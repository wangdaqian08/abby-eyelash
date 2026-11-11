// Booking flow (vanilla TS): 1 Services (one or more, back to back) → 2 Date → 3 Time → 4 Details → 5 Send.
// Nothing is booked here: step 5 hands the customer a pre-filled SMS/WhatsApp to Abby (src/lib/booking-message.ts).
import { addonOptions, bookable, bookableWith, groupAt, headline, itemsParam, mainOptions, priceText, quoteAll, quoteAllText, services, wasText, type Addons, type Lang, type Service, type ServiceOption } from '../../data/services';
import { site } from '../../data/site';
import { bookingStrings } from '../../i18n/booking';
import { daysInMonth, localDate, maxDate, validateDetails, weekday, zonedTimeToUtc, type Details } from '../../lib/availability';
import { smsHref, waTextHref } from '../../lib/booking-message';
import { aliasHant, convertWith } from '../../lib/hant';
import { INTL, localePath } from '../../lib/i18n';
import { bookingText } from './booking-text';

type Days = Record<string, string[]>;
type Month = { days: Days };
type Step = 1 | 2 | 3 | 4 | 5;
type Field = keyof Details | 'service' | 'option' | 'time' | 'deposit';
type Chosen = { service: Service; option?: ServiceOption; addons: Addons }; // one ticked service

const TZ = site.timezone;
const phoneHref = `sms:${site.phone.replace(/\s/g, '')}`; // Abby takes texts/WhatsApp, not calls

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
const svg = (paths: string, cls = 'size-5') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const ICON = {
  service: svg('<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/>'),
  date: svg('<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  time: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  details: svg('<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>'),
  send: svg('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'),
  prev: svg('<path d="m15 18-6-6 6-6"/>'),
  next: svg('<path d="m9 18 6-6-6-6"/>'),
  alert: svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>', 'size-[1em] shrink-0 translate-y-[0.125em]'),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 'size-6'),
  chevron: svg('<path d="m6 9 6 6 6-6"/>', 'pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted'),
  tick: svg('<path d="M20 6 9 17l-5-5"/>', 'size-3.5'),
};
const STEP_ICONS = [ICON.service, ICON.date, ICON.time, ICON.details, ICON.send];

const LB = document.documentElement.dataset.look === 'B'; // look B markup (lib/ab-test.ts); the page sets data-look on <html>
const BTN = LB
  ? 'press inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-medium uppercase disabled:cursor-not-allowed disabled:opacity-50'
  : 'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-medium uppercase transition duration-200 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50';
const BTN_PRIMARY = LB ? `${BTN} btn-solid` : `${BTN} btn-raise bg-primary text-on-primary hover:bg-primary/90`;
const BTN_OUTLINE = LB ? `${BTN} btn-tinted` : `${BTN} btn-soft border border-primary/30 text-primary hover:bg-surface-2`;
const INPUT = 'block h-12 w-full appearance-none rounded-field bg-surface-2 px-4 text-base text-fg placeholder:text-muted aria-invalid:outline-2 aria-invalid:outline-danger';

export function start(root: HTMLElement) {
  const cfg = JSON.parse(root.dataset.config!) as { lang: Lang; hant?: string[] };
  const lang = cfg.lang;
  if (cfg.hant) aliasHant(bookingText, convertWith(bookingText, cfg.hant));
  const t = bookingStrings[lang];
  const locale = INTL[lang];
  const tracking = lang === 'en' ? ' text-xs tracking-[0.2em]' : ' text-sm'; // no tracking on CJK
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const view = $('[data-view]')!;
  const mobile = matchMedia('(max-width: 1023px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const PRESS_MS = 140; // how long a tap's press stays visible before a button swaps the view

  const st: {
    step: Step;
    items: Chosen[]; // in menu order
    month: string;
    date?: string;
    time?: string;
    focus?: string; // keyboard focus within the calendar grid
    details: Details;
    started: boolean;
    deposit: boolean; // ticks survive going back from step 5 to change details
    photos: boolean;
    link?: { key: string; code?: string }; // short calendar link for the current details (reused while they don't change)
  } = { step: 1, items: [], month: localDate(Date.now(), TZ).slice(0, 7), details: { name: '', phone: '', notes: '' }, started: false, deposit: false, photos: false };

  const cache = new Map<string, Month | 'loading' | 'error'>();
  const itemOf = (id: string) => st.items.find((i) => i.service.id === id);
  // An add-on that can be booked on its own (lash removal), ticked while no main option is chosen.
  const alone = (i: Chosen) => addonOptions(i.service).find((o) => o.alone && i.addons[o.id]);
  const ready = () => st.items.length > 0 && st.items.every((i) => i.option || alone(i));
  const asItems = () =>
    st.items.map((i) => (i.option ? { service: i.service.id, option: i.option.id, addons: i.addons } : { service: i.service.id, option: alone(i)!.id, addons: {} }));
  const key = (m = st.month) => `${itemsParam(asItems())}/${m}`;
  const total = () => quoteAll(asItems())!; // the UI only offers valid combinations
  let gridFocusPending = false;

  // --- formatting ---
  const fmtDate = (date: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o }).format(new Date(`${date}T12:00:00Z`));
  // 12-hour clock: "上午10:00" / "下午4:00" (same characters in Simplified and Traditional), "10:00 AM" / "4:00 PM" in English.
  const fmtTime = (date: string, time: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: TZ, hour: 'numeric', minute: '2-digit', hourCycle: 'h12' }).format(zonedTimeToUtc(date, time, TZ)).toUpperCase();
  const price = (o: Parameters<typeof priceText>[0] & { wasPrice?: number }) =>
    priceText(o, lang) + (o.wasPrice ? wasText(o.wasPrice, lang) : '');
  // Booking total: dollar part summed, then what isn't a dollar amount, e.g. "$80 + Price on request + $24".
  const totalPrice = (q: ReturnType<typeof total>) => quoteAllText(q, lang);
  const label = (l: Lang = lang) =>
    total()
      .items.flatMap((q) => [`${q.service.name[l]} · ${q.option.name[l]}`, ...q.extras.map((e) => `${e.option.name[l]}${e.units > 1 ? ` × ${e.units}` : ''}`)])
      .join(' + ');
  const mins = (n: number) => fill(t.minutes, { n });
  const shortDate = (d: string) => fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const announce = (msg: string) => ($('[data-live]')!.textContent = msg);
  const showDemo = () => Object.assign($('[data-demo]')!, { hidden: false, textContent: t.demo });
  const emit = (name: string, detail: Record<string, unknown>) => window.dispatchEvent(new CustomEvent(name, { detail }));

  // --- availability ---
  async function load(month = st.month, force = false) {
    const k = key(month);
    if (!force && cache.has(k) && cache.get(k) !== 'error') return;
    cache.set(k, 'loading');
    try {
      const q = new URLSearchParams({ items: itemsParam(asItems()), month });
      const r = await fetch(`/api/availability?${q}`, force ? { cache: 'reload' } : {});
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as Month & { demo?: boolean };
      cache.set(k, { days: j.days });
      if (j.demo) showDemo();
    } catch {
      cache.set(k, 'error');
    }
    if (k === key() && (st.step === 2 || st.step === 3)) render();
  }
  const daysFor = (m = st.month) => {
    const d = cache.get(key(m));
    return typeof d === 'object' ? d.days : undefined;
  };

  // --- rail stepper (desktop) + progress bar (mobile) ---
  // railFrom → railTo is the last step change: only the dots and lines it touched animate (global.css "Booking rail").
  let railFrom = st.step, railTo = st.step, railHtml = '', barHtml = '';
  function renderChrome() {
    if (st.step !== railTo) [railFrom, railTo] = [railTo, st.step];
    const changed = (n: number) => (n > railFrom && n <= railTo ? 'fill' : n > railTo && n <= railFrom ? 'empty' : '');
    // --k orders the steps a change touches: forward top-down, back bottom-up, so a long jump runs as one wave.
    const k = (n: number) => (changed(n) ? `style="--k:${railTo > railFrom ? n - railFrom - 1 : railFrom - n}"` : '');
    const values = [
      ready() && label(),
      st.date && shortDate(st.date),
      st.date && st.time && fmtTime(st.date, st.time),
      st.step === 5 ? st.details.name.trim() : undefined,
    ];
    const rail = t.steps
      .map((label, i) => {
        const n = i + 1;
        const done = n < st.step;
        const current = n === st.step;
        const text = done && values[i] ? values[i]! : label;
        const inner = `<span data-dot ${k(n)} class="flex size-9 shrink-0 items-center justify-center rounded-full border transition-shadow duration-300 ${done || current ? 'border-primary bg-primary text-on-primary' : 'border-border text-muted'} ${current ? 'ring-4 ring-primary/15' : ''} ${changed(n) && `rail-dot-${changed(n)}`}">${STEP_ICONS[i]}</span>
          <span class="text-sm ${done ? 'font-medium text-primary' : current ? 'text-fg' : 'text-muted'}">${esc(text)}</span>`;
        return `<li ${current ? 'aria-current="step"' : ''}>
          ${i ? `<span aria-hidden="true" class="relative ml-[17px] block h-7 border-l border-dashed border-muted/40"><span ${k(n)} class="rail-line ${n <= st.step ? 'is-on' : ''} ${changed(n) && `rail-line-${changed(n)}`}"></span></span>` : ''}
          ${current ? `<p class="mb-1 flex items-center gap-2 text-xs font-medium text-primary"><span class="size-2 rounded-full bg-primary"></span>${fill(t.stepN, { n })}</p><p class="mb-3 text-sm text-fg">${t.prompts[i]}</p>` : ''}
          ${
            done
              ? `<button type="button" data-goto="${n}" aria-label="${esc(fill(t.editStep, { step: label }))}: ${esc(text)}" class="flex min-h-11 w-full items-center gap-3 text-left hover:opacity-80">${inner}</button>`
              : `<div class="flex min-h-11 items-center gap-3">${inner}</div>`
          }
        </li>`;
      })
      .join('');
    if (rail !== railHtml) $('[data-stepper]')!.innerHTML = railHtml = rail; // unchanged re-renders (slots loading, typing) must not restart the fill

    const bar = `<div class="mb-3 flex min-h-11 items-center justify-between gap-4">
        ${st.step > 1 ? `<button type="button" data-action="back" class="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted hover:text-fg">${ICON.prev}${t.back}</button>` : '<span></span>'}
        <span class="text-xs text-muted">${fill(t.stepOf, { n: st.step })} · ${t.steps[st.step - 1]}</span>
      </div>
      <ol class="mb-8 flex items-center" aria-hidden="true">${[1, 2, 3, 4, 5]
        .map(
          (n) =>
            `${n > 1 ? `<li class="relative h-px flex-1 bg-border"><span ${k(n)} class="bar-line ${n <= st.step ? 'is-on' : ''} ${changed(n) && `bar-line-${changed(n)}`}"></span></li>` : ''}<li data-dot ${k(n)} class="size-2.5 rounded-full ${n <= st.step ? 'bg-primary' : 'border border-muted/50'} ${changed(n) && `rail-dot-${changed(n)}`}"></li>`,
        )
        .join('')}</ol>`;
    if (bar !== barHtml) $('[data-progress]')!.innerHTML = barHtml = bar; // same rule as the rail: redraw only on change
  }

  // --- step 1 ---
  function serviceView() {
    const card = (s: Service) => {
      const h = headline(s);
      const range = h.minutes![0] === h.minutes![1] ? mins(h.minutes![0]) : `${h.minutes![0]}–${mins(h.minutes![1])}`;
      const on = !!itemOf(s.id);
      return `<label class="${LB ? `press no-hover relative flex min-h-16 items-center gap-3 rounded-[1.25rem] bg-surface-2 p-4 transition-colors duration-200 has-checked:bg-primary/8 has-checked:ring-2 has-checked:ring-inset has-checked:ring-primary/60 has-focus-visible:focus-ring` : `relative flex min-h-16 items-center gap-3 rounded-card bg-surface-2/60 p-4 transition duration-200 active:scale-[.98] has-checked:bg-surface-2 has-checked:shadow-[var(--shadow-soft)] has-checked:ring-2 has-checked:ring-inset has-checked:ring-primary/50 has-focus-visible:focus-ring`}">
        <input type="checkbox" name="bk-service" value="${s.id}" class="sr-only" ${on ? 'checked' : ''}>
        <span aria-hidden="true" data-tick class="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${on ? 'bg-primary text-on-primary' : 'ring-1 ring-inset ring-muted/50'}">${on ? ICON.tick : ''}</span>
        <span><span class="block font-medium">${s.name[lang]}</span><span class="text-sm text-muted">${range} · ${price(h)}</span></span>
      </label>`;
    };
    // Per ticked service: its options (skipped when there is only one) and its add-ons.
    const choices = (it: Chosen) => {
      const s = it.service;
      const main = mainOptions(s);
      if (main.length === 1) return addonsView(it, `${s.name[lang]} · ${t.addons}`);
      return `<fieldset class="mt-8"><legend class="font-serif text-xl">${s.name[lang]}<span class="mt-0.5 block font-sans text-sm text-muted">${t.chooseOption}</span></legend>
          <div class="mt-3 divide-y divide-border border-y border-border">${main
            .map(
              (o, i, all) => `${groupAt(all, i) ? `<p class="px-1 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-accent-ink">${groupAt(all, i)![lang]}</p>` : ''}<label class="${LB ? `relative flex min-h-14 items-center justify-between gap-4 px-1 py-3 has-focus-visible:outline-2 has-focus-visible:outline-ring` : `flex min-h-14 items-center justify-between gap-4 px-1 py-3 has-focus-visible:outline-2 has-focus-visible:outline-ring`}">
                <span class="flex items-center gap-3"><span data-radio><input type="radio" name="bk-option-${s.id}" value="${o.id}" class="size-4 accent-primary" ${o === it.option ? 'checked' : ''}></span><span>${o.name[lang]}</span></span>
                <span class="shrink-0 text-right text-sm text-muted"><span class="block whitespace-nowrap text-fg">${price(o)}</span><span class="whitespace-nowrap">${mins(o.minutes)}</span></span>
              </label>`,
            )
            .join('')}</div></fieldset>${addonsView(it, t.addons)}`;
    };
    const together = st.items.length > 1 && ready() ? `<p class="mt-8 rounded-card bg-surface-2 px-4 py-3 text-sm"><span class="font-medium">${t.together}</span> ${mins(total().minutes)} · ${esc(totalPrice(total()))}</p>` : '';
    return `<h2 data-focus tabindex="-1" class="text-2xl outline-none sm:text-3xl">${t.chooseService}</h2>
      <p class="mt-2 text-muted">${t.multiHint}</p>
      <fieldset class="mt-6"><legend class="sr-only">${t.chooseService}</legend>
        <div class="grid gap-3 sm:grid-cols-2">${bookable().map(card).join('')}</div>
      </fieldset>
      ${st.items.map(choices).join('')}
      ${together}
      <button type="button" data-action="to-date" class="${BTN_PRIMARY}${tracking} mt-8 w-full sm:w-auto" ${ready() ? '' : 'disabled'}>${t.continue}</button>`;
  }

  // Add-ons for one ticked service: either/or groups as radios (with "none"), per-unit add-ons as a 0..max select.
  function addonsView(it: Chosen, legend: string) {
    const s = it.service;
    // no main option yet: only what can be booked alone; infill: no removal
    const list = addonOptions(s).filter((o) => (it.option ? !(it.option.noRemoval && o.id === 'removal') : o.alone));
    if (!list.length) return '';
    const row = 'flex min-h-14 items-center justify-between gap-4 px-1 py-3 has-focus-visible:outline-2 has-focus-visible:outline-ring';
    const meta = (o: ServiceOption, p: string) =>
      `<span class="shrink-0 text-right text-sm text-muted"><span class="block whitespace-nowrap text-fg">${p}</span><span class="whitespace-nowrap">+${mins(o.minutes)}${o.unit ? ` / ${o.unit[lang]}` : ''}</span></span>`;
    const groups = [...new Set(list.map((o) => o.group ?? o.id))];
    const blocks = groups.map((g, gi) => {
      const opts = list.filter((o) => (o.group ?? o.id) === g);
      const one = opts[0];
      if (one.max && one.max > 1) {
        const n = it.addons[one.id] ?? 0;
        return `<label class="${row}"><span>${one.name[lang]}</span>
          <span class="flex items-center gap-3">${meta(one, price(one))}
            <span class="relative"><select name="bk-units" data-service="${s.id}" data-addon="${one.id}" class="${INPUT} w-20 pr-8">${Array.from({ length: one.max + 1 }, (_, i) => `<option value="${i}" ${i === n ? 'selected' : ''}>${i}</option>`).join('')}</select>${ICON.chevron}</span></span></label>`;
      }
      const name = `bk-addon-${s.id}-${gi}`;
      const chosen = opts.find((o) => it.addons[o.id]);
      return `${one.group ? `<p class="px-1 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-accent-ink">${one.group[lang]}</p>` : ''}
        <label class="${row}"><span class="flex items-center gap-3"><span data-radio><input type="radio" name="${name}" data-service="${s.id}" value="" class="size-4 accent-primary" ${chosen ? '' : 'checked'}></span><span>${t.noAddon}</span></span></label>
        ${opts.map((o) => `<label class="${row}"><span class="flex items-center gap-3"><span data-radio><input type="radio" name="${name}" data-service="${s.id}" value="${o.id}" class="size-4 accent-primary" ${o === chosen ? 'checked' : ''}></span><span>${o.name[lang]}</span></span>${meta(o, price(o))}</label>`).join('')}`;
    });
    return `<fieldset class="mt-8"><legend class="font-serif text-xl">${legend}</legend>
      <div class="mt-3 divide-y divide-border border-y border-border">${blocks.join('')}</div></fieldset>`;
  }

  // --- steps 2 + 3 (side by side on desktop) ---
  function calendarView() {
    const today = localDate(Date.now(), TZ);
    const last = maxDate(Date.now(), site);
    const data = cache.get(key());
    const days = daysFor();
    const dates = daysInMonth(st.month);
    const inMonth = (d?: string) => d && d.startsWith(st.month);
    const tabbable =
      [st.focus, st.date].find(inMonth) ?? dates.find((d) => days && d in days) ?? (inMonth(today) ? today : dates[0]);
    const mondayFirst = (d: string) => (weekday(d) + 6) % 7;
    const wd = Array.from({ length: 7 }, (_, i) => fmtDate(`2026-11-0${2 + i}`, { weekday: lang !== 'en' ? 'narrow' : 'short' }));
    const cells: string[] = Array(mondayFirst(dates[0])).fill('<span role="gridcell"></span>');
    for (const d of dates) {
      if (!days) {
        cells.push('<span role="gridcell" class="flex justify-center"><span class="size-11 rounded-full bg-surface-2 motion-safe:animate-pulse"></span></span>');
        continue;
      }
      const avail = d in days;
      const sel = d === st.date;
      const cls = sel
        ? (LB ? 'bg-primary font-semibold text-on-primary shadow-[0_6px_14px_-6px_var(--primary)]' : 'bg-primary text-on-primary')
        : avail
          ? (LB ? 'press bg-surface-2 font-medium text-fg' : 'bg-surface-2 font-medium text-fg hover:bg-primary hover:text-on-primary')
          : 'cursor-default text-muted/60';
      const label = `${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${avail ? t.available : t.unavailable}${d === today ? `, ${t.today}` : ''}`;
      cells.push(`<span role="gridcell" class="flex justify-center" ${sel ? 'aria-selected="true"' : ''}>
        <button type="button" data-date="${d}" tabindex="${d === tabbable ? 0 : -1}" aria-label="${esc(label)}" ${avail ? '' : 'aria-disabled="true"'} class="${LB ? `relative flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm ${cls}` : `relative flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm transition-colors duration-200 ${cls}`}">
          ${+d.slice(8)}${d === today ? '<span aria-hidden="true" class="absolute bottom-1 size-1 rounded-full bg-current"></span>' : ''}
        </button></span>`);
    }
    while (cells.length % 7) cells.push('<span role="gridcell"></span>');
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(`<div role="row" class="grid grid-cols-7 gap-x-1.5">${cells.slice(i, i + 7).join('')}</div>`);

    const navBtn = (dir: 'prev' | 'next', disabled: boolean) =>
      `<button type="button" data-action="${dir}" aria-label="${dir === 'prev' ? t.prevMonth : t.nextMonth}" ${disabled ? 'disabled' : ''} class="${LB ? `press flex size-11 items-center justify-center rounded-full ${disabled ? 'cursor-not-allowed bg-surface-2 text-muted/60' : 'btn-tinted'}` : `flex size-11 items-center justify-center rounded-full transition-colors duration-200 ${disabled ? 'cursor-not-allowed bg-surface-2 text-muted/60' : 'bg-primary text-on-primary hover:bg-primary/90'}`}">${ICON[dir]}</button>`;

    const body =
      data === 'error'
        ? `<div role="alert" class="mt-8 rounded-card bg-surface-2 p-6 text-sm">
            <p class="font-medium">${t.loadError}</p>
            <button type="button" data-action="retry" class="${BTN_OUTLINE}${tracking} mt-4">${t.retry}</button>
            <p class="mt-4 text-muted">${t.callFallback} <a class="whitespace-nowrap text-fg underline underline-offset-4" href="${phoneHref}">${site.phoneDisplay}</a></p>
          </div>`
        : `<div role="grid" data-grid aria-labelledby="bk-month" ${days ? '' : 'aria-busy="true"'} class="mt-6 -mx-2 space-y-2.5 sm:mx-0">
            <div role="row" class="grid grid-cols-7 gap-x-1.5 text-center text-xs text-muted">${wd.map((w) => `<span role="columnheader" class="py-2">${w}</span>`).join('')}</div>
            ${rows.join('')}
          </div>${days ? '' : `<p class="sr-only">${t.loading}</p>`}`;

    return `<div class="mx-auto max-w-md">
      <div class="flex items-center justify-between gap-4 sm:justify-center sm:gap-8">
        ${navBtn('prev', st.month <= today.slice(0, 7))}
        <h2 id="bk-month" data-focus tabindex="-1" class="min-w-40 text-center font-sans text-xl font-normal outline-none" aria-live="polite">${fmtDate(`${st.month}-01`, { month: 'long', year: 'numeric' })}</h2>
        ${navBtn('next', st.month >= last.slice(0, 7))}
      </div>
      ${body}
    </div>`;
  }

  function slotsView() {
    if (!st.date) return `<p class="text-sm text-muted lg:pt-3">${t.pickDateHint}</p>`;
    const list = daysFor(st.date.slice(0, 7))?.[st.date] ?? [];
    const items = list
      .map((time) => {
        const label = fmtTime(st.date!, time);
        return time === st.time
          ? `<li class="grid grid-cols-2 gap-2"><span${LB ? ' data-pop' : ''} class="${LB ? `relative flex h-12 items-center justify-center rounded-full bg-primary/8 font-medium text-primary ring-2 ring-inset ring-primary/60` : `flex h-12 items-center justify-center rounded-field bg-muted tabular-nums text-on-primary`}">${label}</span>
              <button type="button" data-action="to-details" aria-label="${t.next}: ${label}" class="${LB ? `btn-solid press h-12 rounded-full font-medium` : `btn-raise h-12 rounded-field bg-primary font-medium text-on-primary transition duration-200 hover:bg-primary/90 active:scale-[.97]`}">${t.next}</button></li>`
          : `<li><button type="button" data-time="${time}" class="${LB ? `press flex h-12 w-full items-center justify-center rounded-full bg-surface-2 px-3 text-fg tabular-nums` : `flex h-12 w-full items-center justify-center rounded-field bg-surface-2/70 px-3 tabular-nums text-muted transition duration-200 hover:bg-surface-2 hover:text-fg active:scale-[.97]`} whitespace-nowrap">${label}</button></li>`;
      })
      .join('');
    return `<h3 data-slots-heading tabindex="-1" class="font-sans text-base font-normal outline-none">${fmtDate(st.date, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
      ${list.length ? `<ul class="mt-4 grid gap-3 lg:-mr-4 lg:max-h-[420px] lg:overflow-y-auto lg:pr-4 lg:[scrollbar-width:thin]">${items}</ul>` : `<p class="mt-4 text-sm text-muted">${t.noSlots}</p>`}`;
  }

  // --- step 4 ---
  const summary = () => {
    const q = total();
    const rows: [string, string][] = [
      [t.fService, label()],
      [t.sDate, fmtDate(st.date!, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
      [t.sTime, fmtTime(st.date!, st.time!)],
      [t.sDuration, mins(q.minutes)],
      [t.sPrice, totalPrice(q)],
      [t.sDeposit, `$${q.deposit}`],
    ];
    return `<dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 bg-surface-2 p-5 text-sm">${rows
      .map(([k, v]) => `<dt class="text-muted">${k}</dt><dd>${esc(v)}</dd>`)
      .join('')}</dl>`;
  };

  function detailsView() {
    const field = (k: Field, label: string, control: string, required = true) =>
      `<div><label for="bk-${k}" class="mb-1.5 block text-sm font-medium">${label}${required ? ' <span aria-hidden="true" class="text-danger">*</span>' : ` <span class="font-normal text-muted">${t.optional}</span>`}</label>
        ${control}<p id="bk-${k}-err" class="mt-1.5 flex items-start gap-1.5 text-sm text-danger" hidden></p></div>`;
    // Unticked by default. Deposit terms are required; photo consent stays optional (consent can't be a condition of booking).
    const agree = (k: string, text: string, required: boolean) =>
      `<div><label class="flex cursor-pointer items-start gap-3"><input type="checkbox" id="bk-${k}" name="${k}" ${st[k as 'deposit' | 'photos'] ? 'checked' : ''} ${required ? 'required aria-describedby="bk-' + k + '-err"' : ''} class="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)] aria-invalid:outline-2 aria-invalid:outline-danger">
        <span class="${required ? '' : 'text-muted'}">${esc(text)}${required ? ' <span aria-hidden="true" class="text-danger">*</span>' : ''}</span></label>
        ${required ? `<p id="bk-${k}-err" class="mt-1.5 flex items-start gap-1.5 text-sm text-danger" hidden></p>` : ''}</div>`;
    const attrs = (k: Field) => `id="bk-${k}" name="${k}" aria-describedby="bk-${k}-err"`;
    const d = st.details;
    return `<form data-form novalidate class="max-w-xl">
      <h2 data-focus tabindex="-1" class="text-2xl outline-none sm:text-3xl">${t.detailsTitle}</h2>
      <p class="mt-2 text-muted">${fill(t.detailsSubtitle, { deposit: total().deposit })}</p>
      <div data-errsum role="alert" tabindex="-1" hidden class="mt-6 border-l-2 border-danger bg-surface-2 p-4 text-sm outline-none"></div>
      <div class="mt-6 grid gap-5">
        ${field('name', t.fName, `<input ${attrs('name')} required maxlength="80" autocomplete="name" class="${INPUT}" value="${esc(d.name)}">`)}
        ${field('phone', t.fPhone, `<input ${attrs('phone')} required type="tel" inputmode="tel" autocomplete="tel" maxlength="20" class="${INPUT}" value="${esc(d.phone)}">`)}
        ${field('notes', t.fNotes, `<textarea ${attrs('notes')} rows="3" maxlength="500" placeholder="${esc(t.notesHint)}" class="${INPUT} h-auto py-3">${esc(d.notes)}</textarea>`, false)}
      </div>
      <div data-summary class="mt-8">${summary()}</div>
      <div class="mt-6 grid gap-4 text-sm">
        ${agree('deposit', fill(t.agreeDeposit, { deposit: total().deposit, hours: site.booking.cancelHours }), true)}
        ${agree('photos', t.agreePhotos, false)}
      </div>
      <button type="submit" class="${BTN_PRIMARY}${tracking} mt-6 w-full">${t.submit}</button>
      <p class="mt-3 text-center text-xs text-muted">${fill(t.privacyNote, { link: `<a href="${localePath(lang, '/privacy')}" target="_blank" class="underline underline-offset-4 hover:text-fg">${t.privacyLink}</a>` })}</p>
    </form>`;
  }

  function setError(k: Field, msg?: string) {
    const input = $(`#bk-${k}`);
    const p = $(`#bk-${k}-err`);
    if (!input || !p) return;
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    p.hidden = !msg;
    p.innerHTML = msg ? `${ICON.alert}<span>${esc(msg)}</span>` : '';
  }
  const errMsg = (k: Field, code: string) => (t.err as Record<string, Record<string, string>>)[k]?.[code] ?? t.err.time.invalid;

  function readDetails(): Details {
    const v = (k: string) => $<HTMLInputElement>(`#bk-${k}`)?.value ?? '';
    return (st.details = { name: v('name'), phone: v('phone'), notes: v('notes') });
  }

  const ticked = (k: string) => $<HTMLInputElement>(`#bk-${k}`)?.checked === true;

  function showSummaryError(html: string) {
    const box = $('[data-errsum]')!;
    box.innerHTML = html;
    box.hidden = false;
    box.focus();
  }

  function submit() {
    const d = readDetails();
    const errs = validateDetails(d);
    (['name', 'phone', 'notes'] as const).forEach((k) => setError(k, errs[k] && errMsg(k, errs[k]!)));
    const list: [Field, string][] = Object.entries(errs).map(([k, c]) => [k as Field, errMsg(k as Field, c!)]);
    const depositOk = ticked('deposit');
    setError('deposit', depositOk ? undefined : t.err.deposit.required);
    if (!depositOk) list.push(['deposit', t.err.deposit.required]);
    if (list.length) {
      return showSummaryError(
        `<p class="font-medium">${t.errSummary}</p><ul class="mt-2 list-disc pl-5">${list
          .map(([k, m]) => `<li><a href="#bk-${k}" class="underline underline-offset-4">${esc(m)}</a></li>`)
          .join('')}</ul>`,
      );
    }
    st.deposit = true;
    st.photos = ticked('photos');
    go(5);
    void fetchLink();
  }

  // Short /c/<code> link for Abby. The message shows at once; the 📅 line joins when the code arrives (no database → no line).
  async function fetchLink() {
    const d = st.details;
    const body = { items: itemsParam(asItems()), date: st.date, time: st.time, name: d.name, phone: d.phone, photos: st.photos };
    const key = JSON.stringify(body);
    if (st.link?.key === key) return;
    st.link = { key };
    try {
      const r = await fetch('/api/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: key });
      const code = r.ok ? ((await r.json()) as { code?: string }).code : undefined;
      if (st.link?.key !== key || !code) return;
      st.link.code = code;
      if (st.step === 5) render();
    } catch {}
  }

  // --- step 5: the message the customer sends Abby (page language; the first line is the same in every language so Abby spots it) ---
  function message() {
    const d = st.details;
    const q = total();
    const m = t.msg;
    const c = lang !== 'en' ? '：' : ': ';
    return [
      m.header,
      `${m.service}${c}${label()}`,
      `${m.when}${c}${shortDate(st.date!)} ${fmtTime(st.date!, st.time!)} (${mins(q.minutes)})`,
      `${m.price}${c}${totalPrice(q)}`,
      `${m.name}${c}${d.name.trim()}`,
      `${m.phone}${c}${d.phone.trim()}`,
      ...(d.notes.trim() ? [`${m.notes}${c}${d.notes.trim().replace(/\s+/g, ' ')}`] : []),
      fill(m.deposit, { deposit: q.deposit, hours: site.booking.cancelHours }),
      st.photos ? m.photosYes : m.photosNo,
      ...(st.link?.code ? ['', `${m.calendar}${c}${location.origin}/c/${st.link.code}`] : []),
    ].join('\n');
  }

  function sendView() {
    const text = message();
    return `<div class="max-w-xl">
      <h2 data-focus tabindex="-1" class="text-2xl outline-none sm:text-3xl">${t.sendTitle}</h2>
      <p class="mt-2 text-muted">${esc(fill(t.sendBody, { deposit: total().deposit }))}</p>
      <div class="mt-6 flex flex-col gap-3">
        <a data-send="whatsapp" href="${esc(waTextHref(site.phone, text))}" target="_blank" rel="noopener" class="${BTN_PRIMARY}${tracking}">${t.sendWhatsApp}</a>
        <a data-send="sms" href="${esc(smsHref(site.phone, text))}" class="${BTN_OUTLINE}${tracking}">${t.sendSms}</a>
      </div>
      <label for="bk-message" class="mt-8 block text-sm font-medium">${t.messageLabel}</label>
      <textarea id="bk-message" readonly rows="${text.split('\n').length + 3}" class="${INPUT} mt-1.5 h-auto resize-none py-3 text-sm [field-sizing:content]">${esc(text)}</textarea>
      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" data-action="copy" class="${BTN}${tracking} -ml-2 text-muted hover:text-fg">${t.copy}</button>
        <button type="button" data-goto="4" class="${BTN}${tracking} text-muted hover:text-fg">${t.edit}</button>
      </div>
      <p data-copied role="status" class="mt-2 text-sm text-muted"></p>
    </div>`;
  }

  async function copyMessage() {
    const box = $<HTMLTextAreaElement>('#bk-message')!;
    // The clipboard API needs HTTPS; the select + execCommand fallback covers a phone testing over the LAN.
    const ok = await navigator.clipboard?.writeText(box.value).then(() => true, () => false);
    if (!ok) {
      box.select();
      document.execCommand('copy');
    }
    $('[data-copied]')!.textContent = fill(t.copied, { phone: site.phoneDisplay });
    emitSent('copy');
  }

  const emitSent = (via: string) =>
    emit('booking_submitted', { via, service: st.items.map((i) => i.service.id).join('+'), option: asItems().map((i) => i.option).join('+'), value: total().price, currency: 'AUD' });

  // --- render + navigation ---
  function render() {
    if (exiting) return renderChrome(); // the old panel is sliding out; go() draws the new one when it has gone
    const active = document.activeElement as HTMLElement | null;
    const hadGridFocus = gridFocusPending || !!active?.closest('[data-grid]');
    const action = view.contains(active) ? active?.dataset.action : undefined;
    renderChrome();
    if (st.step === 1) view.innerHTML = serviceView();
    else if (st.step === 4) view.innerHTML = detailsView();
    else if (st.step === 5) view.innerHTML = sendView();
    else
      view.innerHTML = `<div class="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
        <div class="${st.step === 3 ? 'max-lg:hidden' : ''}">${calendarView()}</div>
        <div class="${st.step === 2 ? 'max-lg:hidden' : ''} lg:border-l lg:border-dashed lg:border-muted/30 lg:pl-10">${slotsView()}</div>
      </div>`;
    enter();
    if (hadGridFocus) {
      const b = view.querySelector<HTMLElement>('[data-grid] button[tabindex="0"]');
      gridFocusPending = !b;
      b?.focus();
    } else if (action) {
      view.querySelector<HTMLElement>(`[data-action="${action}"]:not([disabled])`)?.focus() ??
        view.querySelector<HTMLElement>('[data-focus]')?.focus();
    }
  }

  // Step change: the old panel slides out and fades (left going forward, right going back), then the new panel's blocks slide
  // in from the other side one after another. A re-render inside that second (free times arriving, a first click) redraws
  // the blocks, so the slide resumes where it was instead of vanishing. The rail animates at once, alongside.
  let enteredAt = -1e9, dir = 1;
  let exiting: Animation | undefined;
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  function enter() {
    const t = performance.now() - enteredAt;
    if (reduced.matches || t > 1200) return;
    let box: Element = view;
    while (box.children.length === 1) box = box.children[0];
    [...box.children].slice(0, 8).forEach((el, i) => {
      const a = el.animate([{ opacity: 0, translate: `${40 * dir}px 0` }, { opacity: 1, translate: '0 0' }], { duration: 520, delay: i * 90, easing: EASE, fill: 'backwards' });
      a.currentTime = t;
    });
  }

  function go(step: Step, focus = true) {
    const from = st.step;
    st.step = step;
    dir = step < from ? -1 : 1;
    if (step === 2 || step === 3) void load();
    exiting?.cancel();
    exiting = undefined;
    if (reduced.matches || step === from || !view.children.length) return show(step, focus);
    renderChrome();
    const out = (exiting = view.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: `${-32 * dir}px 0` }], { duration: 200, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }));
    out.onfinish = () => {
      if (exiting !== out) return;
      exiting = undefined;
      out.cancel();
      show(step, focus);
    };
  }

  function show(step: Step, focus: boolean) {
    enteredAt = performance.now();
    render();
    if (!focus) return;
    const top = root.getBoundingClientRect().top;
    if (top < 0) window.scrollBy(0, top - 96);
    view.querySelector<HTMLElement>(step === 3 && mobile.matches ? '[data-slots-heading]' : '[data-focus]')?.focus({ preventScroll: true });
    announce(`${fill(t.stepOf, { n: step })} · ${t.steps[step - 1]}`);
  }

  function setMonth(m: string) {
    st.month = m;
    void load();
    render();
  }

  function moveFocus(from: string, delta: number, unit: 'day' | 'month' = 'day') {
    const today = localDate(Date.now(), TZ);
    const last = maxDate(Date.now(), site);
    let d: string;
    if (unit === 'month') {
      const [y, m, day] = from.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
      const dim = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
      d = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), Math.min(day, dim))).toISOString().slice(0, 10);
    } else d = new Date(Date.parse(`${from}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);
    d = d < today ? today : d > last ? last : d;
    st.focus = d;
    gridFocusPending = true;
    if (d.slice(0, 7) !== st.month) setMonth(d.slice(0, 7));
    else render();
  }

  const startOnce = () => {
    if (st.started || !st.items.length) return;
    st.started = true;
    emit('booking_start', { service: st.items.map((i) => i.service.id).join('+') });
  };

  // Selection feedback: the item just picked pops once (CSS [data-pop]); set after render so nothing else replays.
  function pop(el: Element | null, card = false) {
    (card ? el?.closest('label') : el)?.setAttribute('data-pop', '');
  }

  // --- events ---
  root.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const order = (s: Service) => bookable().indexOf(s);
    if (el.name === 'bk-service') {
      const s = services.find((x) => x.id === el.value)!;
      if (!(el as HTMLInputElement).checked) st.items = st.items.filter((i) => i.service !== s);
      else if (!itemOf(s.id)) {
        const main = mainOptions(s);
        st.items = [...st.items, { service: s, option: main.length === 1 ? main[0] : undefined, addons: {} }].sort((a, b) => order(a.service) - order(b.service));
      }
      startOnce();
    } else if (el.name.startsWith('bk-option-')) {
      const it = itemOf(el.name.slice('bk-option-'.length))!;
      it.option = mainOptions(it.service).find((o) => o.id === el.value);
      if (it.option?.noRemoval) delete it.addons.removal;
    } else if (el.name.startsWith('bk-addon-')) {
      // either/or: drop whichever option of this radio group was chosen before
      const it = itemOf(el.dataset.service!)!;
      root.querySelectorAll<HTMLInputElement>(`input[name="${el.name}"]`).forEach((r) => delete it.addons[r.value]);
      if (el.value) it.addons[el.value] = 1;
    } else if (el.name === 'bk-units') {
      const it = itemOf(el.dataset.service!)!;
      const id = el.dataset.addon!;
      if (+el.value) it.addons[id] = +el.value;
      else delete it.addons[id];
    } else return;
    st.time = undefined;
    render();
    if ((el as HTMLInputElement).checked) pop(view.querySelector(`input[name="${el.name}"][value="${el.value}"]`), true); // the whole row/card releases, radios included
    view.querySelector<HTMLElement>(el.name === 'bk-units' ? `select[data-service="${el.dataset.service}"]` : `input[name="${el.name}"][value="${el.value}"]`)?.focus();
  });

  root.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button, a[href^="#bk-"]');
    if (!el) return;
    if (el.matches('a[href^="#bk-"]')) {
      e.preventDefault();
      $(el.getAttribute('href')!)?.focus();
      return;
    }
    // A touch press is drawn by the layout's pointerdown handler (data-pressed). These buttons re-render the view at once,
    // so wait until the press has been on screen for PRESS_MS before acting; keyboard and mouse-free clicks act at once.
    const shown = performance.now() - Number(el.dataset.pressedAt ?? -1e9);
    if (shown < PRESS_MS && !reduced.matches) setTimeout(() => el.isConnected && act(el), PRESS_MS - shown);
    else act(el);
  });

  function act(el: HTMLElement) {
    if (el.dataset.goto) return go(+el.dataset.goto as Step);
    if (el.dataset.date) {
      if (el.getAttribute('aria-disabled')) return;
      st.date = st.focus = el.dataset.date;
      st.time = undefined;
      if (mobile.matches) return go(3);
      st.step = 3;
      render();
      return pop(view.querySelector(`[data-date="${st.date}"]`));
    }
    if (el.dataset.time) {
      st.time = el.dataset.time;
      render();
      const next = view.querySelector<HTMLElement>('[data-action="to-details"]');
      pop(next?.previousElementSibling ?? null);
      next?.focus();
      return;
    }
    const [y, m] = st.month.split('-').map(Number);
    const shift = (n: number) => new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
    switch (el.dataset.action) {
      case 'to-date':
        startOnce();
        if (st.date && !st.date.startsWith(st.month)) st.month = st.date.slice(0, 7);
        return go(2);
      case 'to-details':
        return go(4);
      case 'to-time':
        return go(3);
      case 'back':
        return go((st.step - 1) as Step);
      case 'prev':
        return setMonth(shift(-1));
      case 'next':
        return setMonth(shift(1));
      case 'copy':
        return void copyMessage();
      case 'retry':
        return void load(st.month, true).then(render);
    }
  }

  root.addEventListener('keydown', (e) => {
    const el = e.target as HTMLElement;
    const d = el.dataset?.date;
    if (!d || !el.closest('[data-grid]')) return;
    const dow = (weekday(d) + 6) % 7;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => moveFocus(d, -1),
      ArrowRight: () => moveFocus(d, 1),
      ArrowUp: () => moveFocus(d, -7),
      ArrowDown: () => moveFocus(d, 7),
      Home: () => moveFocus(d, -dow),
      End: () => moveFocus(d, 6 - dow),
      PageUp: () => moveFocus(d, -1, 'month'),
      PageDown: () => moveFocus(d, 1, 'month'),
    };
    if (moves[e.key]) {
      e.preventDefault();
      moves[e.key]();
    }
  });

  // Validate on blur; once a field shows an error, re-check it while typing so it clears promptly.
  const revalidate = (e: Event, onlyIfInvalid: boolean) => {
    const el = e.target as HTMLInputElement;
    const k = el.name as keyof Details;
    if (!el.closest('[data-form]')) return;
    if (el.name === 'deposit') {
      if (!el.checked) return;
      setError('deposit');
      if (!$('[data-form] [aria-invalid]')) $('[data-errsum]')!.hidden = true; // nothing else wrong: drop the stale summary
      return;
    }
    readDetails();
    if (!['name', 'phone', 'notes'].includes(k) || (onlyIfInvalid && !el.hasAttribute('aria-invalid'))) return;
    const c = validateDetails(st.details)[k];
    setError(k, c && errMsg(k, c));
  };
  root.addEventListener('focusout', (e) => revalidate(e, false));
  root.addEventListener('input', (e) => revalidate(e, true));
  root.addEventListener('submit', (e) => {
    e.preventDefault();
    submit();
  });
  root.addEventListener('click', (e) => {
    const via = (e.target as HTMLElement).closest<HTMLElement>('[data-send]')?.dataset.send;
    if (via) emitSent(via);
  });

  // Deep link: /book?service=lash-lift (id or service-page slug), optional &option=
  const q = new URLSearchParams(location.search);
  const found = services.find((s) => s.id === q.get('service') || s.slug === q.get('service'));
  const pre = found && bookableWith(found);
  if (pre) {
    const main = mainOptions(pre);
    const solo = addonOptions(pre).find((o) => o.alone && o.id === q.get('option')); // e.g. &option=removal
    st.items = [{ service: pre, option: main.find((o) => o.id === q.get('option')) ?? (main.length === 1 ? main[0] : undefined), addons: solo ? { [solo.id]: 1 } : {} }];
  }
  go(1, false);
}
