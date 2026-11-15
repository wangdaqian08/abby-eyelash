# Portfolio photos link to booking: design

Date: 2026-11-15. Status: waiting for the owner's approval.
Prototype (version 3, option C chosen): <https://claude.ai/artifact/5FUiBM2D4SwodZWpDZRtKj> (private to the owner).

## Why

The site is live. None of the portfolio photos can be clicked. A visitor who likes a photo has to find the same style again in the booking menu. Each photo should show which style it is, and one tap should open the booking page with that service and style already chosen. Abby sets which style a photo is in the admin (`/admin/`), for new uploads and for existing photos.

## Goals, non-goals, anti-goals

- Goal: every photo in the home portfolio and in the styled-looks section of the lash-extensions page opens `/book` with the photo's service, and its style when one is set.
- Goal: the style name shows next to the photo without covering any of it.
- Non-goals: the six "lash looks" cards on the home page (they already link to booking); the hero and detail photos of the home page and service pages (those pages already have a Book button); a large-photo viewer.
- Anti-goals: anything that harms SEO (changed alt text, image URLs or sizes, layout shift, links that need JavaScript, new indexable duplicate pages); a look that differs from the current site style.

## Approaches considered

- A: name as a text line under the photo. No cover, but text and photo look loose, like a product list. Rejected by the owner.
- B: name as a chip on the photo (bottom left). Tiles unchanged, but on small tiles the chip covers part of the photo. Rejected by the owner.
- **C (chosen): photo card with a name bar.** The photo and a slim name bar are one white rounded card. Nothing covers the photo. Same family as the existing "lash looks" cards.
- D: tiles unchanged, tap opens a sheet with the full photo and a Book button. One extra tap, and no sign that photos can be tapped. Not chosen.

## Design

### What each photo shows and opens

The admin's style name (`labels` in `src/data/photo-admin.json`, keys from `adminLabels`) decides:

| Style set on the photo | Name bar shows | Link |
|---|---|---|
| A booking option, `option:<service>/<option>` | the option name (for `handcrafted-nails/nail-art`: the service name 手绘造型, since 定制款 alone means nothing) | `/book?service=<service>&option=<option>` |
| A look, `look:<id>` (仙子, 人鱼 …), or a legacy look name (`legacyLooks`, styled group) | the look name | `/book?service=lash-extensions&option=styled&look=<photo id>`; the booking page puts "想做的款式：<look name>" into the notes field |
| Nothing | the part's service name, in the muted colour | `/book?service=<part service>`, no option chosen |

Part service: lashes `lash-extensions`, nails `gel-nails`, brows `powder-brows`. Links use the page's language prefix (`localePath`).

**Powder brows: no name bar** (owner, 2026-11-15: there is only one brows style). A brows photo is a plain tile as today, but the tile is a link to `/book?service=powder-brows&option=powder`.

**Videos:** tapping the picture still plays and pauses it (unchanged). The name bar is the link. The brows video has no bar, so it has no link; the part's existing "Book brows →" link stays.

### Look (from the prototype, option C)

- Card: `surface-3` background, `rounded-field` corners, soft shadow. The photo keeps its ratio, sizes and `Picture` settings.
- Name bar: one line, 12 px (11 px in the three-column nail and brow grids), medium weight, ellipsis when too long; a small chevron on the right in `accent-ink`. Fixed minimum height, so every row lines up and there is no layout shift.
- Hover (mouse devices only): card lifts 2 px, photo scales to 1.04 as on the "lash looks" cards, name turns `primary`, chevron moves 2 px. Press: scale 0.98 (also on touch, via `data-pressed`). Reduced motion: no movement.
- Works in look A and look B (`lib/ab-test.ts`).

### Lash-extensions page, styled looks

The existing cards (`StyledLooks.astro`) become links with the same targets as above. Under the name, one line "预约此款 →" (existing string `lashLooks.bookThis`) in `accent-ink`, as on the home "lash looks" cards. A photo without a name keeps no caption but is still a link.

### Booking page

Already reads `service` and `option`. New: `look=<photo id>`. The booking page knows the look names of all photos at build time (rendered into the page in its language, so the Traditional Chinese conversion applies). If the id is known and the notes field is empty, notes start as "想做的款式：<name>" (en: "Look I'd like: <name>"). An unknown id is ignored.

### Admin

Only the hint under "款式名稱（選填）" changes (`src/i18n/admin.ts`, `labelShown` and `labelHidden` become one text):
選了會顯示在作品照片上，顧客點照片會直接預約這一款。不選也可以：點照片只會選好服務。
For brows the hint says the name is used only for the photo's text description, since brows show no name.

### Pre-filled styles

Option A from the conversation: existing photos without a style get one, written into `photo-admin.json` `labels`, using the prototype's table. Photos I could not tell (two full-face photos, three mirror nails, two marble nails, the dried-flower nails, the navy nails) stay empty for Abby to set. Brows get none (no bar). The styled group keeps its legacy names. Photos Abby has already labelled (her three uploads in #44) are not touched. The file is edited by Abby too, so this is a merge onto the live `main` version at implementation time.

### SEO

- `alt`, image URLs, widths, formats and lazy loading are unchanged.
- The name bar is real text in the HTML.
- Links are plain `<a href>`. `/book` declares its canonical as `/book` without the query, so the new URLs are not indexed as separate pages.
- No nested interactive elements: the video toggle and the bar link are siblings.

## Left to the builder

- Where the photo-to-link logic lives (a function next to `lookName` in `src/data/photos.ts` is the natural place) and its unit test.
- How the booking page receives the look names.
- E2E: a portfolio photo opens `/book` with service and option selected; a look photo fills the notes; a brows photo has no bar; a video tile still plays.
- English names in the three-column grid are cut with an ellipsis; check the result on a 375 px screen.
