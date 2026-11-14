# Admin, feature 1: photo management — design

Date: 2026-11-14. Status: approved by the owner 2026-11-14 (requirements by interview, 31 questions; prototype approved).
Prototype (8 phone screens): <https://claude.ai/artifact/FQNRkaHabSseTAwHc76N7z> (private to the owner).

## Why

Every photo change today needs a developer: run `scripts/photos.mjs` on a Mac, edit `src/data/photos.ts`, open a pull request. Abby must be able to add, delete, reorder and replace photos herself, on her phone.

## Who uses it

- Two people only: the administrator and Abby. First release: one address, `wangdaqian08@gmail.com`. Abby's address is added later.
- Device: iPhone X (375 × 812 CSS px, newest system iOS 16, Safari). The first release is designed for the phone only.
- Interface language: Traditional Chinese only.

## What the admin can do

Address: `/admin/`. Two tabs.

**作品集 (portfolio groups): add, delete, reorder.** Ten groups:

| Part | Groups | Ratio |
|---|---|---|
| Lashes | 整臉效果 (`face`) | 3:4 |
| Lashes | 自然款 · 濃密款 (`natural-full`), 造型款 (`styled`) | 4:3 |
| Nails | `nude-french`, `gold-mirror`, `warm-floral`, `wine-navy`, `mono-art` | 3:4 |
| Brows | `before-after`, `close-ups` | 3:4 |

- Add: the "新增圖片" button. A new photo goes to position 1 of the group.
- Delete: the cross at the top right of a photo. No confirmation dialog: the photo turns grey with a "還原" button and is removed at publish.
- Reorder: press and hold a photo, then drag. Within one group only.
- A group can be emptied; the site then hides that group's heading. No limit on the number of photos.
- `styled` is one list. The home portfolio and the lash-extensions page ("Styled looks") both show it, in the same order. The home portfolio leaves out any photo that a lash card already shows (today: Fairy).

**固定位置 (fixed places): replace only.** Eighteen places: home hero (1), home lash cards (6), service pages (11: hero and detail of each service; lash lift has a hero only). "更換" uploads a new photo; "還原" before publishing goes back to the current one. The two AI style-guide images are not in the admin.

## Upload and editing

- Accepted: photos only (JPEG, PNG, HEIC as the phone delivers them), source file at most 20 MB.
- The ratio comes from the group or place and cannot be changed.
- "編輯" opens the position screen: the photo sits behind a fixed frame of that ratio and is dragged with one finger. No zoom.
- Output, made by the program with no choice for the user: 1600 × 1200 (4:3) or 1200 × 1600 (3:4), JPEG quality 0.82, no metadata. These are the values of `scripts/photos.mjs`.
- Position can be changed only before the photo is published. A published photo: reorder, delete, change the style name; to re-crop, delete and upload again (the site keeps only the cropped file).
- Style name: an optional dropdown under the editor. Options are the existing names of that service; no free text.
  - `styled` group: 仙子, 單根層次, 人魚, 漫畫, 眼線加濃, 太陽花, 小絨花, 造型款. The name shows under the photo on the lash-extensions page. No name: the photo shows without a caption.
  - Other lash groups: the five lash-extension set names and the keratin lift. Nails: 單色, 貓眼, 極光, 法式, 定制款. Brows: 霧眉. These names are not shown on the site; they only improve the alt text.
- Alt text (English and Chinese) is generated from the style name, or from the group or place name when no style name is chosen. Abby types nothing.

## Draft, preview, publish

- Every change is a draft kept on the phone; it survives closing the page. "放棄全部更改" drops it.
- "預覽" shows the draft in the site's real phone layout, inside the admin. No preview URL.
- "發佈" sends all changes at once, as a pull request (branch `admin/photos`) for the administrator to review (owner's decision, 2026-11-14). Merging it deploys the site a few minutes later; closing it unmerged turns the change down and the admin goes back to the site. While the PR is open, later publishes are added to it.
- After publishing the admin shows one of: 已送出，等待管理員審核 / 管理員已確認，網站正在更新 / 已上線 / 管理員沒有採用上次的更改 / 發佈失敗，網站維持原樣 (with "再試一次").
- If the repository changed since the draft was started (the other person published), the publish is refused with "網站已被更新，請重新整理後再修改". The draft must be redone.

## Sign-in

Cloudflare Access (Zero Trust) in front of `/admin` and `/api/admin`: one-time code by email, session 30 days, allow-list of addresses. The API also verifies the Access token itself, so the `*.pages.dev` address is not a way in.

## Storage facts (measured 2026-11-13)

- 60 masters in the repository: 16.7 MB, average 279 KB (103–465 KB).
- Published: 723 image files, 44.5 MB, about 12 files and 0.74 MB per photo.
- No limit on the total number of photos is needed. Cloudflare Pages limits (from memory, to be checked in the owner actions): 20,000 files per site, 25 MB per file.

## Not in this release

- Video upload, and the moving part of Live Photos: version 2. The two existing videos stay; in the admin they can be reordered and deleted, not added.
- Tapping a portfolio photo to open booking: a separate site change.
- Typing new style names; zoom in the editor; moving a photo between groups; merging two people's drafts; desktop layout.

## Open facts to verify before or during the build

1. Live Photo through a web file picker: expected to deliver the still image only. The prototype has a test screen; the owner reports the result. If the phone delivers a video file, come back to the owner.
2. `main` branch protection: the admin commits straight to `main`. If protection requires a pull request, the token needs a bypass.
3. CI duration (the "few minutes"): measure on the first real publish and put the number in the "發佈中" text.
4. iOS 16 Safari on the real phone: press-and-hold drag, HEIC selection, IndexedDB draft. Checked by the owner with the list in the plan's last task.
