# Admin Photo Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A phone admin at `/admin/` where Abby adds, deletes, reorders and replaces the site's photos, previews the result and publishes it.

**Architecture:** The lists the admin edits move out of `src/data/photos.ts` into one JSON file, `src/data/photo-admin.json`; the site is built from it exactly as today. The admin page is a static page with a vanilla-TS client: it keeps a draft in IndexedDB, crops each new photo in a canvas, and publishes through three Pages Functions that verify the Cloudflare Access token and make one commit to `main` with the GitHub Git Data API. The existing CI then tests, builds and deploys.

**Tech Stack:** Astro 7 (static), Tailwind 4 tokens from `src/styles/global.css`, vanilla TypeScript, Cloudflare Pages Functions, WebCrypto, GitHub REST API, `node --test`, Playwright. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-14-admin-photos-design.md`. Prototype: <https://claude.ai/artifact/FQNRkaHabSseTAwHc76N7z>.

## Global Constraints

- Admin copy is Traditional Chinese only, written by hand in `src/i18n/admin.ts`. Names that come from data (groups, services, options, looks) are converted at build time with `toHant` from `scripts/zh-hant.mjs`.
- Target: iPhone X, 375 × 812, iOS 16 Safari. Use no web API newer than Safari 16 (no Popover API, no View Transitions, no `Object.groupBy`).
- Every control is at least 44 × 44 px. Real `<button>`, `<a>`, `<label>` + `<input>`.
- Colours and radii only through the tokens in `src/styles/global.css` (raw hex is allowed only in that file).
- Output: `4:3` → 1600 × 1200, `3:4` → 1200 × 1600, JPEG quality 0.82. Source file at most 20 MB.
- No new npm dependency.
- `/admin/` is never indexed: `noindex`, not in the sitemap, `Disallow: /admin/` in robots.txt, no language redirect, no A/B split, no look-B copy.
- Demo mode (`ADMIN_DEMO=1` or host `localhost` / `127.0.0.1`) never calls GitHub and needs no Access token. Outside demo mode an API call without a valid Access token gets 401.
- The public site built from the initial `photo-admin.json` is identical to today's.
- Unit tests must pass for every state the admin can publish: no test may pin a photo count or a photo id that the admin can change.
- Branch: `feat/admin-photos`. One commit per task.

## Review Focus

1. **Second publish while the first is still building.** The deployed `state.json` is older than the repository. Expected: the client keeps the published data and its new `base`, so the next publish is accepted, not refused as a conflict. Test in Task 5 (`afterPublish`).
2. **A deleted group photo that a fixed place still shows** (same upload used twice is impossible, but an uploaded master is deleted when unreferenced). Expected: a master is removed only when no group and no place refers to it. Tests in Task 2 (`removedMasters`).
3. **Odd source images:** smaller than the output, panorama, PNG with transparency, a file the browser cannot decode. Expected: small images are enlarged (as `sharp` cover does today), transparency becomes white, an undecodable file shows "無法讀取這張圖片" and adds nothing. Tests in Task 2 (`cropRect`) and Task 7 (E2E with a 300 × 200 PNG and a text file renamed `.jpg`).
4. **No IndexedDB** (private browsing) or a full quota. Expected: the admin works for the session and shows "這支手機無法保存草稿，關閉頁面後更改會消失". Test in Task 5 (`kv` falls back to memory).
5. **Sign-in expired during a session.** Expected: an API 401 shows "登入已過期，請重新整理頁面", and the draft stays. Test in Task 8 (E2E: route the API to 401).

## Owner actions (not code; needed before the first real publish)

1. Cloudflare Zero Trust → Access → Applications → self-hosted, for `www.abbyeyelashes.com/admin` and `www.abbyeyelashes.com/api/admin`; policy: emails `wangdaqian08@gmail.com`; session 1 month; login method one-time PIN. Copy the team domain and the application AUD tag.
2. GitHub → fine-grained token for `wangdaqian08/abby-eyelash`: Contents read/write, Actions read/write. If `main` is protected, allow this token to push.
3. Cloudflare Pages → Production variables: `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_REPO=wangdaqian08/abby-eyelash`, and the secret `ADMIN_GITHUB_TOKEN`.
4. Report the result of the Live Photo test screen in the prototype.

Task 8 writes these into `docs/OWNER-ACTIONS.md`.

## File Structure

| File | Responsibility |
|---|---|
| `src/data/photo-admin.json` (new) | What the admin edits: group lists, place overrides, uploads, style names |
| `src/data/photos.ts` (modify) | Builds the site's photo data from the JSON; exports the admin's group, place and label definitions |
| `src/lib/photo-admin.ts` (new) | Pure rules shared by client, Functions and build: crop maths, validation, paths, git blob hash |
| `src/lib/access.ts` (new) | Verifies the Cloudflare Access token; demo mode |
| `src/lib/admin-api.ts` (new) | The three API operations against GitHub, with an injectable `fetch` |
| `functions/api/admin/{blob,publish,status}.ts` (new) | Thin handlers around `admin-api.ts` |
| `src/pages/admin/index.astro`, `src/pages/admin/state.json.ts` (new) | Admin shell; build-time snapshot of the live data with thumbnails and Traditional names |
| `src/components/admin/admin-store.ts` (new) | Draft operations (pure) and the IndexedDB key-value store |
| `src/components/admin/admin-client.ts` (new) | Views: list, group, places, editor, preview, publish |
| `src/components/admin/admin-drag.ts` (new) | Press-and-hold reorder for a grid |
| `src/i18n/admin.ts` (new) | Traditional Chinese UI strings |
| `scripts/e2e-admin.mjs` (new) | Browser test of the whole flow in demo mode |

---

### Task 1: Photo lists move to `photo-admin.json`

**Files:**
- Create: `src/data/photo-admin.json`
- Modify: `src/data/photos.ts`, `src/data/photos.test.ts`, `src/components/service/StyledLooks.astro`, `src/components/home/Gallery.astro`, `scripts/photos.mjs`

**Interfaces:**
- Produces (all exported from `src/data/photos.ts`):

```ts
export type Dir = Photo['dir'];
export type AdminRatio = '4:3' | '3:4';
export interface Upload { dir: Dir; ratio: AdminRatio; where: string } // where: the group id or place key it was uploaded to
export interface AdminData { groups: Record<string, string[]>; slots: Record<string, string>; uploads: Record<string, Upload>; labels: Record<string, string> }
export const adminData: AdminData; // src/data/photo-admin.json
export const adminGroups: { id: string; dir: Dir; ratio: AdminRatio; visible: number; cols: 2 | 3; name: L10n }[]; // 10, in site order
export const adminSlots: { key: string; dir: Dir; ratio: AdminRatio; def: string; name: L10n }[]; // 18
export const adminLabels: { key: string; dir: Dir; styledOnly: boolean; name: L10n }[];
export const lookName: (id: string) => L10n | undefined; // adminData.labels[id] → label name, else the legacy name of that photo
export function uploadAlt(u: Upload, label: string | undefined): L10n;
```

- Place keys: `home-hero`; `card:<serviceId>/<optionId>` (6, from `lashCards`); `page:<serviceId>:hero` and `page:<serviceId>:detail` (11, from `servicePhotos`). A place's `ratio` and `dir` are those of its default photo `def`.
- Label keys: `look:fairy`, `look:layered`, `look:mermaid`, `look:manga`, `look:liner`, `look:sunflower`, `look:pompom` (`styledOnly: true`, names from the existing `styledLooks`: Fairy/仙子, Layered classic/单根层次, Mermaid/人鱼, Manga/漫画, Liner thickened/眼线加浓, Sunflower/太阳花, Little pompom/小绒花); `option:<serviceId>/<optionId>` for `lash-extensions/{classic-natural,classic-full,hybrid-natural,hybrid-full,styled}`, `lash-lift/keratin-lift`, `gel-nails/{solid,cat-eye,aurora,french}`, `handcrafted-nails/nail-art`, `powder-brows/powder` (names from `findOption`).

- [ ] **Step 1: Save today's build.** Run `npm run build && rm -rf /tmp/dist-before && cp -R dist /tmp/dist-before`.

- [ ] **Step 2: Rewrite the pinned tests in `src/data/photos.test.ts` as invariants.** Replace the tests named "nail groups use each of the 22 nail photos…", "every referenced id exists…", "lash portfolio…" and "brows portfolio…" with:

```ts
test('photo-admin.json: the ten groups, no unknown place, every id known with the right dir and ratio', () => {
  assert.deepEqual(Object.keys(adminData.groups).sort(), adminGroups.map((g) => g.id).sort());
  assert.equal(adminGroups.length, 10);
  assert.equal(adminSlots.length, 18);
  for (const g of adminGroups) {
    const ids = adminData.groups[g.id];
    assert.equal(new Set(ids).size, ids.length, g.id);
    for (const id of ids) {
      const p = videos[id] ? photo(videos[id].poster) : photo(id);
      assert.equal(p.dir, g.dir, id); assert.equal(p.ratio, g.ratio, id);
      assert.ok(!/^AI-generated/.test(p.alt.en), id);
    }
  }
  for (const [key, id] of Object.entries(adminData.slots)) {
    const s = adminSlots.find((x) => x.key === key)!;
    assert.ok(s, key); assert.equal(photo(id).ratio, s.ratio, key); assert.equal(photo(id).dir, s.dir, key);
  }
});
test('the site lists are built from photo-admin.json', () => {
  assert.deepEqual(styledLooks.map((l) => l.photo), adminData.groups.styled);
  const cards = new Set(lashCards.map((c) => c.photo));
  assert.deepEqual(lashGroups.find((g) => g.id === 'styled')!.items, adminData.groups.styled.filter((id) => !cards.has(id)));
  assert.deepEqual(nailGroups.map((g) => g.items), nailGroups.map((g) => adminData.groups[g.id]));
  assert.deepEqual(browGroups.map((g) => g.items), browGroups.map((g) => adminData.groups[g.id]));
});
test('an upload is a photo with a generated alt; a place override wins and drops the old position tweak', () => {
  const u = { dir: 'lash', ratio: '4:3', where: 'styled' } as const;
  assert.deepEqual(uploadAlt(u, 'look:mermaid'), { en: 'Mermaid – lash extensions by Abby, Burwood', zh: '人鱼，Abby 嫁接睫毛，Burwood' });
  assert.equal(uploadAlt(u, undefined).en, 'Styled sets – lash extensions by Abby, Burwood');
  assert.equal(uploadAlt({ dir: 'nails', ratio: '3:4', where: 'page:gel-nails:hero' }, undefined).zh, '凝胶美甲，Abby 美甲，Burwood');
  assert.equal(lookName('styled-fairy')!.en, 'Fairy');
  assert.equal(lookName('hero-mirror'), undefined);
});
```

In the remaining tests remove `assert.equal(styledLooks.length, 12)` and `assert.equal(lashCards.length, 6)` stays (cards are fixed places).

- [ ] **Step 3: Run `node --test src/data/photos.test.ts`.** Expected: FAIL, `adminData` is not exported.

- [ ] **Step 4: Create `src/data/photo-admin.json`** with `groups` holding today's ten lists in today's order (`styled` = the twelve `styledLooks` photos in order, Fairy included), and `"slots": {}, "uploads": {}, "labels": {}`.

- [ ] **Step 5: Change `src/data/photos.ts`.**
  - Group `items` come from `adminData.groups[id]`; `lashGroups` `styled` filters out lash-card photos.
  - `styledLooks` = `adminData.groups.styled.map((photo) => ({ photo, name: lookName(photo) }))`; `name` becomes optional.
  - `homeHero`, each `lashCards[i].photo` and each `servicePhotos[*].hero/detail` read `adminData.slots[key]` first. When a place is overridden, its `heroPos` / `detailPos` is dropped (the tweak belongs to the old photo); the aspect class stays.
  - `photos` gains one entry per upload: `{ id, dir, source: '', ratio, alt: uploadAlt(u, adminData.labels[id]) }`.
  - `uploadAlt`: `X` = label name, else the name of the group or place in `where`; noun by `dir`: lash `lash extensions` / `嫁接睫毛`, nails `nails` / `美甲`, brows `powder brows` / `雾眉`; result `{ en: `${X.en} – ${noun.en} by Abby, Burwood`, zh: `${X.zh}，Abby ${noun.zh}，Burwood` }`. A place name is its service name (`page:*`), its option name (`card:*`), or Home / 首页 (`home-hero`).

- [ ] **Step 6: `StyledLooks.astro`** renders `<figcaption>` only when `l.name` exists. **`Gallery.astro`** skips a group with no items. **`scripts/photos.mjs`** skips a manifest entry whose `source` is empty.

- [ ] **Step 7: Run `node --test src/data/` .** Expected: PASS.

- [ ] **Step 8: Prove the site did not change.** Run `npm run build && diff -r --exclude=_astro /tmp/dist-before dist`. Expected: no output.

- [ ] **Step 9: Commit** `Photos: lists the admin edits move to photo-admin.json`.

---

### Task 2: Shared rules — crop, validation, paths, hash

**Files:**
- Create: `src/lib/photo-admin.ts`, `src/lib/photo-admin.test.ts`

**Interfaces:**
- Consumes: `AdminData`, `AdminRatio`, `Dir`, `adminGroups`, `adminSlots`, `adminLabels`, `photo`, `videos` from Task 1.
- Produces:

```ts
export const OUT: Record<AdminRatio, [number, number]>;   // { '4:3': [1600, 1200], '3:4': [1200, 1600] }
export const JPEG_QUALITY = 0.82;
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_BLOB_BASE64 = 2_000_000;                 // characters; a 1600 × 1200 JPEG at 0.82 is far below this
export const MAX_NEW_PER_PUBLISH = 20;
export const UPLOAD_ID: RegExp;                           // /^u-[a-z0-9]{10}$/
export const ADMIN_JSON = 'src/data/photo-admin.json';
/** Source rectangle that covers the ratio; fx, fy in 0..1 choose which part is kept (0.5 = centre). */
export function cropRect(sw: number, sh: number, ratio: AdminRatio, fx: number, fy: number): { sx: number; sy: number; sw: number; sh: number };
export function masterPath(id: string, dir: Dir): string; // src/assets/photos/<dir>/<id>.jpg
/** null when `next` may be published over `prev`; else 'groups' | 'item' | 'duplicate' | 'slot' | 'upload' | 'label' | 'too-many'. */
export function validateAdmin(next: AdminData, prev: AdminData, newBlobs: ReadonlySet<string>): string | null;
/** Master paths of uploads that are in prev and not in next. */
export function removedMasters(prev: AdminData, next: AdminData): string[];
export function gitBlobSha(text: string): Promise<string>; // sha1('blob ' + byteLength + '\0' + text), hex
```

- `validateAdmin` rules: group keys are exactly the ten ids (`groups`); every group item is a legacy photo or video of that group's `dir` and `ratio`, or an upload in `next.uploads` with them (`item`); no id twice in a group (`duplicate`); every place key exists and its photo has the place's `dir` and `ratio` (`slot`); every upload id matches `UPLOAD_ID`, is referenced by a group or place, and an upload not in `prev.uploads` is in `newBlobs` and the reverse (`upload`); at most `MAX_NEW_PER_PUBLISH` new uploads (`too-many`); every label key is a referenced id and its value is an `adminLabels` key of the same `dir`, `styledOnly` labels only on ids in `groups.styled` (`label`).

- [ ] **Step 1: Write `src/lib/photo-admin.test.ts`.**

```ts
test('cropRect covers the ratio and the focus chooses the kept part', () => {
  assert.deepEqual(cropRect(4000, 3000, '4:3', 0.5, 0.5), { sx: 0, sy: 0, sw: 4000, sh: 3000 });
  assert.deepEqual(cropRect(3000, 4000, '4:3', 0.5, 0),   { sx: 0, sy: 0, sw: 3000, sh: 2250 });
  assert.deepEqual(cropRect(3000, 4000, '4:3', 0.5, 0.5), { sx: 0, sy: 875, sw: 3000, sh: 2250 });
  assert.deepEqual(cropRect(3000, 4000, '4:3', 0.5, 1),   { sx: 0, sy: 1750, sw: 3000, sh: 2250 });
  assert.deepEqual(cropRect(4000, 3000, '3:4', 1, 0.5),   { sx: 1750, sy: 0, sw: 2250, sh: 3000 });
  assert.deepEqual(cropRect(300, 200, '4:3', 9, -3),      { sx: 33, sy: 0, sw: 267, sh: 200 }); // focus clamped to 0..1; small sources allowed
});
test('gitBlobSha matches git hash-object', async () => {
  assert.equal(await gitBlobSha('hello\n'), 'ce013625030ba8dba906f756967f9e9ca394464a');
});
test('validateAdmin accepts the live data and every single admin action', () => {
  const live = structuredClone(adminData);
  assert.equal(validateAdmin(live, live, new Set()), null);
  const add = structuredClone(live); add.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; add.groups.styled.unshift('u-abcdefghij'); add.labels['u-abcdefghij'] = 'look:mermaid';
  assert.equal(validateAdmin(add, live, new Set(['u-abcdefghij'])), null);
  const empty = structuredClone(live); empty.groups['close-ups'] = [];
  assert.equal(validateAdmin(empty, live, new Set()), null);
  const swap = structuredClone(live); swap.uploads['u-0000000000'] = { dir: 'lash', ratio: '3:4', where: 'home-hero' }; swap.slots['home-hero'] = 'u-0000000000';
  assert.equal(validateAdmin(swap, live, new Set(['u-0000000000'])), null);
});
test('validateAdmin names what is wrong', () => {
  const live = structuredClone(adminData);
  const bad = (edit: (d: AdminData) => void, blobs: string[] = []) => { const d = structuredClone(live); edit(d); return validateAdmin(d, live, new Set(blobs)); };
  assert.equal(bad((d) => { delete d.groups.styled; }), 'groups');
  assert.equal(bad((d) => { d.groups.styled.push('nail-6920'); }), 'item');          // wrong dir and ratio
  assert.equal(bad((d) => { d.groups.styled.push('../../x'); }), 'item');
  assert.equal(bad((d) => { d.groups.styled.push(d.groups.styled[0]); }), 'duplicate');
  assert.equal(bad((d) => { d.slots['home-hero'] = 'styled-fairy'; }), 'slot');       // 4:3 into a 3:4 place
  assert.equal(bad((d) => { d.slots['nope'] = 'hero-mirror'; }), 'slot');
  assert.equal(bad((d) => { d.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; d.groups.styled.push('u-abcdefghij'); }), 'upload'); // no blob
  assert.equal(bad((d) => { d.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; }, ['u-abcdefghij']), 'upload');                  // unreferenced
  assert.equal(bad((d) => { d.labels['classic-natural-2'] = 'look:mermaid'; }), 'label'); // a styled-only name outside the styled group
});
test('removedMasters: only uploads that nothing refers to any more', () => {
  const prev = structuredClone(adminData); prev.uploads['u-abcdefghij'] = { dir: 'lash', ratio: '4:3', where: 'styled' }; prev.groups.styled.unshift('u-abcdefghij');
  const next = structuredClone(adminData);
  assert.deepEqual(removedMasters(prev, next), ['src/assets/photos/lash/u-abcdefghij.jpg']);
  next.groups.styled = next.groups.styled.filter((id) => id !== 'styled-fairy'); // a legacy photo: its master stays
  assert.deepEqual(removedMasters(prev, next), ['src/assets/photos/lash/u-abcdefghij.jpg']);
});
```

- [ ] **Step 2: Run `node --test src/lib/photo-admin.test.ts`.** Expected: FAIL, module not found.
- [ ] **Step 3: Implement `src/lib/photo-admin.ts`.** `cropRect` rounds with `Math.round`; `gitBlobSha` uses `crypto.subtle.digest('SHA-1', …)` (works in Node 24, Workers and Safari).
- [ ] **Step 4: Run the test.** Expected: PASS.
- [ ] **Step 5: Commit** `Admin: shared crop, validation and hash rules`.

---

### Task 3: Access check and the publish API

**Files:**
- Create: `src/lib/access.ts`, `src/lib/access.test.ts`, `src/lib/admin-api.ts`, `src/lib/admin-api.test.ts`, `functions/api/admin/blob.ts`, `functions/api/admin/publish.ts`, `functions/api/admin/status.ts`
- Modify: `package.json` (`serve`: add `--binding ADMIN_DEMO=1`)

**Interfaces:**
- Consumes: Task 2 exports.
- Produces:

```ts
// src/lib/access.ts
export interface AdminEnv { ADMIN_DEMO?: string; ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string; ADMIN_GITHUB_TOKEN?: string; ADMIN_REPO?: string }
export const adminDemo: (env: AdminEnv, url: string) => boolean; // ADMIN_DEMO === '1' or host localhost / 127.0.0.1
/** The signed-in email, or null. Demo: 'demo@localhost'. Else verifies the Cf-Access-Jwt-Assertion header. */
export function adminEmail(request: Request, env: AdminEnv, fetcher?: typeof fetch): Promise<string | null>;

// src/lib/admin-api.ts — each returns { status, body }; `fetcher` is GitHub's fetch
export type Reply = { status: number; body: Record<string, unknown> };
export function putBlob(env: AdminEnv, demo: boolean, base64: string, fetcher?: typeof fetch): Promise<Reply>;       // 200 { sha }
export function publish(env: AdminEnv, demo: boolean, email: string, body: unknown, fetcher?: typeof fetch): Promise<Reply>; // 200 { commit, base }
export function buildState(env: AdminEnv, demo: boolean, commit: string, rerun: boolean, fetcher?: typeof fetch): Promise<Reply>; // 200 { state: 'building' | 'live' | 'failed' }
```

- HTTP: `POST /api/admin/blob` (body: base64 text), `POST /api/admin/publish` (JSON `{ base: string, data: AdminData, blobs: Record<uploadId, sha> }`), `GET /api/admin/status?commit=<sha>`, `POST /api/admin/status?commit=<sha>` (re-run failed jobs). Every handler: `adminEmail` null → `401 { error: 'signin' }`; all replies `cache-control: no-store`.
- Token check (`adminEmail`): header `alg` is `RS256`; key by `kid` from `https://<ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs` (keep the keys in a module variable for the life of the isolate); signature valid; `iss === 'https://<ACCESS_TEAM_DOMAIN>'`; `aud` contains `ACCESS_AUD`; `exp` in the future. Missing `ACCESS_*` outside demo → null.
- `putBlob`: longer than `MAX_BLOB_BASE64` → `413 { error: 'too-large' }`; not starting with `/9j/` (JPEG) → `400 { error: 'not-jpeg' }`; then `POST /repos/<repo>/git/blobs` `{ content, encoding: 'base64' }`. Demo: `{ sha: 'd'.repeat(40) }`.
- `publish`, in order: body shape wrong or a blob sha not 40 hex → `400 { error: 'bad-request' }`; `GET git/ref/heads/main` → head; `GET contents/src/data/photo-admin.json?ref=<head>` → `prev` and its `sha`; `sha !== base` → `409 { error: 'conflict' }`; `validateAdmin(data, prev, new Set(Object.keys(blobs)))` → `400 { error: <code> }`; `GET git/commits/<head>` → tree; `POST git/trees` with `base_tree` and entries: the JSON (`content`: `JSON.stringify(data, null, 2) + '\n'`), one `{ path: masterPath(id, dir), mode: '100644', type: 'blob', sha }` per new upload, one `{ path, mode: '100644', type: 'blob', sha: null }` per `removedMasters`; `POST git/commits` (`message`: `Photos: published from the admin by <email>`, parent head); `PATCH git/refs/heads/main` `{ sha }`, a 422 → `409 { error: 'conflict' }`; reply `{ commit, base: await gitBlobSha(json) }`. Any other GitHub failure → `502 { error: 'github' }`. Demo: validate against the bundled `adminData`, reply `{ commit: 'demo', base: await gitBlobSha(json) }`.
- `buildState`: `commit` not 40 hex and not `demo` → 400; `GET actions/runs?head_sha=<commit>&event=push`; no run or `status !== 'completed'` → `building`; `conclusion === 'success'` → `live`; else `failed`. `rerun` on a failed run: `POST actions/runs/<id>/rerun-failed-jobs`, reply `building`. Demo: `live`.

- [ ] **Step 1: Write `src/lib/access.test.ts`.** Make an RSA key with `crypto.subtle.generateKey`, sign tokens by hand, serve the JWK from a fake `fetcher`. Tests: `'a valid token gives the email'`; `'wrong audience, wrong issuer, expired, bad signature, alg none, no header: null'` (one assertion each); `'demo mode needs no token'` (`ADMIN_DEMO: '1'` → `'demo@localhost'`); `'no ACCESS_* outside demo: null'` (request URL `https://www.abbyeyelashes.com/api/admin/publish`).

- [ ] **Step 2: Write `src/lib/admin-api.test.ts`** with a fake `fetcher` that records calls and answers from a table. Tests:

```ts
test('publish: one commit with the JSON, the new master and the removed master', async () => { /* base matches; expect the POST git/trees body to hold exactly ADMIN_JSON, src/assets/photos/lash/u-abcdefghij.jpg (sha from blobs) and the removed path with sha null; reply 200 with commit and base = gitBlobSha(json) */ });
test('publish: the repository moved on → 409 conflict, nothing written', async () => { /* contents sha ≠ base; no POST or PATCH recorded */ });
test('publish: main moved between read and write (PATCH 422) → 409 conflict', async () => {});
test('publish: invalid data → 400 with the validateAdmin code, nothing written', async () => {});
test('publish: demo mode calls no fetch at all', async () => {});
test('putBlob: not a JPEG → 400; over the limit → 413; a JPEG → the blob sha', async () => {});
test('buildState: no run yet and running → building; success → live; failure → failed; rerun posts rerun-failed-jobs', async () => {});
```

- [ ] **Step 3: Run `node --test src/lib/access.test.ts src/lib/admin-api.test.ts`.** Expected: FAIL, modules not found.
- [ ] **Step 4: Implement `src/lib/access.ts`, `src/lib/admin-api.ts`** (one private `gh(env, fetcher, method, path, body?)` helper: `Authorization: Bearer`, `Accept: application/vnd.github+json`, `User-Agent: abby-admin`) **and the three handlers** in the style of `functions/api/availability.ts`.
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Check the handlers by hand.** `npm run start`, then `curl -s -X POST localhost:8788/api/admin/blob -d 'abc'` → `{"error":"not-jpeg"}`; `curl -s 'localhost:8788/api/admin/status?commit=demo'` → `{"state":"live"}`.
- [ ] **Step 7: Commit** `Admin API: Access check, blob upload, publish, build status`.

---

### Task 4: Admin shell, live snapshot, route exclusions

**Files:**
- Create: `src/pages/admin/index.astro`, `src/pages/admin/state.json.ts`, `src/i18n/admin.ts`
- Modify: `src/lib/i18n.ts` (`routable`), `src/lib/ab-test.ts` (`neverSplit`), `src/pages/robots.txt.ts`, `astro.config.mjs` (sitemap filter), `src/pages/look-b/[...path].astro` (no `/admin` copy), and the tests `src/lib/i18n.test.ts`, `src/lib/ab-test.test.ts`, `scripts/check-seo.mjs`

**Interfaces:**
- Produces `GET /admin/state.json` (static, built once):

```ts
export interface AdminState {
  base: string;                    // gitBlobSha of the photo-admin.json file as built
  data: AdminData;
  groups: { id: string; part: 'lashes' | 'nails' | 'brows'; name: string; dir: Dir; ratio: AdminRatio; visible: number; cols: 2 | 3 }[];
  slots: { key: string; section: 'hero' | 'cards' | string /* a service name */; name: string; dir: Dir; ratio: AdminRatio; def: string }[];
  labels: { key: string; dir: Dir; styledOnly: boolean; name: string }[];
  photos: Record<string, { thumb: string; video?: true; name?: string }>; // every id in a group or place; name = lookName
}
```

  All `name` values are Traditional Chinese (`toHant` of the `zh` text). `thumb` = `getImage({ src: photoSrc(id), width: 480, format: 'webp' })`; a video's thumb is its poster.
- Produces `src/i18n/admin.ts`: `export const admin = { … }`, one flat table of Traditional Chinese strings, keys used by Tasks 6–8. The copy is the prototype's.
- `index.astro`: own minimal document (not `BaseLayout`): `lang="zh-Hant"`, `<meta name="robots" content="noindex, nofollow">`, viewport with `viewport-fit=cover`, `global.css`, `<main data-admin>`, and `<script>import { start } from '../../components/admin/admin-client'; start(document.querySelector('[data-admin]')!);</script>`. Until Task 6 the client is a stub that renders the title "圖片管理".

- [ ] **Step 1: Add the failing assertions.** `src/lib/i18n.test.ts`: `assert.equal(routable('/admin/'), false)` and `routable('/admin/state.json')` false. `src/lib/ab-test.test.ts`: `assert.equal(neverSplit('/admin/'), true)`. `scripts/check-seo.mjs`: `dist/admin/index.html` has `noindex`, no sitemap entry contains `/admin`, `robots.txt` has `Disallow: /admin/` in every group, and `dist/look-b/admin` does not exist.
- [ ] **Step 2: Run `npm run test:unit`.** Expected: FAIL on the two new assertions.
- [ ] **Step 3: Implement** the files and the five exclusions.
- [ ] **Step 4: Run `npm run test:unit && npm run build && npm run check:seo`.** Expected: PASS. Then `node -e "const s=require('./dist/admin/state.json');console.log(s.groups.length,s.slots.length,Object.keys(s.photos).length>60,s.groups[2].name)"` → `10 18 true 造型款`.
- [ ] **Step 5: Commit** `Admin: page shell, live snapshot, kept out of search, language and A/B routing`.

---

### Task 5: Draft store

**Files:**
- Create: `src/components/admin/admin-store.ts`, `src/components/admin/admin-store.test.ts`

**Interfaces:**
- Consumes: `AdminData`, `Upload`, `AdminState`.
- Produces:

```ts
export interface Draft {
  base: string; data: AdminData;                 // data includes not-yet-published uploads and still lists items marked removed
  removed: string[];                             // `${groupId}/${id}`
  focus: Record<string, { x: number; y: number }>; // unpublished uploads only; default { x: 0.5, y: 0.5 }
  pending?: { commit: string; state: 'building' | 'live' | 'failed' }; // the last publish
}
export function fromState(s: AdminState): Draft;
export function newId(): string;                                   // matches UPLOAD_ID
export function addToGroup(d: Draft, groupId: string, id: string, u: Upload): Draft;   // position 0
export function replaceSlot(d: Draft, key: string, id: string, u: Upload): Draft;      // drops the upload it replaces, if unpublished
export function resetSlot(d: Draft, live: AdminData, key: string): Draft;              // back to the live value
export function toggleRemoved(d: Draft, groupId: string, id: string): Draft;           // an unpublished upload is dropped at once instead
export function move(d: Draft, groupId: string, from: number, to: number): Draft;
export function setLabel(d: Draft, id: string, key: string): Draft;                    // '' clears
export function setFocus(d: Draft, id: string, x: number, y: number): Draft;
export function finalData(d: Draft): AdminData;                    // removed applied; unreferenced uploads and their labels dropped
export function changes(d: Draft, live: AdminData): { added: string[]; removed: string[]; reordered: string[]; replaced: string[]; relabelled: string[] }; // ids, group ids, place keys
export function isDirty(d: Draft, live: AdminData): boolean;
/** After a 200 from /publish: the published data becomes the clean local state on the new base. */
export function afterPublish(d: Draft, commit: string, base: string): Draft;
/** Which state the page starts from: the stored draft, unless it is clean and the deployed snapshot has caught up or moved on. */
export function resume(stored: Draft | undefined, s: AdminState): { draft: Draft; stale: boolean };
export const kv: { get<T>(k: string): Promise<T | undefined>; set(k: string, v: unknown): Promise<void>; del(k: string): Promise<void>; persistent: boolean };
```

- `kv`: IndexedDB database `abby-admin`, object store `kv`; keys `draft` and `src:<uploadId>` (the picked `File`). When IndexedDB is missing or `open` fails: an in-memory `Map`, `persistent = false`.
- `resume`: no stored draft → `fromState(s)`. Stored and dirty with `stored.base === s.base` → the stored draft. Stored and clean → the stored draft while `stored.pending?.state === 'building'` or `stored.base !== s.base` and it has `pending` (the deploy has not caught up); else `fromState(s)`. Stored, dirty, `stored.base !== s.base`, no `pending` → the stored draft with `stale: true` (the publish will be refused; the client shows the "網站已被更新" notice at once).

- [ ] **Step 1: Write `admin-store.test.ts`.** Use a small fixture `AdminState`. Tests (each with exact arrays): `'addToGroup puts the upload first'`; `'toggleRemoved marks and restores a live photo, and drops an unpublished upload with its label and focus'`; `'move reorders within the group only'`; `'replaceSlot twice keeps one upload'`; `'finalData applies removals and drops unreferenced uploads'`; `'changes lists added, removed, reordered groups, replaced places'`; `'afterPublish: clean, on the new base, pending building'`; `'resume keeps the published state until the snapshot catches up, then takes the snapshot'` (Review Focus 1); `'resume flags a dirty draft on an old base as stale'`; `'kv falls back to memory when indexedDB is undefined'` (Review Focus 4: `persistent === false`, `set` then `get` returns the value).
- [ ] **Step 2: Run `node --test src/components/admin/admin-store.test.ts`.** Expected: FAIL.
- [ ] **Step 3: Implement.** Every operation returns a new `Draft` (no mutation).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `Admin: draft operations and the on-phone store`.

---

### Task 6: List, group and places views; add, delete, restore, reorder

**Files:**
- Create: `src/components/admin/admin-client.ts`, `src/components/admin/admin-drag.ts`, `scripts/e2e-admin.mjs`, `scripts/fixtures/admin-landscape.jpg` (2000 × 1500), `scripts/fixtures/admin-portrait.jpg` (1500 × 2000), `scripts/fixtures/admin-small.png` (300 × 200, transparent), `scripts/fixtures/admin-broken.jpg` (a text file)
- Modify: `scripts/e2e.mjs` (run `node scripts/e2e-admin.mjs` once, in part 1), `src/styles/global.css` only if a token is missing

**Interfaces:**
- Consumes: Task 4 `AdminState`, `admin` strings; Task 5 store.
- Produces:

```ts
// admin-client.ts
export function start(root: HTMLElement): Promise<void>;
// admin-drag.ts
/** Press and hold (350 ms) a child of `grid` that matches `item`, then drag; `onMove(from, to)` once on release. */
export function sortable(grid: HTMLElement, item: string, onMove: (from: number, to: number) => void): void;
```

- Stable hooks for tests: `[data-view="list|group|slots|edit|preview|publish"]`, `[data-group="<id>"]`, `[data-tile="<id>"]`, `[data-slot="<key>"]`, `[data-action="add|remove|restore|edit|replace|reset|preview|publish|discard|done|cancel|retry"]`, `[data-banner]`, `<input type="file" data-file accept="image/jpeg,image/png,image/heic,image/heif" hidden>`.
- Views (layout and copy: prototype screens 01, 02, 03, 05): hash routes `#/` (tabs 作品集 / 固定位置), `#/g/<groupId>`, `#/s`. The group view marks the end of the first row with the line "以上 N 張顯示在首頁第一排" where N = the group's `visible`.
- Picking a file: larger than `MAX_SOURCE_BYTES` → "圖片超過 20 MB"; not decodable (`createImageBitmap` or `<img>` fails) → "無法讀取這張圖片"; else `kv.set('src:' + id, file)` and `addToGroup` / `replaceSlot`. Thumbnails of unpublished uploads: an object URL of the source with `object-fit: cover; object-position: <x*100>% <y*100>%`.
- `sortable`: pointer events; starting the drag needs 350 ms without moving more than 8 px; while dragging, a non-passive `touchmove` listener calls `preventDefault`; the tile follows the finger, a dashed placeholder marks the target found with `document.elementFromPoint`; the page scrolls when the finger is within 60 px of the top or bottom; tiles have `-webkit-touch-callout: none; user-select: none`. The buttons on a tile are hidden while dragging.

- [ ] **Step 1: Write `scripts/e2e-admin.mjs`** (Playwright, viewport 375 × 812, `hasTouch: true`, `isMobile: true`, `BASE` from the environment). This task's checks:
  1. `/admin/` shows ten `[data-group]` rows and, on 固定位置, eighteen `[data-slot]` rows.
  2. In `styled`: `setInputFiles` with `admin-landscape.jpg` → a new first tile with the text "新增 · 未發佈"; the banner says "草稿：1 項更改尚未發佈".
  3. Remove the second tile → it shows `[data-action="restore"]`; restore → gone.
  4. Press and hold the third tile for 400 ms, move it over the first, release → it is first; reload the page → the order and the new tile are still there.
  5. `admin-small.png` is accepted; `admin-broken.jpg` shows "無法讀取這張圖片" and adds no tile.
  6. On 固定位置: replace `home-hero` with `admin-portrait.jpg` → the row shows "已更換 · 未發佈"; `[data-action="reset"]` brings the old thumbnail back.
- [ ] **Step 2: Run `npm run build && npm run serve` in one terminal, `node scripts/e2e-admin.mjs` in another.** Expected: FAIL at check 1.
- [ ] **Step 3: Implement `admin-drag.ts` and the three views in `admin-client.ts`.**
- [ ] **Step 4: Run the E2E script.** Expected: PASS. Run `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `Admin: groups and fixed places — add, delete, restore, reorder`.

---

### Task 7: Editor — position, style name, and the cropped output

**Files:**
- Modify: `src/components/admin/admin-client.ts`, `scripts/e2e-admin.mjs`
- Create: `src/components/admin/admin-image.ts`

**Interfaces:**
- Consumes: `cropRect`, `OUT`, `JPEG_QUALITY` (Task 2); `setFocus`, `setLabel` (Task 5).
- Produces:

```ts
// admin-image.ts
/** The master as base64 (no data: prefix): the source cropped with cropRect and scaled to OUT[ratio], on white, JPEG at JPEG_QUALITY. */
export function render(source: Blob, ratio: AdminRatio, focus: { x: number; y: number }): Promise<string>;
```

- Editor view `#/e/<id>` (prototype screen 04): a frame of the ratio, 343 px wide; the photo scaled to cover the frame and shown beyond it, dimmed; one-finger drag moves it along the axis that has spare room; "重設置中" sets 0.5 / 0.5; the read-out is "垂直位置 N%" or "水平位置 N%". For a published photo the frame shows the thumbnail, drag is off, and the note reads "已上線的圖片不能重新裁切；要重新裁切請刪除後再上傳". The dropdown lists "不選擇" and the `labels` of the photo's `dir` (`styledOnly` only in the `styled` group). 完成 saves, 取消 does not.
- `render`: decode with `createImageBitmap(source)`, fall back to an `<img>` element; draw into a canvas of `OUT[ratio]` after `fillRect` white, `imageSmoothingQuality = 'high'`; `canvas.toBlob('image/jpeg', JPEG_QUALITY)`; base64 with `FileReader`.

- [ ] **Step 1: Extend `scripts/e2e-admin.mjs`.**
  7. Open the editor of the new `styled` upload (source 2000 × 1500 into 4:3: no spare room) → the read-out is hidden and dragging changes nothing. Upload `admin-portrait.jpg` into `styled`, open its editor, drag down by 60 px → the read-out is below 50%; choose 人魚; 完成 → the tile shows 人魚.
  8. In the page, `render` the portrait fixture at focus y = 0 and y = 1: both decode to 1600 × 1200 and their base64 differ; the PNG fixture renders to 1600 × 1200 with a white corner pixel (Review Focus 3).
  9. The editor of a published tile has no drag and shows the "已上線的圖片不能重新裁切" note; changing its style name marks the draft.
- [ ] **Step 2: Run it.** Expected: FAIL at check 7.
- [ ] **Step 3: Implement `admin-image.ts` and the editor view.**
- [ ] **Step 4: Run the E2E script and `npm test`.** Expected: PASS.
- [ ] **Step 5: Commit** `Admin: position editor, style name, cropped output`.

---

### Task 8: Preview, publish, status; documents; phone check

**Files:**
- Modify: `src/components/admin/admin-client.ts`, `scripts/e2e-admin.mjs`, `docs/OWNER-ACTIONS.md`, `docs/DEPLOY-CHECKLIST.md`, `README.md` (one paragraph: what `/admin/` is and where its data lives)

**Interfaces:**
- Consumes: Task 3 HTTP API; `finalData`, `changes`, `afterPublish`, `resume` (Task 5); `render` (Task 7).

- Preview view `#/p` (prototype screen 06): for every group in `changes().added/removed/reordered` the site's grid (that group's `cols`, the first `visible` tiles, then "顯示全部 N 張"); for `styled` also the lash-page grid with captions; for every replaced place the photo at the place's ratio. Header "預覽 · 尚未發佈，客人還看不到".
- Publish view `#/x` (prototype screen 07): the change list, "確認發佈", "放棄全部更改" (asks once: "確定放棄全部更改？").
- 確認發佈: for each new upload `render` then `POST /api/admin/blob` (progress "上傳中 2 / 5"); then `POST /api/admin/publish`; on 200 `afterPublish`, delete the `src:*` blobs only when the snapshot has caught up, and poll `GET /api/admin/status` every 20 s while the page is visible. Errors: 401 → "登入已過期，請重新整理頁面"; 409 → "網站已被更新，請重新整理後再修改" with a button that drops the draft and reloads; 400 / 413 / 502 / network → "發佈沒有成功，草稿仍然保留，請稍後再試". 發佈 is disabled while `pending.state === 'building'`.
- Banner on the list view: 發佈中 ("網站正在更新，約需幾分鐘") / 已上線 / 發佈失敗，網站維持原樣 with "再試一次" (`POST /api/admin/status`). `kv.persistent === false` adds the line "這支手機無法保存草稿，關閉頁面後更改會消失".

- [ ] **Step 1: Extend `scripts/e2e-admin.mjs`.**
  10. Preview shows the `styled` grid with the uploaded tile first and without the tile marked removed.
  11. 確認發佈 → two `/api/admin/blob` requests and one `/api/admin/publish` whose JSON has both upload ids in `data.uploads` and in `blobs`; the banner becomes 已上線; the draft banner is gone; after a reload the list still shows the published order (the snapshot is old, the local state wins).
  12. With `page.route` answering `/api/admin/publish` with 409: the "網站已被更新" message and its button; with 401: "登入已過期，請重新整理頁面" and the draft is still there after a reload (Review Focus 5).
  13. 放棄全部更改 → the list equals the snapshot.
- [ ] **Step 2: Run it.** Expected: FAIL at check 10.
- [ ] **Step 3: Implement the two views, publishing and the banner.**
- [ ] **Step 4: Run `npm test` and `npm run check:layout`.** Expected: PASS.
- [ ] **Step 5: Write the documents.** `docs/OWNER-ACTIONS.md`: the four owner actions above, each with the exact menu path and the value to copy. `docs/DEPLOY-CHECKLIST.md`: the four variables, and the check "open `https://www.abbyeyelashes.com/admin/` in a private window: Cloudflare asks for the email code; `curl -X POST https://abby-eyelash.pages.dev/api/admin/publish` answers 401".
- [ ] **Step 6: Phone check, by the owner, on the preview deployment of the pull request** (demo mode cannot be used there; set `ADMIN_DEMO=1` as a Preview variable for this check and remove it afterwards). Record each line as pass or fail in the pull request:
  1. Pick a HEIC photo from the library: a tile appears.
  2. Press and hold a tile, drag it two rows up while the page scrolls: it lands where released; no system "save image" menu appears.
  3. Drag in the editor follows the finger; 完成 keeps the position.
  4. Close Safari, open `/admin/` again: the draft is still there.
  5. Every button can be hit with a thumb; nothing is hidden under the home indicator.
- [ ] **Step 7: Commit** `Admin: preview, publish, build status; owner documents`.

---

## After the plan

- First real publish: measure the time from 確認發佈 to 已上線 and put the number into the "發佈中" text (spec, open fact 3).
- Version 2 (not planned here): video upload and Live Photo motion; tap a portfolio photo to book.
