# Portfolio photos link to booking: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every portfolio photo (home gallery, lash-page styled looks) is a link to `/book` with its service and style chosen. Lash and nail photos show a name bar under the photo (option C).

**Architecture:** One pure function in `src/data/photos.ts` turns a photo id, dir and the admin labels into a booking target and a bar name. `Gallery.astro` and `StyledLooks.astro` render cards from it. The booking app gets a new `look=<photo id>` parameter and a map of look names in its `data-config`, and uses them to pre-fill the notes.

**Tech Stack:** Astro 7, Tailwind 4, TypeScript run by `node --test` (unit), Playwright scripts (E2E).

**Spec:** `docs/superpowers/specs/2026-11-15-photo-booking-links-design.md`

## Global Constraints

- `alt`, image sources, `widths`, `sizes`, `formats` and `loading` of every `Picture` stay as they are.
- Links are plain `<a href>` built with `localePath(lang, …)`. No JavaScript is needed to follow them.
- The video toggle `<button>` and the bar `<a>` are siblings, never nested.
- Hover effects only through Tailwind `hover:` (v4 applies it on hover devices only). Press: `active:scale-[.98]`.
- Brows: no name bar, whatever the label.
- Notes pre-fill: en `Look I’d like: <name>`, zh `想做的款式：<name>`. Only when notes are empty.
- Admin hint (zh-Hant), lashes and nails: `選了會顯示在作品照片上，顧客點照片會直接預約這一款。不選也可以：點照片只會選好服務。`

## Review Focus

- Unknown or forged `look` value in the URL (`?look=<script>`, `?look=nope`): it must be ignored; the notes stay empty. Covered in Task 2.
- Traditional Chinese page (`/zh-hant/`): the bar names and the notes text must be Traditional. Covered in Task 5 (check on the built page).
- A video tile: tapping the picture still plays; the bar is a separate link. Covered in Task 3 E2E.
- A photo Abby uploads later with a look label (`look:mermaid`) in a non-styled group cannot happen (validateAdmin rejects it), so no handling is needed.
- English names longer than a three-column card: cut with an ellipsis, never wrap or overflow. Covered in Task 5 (screenshot at 375 px).

---

### Task 1: `photoBooking` and `bookingHref`

**Files:**
- Modify: `src/data/photos.ts` (after `lookName`)
- Test: `src/data/photos.test.ts`

**Interfaces:**
- Produces:
  - `photoBooking(id: string, dir: Dir, labels?: Record<string, string>): PhotoBooking` (`labels` defaults to `adminData.labels`)
  - `interface PhotoBooking { service: string; option?: string; look?: true; name?: L10n; muted?: true }`
  - `bookingHref(lang: Lang, id: string, b: PhotoBooking): string`

Rules:
- `dir === 'brows'`: `{ service: 'powder-brows', option: 'powder' }`, no name.
- label `option:<s>/<o>`: `{ service: s, option: o, name }`; name is the option name, except `handcrafted-nails`, where it is the service name.
- label `look:<x>`, or no label and a legacy look name: `{ service: 'lash-extensions', option: 'styled', look: true, name: lookName(id) }`.
- otherwise: `{ service: PART[dir], name: <service name>, muted: true }` with `PART = { lash: 'lash-extensions', nails: 'gel-nails' }`.
- `bookingHref`: `localePath(lang, '/book?service=…[&option=…][&look=<id>]')`; `look` only when `b.look`.

- [ ] **Step 1: Write the failing tests** in `photos.test.ts`:

```ts
test('photoBooking: option label', () => {
  const b = photoBooking('classic-natural-2', 'lash', { 'classic-natural-2': 'option:lash-extensions/classic-natural' });
  assert.deepEqual([b.service, b.option, b.name?.zh, b.look, b.muted], ['lash-extensions', 'classic-natural', '日式单根 · 自然', undefined, undefined]);
});
test('photoBooking: hand-painted nails show the service name', () => {
  assert.equal(photoBooking('nail-8351', 'nails', { 'nail-8351': 'option:handcrafted-nails/nail-art' }).name?.zh, '手绘造型');
});
test('photoBooking: look label and legacy look name book the styled set', () => {
  const a = photoBooking('u-abcdefghij', 'lash', { 'u-abcdefghij': 'look:mermaid' });
  assert.deepEqual([a.service, a.option, a.look, a.name?.zh], ['lash-extensions', 'styled', true, '人鱼']);
  const b = photoBooking('styled-liner-2', 'lash', {});
  assert.deepEqual([b.option, b.look, b.name?.zh], ['styled', true, '眼线加浓 2']);
});
test('photoBooking: no label books the part service, muted name', () => {
  const b = photoBooking('nail-2020', 'nails', {});
  assert.deepEqual([b.service, b.option, b.muted, b.name?.zh], ['gel-nails', undefined, true, '凝胶美甲']);
});
test('photoBooking: brows never get a name', () => {
  const b = photoBooking('brow-3166', 'brows', { 'brow-3166': 'option:powder-brows/powder' });
  assert.deepEqual(b, { service: 'powder-brows', option: 'powder' });
});
test('bookingHref', () => {
  assert.equal(bookingHref('zh', 'styled-mermaid', photoBooking('styled-mermaid', 'lash', {})), '/zh/book?service=lash-extensions&option=styled&look=styled-mermaid');
  assert.equal(bookingHref('en', 'nail-2020', photoBooking('nail-2020', 'nails', {})), '/book?service=gel-nails');
});
```

- [ ] **Step 2: Run** `node --test src/data/photos.test.ts`. Expected: FAIL, `photoBooking` is not exported.
- [ ] **Step 3: Implement** both functions in `photos.ts` by the rules above.
- [ ] **Step 4: Run** `node --test src/data/photos.test.ts`. Expected: all pass.
- [ ] **Step 5: Commit** `Photos: photoBooking, the booking a portfolio photo opens`.

### Task 2: booking page pre-fills the notes from `look`

**Files:**
- Modify: `src/i18n/booking.ts` (`notesLook` in en and zh)
- Modify: `src/components/booking/BookingApp.astro` (`looks` in `config`)
- Modify: `src/components/booking/booking-client.ts` (cfg type, deep-link block near line 726)
- Test: `scripts/e2e-booking.mjs` (new numbered block before the final checks)

**Interfaces:**
- Consumes: `photoBooking`, `lookName`, `photos` (Task 1).
- Produces: `data-config` gains `looks: Record<string, string>` (photo id to look name in the page language, only photos whose `photoBooking(...).look` is true).

- [ ] **Step 1: Write the failing E2E block** (inside `if (mine())`):
  - open `/book/?service=lash-extensions&option=styled&look=styled-mermaid`; expect `input[name="bk-option-lash-extensions"][value="styled"]` checked; go to step 4 (date, time, `to-details`); expect `#bk-notes` value `Look I’d like: Mermaid` (the legacy en name). Check id is `bk-notes` via `attrs('notes')` in booking-client.
  - open the same URL with `look=nope`; at step 4 expect `#bk-notes` value `''`.
- [ ] **Step 2: Run** `npm run build && npm run serve` in the background, then `node scripts/e2e-booking.mjs`. Expected: the two new checks FAIL.
- [ ] **Step 3: Implement.** `notesLook: 'Look I’d like: '` / `'想做的款式：'`. In BookingApp: `looks` from `photos` filtered by `photoBooking(p.id, p.dir).look`, value `lookName(p.id)![lang]`. In booking-client deep-link block: `const look = cfg.looks?.[q.get('look') ?? '']; if (look && !st.details.notes) st.details.notes = t.notesLook + look;` (`Object.hasOwn` guard, so `?look=__proto__` is ignored).
- [ ] **Step 4: Rebuild, run** `node scripts/e2e-booking.mjs`. Expected: all pass.
- [ ] **Step 5: Commit** `Booking: a look photo's link pre-fills the notes`.

### Task 3: gallery cards with name bar

**Files:**
- Modify: `src/components/home/Gallery.astro` (`tiles`)
- Test: `scripts/e2e-booking.mjs` (new block: home page)

**Interfaces:**
- Consumes: `photoBooking`, `bookingHref` (Task 1).

Card markup (classes from the prototype, site tokens):
- `<li>`: `group/card overflow-hidden rounded-field bg-surface-3 shadow-[var(--shadow-soft)] transition duration-300 ease-brand hover:-translate-y-0.5 hover:shadow-lift active:scale-[.98]`.
- Photo: wrapper `block overflow-hidden` with the group's aspect class; `Picture` adds `transition-transform duration-700 ease-soft group-hover/card:scale-[1.04]`.
- Bar (only when `b.name`): `flex min-h-7.5 items-center justify-between gap-1 px-2.5 py-1.5` (three-column: `min-h-6.5 px-1.5 py-1`); name `truncate text-xs font-medium` (three-column `text-[11px]`), muted adds `font-normal text-muted`, hover `group-hover/card:text-primary`; chevron `size-3 shrink-0 text-accent-ink transition-transform group-hover/card:translate-x-0.5`, `aria-hidden`.
- Photo tile: one `<a href={bookingHref(...)} data-track="book_click">` around photo and bar.
- Video tile: `<div class="relative aspect-…">` with the video and toggle (as today), then the bar as its own `<a>` (no bar on brows, so no link).

- [ ] **Step 1: Write the failing E2E block** (`if (mine())`, viewport 375 × 812, `/`):
  - first lash card link href: `/book?service=` prefix.
  - a nails card in group `nude-french` with name bar text `French`; click it; expect `/book/` with `input[name="bk-option-gel-nails"][value="french"]` checked. (After Task 4's labels; until then pick `nail-3406` by its link href containing `option=french`.)
  - no `#gallery [data-part]:last-child` element has a bar (`[data-bar]` count 0 in the brows part).
  - nail video: click `[data-video-toggle]`; `aria-pressed` becomes `true`; the page did not navigate.
- [ ] **Step 2: Run** against a fresh build. Expected: FAIL.
- [ ] **Step 3: Implement** the card markup above; bar element gets `data-bar`.
- [ ] **Step 4: Rebuild, run** `node scripts/e2e-booking.mjs`. Expected: pass.
- [ ] **Step 5: Commit** `Gallery: each photo is a card that opens its booking`.

### Task 4: lash-page styled looks, admin hint, pre-filled labels

**Files:**
- Modify: `src/components/service/StyledLooks.astro`
- Modify: `src/i18n/admin.ts` (`labelShown`, `labelHidden`), `src/components/admin/admin-client.ts:300`
- Modify: `src/data/photo-admin.json` (`labels`)
- Test: `src/data/photos.test.ts`

- [ ] **Step 1: Write the failing test**: live data still validates and the pre-fill is there:

```ts
test('pre-filled labels are valid and keep Abby\'s own', () => {
  assert.equal(validateAdmin(adminData, adminData, new Set()), null);
  assert.equal(adminData.labels['nail-3406'], 'option:gel-nails/french');
  assert.equal(adminData.labels['u-0w5i41u163'], 'option:lash-extensions/styled');
});
```

- [ ] **Step 2: Run** `node --test src/data/photos.test.ts`. Expected: FAIL on `nail-3406`.
- [ ] **Step 3: Implement.**
  - Labels to add (only where no label exists): `selfie`, `styled-half-face`, `styled-mermaid-selfie` → `option:lash-extensions/styled`; `classic-natural-2`, `classic-natural-colour` → `option:lash-extensions/classic-natural`; `hybrid-full-eye`, `hybrid-full-bottom` → `option:lash-extensions/hybrid-full`; `nail-6920`, `nail-4067`, `nail-2112`, `nail-2441` → `option:gel-nails/solid`; `nail-3406`, `nail-video`, `nail-7334` → `option:gel-nails/french`; `nail-fc1a` → `option:gel-nails/cat-eye`; `nail-b029`, `nail-6e6c`, `nail-8353`, `nail-1848`, `nail-8351`, `nail-4630`, `nail-9264`, `nail-7242` → `option:handcrafted-nails/nail-art`. Keep the file's two-space JSON format.
  - StyledLooks: `<a>` card (classes as the home "lash looks" cards), caption = name plus `common[lang].lashLooks.bookThis` + ` →` in `text-accent-ink`; no name, no caption.
  - Admin: `labelShown` = the Global Constraints text; `labelHidden` = `眉毛只有一種款式，網站上不顯示名稱；名稱只用於圖片的文字說明。`; admin-client chooses `e.ctx.dir === 'brows' ? t.labelHidden : t.labelShown`.
- [ ] **Step 4: Run** `npm run test:unit`. Expected: all pass. Run `node scripts/e2e-admin.mjs` against the served build. Expected: pass.
- [ ] **Step 5: Commit** `Photos: pre-filled styles, lash-page looks link to booking, admin hint`.

### Task 5: verify and compare with the prototype

- [ ] **Step 1:** `npm run build && npm run check:seo`. Expected: no new findings.
- [ ] **Step 2:** `npm test` (unit + all E2E). Expected: all pass.
- [ ] **Step 3:** Screenshots at 375 × 812 of `/zh/#gallery` (lashes, nails, brows), `/zh-hant/#gallery`, `/#gallery` (English names) and `/zh/eyelash-extensions-burwood/#styled-looks`, plus 1280 wide with a hovered card. Put each next to the prototype (version 3) and list every difference.
- [ ] **Step 4:** Fix differences that are mistakes; report the rest to the owner with the screenshots.
