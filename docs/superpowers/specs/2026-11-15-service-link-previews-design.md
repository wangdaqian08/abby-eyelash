# Service pages: a link preview of their own (2026-11-15)

## Why

Every page had the same `og:image`: `og-default.jpg`, a text card with the studio's name. A link to any page, shared to
Facebook or WeChat, showed that one card. The owner noticed it when Facebook offered identical previews for different links.
The SEO checks had only asked whether an `og:image` existed, never whether pages differed.

## What changes

- **Each of the six service pages has its own `og:image`**, 1200 × 630 (Meta's recommended size, 1.91:1), the same in the
  three languages. The home, booking and privacy pages keep `og-default.jpg`.
- **Abby chooses it in the admin.** Fixed places gain one per service page, `預覽圖` (key `page:<service>:og`), 24 places in
  all. It takes an upload cropped in the editor to a new shape, `1.91:1` (master 1200 × 630). What the editor frames is
  what Facebook shows.
- **Until she chooses, the page's hero is cut automatically** (`src/lib/og-image.ts`: sharp `cover` with `position:
  'entropy'`, the busiest band of the photo). The admin lists that cut as the place's current picture, marked
  `分享用 · 自動取自主圖`. A fixed centre or top cut was tried first and showed a bare wall (gel nails) and a forehead (lash
  extensions). The automatic cut can still be poor: the lash-lift hero is a before-and-after pair stacked top and bottom,
  and a wide band cuts through the upper eye. That page is the first one to crop by hand.
- **`npm run check:seo` enforces it** (GEO-STRATEGY #20): a service page may not use the default image or share one with
  another service in its language, and every `og:image` must be 1200 × 630 with matching width and height tags.

## Rules

- The `1.91:1` shape exists only for link previews. `validateAdmin` lets such an upload into an `:og` place only; a 4:3 or
  3:4 photo cannot go into an `:og` place, so no existing photo can be picked without cropping it again.
- A link preview has no style name: the editor hides that field for it.
- The place's `def` is the page's hero as built. If the hero is replaced in the same draft, the automatic thumbnail in the
  admin still shows the old hero until the site is rebuilt.

## After a change goes live

Facebook keeps the old picture until it reads the page again. Paste each changed link into Meta's Sharing Debugger and
press "Scrape Again".

## Not done

- No preview picker for the home page: it keeps the text card.
- No measurement yet of whether photo previews are clicked more. GA4 can compare sessions with `utm_source=facebook` per
  landing page before and after.
