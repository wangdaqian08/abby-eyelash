// The photo admin (vanilla TS), for a phone: lists → group / fixed places → editor → preview → publish.
// Every change goes into a draft kept on the phone (admin-store.ts); nothing reaches the site before "發佈".
// Spec: docs/superpowers/specs/2026-11-14-admin-photos-design.md
import { admin as t } from '../../i18n/admin';
import { MAX_SOURCE_BYTES, OUT, type AdminState } from '../../lib/photo-admin';
import { sortable } from './admin-drag';
import { render as renderJpeg } from './admin-image';
import { addToGroup, afterPublish, building, changeCount, changes, finalData, kv, move, newId, replaceSlot, resetSlot, resume, setFocus, setLabel, toggleRemoved, unpublished, type Draft } from './admin-store';

type Group = AdminState['groups'][number];
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
let editing: { id: string; x: number; y: number; w: number; h: number; back: string; ctx: Group | Slot; grab?: { px: number; py: number; x: number; y: number } } | undefined;
const sources = new Map<string, string>(); // upload id → object URL of its source file, while that is still on this phone
const fileInput = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/jpeg,image/png', hidden: true });

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const route = () => {
  const [, view = '', id = ''] = location.hash.replace(/\?.*$/, '').split('/');
  return { view: ({ g: 'group', s: 'slots', e: 'edit', p: 'preview', x: 'publish' } as Record<string, string>)[view] ?? 'list', id: decodeURIComponent(id) };
};
const aspect = (ratio: string) => (ratio === '4:3' ? 'aspect-[4/3]' : 'aspect-[3/4]');
const slotNow = (s: Slot) => draft.data.slots[s.key] ?? s.def;
const removed = (g: string, id: string) => draft.removed.includes(`${g}/${id}`);
const nameOf = (id: string) => state.labels.find((l) => l.key === draft.data.labels[id])?.name ?? state.photos[id]?.name ?? '';

function picture(id: string, cls = 'size-full object-cover') {
  const f = draft.focus[id] ?? { x: 0.5, y: 0.5 };
  const src = sources.get(id) ?? state.photos[id]?.thumb ?? '';
  return `<img src="${esc(src)}" alt="" draggable="false" class="${cls}" style="object-position:${Math.round(f.x * 100)}% ${Math.round(f.y * 100)}%">`;
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
function top(tab: 'groups' | 'slots') {
  const on = 'bg-surface-3 font-bold text-fg shadow-sm', off = 'font-medium text-muted';
  return `
    <header class="flex items-end justify-between">
      <div><p class="text-xs tracking-[0.12em] text-muted">${t.brand}</p><h1 class="font-sans text-[1.75rem] leading-tight font-bold">${t.title}</h1></div>
      <a href="/cdn-cgi/access/logout" class="inline-flex min-h-11 min-w-11 items-center justify-end text-sm text-muted">${t.logout}</a>
    </header>
    <nav class="mt-4 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1">
      <a data-tab="groups" href="#/" ${tab === 'groups' ? 'aria-current="page"' : ''} class="flex min-h-11 items-center justify-center rounded-full ${tab === 'groups' ? on : off}">${t.tabGroups}</a>
      <a data-tab="slots" href="#/s" ${tab === 'slots' ? 'aria-current="page"' : ''} class="flex min-h-11 items-center justify-center rounded-full ${tab === 'slots' ? on : off}">${t.tabSlots}</a>
    </nav>`;
}
function banner() {
  const n = changeCount(draft), p = draft.pending;
  const card = (cls: string, title: string, note: string, action = '') =>
    `<div class="flex items-center justify-between gap-3 rounded-card px-4 py-3 ${cls}"><p class="min-w-0"><span class="block font-bold">${title}</span>${note && `<span class="block text-sm opacity-90">${note}</span>`}</p>${action}</div>`;
  const parts = [
    stale && card('bg-danger/10 text-danger', t.stale, t.staleNote, `<button type="button" data-action="drop-reload" class="${pill} shrink-0 bg-surface-3 text-fg">${t.dropAndReload}</button>`),
    p?.state === 'building' && card('bg-surface text-fg shadow-sm', t.building, t.buildingNote),
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
/** Publishing is possible: there are changes, nobody else changed the site, and the last publish has finished building. */
const canPublish = () => changeCount(draft) > 0 && !stale && !building(draft);
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
  c.reordered.includes(g.id) || c.removed.some((m) => m.startsWith(`${g.id}/`)) || draft.data.groups[g.id].some((id) => c.added.includes(id) || c.relabelled.includes(id));
const cardPhotos = () => new Set(state.slots.filter((s) => s.section === 'cards').map(slotNow)); // the home portfolio does not repeat a lash card's photo
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
      <li><a data-group="${g.id}" href="#/g/${g.id}" class="flex min-h-16 items-center gap-3 px-3">
        <span class="size-11 shrink-0 overflow-hidden rounded-field bg-surface-2">${ids[0] ? picture(ids[0]) : ''}</span>
        <span class="min-w-0 flex-1"><span class="block font-medium">${esc(g.name)}</span><span class="block text-sm text-muted">${countText(g, ids)}</span></span>
        ${touched(g, c) ? `<span class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold whitespace-nowrap text-primary">${t.draftChip}</span>` : ''}
        <span class="shrink-0 text-muted">${icon(CHEVRON)}</span>
      </a></li>`;
  };
  const part = (id: Group['part']) => `
    <section class="mt-5">
      <h2 class="px-1 font-sans text-sm font-medium text-muted">${t.parts[id]}</h2>
      <ul class="mt-2 overflow-hidden rounded-card bg-surface shadow-sm">${state.groups.filter((g) => g.part === id).map(row).join('')}</ul>
    </section>`;
  return `<div data-view="list">${top('groups')}${banner()}${noticeBox()}${(['lashes', 'nails', 'brows'] as const).map(part).join('')}</div>`;
}

// ── One group: add, delete, restore, reorder ──
function groupView(g: Group) {
  const ids = draft.data.groups[g.id];
  const onCard = new Set(g.id === 'styled' ? state.slots.filter((s) => s.section === 'cards').map(slotNow) : []); // the home portfolio does not repeat a lash card's photo
  let shown = 0;
  const tile = (id: string, i: number) => {
    const gone = removed(g.id, id), isNew = unpublished(draft, id), video = state.photos[id]?.video, name = nameOf(id);
    if (!gone && !onCard.has(id)) shown++;
    const last = shown === g.visible && !gone && !onCard.has(id) && ids.slice(i + 1).some((x) => !removed(g.id, x) && !onCard.has(x));
    const chipCls = 'absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap';
    return `
      <li data-tile="${id}" class="relative touch-manipulation overflow-hidden rounded-field bg-surface-2 select-none [-webkit-touch-callout:none] data-[placeholder]:opacity-30 ${aspect(g.ratio)} ${isNew ? 'outline-3 -outline-offset-3 outline-primary' : ''}">
        ${picture(id, `size-full object-cover ${gone ? 'opacity-25 grayscale' : ''}`)}
        ${gone ? `
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span class="text-xs font-medium">${t.removedNote}</span>
            <button type="button" data-action="restore" class="${pill} gap-1.5 bg-surface-3 text-fg shadow-sm">${icon(UNDO)}${t.restore}</button>
          </div>` : `
          ${isNew ? `<span class="${chipCls} bg-primary text-on-primary">${t.isNew}</span>` : video ? `<span class="${chipCls} bg-fg/75 text-bg">${t.video}</span>` : onCard.has(id) ? `<span class="${chipCls} bg-fg/75 text-bg">${t.onCard}</span>` : ''}
          <div class="group-data-[dragging]/admin:hidden">
            ${name ? `<span class="absolute bottom-1.5 left-1.5 max-w-[55%] truncate rounded-full bg-fg/75 px-2 py-0.5 text-xs text-bg">${esc(name)}</span>` : ''}
            ${video ? '' : `<a data-action="edit" href="#/e/${id}?g=${g.id}" class="absolute right-0 bottom-0 flex min-h-11 min-w-11 items-end justify-end p-1.5"><span class="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-fg">${t.edit}</span></a>`}
            <button type="button" data-action="remove" aria-label="${t.remove(esc(name))}" class="absolute top-0 right-0 flex size-11 items-start justify-end p-1.5"><span class="flex size-6.5 items-center justify-center rounded-full bg-fg/75 text-bg">${icon(CROSS, 'size-3.5')}</span></button>
          </div>`}
      </li>
      ${last ? `<li aria-hidden="true" class="col-span-full flex items-center gap-2 py-1 text-xs text-muted"><span class="h-0.5 flex-1 rounded bg-fg/10"></span>${t.firstRow}<span class="h-0.5 flex-1 rounded bg-fg/10"></span></li>` : ''}`;
  };
  return `
    <div data-view="group">
      <a href="#/" class="inline-flex min-h-11 items-center gap-1 text-muted">${icon(BACK)}${t.back}</a>
      <h1 class="mt-1 font-sans text-2xl leading-tight font-bold">${esc(g.name)}</h1>
      <p class="mt-1 text-sm text-muted">${t.parts[g.part]} · ${countText(g, ids.filter((id) => !removed(g.id, id)))}${g.id === 'styled' ? ` · ${t.sharedOrder}` : ''}</p>
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
    return `
      <li data-slot="${s.key}" class="flex min-h-17 items-center gap-3 px-3 py-2 ${changed ? 'bg-primary/5' : ''}">
        <span class="w-14 shrink-0 overflow-hidden rounded-field bg-surface-2 ${aspect(s.ratio)} ${changed ? 'outline-3 -outline-offset-3 outline-primary' : ''}">${picture(slotNow(s))}</span>
        <span class="min-w-0 flex-1"><span class="block font-medium">${esc(s.section === 'hero' ? t.heroName : s.name)}</span>
          <span class="block text-sm ${changed ? 'font-bold text-primary' : 'text-muted'}">${changed ? t.replaced : t.ratio[s.ratio]}</span></span>
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

// ── Editor: drag the photo behind a frame of the fixed ratio; optional style name ──
/** Sizes on screen: the frame, the photo scaled to cover it, and how far the photo can move (spare). */
function layout() {
  const e = editing!, wide = e.ctx.ratio === '4:3';
  const stageW = root.clientWidth - 32; // the content width (px-4 on both sides)
  const fw = wide ? stageW : Math.round(stageW * 0.75), fh = Math.round(wide ? fw * 0.75 : (fw * 4) / 3);
  const scale = e.w ? Math.max(fw / e.w, fh / e.h) : 0;
  const dw = e.w ? e.w * scale : fw, dh = e.h ? e.h * scale : fh;
  const spareX = Math.max(0, Math.round(dw - fw)), spareY = Math.max(0, Math.round(dh - fh));
  const stageH = Math.min(Math.max(fh, Math.round(dh)), 460);
  return { fw, fh, dw, dh, spareX, spareY, stageH, left: (stageW - fw) / 2, top: (stageH - fh) / 2 };
}
/** Moves the photo to the editor's current position, without redrawing the screen (called while a finger drags). */
function placePhoto() {
  const e = editing!, l = layout();
  const img = root.querySelector<HTMLElement>('[data-photo]');
  if (img) Object.assign(img.style, { left: `${l.left - e.x * l.spareX}px`, top: `${l.top - e.y * l.spareY}px` });
  const readout = root.querySelector('[data-readout]');
  if (readout) readout.textContent = l.spareY ? t.posV(Math.round(e.y * 100)) : t.posH(Math.round(e.x * 100));
}
function editView() {
  const e = editing!, l = layout(), movable = l.spareX + l.spareY > 0;
  const inStyled = draft.data.groups.styled.includes(e.id);
  const options = state.labels.filter((x) => x.dir === e.ctx.dir && (inStyled ? x.styledOnly || x.key === 'option:lash-extensions/styled' : !x.styledOnly));
  const label = draft.data.labels[e.id] ?? '';
  const legacy = !label && state.photos[e.id]?.name;
  const line = 'absolute bg-surface-3/40';
  return `
    <div data-view="edit">
      <header class="flex items-center justify-between">
        <button type="button" data-action="cancel" class="${pill} -ml-4 font-medium text-muted">${t.cancel}</button>
        <h1 class="font-sans text-lg font-bold">${t.editTitle}</h1>
        <button type="button" data-action="done" class="${pill} bg-primary text-on-primary">${t.done}</button>
      </header>
      <div data-stage class="relative mt-3 overflow-hidden rounded-card bg-fg select-none ${movable ? 'cursor-grab touch-none' : ''}" style="height:${l.stageH}px">
        ${e.w
          ? `<img data-photo src="${esc(sources.get(e.id) ?? '')}" alt="" draggable="false" class="pointer-events-none absolute max-w-none" style="width:${l.dw}px;height:${l.dh}px">`
          : picture(e.id, 'pointer-events-none absolute object-cover').replace('style="', `style="left:${l.left}px;top:${l.top}px;width:${l.fw}px;height:${l.fh}px;`)}
        <div aria-hidden="true" class="pointer-events-none absolute rounded-[4px] shadow-[0_0_0_9999px_color-mix(in_oklch,var(--fg)_72%,transparent)] outline-2 outline-surface-3" style="left:${l.left}px;top:${l.top}px;width:${l.fw}px;height:${l.fh}px">
          <span class="${line} inset-y-0 left-1/3 w-px"></span><span class="${line} inset-y-0 left-2/3 w-px"></span>
          <span class="${line} inset-x-0 top-1/3 h-px"></span><span class="${line} inset-x-0 top-2/3 h-px"></span>
        </div>
        <span class="pointer-events-none absolute rounded-full bg-fg/75 px-2 py-0.5 text-xs whitespace-nowrap text-bg" style="left:${l.left + 8}px;top:${l.top + 8}px">${t.ratio[e.ctx.ratio]} · ${t.fixedRatio}</span>
      </div>
      ${movable ? `
        <p class="mt-2 text-center text-sm text-muted">${l.spareY ? t.dragV : t.dragH}</p>
        <div class="mt-3 flex items-center justify-between gap-3">
          <p><span data-readout class="block font-bold tabular-nums"></span><span class="block text-xs text-muted">${t.output(...OUT[e.ctx.ratio])}</span></p>
          <button type="button" data-action="recentre" class="${pill} bg-surface-2 text-fg">${t.recentre}</button>
        </div>` : `<p class="mt-3 text-sm text-muted">${e.w ? t.fits : t.locked}</p>`}
      <label for="look-name" class="mt-5 block font-bold">${t.labelTitle}</label>
      <select id="look-name" data-label class="mt-1.5 h-12 w-full rounded-field bg-surface-3 px-3 text-base shadow-sm outline-1 outline-primary/20">
        <option value="">${t.labelNone}</option>
        ${options.map((o) => `<option value="${o.key}" ${o.key === label ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}
      </select>
      <p class="mt-1.5 text-xs leading-relaxed text-muted">${legacy ? `${t.currentName(esc(legacy))}。` : ''}${inStyled ? t.labelShown : t.labelHidden}</p>
    </div>`;
}
/** Opens the editor for the photo in the address (#/e/<id>?g=<group> or ?s=<place>); reads the source's size first. */
async function openEditor(id: string) {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const ctx = state.slots.find((s) => s.key === q.get('s')) ?? state.groups.find((g) => g.id === q.get('g'));
  const known = ctx && ('key' in ctx ? slotNow(ctx) === id : draft.data.groups[ctx.id].includes(id));
  if (!known) { location.hash = '#/'; return; }
  const next: NonNullable<typeof editing> = { id, ...(draft.focus[id] ?? { x: 0.5, y: 0.5 }), w: 0, h: 0, back: 'key' in ctx ? '#/s' : `#/g/${ctx.id}`, ctx };
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
    let next = setLabel(draft, e.id, root.querySelector<HTMLSelectElement>('select[data-label]')!.value);
    if (e.w) next = setFocus(next, e.id, Math.round(e.x * 100) / 100, Math.round(e.y * 100) / 100);
    save(next);
  }
  location.hash = e.back;
}
function grabbed(ev: PointerEvent) {
  const stage = (ev.target as Element).closest<HTMLElement>('[data-stage]');
  if (!stage || !editing?.w || !ev.isPrimary) return;
  editing.grab = { px: ev.clientX, py: ev.clientY, x: editing.x, y: editing.y };
  stage.setPointerCapture(ev.pointerId);
}
function dragged(ev: PointerEvent) {
  const e = editing, g = e?.grab;
  if (!e || !g) return;
  const l = layout(), clamp = (n: number) => Math.min(1, Math.max(0, n));
  // the photo follows the finger: pulling it down brings its top into the frame
  if (l.spareX) e.x = clamp(g.x - (ev.clientX - g.px) / l.spareX);
  if (l.spareY) e.y = clamp(g.y - (ev.clientY - g.py) / l.spareY);
  placePhoto();
}

// ── Preview: the draft in the site's phone layout ──
function previewView() {
  const c = changes(draft), cards = cardPhotos();
  const kept = (g: Group) => draft.data.groups[g.id].filter((id) => !removed(g.id, id));
  const head = (text: string) => `<h2 class="font-sans text-sm font-medium text-muted">${text}</h2>`;
  const home = (g: Group) => {
    const ids = kept(g).filter((id) => g.id !== 'styled' || !cards.has(id));
    return `
      <section class="mt-6">${head(t.previewHome(esc(g.name)))}
        <div class="mt-2 rounded-card bg-surface-2 p-3">
          <ul data-preview-group="${g.id}" class="grid gap-2 ${g.cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}">
            ${ids.slice(0, g.visible).map((id) => `<li data-photo-id="${id}" class="overflow-hidden rounded-field bg-fg/5 ${aspect(g.ratio)}">${picture(id)}</li>`).join('')}
          </ul>
          ${ids.length > g.visible ? `<p class="mt-3 text-center"><span class="inline-block rounded-full bg-surface px-4 py-2 text-sm font-medium shadow-sm">${t.showAll(ids.length)}</span></p>` : ''}
        </div>
      </section>`;
  };
  const styled = state.groups.find((g) => g.id === 'styled')!;
  const lashPage = () => `
    <section class="mt-6">${head(t.previewPage)}
      <ul data-preview-page="styled" class="mt-2 grid grid-cols-2 gap-3">
        ${kept(styled).map((id) => `<li data-photo-id="${id}" class="overflow-hidden rounded-card bg-surface shadow-sm"><div class="aspect-[4/3]">${picture(id)}</div>${nameOf(id) ? `<p class="p-3 text-sm font-medium">${esc(nameOf(id))}</p>` : ''}</li>`).join('')}
      </ul>
    </section>`;
  const place = (s: Slot) => `
    <section class="mt-6">${head(t.previewSlot(slotTitle(s)))}
      <figure data-preview-slot="${s.key}" class="mx-auto mt-2 overflow-hidden rounded-card bg-surface-2 ${s.ratio === '4:3' ? 'w-full' : 'w-2/3'} ${aspect(s.ratio)}">${picture(slotNow(s))}</figure>
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
  const groupName = (id: string) => esc(state.groups.find((g) => g.id === id)?.name ?? '');
  const row = (photo: string | undefined, title: string, note: string, grey = false) => `
    <li data-change class="flex min-h-16 items-center gap-3 px-3 py-2">
      <span class="aspect-[4/3] w-14 shrink-0 overflow-hidden rounded-field bg-surface-2">${photo ? picture(photo, `size-full object-cover ${grey ? 'opacity-50 grayscale' : ''}`) : ''}</span>
      <span class="min-w-0"><span class="block font-bold">${title}</span><span class="block text-sm text-muted">${note}</span></span>
    </li>`;
  const rows = [
    ...c.added.map((id) => row(id, t.chAdded, groupName(state.groups.find((g) => draft.data.groups[g.id].includes(id))?.id ?? ''))),
    ...c.removed.map((m) => { const [g, id] = [m.slice(0, m.indexOf('/')), m.slice(m.indexOf('/') + 1)]; return row(id, t.chRemoved, `${groupName(g)}${nameOf(id) ? `「${esc(nameOf(id))}」` : ''}`, true); }),
    ...c.reordered.map((g) => row(draft.data.groups[g].find((id) => !removed(g, id)), t.chReordered, groupName(g))),
    ...state.slots.filter((s) => c.replaced.includes(s.key)).map((s) => row(slotNow(s), t.chReplaced, slotTitle(s))),
    ...c.relabelled.map((id) => row(id, t.chRelabelled, esc(nameOf(id)) || t.labelNone)),
  ];
  const ready = canPublish() && !busy;
  return `
    <div data-view="publish">
      <a href="${esc(lastEdit)}" class="inline-flex min-h-11 items-center gap-1 text-muted">${icon(BACK)}${t.backToEdit}</a>
      <h1 class="mt-1 font-sans text-2xl leading-tight font-bold">${t.publishTitle(n)}</h1>
      ${stale ? banner() : ''}${noticeBox()}
      <ul class="mt-4 overflow-hidden rounded-card bg-surface shadow-sm">${rows.join('')}</ul>
      <p class="mt-3 text-sm text-muted">${building(draft) ? t.waitBuild : t.publishNote}</p>
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
      const res = await post('/api/admin/blob', await renderJpeg(source, data.uploads[id].ratio, sent.focus[id] ?? { x: 0.5, y: 0.5 }));
      if (!res.ok) return refused(res.status);
      blobs[id] = (await res.json()).sha;
    }
    busy = t.sending; render();
    const res = await post('/api/admin/publish', JSON.stringify({ base: sent.base, data, blobs }));
    if (!res.ok) return refused(res.status);
    const done = await res.json();
    busy = '';
    save(afterPublish(sent, done.commit, done.base)); // the sources stay on the phone until the rebuilt site shows these photos
    location.hash = '#/';
    void poll();
  } catch {
    refused(0); // offline, or the photo could not be prepared
  }
}
/** Asks whether the last publish is live yet; again every 20 s while it is building and the page is in front. */
async function poll(rerun = false) {
  clearTimeout(pollTimer);
  const p = draft.pending;
  if (!p || document.hidden || (p.state !== 'building' && !rerun)) return;
  try {
    const res = signedIn(await fetch(`/api/admin/status?commit=${p.commit}`, { method: rerun ? 'POST' : 'GET', cache: 'no-store', redirect: 'manual' }));
    if (res.status === 401 && route().view !== 'edit') say(t.signedOut);
    const now = res.ok ? (await res.json()).state : undefined;
    if (now && draft.pending?.commit === p.commit && now !== draft.pending.state) {
      save({ ...draft, pending: { ...draft.pending, state: now } });
      if (route().view !== 'edit') render();
    }
  } catch { /* offline: ask again later */ }
  if (draft.pending?.state === 'building') pollTimer = window.setTimeout(poll, 20_000);
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
  root.innerHTML = r.view === 'group' && group ? groupView(group) : r.view === 'slots' ? slotsView() : listView();
}

async function picked() {
  const file = fileInput.files?.[0];
  const { group, slot } = picking;
  fileInput.value = ''; picking = {}; notice = '';
  if (!file || (!group && !slot)) return;
  if (file.size > MAX_SOURCE_BYTES) return say(t.tooBig);
  const url = URL.createObjectURL(file);
  try {
    await Object.assign(new Image(), { src: url }).decode(); // can this phone's browser read it?
  } catch {
    URL.revokeObjectURL(url);
    return say(t.unreadable);
  }
  const id = newId();
  await kv.set(`src:${id}`, file).catch(() => { kv.persistent = false; });
  sources.set(id, url);
  if (group) return commit(addToGroup(draft, group.id, id, { dir: group.dir, ratio: group.ratio, where: group.id }));
  const old = draft.data.slots[slot!.key];
  if (old && unpublished(draft, old)) forgetSource(old);
  commit(replaceSlot(draft, slot!.key, id, { dir: slot!.dir, ratio: slot!.ratio, where: slot!.key }));
}

function clicked(e: MouseEvent) {
  const el = (e.target as Element).closest<HTMLElement>('[data-action]');
  if (!el || busy) return;
  const groupId = route().id;
  const tile = el.closest<HTMLElement>('[data-tile]')?.dataset.tile;
  const slot = state.slots.find((s) => s.key === el.closest<HTMLElement>('[data-slot]')?.dataset.slot);
  switch (el.dataset.action) {
    case 'add': picking = { group: state.groups.find((g) => g.id === groupId) }; fileInput.click(); break;
    case 'replace': picking = { slot }; fileInput.click(); break;
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
    case 'done': closeEditor(true); break;
    case 'cancel': closeEditor(false); break;
    case 'recentre': if (editing) { editing.x = editing.y = 0.5; placePhoto(); } break;
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
  for (const end of ['pointerup', 'pointercancel'] as const) root.addEventListener(end, () => { if (editing) delete editing.grab; });
  sortable(root, '[data-tile]', (from, to) => commit(move(draft, route().id, from, to)));
  addEventListener('hashchange', () => { notice = ''; render(); scrollTo(0, 0); });
  render();
}
