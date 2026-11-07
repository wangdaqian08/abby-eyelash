// Booking flow (vanilla TS): 1 Services (one or more, back to back) → 2 Date → 3 Time → 4 Details → success.
import { addonOptions, bookable, bookableWith, groupAt, headline, itemsParam, mainOptions, priceText, quoteAll, quoteAllText, services, type Addons, type Lang, type Service, type ServiceOption } from '../../data/services';
import { site } from '../../data/site';
import { bookingStrings } from '../../i18n/booking';
import { daysInMonth, localDate, maxDate, validateDetails, weekday, zonedTimeToUtc, type Details } from '../../lib/availability';

declare global {
  interface Window {
    turnstile?: {
      render(el: Element, o: Record<string, unknown>): string;
      reset(id?: string): void;
      remove(id: string): void;
    };
  }
}

type Days = Record<string, string[]>;
type Month = { days: Days; recommended: Days };
type Step = 1 | 2 | 3 | 4 | 5;
type Field = keyof Details | 'service' | 'option' | 'time';
type Chosen = { service: Service; option?: ServiceOption; addons: Addons }; // one ticked service

const TZ = site.timezone;
const MIN = 60_000;
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
  prev: svg('<path d="m15 18-6-6 6-6"/>'),
  next: svg('<path d="m9 18 6-6-6-6"/>'),
  alert: svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>', 'size-[1em] shrink-0 translate-y-[0.125em]'),
  check: svg('<path d="M20 6 9 17l-5-5"/>', 'size-6'),
  chevron: svg('<path d="m6 9 6 6 6-6"/>', 'pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted'),
  tick: svg('<path d="M20 6 9 17l-5-5"/>', 'size-3.5'),
};
const STEP_ICONS = [ICON.service, ICON.date, ICON.time, ICON.details];

const BTN = 'press inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 font-medium uppercase disabled:cursor-not-allowed disabled:opacity-50';
const BTN_PRIMARY = `${BTN} btn-solid`;
const BTN_OUTLINE = `${BTN} btn-tinted`;
const PRESS_MS = 140;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const INPUT = 'block h-12 w-full appearance-none rounded-field bg-surface-2 px-4 text-base text-fg placeholder:text-muted aria-invalid:outline-2 aria-invalid:outline-danger';

export function start(root: HTMLElement) {
  const cfg = JSON.parse(root.dataset.config!) as { lang: Lang; turnstileSiteKey: string; web3formsKey: string; home: string };
  const lang = cfg.lang;
  const t = bookingStrings[lang];
  const locale = lang === 'zh' ? 'zh-CN' : 'en-AU';
  const tracking = lang === 'en' ? ' text-xs tracking-[0.2em]' : ' text-sm'; // no tracking on CJK
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const view = $('[data-view]')!;
  const mobile = matchMedia('(max-width: 1023px)');

  const st: {
    step: Step;
    items: Chosen[]; // in menu order
    month: string;
    date?: string;
    time?: string;
    focus?: string; // keyboard focus within the calendar grid
    details: Details;
    started: boolean;
    name?: string;
  } = { step: 1, items: [], month: localDate(Date.now(), TZ).slice(0, 7), details: { name: '', phone: '', email: '', notes: '' }, started: false };

  const cache = new Map<string, Month | 'loading' | 'error'>();
  const itemOf = (id: string) => st.items.find((i) => i.service.id === id);
  const ready = () => st.items.length > 0 && st.items.every((i) => i.option);
  const asItems = () => st.items.map((i) => ({ service: i.service.id, option: i.option!.id, addons: i.addons }));
  const key = (m = st.month) => `${itemsParam(asItems())}/${m}`;
  const total = () => quoteAll(asItems())!; // the UI only offers valid combinations
  let tsToken = '';
  let tsWidget: string | undefined;
  let gridFocusPending = false;

  // --- formatting ---
  const fmtDate = (date: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...o }).format(new Date(`${date}T12:00:00Z`));
  const fmtTime = (date: string, time: string) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: TZ,
      hour: lang === 'zh' ? '2-digit' : 'numeric',
      minute: '2-digit',
      hourCycle: lang === 'zh' ? 'h23' : 'h12',
    }).format(zonedTimeToUtc(date, time, TZ));
  const price = (o: Parameters<typeof priceText>[0] & { wasPrice?: number }) =>
    priceText(o, lang) + (o.wasPrice ? (lang === 'zh' ? `（原价 $${o.wasPrice}）` : ` (was $${o.wasPrice})`) : '');
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
      cache.set(k, { days: j.days, recommended: j.recommended ?? {} });
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
  const recommendedFor = (date: string) => {
    const d = cache.get(key(date.slice(0, 7)));
    return new Set(typeof d === 'object' ? d.recommended[date] : []);
  };

  // --- rail stepper (desktop) + progress bar (mobile) ---
  function renderChrome() {
    const values = [
      ready() && label(),
      st.date && shortDate(st.date),
      st.date && st.time && fmtTime(st.date, st.time),
      st.step === 5 ? st.name : undefined,
    ];
    $('[data-stepper]')!.innerHTML = t.steps
      .map((label, i) => {
        const n = i + 1;
        const done = n < st.step;
        const current = n === st.step;
        const text = done && values[i] ? values[i]! : label;
        const inner = `<span class="flex size-9 shrink-0 items-center justify-center rounded-full border ${done || current ? 'border-primary/30 bg-surface-2 text-primary' : 'border-border text-muted'}">${STEP_ICONS[i]}</span>
          <span class="text-sm ${done ? 'font-medium text-primary' : current ? 'text-fg' : 'text-muted'}">${esc(text)}</span>`;
        return `<li ${current ? 'aria-current="step"' : ''}>
          ${i ? '<span aria-hidden="true" class="ml-[17px] block h-7 border-l border-dashed border-muted/40"></span>' : ''}
          ${current ? `<p class="mb-1 flex items-center gap-2 text-xs font-medium text-primary"><span class="size-2 rounded-full bg-primary"></span>${fill(t.stepN, { n })}</p><p class="mb-3 text-sm text-fg">${t.prompts[i]}</p>` : ''}
          ${
            done && st.step < 5
              ? `<button type="button" data-goto="${n}" aria-label="${esc(fill(t.editStep, { step: label }))}: ${esc(text)}" class="flex min-h-11 w-full items-center gap-3 text-left hover:opacity-80">${inner}</button>`
              : `<div class="flex min-h-11 items-center gap-3">${inner}</div>`
          }
        </li>`;
      })
      .join('');

    const progress = $('[data-progress]')!;
    progress.hidden = st.step === 5;
    if (st.step === 5) return;
    progress.innerHTML = `<div class="mb-3 flex min-h-11 items-center justify-between gap-4">
        ${st.step > 1 ? `<button type="button" data-action="back" class="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm text-muted hover:text-fg">${ICON.prev}${t.back}</button>` : '<span></span>'}
        <span class="text-xs text-muted">${fill(t.stepOf, { n: st.step })} · ${t.steps[st.step - 1]}</span>
      </div>
      <ol class="mb-8 flex items-center" aria-hidden="true">${[1, 2, 3, 4]
        .map(
          (n) =>
            `${n > 1 ? `<li class="h-px flex-1 ${n <= st.step ? 'bg-primary' : 'bg-border'}"></li>` : ''}<li class="size-2.5 rounded-full ${n <= st.step ? 'bg-primary' : 'border border-muted/50'}"></li>`,
        )
        .join('')}</ol>`;
  }

  // --- step 1 ---
  function serviceView() {
    const card = (s: Service) => {
      const h = headline(s);
      const range = h.minutes![0] === h.minutes![1] ? mins(h.minutes![0]) : `${h.minutes![0]}–${mins(h.minutes![1])}`;
      const on = !!itemOf(s.id);
      return `<label class="press relative flex min-h-16 items-center gap-3 rounded-[1.25rem] bg-surface-2 p-4 transition-colors duration-200 has-checked:bg-primary/8 has-checked:ring-2 has-checked:ring-inset has-checked:ring-primary/60 has-focus-visible:focus-ring">
        <input type="checkbox" name="bk-service" value="${s.id}" class="sr-only" ${on ? 'checked' : ''}>
        <span aria-hidden="true" class="flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${on ? 'bg-primary text-on-primary' : 'ring-1 ring-inset ring-muted/50'}">${on ? ICON.tick : ''}</span>
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
              (o, i, all) => `${groupAt(all, i) ? `<p class="px-1 pb-2 pt-5 text-xs font-medium uppercase tracking-wider text-accent-ink">${groupAt(all, i)![lang]}</p>` : ''}<label class="relative flex min-h-14 items-center justify-between gap-4 px-1 py-3 has-focus-visible:outline-2 has-focus-visible:outline-ring">
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
    const list = addonOptions(s);
    if (!it.option || it.option.noAddons || !list.length) return '';
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
    const wd = Array.from({ length: 7 }, (_, i) => fmtDate(`2026-11-0${2 + i}`, { weekday: lang === 'zh' ? 'narrow' : 'short' }));
    const cells: string[] = Array(mondayFirst(dates[0])).fill('<span role="gridcell"></span>');
    for (const d of dates) {
      if (!days) {
        cells.push('<span role="gridcell" class="flex justify-center"><span class="size-11 rounded-full bg-surface-2 motion-safe:animate-pulse"></span></span>');
        continue;
      }
      const avail = d in days;
      const sel = d === st.date;
      const cls = sel
        ? 'bg-primary font-semibold text-on-primary shadow-[0_6px_14px_-6px_var(--primary)]'
        : avail
          ? 'press bg-surface-2 font-medium text-fg'
          : 'cursor-default text-muted/60';
      const label = `${fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${avail ? t.available : t.unavailable}${d === today ? `, ${t.today}` : ''}`;
      cells.push(`<span role="gridcell" class="flex justify-center" ${sel ? 'aria-selected="true"' : ''}>
        <button type="button" data-date="${d}" tabindex="${d === tabbable ? 0 : -1}" aria-label="${esc(label)}" ${avail ? '' : 'aria-disabled="true"'} class="relative flex size-11 items-center justify-center rounded-full text-sm ${cls}">
          ${+d.slice(8)}${d === today ? '<span aria-hidden="true" class="absolute bottom-1 size-1 rounded-full bg-current"></span>' : ''}
        </button></span>`);
    }
    while (cells.length % 7) cells.push('<span role="gridcell"></span>');
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(`<div role="row" class="grid grid-cols-7 gap-y-2">${cells.slice(i, i + 7).join('')}</div>`);

    const navBtn = (dir: 'prev' | 'next', disabled: boolean) =>
      `<button type="button" data-action="${dir}" aria-label="${dir === 'prev' ? t.prevMonth : t.nextMonth}" ${disabled ? 'disabled' : ''} class="press flex size-11 items-center justify-center rounded-full ${disabled ? 'cursor-not-allowed bg-surface-2 text-muted/60' : 'btn-tinted'}">${ICON[dir]}</button>`;

    const body =
      data === 'error'
        ? `<div role="alert" class="mt-8 rounded-card bg-surface-2 p-6 text-sm">
            <p class="font-medium">${t.loadError}</p>
            <button type="button" data-action="retry" class="${BTN_OUTLINE}${tracking} mt-4">${t.retry}</button>
            <p class="mt-4 text-muted">${t.callFallback} <a class="whitespace-nowrap text-fg underline underline-offset-4" href="${phoneHref}">${site.phoneDisplay}</a></p>
          </div>`
        : `<div role="grid" data-grid aria-labelledby="bk-month" ${days ? '' : 'aria-busy="true"'} class="mt-6">
            <div role="row" class="grid grid-cols-7 text-center text-xs text-muted">${wd.map((w) => `<span role="columnheader" class="py-2">${w}</span>`).join('')}</div>
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
    const rec = recommendedFor(st.date);
    const badge = `<span class="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-accent-ink">${t.recommended}</span>`;
    const items = list
      .map((time) => {
        const label = fmtTime(st.date!, time);
        const tag = rec.has(time) ? badge : '';
        return time === st.time
          ? `<li class="grid grid-cols-2 gap-2"><span data-pop class="relative flex h-12 items-center justify-center rounded-full bg-primary/8 font-medium text-primary ring-2 ring-inset ring-primary/60">${label}${tag && `<span class="sr-only">, ${t.recommended}</span>`}</span>
              <button type="button" data-action="to-details" aria-label="${t.next}: ${label}" class="btn-solid press h-12 rounded-full font-medium">${t.next}</button></li>`
          : `<li><button type="button" data-time="${time}" class="press relative h-12 w-full rounded-full bg-surface-2 text-fg tabular-nums">${label}${tag}</button></li>`;
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
    const attrs = (k: Field) => `id="bk-${k}" name="${k}" aria-describedby="bk-${k}-err"`;
    const d = st.details;
    return `<form data-form novalidate class="max-w-xl">
      <h2 data-focus tabindex="-1" class="text-2xl outline-none sm:text-3xl">${t.detailsTitle}</h2>
      <p class="mt-2 text-muted">${fill(t.detailsSubtitle, { deposit: total().deposit })}</p>
      <div data-errsum role="alert" tabindex="-1" hidden class="mt-6 border-l-2 border-danger bg-surface-2 p-4 text-sm outline-none"></div>
      <div class="mt-6 grid gap-5">
        ${field('name', t.fName, `<input ${attrs('name')} required maxlength="80" autocomplete="name" class="${INPUT}" value="${esc(d.name)}">`)}
        ${field('phone', t.fPhone, `<input ${attrs('phone')} required type="tel" inputmode="tel" autocomplete="tel" maxlength="20" class="${INPUT}" value="${esc(d.phone)}">`)}
        ${field('email', t.fEmail, `<input ${attrs('email')} required type="email" autocomplete="email" maxlength="254" class="${INPUT}" value="${esc(d.email)}">`)}
        ${field('notes', t.fNotes, `<textarea ${attrs('notes')} rows="3" maxlength="500" placeholder="${esc(t.notesHint)}" class="${INPUT} h-auto py-3">${esc(d.notes)}</textarea>`, false)}
      </div>
      <div data-summary class="mt-8">${summary()}</div>
      <div data-turnstile class="mt-6 min-h-0"></div>
      <button type="submit" class="${BTN_PRIMARY}${tracking} mt-6 w-full">${t.submit}</button>
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
    return (st.details = { name: v('name'), phone: v('phone'), email: v('email'), notes: v('notes') });
  }

  function showSummaryError(html: string) {
    const box = $('[data-errsum]')!;
    box.innerHTML = html;
    box.hidden = false;
    box.focus();
  }

  function mountTurnstile() {
    tsToken = '';
    const el = $('[data-turnstile]');
    if (!cfg.turnstileSiteKey || !el) return;
    const go = () => {
      tsWidget = window.turnstile!.render(el, {
        sitekey: cfg.turnstileSiteKey,
        language: lang === 'zh' ? 'zh-cn' : 'en',
        callback: (tok: string) => (tsToken = tok),
        'expired-callback': () => (tsToken = ''),
        'error-callback': () => (tsToken = ''),
      });
    };
    if (window.turnstile) return go();
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = go;
    document.head.append(s);
  }

  // Before sending: the chosen time must still be free for the whole visit.
  async function recheckSlot() {
    await load(st.date!.slice(0, 7));
    const days = daysFor(st.date!.slice(0, 7));
    return !days || days[st.date!]?.includes(st.time!) === true; // unknown → let the server decide
  }

  async function submit() {
    const d = readDetails();
    const errs = validateDetails(d);
    (['name', 'phone', 'email', 'notes'] as const).forEach((k) => setError(k, errs[k] && errMsg(k, errs[k]!)));
    const list: [Field, string][] = Object.entries(errs).map(([k, c]) => [k as Field, errMsg(k as Field, c!)]);
    if (list.length) {
      return showSummaryError(
        `<p class="font-medium">${t.errSummary}</p><ul class="mt-2 list-disc pl-5">${list
          .map(([k, m]) => `<li><a href="#bk-${k}" class="underline underline-offset-4">${esc(m)}</a></li>`)
          .join('')}</ul>`,
      );
    }
    if (!(await recheckSlot())) return showSummaryError(`<p>${t.slotTaken}</p><button type="button" data-action="to-time" class="${BTN_OUTLINE}${tracking} mt-3">${t.chooseAnotherTime}</button>`);
    if (cfg.turnstileSiteKey && !tsToken) return showSummaryError(`<p>${t.captcha}</p>`);

    const btn = $<HTMLButtonElement>('[data-form] [type=submit]')!;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = `<span aria-hidden="true" class="size-4 rounded-full border-2 border-on-primary/40 border-t-on-primary motion-safe:animate-spin"></span>${t.submitting}`;
    const payload = { ...d, items: itemsParam(asItems()), date: st.date, time: st.time, lang, turnstileToken: tsToken };
    let res: Response | undefined;
    let body: { ok?: boolean; demo?: boolean; error?: string; errors?: Record<string, string> } = {};
    try {
      res = await fetch('/api/book', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      body = await res.json();
    } catch {}

    if (res?.ok && body.ok) {
      if (body.demo) showDemo();
      notifyOwner(d);
      emit('booking_submitted', { service: st.items.map((i) => i.service.id).join('+'), option: st.items.map((i) => i.option!.id).join('+'), value: total().price, currency: 'AUD' });
      st.name = d.name.trim();
      load(st.date!.slice(0, 7), true); // bypass the browser's 60 s cache so the taken slot disappears
      return go(5);
    }

    btn.disabled = false;
    btn.removeAttribute('aria-busy');
    btn.textContent = t.submit;
    if (tsWidget) window.turnstile?.reset(tsWidget);
    tsToken = '';
    const phone = `<a class="whitespace-nowrap underline underline-offset-4" href="${phoneHref}">${site.phoneDisplay}</a>`;
    if (body.error === 'validation' && body.errors) {
      const entries = Object.entries(body.errors) as [Field, string][];
      entries.forEach(([k, c]) => setError(k, errMsg(k, c)));
      showSummaryError(`<p class="font-medium">${t.errSummary}</p><ul class="mt-2 list-disc pl-5">${entries.map(([k, c]) => `<li>${esc(errMsg(k, c))}</li>`).join('')}</ul>`);
    } else if (body.error === 'slot_taken') {
      cache.delete(key(st.date!.slice(0, 7)));
      showSummaryError(`<p>${t.slotTaken}</p><button type="button" data-action="to-time" class="${BTN_OUTLINE}${tracking} mt-3">${t.chooseAnotherTime}</button>`);
    } else if (body.error === 'captcha') {
      showSummaryError(`<p>${t.captcha}</p>`);
    } else {
      showSummaryError(`<p>${t.serverError} ${phone}.</p>`);
    }
  }

  // Web3Forms only accepts browser-side submissions on the free plan; keepalive lets it finish during navigation.
  function notifyOwner(d: Details) {
    if (!cfg.web3formsKey) return;
    const q = total();
    const service = label('en');
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        access_key: cfg.web3formsKey,
        subject: `New booking request (pending): ${d.name.trim()} – ${st.date} ${st.time}`,
        from_name: 'Abby Eyelash website',
        replyto: d.email.trim(),
        name: d.name.trim(),
        phone: d.phone.trim(),
        email: d.email.trim(),
        service: `${service} (${q.minutes} min)`,
        date: st.date,
        time: st.time,
        price: quoteAllText(q, 'en'),
        deposit: `$${q.deposit}`,
        notes: d.notes.trim() || '-',
        language: lang,
        status: 'PENDING — confirm by SMS/WhatsApp, collect the deposit, then rename the calendar event',
      }),
    }).catch(() => {});
  }

  // --- success ---
  function successView() {
    const start = zonedTimeToUtc(st.date!, st.time!, TZ);
    const end = start + total().minutes * MIN;
    const stamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = fill(t.calendarTitle, { service: label() });
    const a = site.address;
    const location = `${site.name}, ${a.street}, ${a.locality} ${a.region} ${a.postcode}`;
    const successBody = fill(t.successBody, { deposit: total().deposit, hours: site.booking.cancelHours });
    const details = `${t.pending}\n${successBody}\n${site.phoneDisplay}`;
    const gcal = `https://calendar.google.com/calendar/render?${new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${stamp(start)}/${stamp(end)}`, details, location, ctz: TZ })}`;
    const icsText = (s: string) => s.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Abby Eyelash//Booking//EN',
      'BEGIN:VEVENT',
      `UID:${stamp(start)}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}@abby-eyelash`, // randomUUID only exists on HTTPS/localhost (not a phone on the LAN)
      `DTSTAMP:${stamp(Date.now())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${icsText(title)}`,
      `LOCATION:${icsText(location)}`,
      `DESCRIPTION:${icsText(details)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const icsUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    return `<div class="max-w-xl">
      <span class="flex size-12 items-center justify-center rounded-full bg-surface-2 text-primary">${ICON.check}</span>
      <h2 data-focus tabindex="-1" class="mt-6 text-3xl outline-none">${t.successTitle}</h2>
      <p class="mt-2">${esc(fill(t.successThanks, { name: st.name ?? '' }))}</p>
      <p class="mt-4 inline-flex items-center gap-2 bg-surface-2 px-3 py-1.5 text-sm font-medium text-accent-ink"><span aria-hidden="true" class="size-2 rounded-full bg-accent"></span>${t.pending}</p>
      <div class="mt-6">${summary()}</div>
      <p class="mt-6">${successBody}</p>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <a href="${gcal}" target="_blank" rel="noopener" class="${BTN_PRIMARY}${tracking}">${t.addGoogle}</a>
        <a href="${icsUrl}" download="abby-eyelash-booking.ics" class="${BTN_OUTLINE}${tracking}">${t.downloadIcs}</a>
        <a href="${cfg.home}" class="${BTN}${tracking} text-muted hover:text-fg">${t.home}</a>
      </div>
    </div>`;
  }

  // --- render + navigation ---
  function render() {
    const active = document.activeElement as HTMLElement | null;
    const hadGridFocus = gridFocusPending || !!active?.closest('[data-grid]');
    const action = view.contains(active) ? active?.dataset.action : undefined;
    if (tsWidget) window.turnstile?.remove(tsWidget);
    tsWidget = undefined;
    renderChrome();
    if (st.step === 1) view.innerHTML = serviceView();
    else if (st.step === 4) view.innerHTML = detailsView();
    else if (st.step === 5) view.innerHTML = successView();
    else
      view.innerHTML = `<div class="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
        <div class="${st.step === 3 ? 'max-lg:hidden' : ''}">${calendarView()}</div>
        <div class="${st.step === 2 ? 'max-lg:hidden' : ''} lg:border-l lg:border-dashed lg:border-muted/30 lg:pl-10">${slotsView()}</div>
      </div>`;
    if (hadGridFocus) {
      const b = view.querySelector<HTMLElement>('[data-grid] button[tabindex="0"]');
      gridFocusPending = !b;
      b?.focus();
    } else if (action) {
      view.querySelector<HTMLElement>(`[data-action="${action}"]:not([disabled])`)?.focus() ??
        view.querySelector<HTMLElement>('[data-focus]')?.focus();
    }
    if (st.step === 4) mountTurnstile();
  }

  function go(step: Step, focus = true) {
    st.step = step;
    if (step === 2 || step === 3) void load();
    render();
    if (!reduced.matches) view.animate([{ opacity: 0, translate: '0 10px' }, { opacity: 1, translate: '0 0' }], { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    if (!focus) return;
    const top = root.getBoundingClientRect().top;
    if (top < 0) window.scrollBy(0, top - 96);
    view.querySelector<HTMLElement>(step === 3 && mobile.matches ? '[data-slots-heading]' : '[data-focus]')?.focus({ preventScroll: true });
    announce(step < 5 ? `${fill(t.stepOf, { n: step })} · ${t.steps[step - 1]}` : t.successTitle);
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
      if (it.option?.noAddons) it.addons = {};
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
    const again = view.querySelector<HTMLElement>(el.name === 'bk-units' ? `select[data-service="${el.dataset.service}"]` : `input[name="${el.name}"][value="${el.value}"]`);
    again?.focus();
    // Selected option pops with a delayed halo (CSS [data-pop]).
    if (again instanceof HTMLInputElement && again.checked && !reduced.matches) (again.type === 'radio' ? again.closest('[data-radio]') : again.closest('label'))?.setAttribute('data-pop', '');
  });

  root.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button, a[href^="#bk-"]');
    if (!el) return;
    if (el.matches('a[href^="#bk-"]')) {
      e.preventDefault();
      $(el.getAttribute('href')!)?.focus();
      return;
    }
    // Let the press show before the view re-renders (touch presses are mirrored in data-pressedAt by BaseLayout).
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
      return mobile.matches ? go(3) : ((st.step = 3), render());
    }
    if (el.dataset.time) {
      st.time = el.dataset.time;
      render();
      view.querySelector<HTMLElement>('[data-action="to-details"]')?.focus();
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
    readDetails();
    if (!['name', 'phone', 'email', 'notes'].includes(k) || (onlyIfInvalid && !el.hasAttribute('aria-invalid'))) return;
    const c = validateDetails(st.details)[k];
    setError(k, c && errMsg(k, c));
  };
  root.addEventListener('focusout', (e) => revalidate(e, false));
  root.addEventListener('input', (e) => revalidate(e, true));
  root.addEventListener('submit', (e) => {
    e.preventDefault();
    void submit();
  });

  // Deep link: /book?service=lash-lift (id or service-page slug), optional &option=
  const q = new URLSearchParams(location.search);
  const found = services.find((s) => s.id === q.get('service') || s.slug === q.get('service'));
  const pre = found && bookableWith(found);
  if (pre) {
    const main = mainOptions(pre);
    st.items = [{ service: pre, option: main.find((o) => o.id === q.get('option')) ?? (main.length === 1 ? main[0] : undefined), addons: {} }];
  }
  go(1, false);
}
