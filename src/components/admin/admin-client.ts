// The photo admin (vanilla TS), for a phone: lists → group / fixed places → editor → preview → publish.
// Every change goes into a draft kept on the phone (admin-store.ts); nothing reaches the site before "發佈".
// Spec: docs/superpowers/specs/2026-11-14-admin-photos-design.md
import { admin as t } from '../../i18n/admin';
import { MAX_ALT, MAX_NAME, MAX_SOURCE_BYTES, MAX_ZOOM, OUT, sharpLimit, type AdminState } from '../../lib/photo-admin';
import { sortable } from './admin-drag';
import { render as renderJpeg } from './admin-image';
import { goldenGuide } from './golden';
import { addToGroup, afterPublish, changeCount, changes, finalData, fromState, isDirty, kv, move, moveTo, newId, replaceSlot, resetSlot, resume, setAlt, setFocus, setLabel, setName, toggleRemoved, unpublished, type Draft } from './admin-store';

type Group = AdminState['groups'][number];
const STYLED = 'lash-extensions/styled'; // the styled set: its photos carry look names, and the lash page shows it too
type Slot = AdminState['slots'][number];

let root: HTMLElement;
let state: AdminState;
let draft: Draft;
let stale = false; // the site was changed by someone else since this draft was started
let notice = '';
let picking: { group?: Group; slot?: Slot } = {};
let busy = ''; // while publishing: the progress text
let pollTimer = 0;
let lastEdit = '#/'; // where "返回編輯" goes: the list, group or fixed-places screen last shown
// The photo open in the editor. w, h: its source size (0 = already on the site, cannot be re-cropped). Saved only by 完成.
let editing: { id: string; x: number; y: number; z: number; w: number; h: number; back: string; ctx: Group | Slot; grab?: { px: number; py: number; x: number; y: number } } | undefined;
// The editor's golden-spiral guide: on or off is remembered on this phone; which corner the spiral is in, while the page is open.
const GUIDE = 'abby-admin-guide';
let guide = (() => { try { return localStorage.getItem(GUIDE) === '1'; } catch { return false; } })();
let guideTurn = 0;
const touches = new Map<number, { x: number; y: number }>(); // fingers on the editor's photo
let pinchStart: { d: number; z: number } | undefined;
const sources = new Map<string, string>(); // upload id → object URL of its source file, while that is still on this phone
const fileInput = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/jpeg,image/png', multiple: true, hidden: true });

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const route = () => {
  const [, view = '', id = ''] = location.hash.replace(/\?.*$/, '').split('/');
  return { view: ({ g: 'group', s: 'slots', n: 'names', e: 'edit', p: 'preview', x: 'publish' } as Record<string, string>)[view] ?? 'list', id: decodeURIComponent(id) };
};
const ASPECT: Record<string, string> = { '4:3': 'aspect-[4/3]', '3:4': 'aspect-[3/4]', '1.91:1': 'aspect-[40/21]' }; // literal classes, so Tailwind sees them
const aspect = (ratio: string) => ASPECT[ratio];
const portrait = (ratio: Slot['ratio']) => OUT[ratio][1] > OUT[ratio][0];
const isOg = (ratio: string) => ratio === '1.91:1'; // a service page's link preview
const slotNow = (s: Slot) => draft.data.slots[s.key] ?? s.def;
const removed = (g: string, id: string) => draft.removed.includes(`${g}/${id}`);
const nameOf = (id: string) => state.labels.find((l) => l.key === draft.data.labels[id])?.name ?? (draft.data.groups[STYLED].includes(id) ? state.photos[id]?.name : '') ?? '';
/** "凝膠美甲 · 貓眼"; 整臉效果 alone. */
const groupTitle = (g: Group) => (g.id === 'face' ? g.name : `${g.serviceName} · ${g.name}`);
const groupHref = (g: Group | string) => `#/g/${encodeURIComponent(typeof g === 'string' ? g : g.id)}`;

function picture(id: string, cls = 'size-full object-cover') {
  const f = draft.focus[id] ?? { x: 0.5, y: 0.5, z: 1 };
  const src = sources.get(id) ?? state.photos[id]?.thumb ?? '';
  const at = `${Math.round(f.x * 100)}% ${Math.round(f.y * 100)}%`;
  // a zoomed crop: scaling about the focus point shows exactly the part cropRect cuts (the box clips the rest)
  const zoom = f.z > 1 ? `;transform:scale(${f.z});transform-origin:${at}` : '';
  return `<img src="${esc(src)}" alt="" draggable="false" class="${cls}" style="object-position:${at}${zoom}">`;
}
const icon = (d: string, cls = 'size-4') => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="${cls}"><path d="${d}"/></svg>`;
const CHEVRON = 'M9 6l6 6-6 6', BACK = 'M15 6l-6 6 6 6', PLUS = 'M12 5v14M5 12h14', CROSS = 'M6 6l12 12M18 6L6 18', UNDO = 'M4 9h10a5 5 0 0 1 0 10H8M8 5L4 9l4 4';
const pill = 'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-bold whitespace-nowrap active:scale-[0.97]';

// ── Saving ──
function save(next: Draft) {
  draft = next;
  kv.set('draft', draft).catch(() => { kv.persistent = false; }); // storage full: the draft lives for this visit only
}
function commit(next: Draft) { save(next); render(); }
function forgetSource(id: string) {
  const url = sources.get(id);
  if (url) URL.revokeObjectURL(url);
  sources.delete(id);
  kv.del(`src:${id}`).catch(() => {});
}
const say = (text: string) => { notice = text; render(); };

// ── Shared pieces ──
function top(tab: 'groups' | 'slots' | 'names') {
  const on = 'bg-surface-3 font-bold text-fg shadow-sm', off = 'font-medium text-muted';
  return `
    <header class="flex items-end justify-between">
      <div><p class="text-xs tracking-[0.12em] text-muted">${t.brand}</p><h1 class="font-sans text-[1.75rem] leading-tight font-bold">${t.title}</h1></div>
      <a href="/cdn-cgi/access/logout" class="inline-flex min-h-11 min-w-11 items-center justify-end text-sm text-muted">${t.logout}</a>
    </header>
    <nav class="mt-4 grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
      ${([['groups', '#/', t.tabGroups], ['slots', '#/s', t.tabSlots], ['names', '#/n', t.tabNames]] as const).map(([id, href, label]) =>
        `<a data-tab="${id}" href="${href}" ${tab === id ? 'aria-current="page"' : ''} class="flex min-h-11 items-center justify-center rounded-full ${tab === id ? on : off}">${label}</a>`).join('')}
    </nav>`;
}
function banner() {
  const n = changeCount(draft), p = draft.pending;
  const card = (cls: string, title: string, note: string, action = '') =>
    `<div class="flex items-center justify-between gap-3 rounded-card px-4 py-3 ${cls}"><p class="min-w-0"><span class="block font-bold">${title}</span>${note && `<span class="block text-sm opacity-90">${note}</span>`}</p>${action}</div>`;
  const parts = [
    stale && card('bg-danger/10 text-danger', t.stale, t.staleNote, `<button type="button" data-action="drop-reload" class="${pill} shrink-0 bg-surface-3 text-fg">${t.dropAndReload}</button>`),
    p?.state === 'review' && card('bg-surface text-fg shadow-sm', t.review, t.reviewNote),
    p?.state === 'building' && card('bg-surface text-fg shadow-sm', t.building, t.buildingNote),
    p?.state === 'rejected' && card('bg-surface text-fg shadow-sm', t.rejected, t.rejectedNote),
    p?.state === 'live' && card('bg-surface text-fg shadow-sm', t.live, t.liveNote),
    p?.state === 'failed' && card('bg-danger/10 text-danger', t.failed, t.failedNote, `<button type="button" data-action="retry" class="${pill} shrink-0 bg-surface-3 text-fg">${t.retry}</button>`),
    n > 0 && !stale && `<a href="#/x" class="flex items-center justify-between gap-3 rounded-card bg-primary px-4 py-3 text-on-primary"><span class="font-bold">${t.draft(n)}</span><span class="${pill} min-h-9 shrink-0 bg-bg text-primary">${t.view}</span></a>`,
    !kv.persistent && `<p class="rounded-card bg-surface-2 px-4 py-3 text-sm text-muted">${t.notSaved}</p>`,
  ].filter(Boolean);
  return `<div data-banner class="mt-4 space-y-2 empty:hidden">${parts.join('')}</div>`;
}
const noticeBox = () => notice && `
  <p data-notice role="alert" class="mt-3 flex items-center justify-between gap-2 rounded-card bg-danger/10 py-1 pr-1 pl-4 text-sm font-medium text-danger">
    <span>${esc(notice)}</span><button type="button" data-action="close-notice" aria-label="${t.close}" class="flex size-11 shrink-0 items-center justify-center">${icon(CROSS)}</button>
  </p>`;
const off = (yes: boolean) => (yes ? 'aria-disabled="true" tabindex="-1"' : '');
const OFF = 'pointer-events-none opacity-40';
/** Publishing is possible: there are changes and nobody else changed the site. A publish waiting for review takes more. */
const canPublish = () => changeCount(draft) > 0 && !stale;
function bar() {
  const n = changeCount(draft);
  return `
    <div class="sticky bottom-0 -mx-4 mt-6 grid grid-cols-2 gap-2 bg-bg/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
      <a data-action="preview" href="#/p" ${off(!n)} class="${pill} min-h-13 bg-surface-2 text-base text-fg ${n ? '' : OFF}">${t.preview}</a>
      <a data-action="publish" href="#/x" ${off(!canPublish())} class="${pill} min-h-13 bg-primary text-base text-on-primary ${canPublish() ? '' : OFF}">${n ? t.publishN(n) : t.noChanges}</a>
    </div>`;
}
/** Has this draft changed anything in the group? */
const touched = (g: Group, c = changes(draft)) =>
  c.reordered.includes(g.id) || c.removed.some((m) => m.startsWith(`${g.id}/`)) || draft.clean.groups[g.id].some((id) => c.moved.includes(id))
  || draft.data.groups[g.id].some((id) => c.added.includes(id) || c.relabelled.includes(id) || c.moved.includes(id) || c.described.includes(id));
const slotTitle = (s: Slot) => (s.section === 'hero' ? t.heroName : s.section === 'cards' ? `${t.sectionCards} · ${esc(s.name)}` : `${t.sectionPage(esc(s.section))} · ${esc(s.name)}`);
const countText = (g: Group, ids: string[]) => {
  const v = ids.filter((id) => state.photos[id]?.video).length;
  return `${t.photos(ids.length - v)}${v ? t.videos(v) : ''} · ${t.ratio[g.ratio]}`;
};

// ── Portfolio groups: the list ──
function listView() {
  const c = changes(draft);
  const row = (g: Group) => {
    const ids = draft.data.groups[g.id].filter((id) => !removed(g.id, id));
    return `
      <li><a data-group="${g.id}" href="${groupHref(g)}" class="flex min-h-16 items-center gap-3 px-3">
        <span class="size-11 shrink-0 overflow-hidden rounded-field bg-surface-2">${ids[0] ? picture(ids[0]) : ''}</span>
        <span class="min-w-0 flex-1"><span class="block font-medium">${esc(g.name)}</span>${ids.length
          ? `<span class="block text-sm text-muted">${countText(g, ids)}</span>`
          : `<span data-empty-style class="block text-sm font-medium text-accent-ink">${t.emptyStyle}</span>`}</span>
        ${touched(g, c) ? `<span class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-primary">${t.draftChip}</span>` : ''}
        <span class="shrink-0 text-muted">${icon(CHEVRON)}</span>
      </a></li>`;
  };
  // each part by service (整臉效果 first in lashes), then its styles; an empty style is listed with a reminder
  const sectionOf = (g: Group) => (g.id === 'face' ? 'face' : g.service);
  const part = (id: Group['part']) => {
    const groups = state.groups.filter((g) => g.part === id);
    return `
    <section class="mt-5">
      <h2 class="px-1 font-sans text-sm font-medium text-muted">${t.parts[id]}</h2>
      ${[...new Set(groups.map(sectionOf))].map((k) => {
        const own = groups.filter((g) => sectionOf(g) === k);
        return `<h3 class="mt-3 px-1 font-sans text-base font-bold">${esc(k === 'face' ? own[0].name : own[0].serviceName)}</h3>
          <ul class="mt-1.5 overflow-hidden rounded-card bg-surface shadow-sm">${own.map(row).join('')}</ul>`;
      }).join('')}
    </section>`;
  };
  return `<div data-view="list">${top('groups')}${banner()}${noticeBox()}${(['lashes', 'nails', 'brows'] as const).map(part).join('')}</div>`;
}

// ── One group: add, delete, restore, reorder ──
function groupView(g: Group) {
  const ids = draft.data.groups[g.id];
  let shown = 0;
  const tile = (id: string, i: number) => {
    const gone = removed(g.id, id), isNew = unpublished(draft, id), video = state.photos[id]?.video, name = nameOf(id);
    if (!gone) shown++;
    const last = shown === g.visible && !gone && ids.slice(i + 1).some((x) => !removed(g.id, x));
    const chipCls = 'absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap';
    return `
      <li data-tile="${id}" class="relative touch-manipulation overflow-hidden rounded-field bg-surface-2 select-none [-webkit-touch-callout:none] data-[placeholder]:opacity-30 ${aspect(g.ratio)} ${isNew ? 'outline-3 -outline-offset-3 outline-primary' : ''}">
        ${picture(id, `size-full object-cover ${gone ? 'opacity-25 grayscale' : ''}`)}
        ${gone ? `
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span class="text-xs font-medium">${t.removedNote}</span>
            <button type="button" data-action="restore" class="${pill} gap-1.5 bg-surface-3 text-fg shadow-sm">${icon(UNDO)}${t.restore}</button>
          </div>` : `
          ${isNew ? `<span class="${chipCls} bg-primary text-on-primary">${t.isNew}</span>` : video ? `<span class="${chipCls} bg-fg/75 text-bg">${t.video}</span>` : ''}
          <div class="group-data-[dragging]/admin:hidden">
            ${name ? `<span class="absolute bottom-1.5 left-1.5 max-w-[55%] truncate rounded-full bg-fg/75 px-2 py-0.5 text-xs text-bg">${esc(name)}</span>` : ''}
            <a data-action="edit" href="#/e/${id}?g=${encodeURIComponent(g.id)}" class="absolute right-0 bottom-0 flex min-h-11 min-w-11 items-end justify-end p-1.5"><span class="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-fg">${t.edit}</span></a>
            <button type="button" data-action="remove" aria-label="${t.remove(esc(name))}" class="absolute top-0 right-0 flex size-11 items-start justify-end p-1.5"><span class="flex size-6.5 items-center justify-center rounded-full bg-fg/75 text-bg">${icon(CROSS, 'size-3.5')}</span></button>
          </div>`}
      </li>
      ${last ? `<li aria-hidden="true" class="col-span-full flex items-center gap-2 py-1 text-xs text-muted"><span class="h-0.5 flex-1 rounded bg-fg/10"></span>${t.firstRow}<span class="h-0.5 flex-1 rounded bg-fg/10"></span></li>` : ''}`;
  };
  return `
    <div data-view="group">
      <a href="#/" class="inline-flex min-h-11 items-center gap-1 text-muted">${icon(BACK)}${t.back}</a>
      <h1 class="mt-1 font-sans text-2xl leading-tight font-bold">${esc(groupTitle(g))}</h1>
      <p class="mt-1 text-sm text-muted">${t.parts[g.part]} · ${countText(g, ids.filter((id) => !removed(g.id, id)))}${g.id === STYLED ? ` · ${t.sharedOrder}` : ''}</p>
      ${noticeBox()}
      <button type="button" data-action="add" class="${pill} mt-3 min-h-12 w-full gap-2 bg-primary/10 text-base text-primary">${icon(PLUS, 'size-4.5')}${t.add}</button>
      <p class="mt-3 text-sm text-muted">${ids.length ? t.groupHint : t.empty}</p>
      <ul data-grid class="mt-3 grid gap-2 ${g.cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}">${ids.map(tile).join('')}</ul>
      ${bar()}
    </div>`;
}

// ── Fixed places: replace only ──
function slotsView() {
  const row = (s: Slot) => {
    const changed = draft.data.slots[s.key] !== draft.clean.slots[s.key];
    // A link preview nobody has picked yet shows the automatic cut of the page's hero: what the page uses now.
    const auto = s.auto && !(s.key in draft.data.slots);
    const shown = auto ? `<img src="${esc(s.auto!)}" alt="" draggable="false" class="size-full object-cover">` : picture(slotNow(s));
    return `
      <li data-slot="${s.key}" class="flex min-h-17 items-center gap-3 px-3 py-2 ${changed ? 'bg-primary/5' : ''}">
        <span class="${isOg(s.ratio) ? 'w-16' : 'w-14'} shrink-0 overflow-hidden rounded-field bg-surface-2 ${aspect(s.ratio)} ${changed ? 'outline-3 -outline-offset-3 outline-primary' : ''}">${shown}</span>
        <span class="min-w-0 flex-1"><span class="block font-medium">${esc(s.section === 'hero' ? t.heroName : s.name)}</span>
          <span class="block text-sm ${changed ? 'font-bold text-primary' : 'text-muted'}">${changed ? t.replaced : isOg(s.ratio) ? (auto ? t.ogAuto : t.ogSet) : t.ratio[s.ratio]}</span></span>
        ${changed
          ? `<a data-action="edit" href="#/e/${slotNow(s)}?s=${encodeURIComponent(s.key)}" class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-sm font-bold text-primary">${t.edit}</a>
             <button type="button" data-action="reset" class="${pill} shrink-0 bg-surface-3 text-fg shadow-sm">${t.restore}</button>`
          : `<button type="button" data-action="replace" class="${pill} shrink-0 bg-surface-2 text-fg">${t.replace}</button>`}
      </li>`;
  };
  const sections = [...new Set(state.slots.map((s) => s.section))];
  const title = (s: string) => (s === 'hero' ? t.sectionHero : s === 'cards' ? t.sectionCards : t.sectionPage(esc(s)));
  return `
    <div data-view="slots">${top('slots')}${banner()}${noticeBox()}
      <p class="mt-4 px-1 text-sm text-muted">${t.slotsIntro(state.slots.length)}</p>
      ${sections.map((sec) => `
        <section class="mt-5">
          <h2 class="px-1 font-sans text-sm font-medium text-muted">${title(sec)}</h2>
          <ul class="mt-2 overflow-hidden rounded-card bg-surface shadow-sm">${state.slots.filter((s) => s.section === sec).map(row).join('')}</ul>
        </section>`).join('')}
      ${bar()}
    </div>`;
}

// ── Names: each service and its styles, in Chinese and English ──
function namesView() {
  const row = (n: AdminState['names'][number]) => {
    const now = draft.data.names[n.key] ?? n.text, mine = n.key in draft.data.names;
    const changed = JSON.stringify(draft.data.names[n.key]) !== JSON.stringify(draft.clean.names[n.key]);
    const input = (lang: 'zh' | 'en', label: string) =>
      `<label class="mt-1.5 flex items-center gap-2"><span class="w-24 shrink-0 text-xs text-muted">${label}</span>
        <input data-lang="${lang}" value="${esc(now[lang])}" maxlength="${MAX_NAME}" class="h-11 min-w-0 flex-1 rounded-field bg-surface-3 px-3 text-base shadow-sm outline-1 outline-primary/20"></label>`;
    return `
      <li data-name="${n.key}" class="px-3 py-3 ${changed ? 'bg-primary/5' : ''}">
        <p class="flex items-center justify-between gap-2"><span class="font-bold">${n.key.includes('/') ? esc(n.label) : t.nameService}</span>
          ${changed ? `<span class="shrink-0 text-xs font-bold text-primary">${t.nameChanged}</span>` : ''}
          ${mine ? `<button type="button" data-action="name-reset" class="${pill} shrink-0 bg-surface-3 text-fg shadow-sm">${t.restore}</button>` : ''}</p>
        ${input('zh', t.nameZh)}${input('en', t.nameEn)}
      </li>`;
  };
  const byService = [...new Set(state.names.map((n) => n.service))];
  return `
    <div data-view="names">${top('names')}${banner()}${noticeBox()}
      <p class="mt-4 px-1 text-sm text-muted">${t.namesIntro}</p>
      ${byService.map((sv) => `
        <section class="mt-5">
          <h2 class="px-1 font-sans text-base font-bold">${esc(state.names.find((n) => n.key === sv)!.label)}</h2>
          <ul class="mt-2 divide-y divide-fg/5 overflow-hidden rounded-card bg-surface shadow-sm">${state.names.filter((n) => n.service === sv).map(row).join('')}</ul>
        </section>`).join('')}
      ${bar()}
    </div>`;
}
/** A name field was left: both languages written → the new name; one blank → back to the written name. */
function nameEdited(li: HTMLElement) {
  const n = state.names.find((x) => x.key === li.dataset.name);
  if (!n) return;
  const [zh, en] = (['zh', 'en'] as const).map((k) => li.querySelector<HTMLInputElement>(`[data-lang="${k}"]`)!.value.trim());
  const now = draft.data.names[n.key] ?? n.text;
  if (zh === now.zh && en === now.en) return;
  notice = zh && en ? '' : t.nameEmpty;
  commit(setName(draft, n.key, zh && en ? { en, zh } : undefined, n.text));
}

// ── Editor: drag and zoom the photo behind a frame of the fixed ratio; optional style name ──
/** Sizes on screen: the frame, the photo scaled to cover it, and how far the photo can move (spare). */
function layout() {
  const e = editing!, [ow, oh] = OUT[e.ctx.ratio];
  const stageW = root.clientWidth - 32; // the content width (px-4 on both sides)
  const fw = portrait(e.ctx.ratio) ? Math.round(stageW * 0.75) : stageW, fh = Math.round((fw * oh) / ow);
  const base = e.w ? Math.max(fw / e.w, fh / e.h) : 0;
  const dw = e.w ? e.w * base * e.z : fw, dh = e.h ? e.h * base * e.z : fh;
  const spareX = Math.max(0, Math.round(dw - fw)), spareY = Math.max(0, Math.round(dh - fh));
  const stageH = Math.min(Math.max(fh, Math.round(e.h * base)), 460); // sized at 1x, so zooming does not move the page
  return { fw, fh, dw, dh, spareX, spareY, stageH, left: (stageW - fw) / 2, top: (stageH - fh) / 2 };
}
/** The zoom up to which this photo stays sharp, and how it is written (rounded down: never promise more than is true). */
const sharp = () => { const v = sharpLimit(editing!.w, editing!.h, editing!.ctx.ratio); return { v, text: (Math.floor(v * 10) / 10).toFixed(1) }; };
const along = (z: number) => (z - 1) / (MAX_ZOOM - 1); // 0..1 along the slider
const onSlider = (f: number) => `calc(14px + (100% - 28px) * ${f})`; // the thumb's centre at that point
/** Moves and sizes the photo to the editor's current position and zoom, without redrawing the screen (called while fingers move). */
function placePhoto() {
  const e = editing!, l = layout();
  const img = root.querySelector<HTMLElement>('[data-photo]');
  if (img) Object.assign(img.style, { width: `${l.dw}px`, height: `${l.dh}px`, left: `${l.left - e.x * l.spareX}px`, top: `${l.top - e.y * l.spareY}px` });
  const readout = root.querySelector('[data-readout]');
  if (readout) readout.textContent = [l.spareY && t.posV(Math.round(e.y * 100)), l.spareX && t.posH(Math.round(e.x * 100))].filter(Boolean).join(' · ');
  if (!e.w) return;
  const s = sharp(), over = e.z > s.v + 0.001;
  root.querySelector('[data-zoom-readout]')!.textContent = t.zoomed(e.z.toFixed(1));
  const slider = root.querySelector<HTMLInputElement>('input[data-zoom]')!;
  if (Number(slider.value) !== e.z) slider.value = String(Math.round(e.z * 20) / 20);
  root.querySelector<HTMLElement>('[data-zoom-fill]')!.style.width = `${along(Math.min(e.z, Math.max(1, s.v))) * 100}%`;
  const overBar = root.querySelector<HTMLElement>('[data-zoom-over]')!.classList;
  overBar.toggle('bg-accent', over); overBar.toggle('bg-accent/30', !over); // one background at a time: both classes would fight
  root.querySelector('[data-warn-slot]')!.innerHTML = over
    ? `<p data-sharp-warning role="status" class="mt-2 flex gap-2 rounded-field bg-accent/15 px-3 py-2.5 text-sm leading-normal font-medium text-accent-ink">${icon('M12 3l10 18H2zM12 10v5M12 18v.5', 'mt-0.5 size-4.5 shrink-0')}<span>${s.v < 1 ? t.lowRes : t.sharpWarn(s.text)}</span></p>`
    : '';
}
function zoomControls() {
  const s = sharp(), mark = s.v > 1 && s.v < MAX_ZOOM;
  const lens = (plus: boolean) => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" class="size-4.5 shrink-0 text-muted"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M8 11h6${plus ? 'M11 8v6' : ''}"/></svg>`;
  const thumb = '[&::-webkit-slider-thumb]:size-7 [&::-webkit-slider-thumb]:-mt-[11px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-surface-3 [&::-webkit-slider-thumb]:shadow-[0_1px_3px_color-mix(in_oklch,var(--fg)_35%,transparent)] [&::-webkit-slider-runnable-track]:h-1.5 [&::-moz-range-thumb]:size-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-surface-3';
  return `
    ${guideRow()}
    ${hint()}
    <div class="mt-2 flex items-center gap-2.5">
      ${lens(false)}
      <div class="relative h-11 flex-1">
        <div aria-hidden="true" class="absolute inset-x-3.5 top-[19px] h-1.5 overflow-hidden rounded-full bg-fg/10">
          <div data-zoom-fill class="absolute inset-y-0 left-0 bg-primary"></div>
          ${s.v < MAX_ZOOM ? `<div data-zoom-over class="absolute inset-y-0 right-0 bg-accent/30" style="left:${along(Math.max(1, s.v)) * 100}%"></div>` : '<div data-zoom-over hidden></div>'}
        </div>
        ${mark ? `<div aria-hidden="true" class="absolute top-3 h-5 w-0.5 -translate-x-1/2 rounded-full bg-accent-ink" style="left:${onSlider(along(s.v))}"></div>` : ''}
        <input type="range" data-zoom aria-label="${t.zoomLabel}" min="1" max="${MAX_ZOOM}" step="0.05" value="${editing!.z}" class="absolute inset-0 m-0 h-11 w-full cursor-pointer appearance-none bg-transparent ${thumb}">
      </div>
      ${lens(true)}
    </div>
    <div class="flex justify-between px-7 text-xs text-muted"><span>${t.zoomMin}</span>${mark ? `<span>${t.sharpMark(s.text)}</span>` : ''}<span>${t.zoomMax}</span></div>
    <div data-warn-slot></div>
    <div class="mt-3 flex items-center justify-between gap-3">
      <p class="min-w-0"><span data-zoom-readout class="block font-bold tabular-nums"></span><span data-readout class="block text-sm text-muted tabular-nums empty:hidden"></span><span class="block text-xs text-muted">${t.output(...OUT[editing!.ctx.ratio])}</span></p>
      <button type="button" data-action="recentre" class="${pill} shrink-0 bg-surface-2 text-fg">${t.recentre}</button>
    </div>`;
}
/** Inside the white frame: the thirds grid, or (guide on, photo can move) the golden spiral with a dot where it ends. */
function guideLayer() {
  const e = editing!;
  if (!(e.w && guide)) {
    const line = 'absolute bg-surface-3/40';
    return `<div data-thirds><span class="${line} inset-y-0 left-1/3 w-px"></span><span class="${line} inset-y-0 left-2/3 w-px"></span>
      <span class="${line} inset-x-0 top-1/3 h-px"></span><span class="${line} inset-x-0 top-2/3 h-px"></span></div>`;
  }
  const g = goldenGuide(portrait(e.ctx.ratio), guideTurn);
  return `${g.svg}<span data-guide-end class="absolute -mt-1.75 -ml-1.75 size-3.5 rounded-full bg-[#f3d08a] shadow-[0_0_0_2px_rgb(30_18_21/.55),0_0_0_7px_rgb(243_208_138/.35)]" style="left:${g.end[0] * 100}%;top:${g.end[1] * 100}%"></span>`;
}
function guideRow() {
  return `
    <div data-guide-row class="mt-2.5 flex items-center justify-end gap-2.5">
      ${guide ? `<button type="button" data-action="turn" aria-label="${t.guideTurnLabel}" class="${pill} mr-auto gap-1.5 bg-surface-2 text-fg">${icon('M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4')}${t.guideTurn}</button>` : ''}
      <label for="guide-switch" class="cursor-pointer text-sm font-bold">${t.guide}</label>
      <button type="button" id="guide-switch" role="switch" aria-checked="${guide}" data-action="guide" class="relative h-8 w-13 shrink-0 rounded-full transition-colors duration-200 before:absolute before:-inset-x-0.5 before:-inset-y-1.5 ${guide ? 'bg-primary' : 'bg-fg/20'}">
        <span class="absolute top-0.75 left-0.75 size-6.5 rounded-full bg-surface-3 shadow-[0_1px_3px_rgb(30_18_21/.3)] transition-transform duration-200 ${guide ? 'translate-x-5' : ''}"></span>
      </button>
    </div>`;
}
const hint = () => `<p data-hint class="mt-1.5 text-center text-sm text-balance ${guide ? 'font-medium text-accent-ink' : 'text-muted'}">${guide ? t.guideHint : t.dragZoom}</p>`;
/** After the switch or 換方向: redraws only the guide, so an unsaved style name and the photo's place stay as they are. */
function refreshGuide() {
  root.querySelector('[data-guide-layer]')!.innerHTML = guideLayer();
  root.querySelector('[data-guide-row]')!.outerHTML = guideRow();
  root.querySelector('[data-hint]')!.outerHTML = hint();
}
function editView() {
  const e = editing!, l = layout();
  const g = 'key' in e.ctx ? undefined : e.ctx; // a portfolio group (not a fixed place)
  const options = state.labels.filter((x) => x.group === g?.id); // 整臉效果: its style; the styled set: its look name
  const label = draft.data.labels[e.id] ?? '';
  const legacy = !label && g?.id === STYLED && state.photos[e.id]?.name;
  const alt = draft.data.alts[e.id] ?? state.photos[e.id]?.alt ?? { en: '', zh: '' };
  const num = finalData(draft).numbers[e.id], was = draft.clean.numbers[e.id];
  const field = 'mt-1.5 w-full rounded-field bg-surface-3 px-3 text-base shadow-sm outline-1 outline-primary/20';
  return `
    <div data-view="edit">
      <header class="flex items-center justify-between">
        <button type="button" data-action="cancel" class="${pill} -ml-4 font-medium text-muted">${t.cancel}</button>
        <h1 class="font-sans text-lg font-bold">${t.editTitle}</h1>
        <button type="button" data-action="done" class="${pill} bg-primary text-on-primary">${t.done}</button>
      </header>
      <div data-stage class="relative mt-3 overflow-hidden rounded-card bg-fg select-none ${e.w ? 'cursor-grab touch-none' : ''}" style="height:${l.stageH}px">
        ${e.w
          ? `<img data-photo src="${esc(sources.get(e.id) ?? '')}" alt="" draggable="false" class="pointer-events-none absolute max-w-none">`
          : picture(e.id, 'pointer-events-none absolute object-cover').replace('style="', `style="left:${l.left}px;top:${l.top}px;width:${l.fw}px;height:${l.fh}px;`)}
        <div aria-hidden="true" class="pointer-events-none absolute rounded-[4px] shadow-[0_0_0_9999px_color-mix(in_oklch,var(--fg)_72%,transparent)] outline-2 outline-surface-3" style="left:${l.left}px;top:${l.top}px;width:${l.fw}px;height:${l.fh}px">
          <div data-guide-layer class="absolute inset-0">${guideLayer()}</div>
        </div>
        <span class="pointer-events-none absolute rounded-full bg-fg/75 px-2 py-0.5 text-xs whitespace-nowrap text-bg" style="left:${l.left + 8}px;top:${l.top + 8}px">${t.ratio[e.ctx.ratio]} · ${t.fixedRatio}</span>
      </div>
      ${e.w ? zoomControls() : `<p class="mt-3 text-sm text-muted">${t.locked}</p>`}
      ${g ? `
      <label for="photo-group" class="mt-5 block font-bold">${t.groupTitle}</label>
      <select id="photo-group" data-group-select class="${field} h-12">
        ${state.groups.filter((x) => x.dir === g.dir).map((x) => `<option value="${x.id}" ${x.id === g.id ? 'selected' : ''}>${esc(groupTitle(x))}</option>`).join('')}
      </select>
      <p class="mt-1.5 text-xs leading-relaxed text-muted">${t.groupNote}</p>` : ''}
      ${options.length ? `
      <label for="look-name" class="mt-5 block font-bold">${g!.id === 'face' ? t.labelTitle : t.lookTitle}</label>
      <select id="look-name" data-label class="${field} h-12">
        <option value="">${t.labelNone}</option>
        ${options.map((o) => `<option value="${o.key}" ${o.key === label ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}
      </select>
      <p class="mt-1.5 text-xs leading-relaxed text-muted">${legacy ? `${t.currentName(esc(legacy))}。` : ''}${t.labelShown}</p>` : ''}
      ${isOg(e.ctx.ratio) ? '' : `
      <p class="mt-5 font-bold">${t.altTitle}</p>
      <label for="alt-zh" class="mt-2 block text-sm text-muted">${t.altZh}</label>
      <textarea id="alt-zh" data-alt="zh" rows="2" maxlength="${MAX_ALT}" class="${field} py-2">${esc(alt.zh)}</textarea>
      <label for="alt-en" class="mt-2 block text-sm text-muted">${t.altEn}</label>
      <textarea id="alt-en" data-alt="en" rows="2" maxlength="${MAX_ALT}" class="${field} py-2">${esc(alt.en)}</textarea>
      <p class="mt-1.5 text-xs leading-relaxed text-muted">${t.altNote}</p>
      ${num ? `<p data-number class="mt-5 text-sm font-bold tabular-nums">${was && was !== num ? t.numberNext(num, was) : t.number(num)}</p>
      <p class="mt-1 text-xs leading-relaxed text-muted">${t.numberNote}</p>` : ''}`}
    </div>`;
}
/** Opens the editor for the photo in the address (#/e/<id>?g=<group> or ?s=<place>); reads the source's size first. */
async function openEditor(id: string) {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const ctx = state.slots.find((s) => s.key === q.get('s')) ?? state.groups.find((g) => g.id === q.get('g'));
  const known = ctx && ('key' in ctx ? slotNow(ctx) === id : draft.data.groups[ctx.id].includes(id));
  if (!known) { location.hash = '#/'; return; }
  const next: NonNullable<typeof editing> = { id, x: 0.5, y: 0.5, z: 1, ...draft.focus[id], w: 0, h: 0, back: 'key' in ctx ? '#/s' : groupHref(ctx), ctx };
  if (unpublished(draft, id) && sources.has(id)) {
    const img = Object.assign(new Image(), { src: sources.get(id)! });
    await img.decode().catch(() => {});
    next.w = img.naturalWidth; next.h = img.naturalHeight;
  }
  editing = next;
  render();
}
function closeEditor(keep: boolean) {
  const e = editing!;
  if (keep) {
    const name = root.querySelector<HTMLSelectElement>('select[data-label]'); // only 整臉效果 and the styled set have one
    let next = name ? setLabel(draft, e.id, name.value) : draft;
    const to = root.querySelector<HTMLSelectElement>('select[data-group-select]')?.value;
    if (to && !('key' in e.ctx)) next = moveTo(next, e.ctx.id, to, e.id); // after the label: a label that does not apply there is dropped
    const [zh, en] = (['zh', 'en'] as const).map((k) => root.querySelector<HTMLTextAreaElement>(`[data-alt="${k}"]`)?.value.trim());
    const shown = draft.data.alts[e.id] ?? state.photos[e.id]?.alt;
    if (zh !== undefined && en !== undefined && (zh !== (shown?.zh ?? '') || en !== (shown?.en ?? '')))
      next = setAlt(next, e.id, zh && en ? { en, zh } : undefined, state.photos[e.id]?.alt); // one left blank: back to the written one
    const r2 = (n: number) => Math.round(n * 100) / 100;
    if (e.w) next = setFocus(next, e.id, r2(e.x), r2(e.y), r2(e.z));
    save(next);
  }
  location.hash = e.back;
}
const gap = () => { const [a, b] = [...touches.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
const holdFrom = (p: { x: number; y: number }) => { editing!.grab = { px: p.x, py: p.y, x: editing!.x, y: editing!.y }; };
/** A finger (or the mouse) goes down on the photo: one moves it, two zoom it. */
function grabbed(ev: PointerEvent) {
  const stage = (ev.target as Element).closest<HTMLElement>('[data-stage]');
  if (!stage || !editing?.w) return;
  touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  stage.setPointerCapture(ev.pointerId);
  if (touches.size === 2) { pinchStart = { d: gap() || 1, z: editing.z }; delete editing.grab; }
  else if (touches.size === 1) holdFrom({ x: ev.clientX, y: ev.clientY });
}
function released(ev: PointerEvent) {
  touches.delete(ev.pointerId);
  if (touches.size < 2) pinchStart = undefined;
  if (!editing) return;
  if (touches.size === 1) holdFrom([...touches.values()][0]); // the finger left on the photo carries on moving it, without a jump
  else delete editing.grab;
}
function dragged(ev: PointerEvent) {
  const e = editing;
  if (!e || !touches.has(ev.pointerId)) return;
  touches.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (pinchStart && touches.size >= 2) {
    e.z = Math.min(MAX_ZOOM, Math.max(1, (pinchStart.z * gap()) / pinchStart.d));
    placePhoto();
    return;
  }
  const g = e.grab;
  if (!g) return;
  const l = layout(), clamp = (n: number) => Math.min(1, Math.max(0, n));
  // the photo follows the finger: pulling it down brings its top into the frame
  if (l.spareX) e.x = clamp(g.x - (ev.clientX - g.px) / l.spareX);
  if (l.spareY) e.y = clamp(g.y - (ev.clientY - g.py) / l.spareY);
  placePhoto();
}

// ── Preview: the draft in the site's phone layout ──
function previewView() {
  const c = changes(draft);
  const kept = (g: Group) => draft.data.groups[g.id].filter((id) => !removed(g.id, id));
  const head = (text: string) => `<h2 class="font-sans text-sm font-medium text-muted">${text}</h2>`;
  const home = (g: Group) => {
    const ids = kept(g);
    return `
      <section class="mt-6">${head(t.previewHome(esc(groupTitle(g))))}
        <div class="mt-2 rounded-card bg-surface-2 p-3">
          <ul data-preview-group="${g.id}" class="grid gap-2 ${g.cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}">
            ${ids.slice(0, g.visible).map((id) => `<li data-photo-id="${id}" class="overflow-hidden rounded-field bg-fg/5 ${aspect(g.ratio)}">${picture(id)}</li>`).join('')}
          </ul>
          ${ids.length > g.visible ? `<p class="mt-3 text-center"><span class="inline-block rounded-full bg-surface px-4 py-2 text-sm font-medium shadow-sm">${t.showAll(ids.length)}</span></p>` : ''}
        </div>
      </section>`;
  };
  const styled = state.groups.find((g) => g.id === STYLED)!;
  const lashPage = () => `
    <section class="mt-6">${head(t.previewPage)}
      <ul data-preview-page="${STYLED}" class="mt-2 grid grid-cols-2 gap-3">
        ${kept(styled).map((id) => `<li data-photo-id="${id}" class="overflow-hidden rounded-card bg-surface shadow-sm"><div class="aspect-[4/3]">${picture(id)}</div>${nameOf(id) ? `<p class="p-3 text-sm font-medium">${esc(nameOf(id))}</p>` : ''}</li>`).join('')}
      </ul>
    </section>`;
  const place = (s: Slot) => `
    <section class="mt-6">${head(t.previewSlot(slotTitle(s)))}
      <figure data-preview-slot="${s.key}" class="mx-auto mt-2 overflow-hidden rounded-card bg-surface-2 ${portrait(s.ratio) ? 'w-2/3' : 'w-full'} ${aspect(s.ratio)}">${picture(slotNow(s))}</figure>
    </section>`;
  const groups = state.groups.filter((g) => touched(g, c));
  const body = [...groups.map(home), ...(groups.includes(styled) ? [lashPage()] : []), ...state.slots.filter((s) => c.replaced.includes(s.key)).map(place)];
  return `
    <div data-view="preview">
      <header class="-mx-4 -mt-5 flex items-center justify-between gap-3 bg-primary px-4 py-2 text-on-primary">
        <p><span class="block font-bold">${t.previewTitle}</span><span class="block text-xs opacity-90">${t.previewNote}</span></p>
        <a href="${esc(lastEdit)}" class="${pill} -mr-2">${t.backToEdit}</a>
      </header>
      ${body.join('') || `<p class="mt-6 text-muted">${t.nothingToPreview}</p>`}
      <div class="sticky bottom-0 -mx-4 mt-6 bg-bg/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
        <a data-action="publish" href="#/x" ${off(!canPublish())} class="${pill} min-h-13 w-full bg-primary text-base text-on-primary ${canPublish() ? '' : OFF}">${t.publishN(changeCount(draft))}</a>
      </div>
    </div>`;
}

// ── Publish: what will change, then send it ──
function publishView() {
  const c = changes(draft), n = changeCount(draft);
  const groupName = (id: string) => { const g = state.groups.find((x) => x.id === id); return g ? esc(groupTitle(g)) : ''; };
  const groupNow = (id: string) => state.groups.find((g) => draft.data.groups[g.id].includes(id))?.id ?? '';
  const nameLabel = (key: string) => { const n = state.names.find((x) => x.key === key)!; return esc(n.key.includes('/') ? `${state.names.find((x) => x.key === n.service)!.label} · ${n.label}` : n.label); };
  const row = (photo: string | undefined, title: string, note: string, grey = false) => `
    <li data-change class="flex min-h-16 items-center gap-3 px-3 py-2">
      <span class="aspect-[4/3] w-14 shrink-0 overflow-hidden rounded-field bg-surface-2">${photo ? picture(photo, `size-full object-cover ${grey ? 'opacity-50 grayscale' : ''}`) : ''}</span>
      <span class="min-w-0"><span class="block font-bold">${title}</span><span class="block text-sm text-muted">${note}</span></span>
    </li>`;
  const rows = [
    ...c.added.map((id) => row(id, t.chAdded, groupName(groupNow(id)))),
    // a mark is `${groupId}/${photoId}`: group ids have a '/' of their own, photo ids none
    ...c.removed.map((m) => { const [g, id] = [m.slice(0, m.lastIndexOf('/')), m.slice(m.lastIndexOf('/') + 1)]; return row(id, t.chRemoved, `${groupName(g)}${nameOf(id) ? `「${esc(nameOf(id))}」` : ''}`, true); }),
    ...c.moved.map((id) => row(id, t.chMoved, groupName(groupNow(id)))),
    ...c.reordered.map((g) => row(draft.data.groups[g].find((id) => !removed(g, id)), t.chReordered, groupName(g))),
    ...state.slots.filter((s) => c.replaced.includes(s.key)).map((s) => row(slotNow(s), t.chReplaced, slotTitle(s))),
    ...c.relabelled.map((id) => row(id, t.chRelabelled, esc(nameOf(id)) || t.labelNone)),
    ...c.renamed.map((key) => row(undefined, t.chRenamed, `${nameLabel(key)}：${esc((draft.data.names[key] ?? state.names.find((n) => n.key === key)!.text).zh)}`)),
    ...c.described.map((id) => row(id, t.chDescribed, esc((draft.data.alts[id] ?? state.photos[id]?.alt)?.zh ?? ''))),
  ];
  const ready = canPublish() && !busy;
  return `
    <div data-view="publish">
      <a href="${esc(lastEdit)}" class="inline-flex min-h-11 items-center gap-1 text-muted">${icon(BACK)}${t.backToEdit}</a>
      <h1 class="mt-1 font-sans text-2xl leading-tight font-bold">${t.publishTitle(n)}</h1>
      ${stale ? banner() : ''}${noticeBox()}
      <ul class="mt-4 overflow-hidden rounded-card bg-surface shadow-sm">${rows.join('')}</ul>
      <p class="mt-3 text-sm text-muted">${draft.pending?.state === 'review' ? t.publishMore : t.publishNote}</p>
      <button type="button" data-action="confirm" ${ready ? '' : 'disabled'} class="${pill} mt-4 min-h-13 w-full bg-primary text-base text-on-primary disabled:opacity-40">${busy || t.confirm}</button>
      <button type="button" data-action="discard" ${busy ? 'disabled' : ''} class="${pill} mt-1 w-full text-base text-danger disabled:opacity-40">${t.discard}</button>
    </div>`;
}
/** Cloudflare Access answers an expired session with a redirect to its sign-in page, not a 401; fetch must not follow it. */
const signedIn = (res: Response) => (res.type === 'opaqueredirect' ? new Response(null, { status: 401 }) : res);
/** A publish the server refused, or that never reached it. The draft is untouched. */
function refused(status: number) {
  busy = '';
  if (status === 409) { stale = true; notice = ''; render(); return; } // someone else published since this draft was started
  say(status === 401 ? t.signedOut : t.publishFailed);
}
async function publishNow() {
  if (busy || !canPublish()) return;
  const sent = draft; // exactly what is published; the screen is locked meanwhile (render), so nothing else can change
  const data = finalData(sent);
  const fresh = Object.keys(data.uploads).filter((id) => !(id in sent.clean.uploads));
  const post = async (path: string, body: string) => signedIn(await fetch(path, { method: 'POST', body, headers: { 'content-type': 'text/plain' }, redirect: 'manual' }));
  const blobs: Record<string, string> = {};
  try {
    for (const [i, id] of fresh.entries()) { // one photo per request: each stays small, and a weak connection loses one photo's work at most
      busy = t.uploading(i + 1, fresh.length); render();
      const source = await (await fetch(sources.get(id)!)).blob();
      const res = await post('/api/admin/blob', await renderJpeg(source, data.uploads[id].ratio, sent.focus[id] ?? { x: 0.5, y: 0.5, z: 1 }));
      if (!res.ok) return refused(res.status);
      blobs[id] = (await res.json()).sha;
    }
    busy = t.sending; render();
    const res = await post('/api/admin/publish', JSON.stringify({ base: sent.base, data, blobs }));
    if (!res.ok) return refused(res.status);
    const done = await res.json();
    busy = '';
    save(afterPublish(sent, done.pr, done.base)); // the sources stay on the phone until the rebuilt site shows these photos
    location.hash = '#/';
    void poll();
  } catch {
    refused(0); // offline, or the photo could not be prepared
  }
}
/** Asks where the last publish stands; again while it waits for review (every minute) or builds (every 20 s), when the page is in front. */
async function poll(rerun = false) {
  clearTimeout(pollTimer);
  const p = draft.pending;
  const waiting = (s?: string) => s === 'review' || s === 'building';
  if (!p || !p.pr || document.hidden || (!waiting(p.state) && !rerun)) return;
  try {
    const res = signedIn(await fetch(`/api/admin/status?pr=${p.pr}`, { method: rerun ? 'POST' : 'GET', cache: 'no-store', redirect: 'manual' }));
    if (res.status === 401 && route().view !== 'edit') say(t.signedOut);
    const now = res.ok ? (await res.json()).state : undefined;
    if (now && draft.pending?.pr === p.pr && now !== draft.pending.state) {
      const pending = { ...draft.pending, state: now };
      if (now === 'rejected' && isDirty(draft)) stale = true; // changes built on the turned-down version cannot be published
      save(now === 'rejected' && !stale ? { ...fromState(state), pending } : { ...draft, pending }); // turned down: back to the site
      if (route().view !== 'edit') render();
    }
  } catch { /* offline: ask again later */ }
  if (waiting(draft.pending?.state)) pollTimer = window.setTimeout(poll, draft.pending!.state === 'review' ? 60_000 : 20_000);
}
/** 放棄全部更改: back to the live site (or to what this phone last published). */
function discard() {
  for (const id of Object.keys(draft.data.uploads)) if (unpublished(draft, id)) forgetSource(id);
  save({ ...draft, data: structuredClone(draft.clean), removed: [], focus: Object.fromEntries(Object.entries(draft.focus).filter(([id]) => id in draft.clean.uploads)) });
  location.hash = '#/';
}
/** The draft can never be published (the site moved on): forget everything on this phone and start from the site. */
async function dropAndReload() {
  for (const k of await kv.keys().catch(() => [])) await kv.del(k).catch(() => {});
  history.replaceState(null, '', '#/');
  location.reload();
}

// ── Rendering and events ──
function render() {
  const r = route();
  const group = state.groups.find((g) => g.id === r.id);
  if (busy) { root.innerHTML = publishView(); return; } // a publish is being sent: no editing until it has an answer
  if (r.view === 'edit') {
    if (editing?.id !== r.id) { void openEditor(r.id); return; } // comes back here once the photo's size is known
    root.innerHTML = editView();
    placePhoto();
    return;
  }
  editing = undefined;
  if (r.view === 'preview' || r.view === 'publish') { root.innerHTML = r.view === 'preview' ? previewView() : publishView(); return; }
  lastEdit = location.hash || '#/';
  root.innerHTML = r.view === 'group' && group ? groupView(group) : r.view === 'slots' ? slotsView() : r.view === 'names' ? namesView() : listView();
}

const MAX_PICK = 10; // photos added in one pick (owner's decision, 2026-11-14); pick again for more
/** Reads a picked file: a tile-ready source, or why it cannot be used. */
async function readPhoto(file: File): Promise<{ id: string; url: string } | 'big' | 'bad'> {
  if (file.size > MAX_SOURCE_BYTES) return 'big';
  const url = URL.createObjectURL(file);
  try {
    await Object.assign(new Image(), { src: url }).decode(); // can this phone's browser read it?
  } catch {
    URL.revokeObjectURL(url);
    return 'bad';
  }
  const id = newId();
  await kv.set(`src:${id}`, file).catch(() => { kv.persistent = false; });
  sources.set(id, url);
  return { id, url };
}
async function picked() {
  const files = [...(fileInput.files ?? [])];
  const { group, slot } = picking;
  fileInput.value = ''; picking = {}; notice = '';
  if (!files.length || (!group && !slot)) return;
  if (slot) {
    const r = await readPhoto(files[0]);
    if (typeof r === 'string') return say(r === 'big' ? t.tooBig : t.unreadable);
    const old = draft.data.slots[slot.key];
    if (old && unpublished(draft, old)) forgetSource(old);
    return commit(replaceSlot(draft, slot.key, r.id, { dir: slot.dir, ratio: slot.ratio, where: slot.key }));
  }
  const results = [];
  for (const f of files.slice(0, MAX_PICK)) results.push(await readPhoto(f)); // one at a time: a phone has little memory
  let next = draft;
  // added last-picked first, so the first one picked ends up first in the group
  for (const r of [...results].reverse()) if (typeof r !== 'string') next = addToGroup(next, group!.id, r.id, { dir: group!.dir, ratio: group!.ratio, where: group!.id });
  const big = results.filter((r) => r === 'big').length, bad = results.filter((r) => r === 'bad').length;
  const single = files.length === 1 && (big || bad);
  const parts = [files.length > MAX_PICK && t.tooMany(MAX_PICK), single ? (big ? t.tooBig : t.unreadable) : (big || bad) && t.skipped(big, bad)].filter(Boolean);
  notice = parts.join(' ');
  commit(next);
}

function clicked(e: MouseEvent) {
  const el = (e.target as Element).closest<HTMLElement>('[data-action]');
  if (!el || busy) return;
  const groupId = route().id;
  const tile = el.closest<HTMLElement>('[data-tile]')?.dataset.tile;
  const slot = state.slots.find((s) => s.key === el.closest<HTMLElement>('[data-slot]')?.dataset.slot);
  switch (el.dataset.action) {
    case 'add': picking = { group: state.groups.find((g) => g.id === groupId) }; fileInput.multiple = true; fileInput.click(); break;
    case 'replace': picking = { slot }; fileInput.multiple = false; fileInput.click(); break; // one place, one photo
    case 'remove': case 'restore':
      if (!tile) break;
      if (unpublished(draft, tile)) forgetSource(tile);
      commit(toggleRemoved(draft, groupId, tile));
      break;
    case 'reset':
      if (!slot) break;
      if (unpublished(draft, slotNow(slot))) forgetSource(slotNow(slot));
      commit(resetSlot(draft, slot.key));
      break;
    case 'close-notice': notice = ''; render(); break;
    case 'name-reset': { const key = el.closest<HTMLElement>('[data-name]')?.dataset.name; if (key) commit(setName(draft, key, undefined)); break; }
    case 'done': closeEditor(true); break;
    case 'cancel': closeEditor(false); break;
    case 'recentre': if (editing) { editing.x = editing.y = 0.5; editing.z = 1; placePhoto(); } break;
    case 'guide': guide = !guide; try { localStorage.setItem(GUIDE, guide ? '1' : '0'); } catch { /* private mode: on for this visit only */ } refreshGuide(); root.querySelector<HTMLElement>('#guide-switch')?.focus(); break;
    case 'turn': guideTurn = (guideTurn + 1) % 4; refreshGuide(); root.querySelector<HTMLElement>('[data-action="turn"]')?.focus(); break;
    case 'confirm': void publishNow(); break;
    case 'discard': if (confirm(t.discardAsk)) discard(); break;
    case 'drop-reload': void dropAndReload(); break;
    case 'retry': void poll(true); break;
  }
}

export async function start(el: HTMLElement): Promise<void> {
  root = el;
  try {
    const res = await fetch('/admin/state.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    state = await res.json();
  } catch {
    root.innerHTML = `<p role="alert" class="text-danger">${t.loadFailed}</p>`;
    return;
  }
  ({ draft, stale } = resume(await kv.get<Draft>('draft').catch(() => undefined), state));
  for (const id of Object.keys(draft.data.uploads)) { // photos added on this phone that the site does not have yet
    const file = state.photos[id] ? undefined : await kv.get<Blob>(`src:${id}`).catch(() => undefined);
    if (file) sources.set(id, URL.createObjectURL(file));
  }
  for (const k of await kv.keys().catch(() => [])) // sources nothing needs any more: deleted uploads, photos the site now has
    if (k.startsWith('src:') && (!(k.slice(4) in draft.data.uploads) || state.photos[k.slice(4)])) void kv.del(k).catch(() => {});
  document.addEventListener('visibilitychange', () => void poll());
  void poll();
  document.body.append(fileInput);
  fileInput.dataset.file = '';
  fileInput.addEventListener('change', picked);
  root.addEventListener('click', clicked);
  root.addEventListener('pointerdown', grabbed);
  root.addEventListener('pointermove', dragged);
  for (const end of ['pointerup', 'pointercancel'] as const) root.addEventListener(end, released);
  root.addEventListener('change', (ev) => { // a name field left (or Enter): saved into the draft
    const li = (ev.target as Element).closest<HTMLElement>('[data-name]');
    if (li) nameEdited(li);
  });
  root.addEventListener('input', (ev) => {
    const el = ev.target as HTMLInputElement;
    if (editing && el.matches('input[data-zoom]')) { editing.z = Number(el.value); placePhoto(); }
  });
  // Safari's own pinch gesture would zoom the whole page instead of the photo
  root.addEventListener('gesturestart', (ev) => { if (editing) ev.preventDefault(); });
  sortable(root, '[data-tile]', (from, to) => commit(move(draft, route().id, from, to)));
  addEventListener('hashchange', () => { notice = ''; render(); scrollTo(0, 0); });
  render();
}
