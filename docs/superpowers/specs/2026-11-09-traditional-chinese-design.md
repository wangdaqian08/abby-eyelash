# Traditional Chinese version and automatic language routing — design

Date: 2026-11-09. Status: approved by the owner 2026-11-10; built on branch feat/traditional-chinese.

## Why

Abby has many clients from Taiwan and Hong Kong. Today the site has English (`/`) and Simplified Chinese (`/zh/`) only. Clients whose phones are set to Traditional Chinese should see Traditional Chinese without doing anything.

## What the visitor gets

| Phone system language | Opening an English link | Opening a Chinese link (`/zh/` or `/zh-hant/`) |
|---|---|---|
| Traditional Chinese (Taiwan, Hong Kong, Macau) | Traditional Chinese | Traditional Chinese |
| Simplified Chinese (Mainland China, Singapore) | Simplified Chinese | Simplified Chinese |
| Any other language (English, Korean, …) | English | **stays Chinese, as linked** |

A phone set to Chinese decides which Chinese (and moves English links to Chinese). A phone set to any other language never moves a visitor away from a Chinese page: many Chinese-speaking clients in Sydney keep their phones in English and should still see the Chinese page Abby linked.

- The language switcher at the top right has three choices: **EN / 简 / 繁**.
- After a visitor picks a language there once, the site remembers it. Later visits open in that language, whatever the phone language is.
- The automatic choice works on every page, not only the home page. Example: a Taiwan client taps a Xiaohongshu link to a `/zh/` service page and lands on the same service page in Traditional Chinese.
- Search engine crawlers are never redirected. Each version has its own fixed URL and is indexed on its own.

## Decided by the owner

1. Three versions: English, Simplified Chinese, Traditional Chinese.
2. Automatic routing by the phone's system language, on every page; a manual choice overrides it and is remembered. **A non-Chinese phone is never moved away from a Chinese page** (owner's choice A, 2026-11-09).
3. Switcher at the top right with the three choices.
4. Crawlers are not redirected; three fixed URLs: English `/`, Simplified `/zh/` (unchanged), Traditional `/zh-hant/`.
5. The Traditional text is converted automatically from the Simplified text, **characters only**. No Taiwan- or Hong Kong-specific wording, so clients from both places read it naturally.
6. The booking message (SMS / WhatsApp) sent from a Traditional page is in Traditional Chinese. The Google Calendar event that Abby's 📅 link creates stays in English.
7. **Abby reviews the Traditional text once, before launch.** Her corrections must survive every later build. Later edits to the Simplified text are converted and go live without a new review.
8. **Language is not part of the A/B test.** The look A/B test (50%) keeps running and Traditional ships as soon as it is ready. Traditional pages have both looks and join the split like every other page.

## Goals

- A Traditional Chinese twin of every Simplified page: home, every service page, booking, privacy. Both looks of the A/B test (look A, and look B under `/look-b/`).
- Correct automatic routing for real visitors; no change for crawlers and link-preview bots.
- SEO stays correct with three languages: hreflang, `<html lang>`, canonical, sitemap, JSON-LD, Open Graph.
- One source of truth for Chinese text: the Simplified text. Nobody maintains a second hand-written copy.

## Non-goals

- Separate Taiwan and Hong Kong versions or regional wording.
- Any change to the English or Simplified text.
- IP or location-based routing.
- Translating the Google Calendar event, the API error codes or the admin docs.

## Anti-goals (failure even if it "works")

- A crawler or a link-preview bot (WhatsApp, Facebook, Xiaohongshu) is redirected away from the URL it asked for.
- A visitor who picked a language is sent back to another one, or a redirect loop.
- Abby's corrections are lost on the next build.
- A Simplified→Traditional converter is shipped to the browser (phone page weight).
- Existing `/zh/` URLs change or stop working.
- Simplified text shows up anywhere on a Traditional page (for example dynamic booking text rendered by client JavaScript).

## Constraints

- Astro 7 static build on Cloudflare Pages, plus Pages Functions (`functions/_middleware.ts` already serves the A/B looks). Free plan.
- Most visitors are on phones: check every UI change at 375 px width with emulated touch taps.
- Local preview runs only on port 8788 (`npm run preview`, flags live in `package.json`).
- `npm test`, `npm run build`, `npm run check:seo` and `npm run check:go-live` must pass.
- No new dependency in the browser bundle. A build-time dependency for the conversion is fine (e.g. `opencc-js`).

## How it works (decided parts)

### Routing (middleware)

Runs for HTML page requests only: not `/api/*`, not `/c/*`, not static files. It must run before the A/B code's early return.

1. **Manual choice wins.** The switcher stores the choice in a cookie (one year). If the requested page is in another language than the cookie, redirect to the same page in the cookie's language.
2. **No cookie: device language.** Read the **first** tag of `Accept-Language`:
   - `zh-TW`, `zh-HK`, `zh-MO`, or any tag with the `Hant` script → Traditional.
   - `zh-CN`, `zh-SG`, `zh-Hans`, or plain `zh` → Simplified.
   - anything else → no automatic language: the page is served as requested (an English page stays English, a Chinese page stays in the Chinese it was linked in).
   If the first tag is Chinese and the requested page is in another version, redirect to the same page in the phone's Chinese.
3. **No redirect** when there is no `Accept-Language` header, or the user agent is a crawler or link-preview bot.
4. Redirects are temporary (302), keep the query string, and are never cached.
5. **The switcher's own links must set the cookie**, so a manual choice is remembered and is not immediately undone by rule 2. It should work without JavaScript.

### Traditional text

- Generated at build time from the Simplified text with a character-only Simplified→Traditional conversion.
- Abby's corrections go into **one overrides file** (phrase → replacement), applied after the conversion. The file is committed. Adding a correction never needs a code change.
- Client-side code (the booking app) receives its Traditional strings already converted at build time, e.g. through the page's `data-config`. No converter in the browser.

### Pages and links

- `/zh-hant/` mirrors every `/zh/` page, and look B mirrors it under `/look-b/zh-hant/`.
- The bilingual 404 page and the expired-link page (`/c/<code>`) get a Traditional paragraph too.
- `public/_redirects`: no `/zh-hant/` copies needed (builder's call): the rules cover old URLs from before 2026-10-30, and `/zh-hant/` never had them.

### SEO

- `<html lang="zh-Hant">` on Traditional pages.
- hreflang on every page: `en-AU`, `zh-Hans`, `zh-Hant`, `x-default` (English), all reciprocal.
- Sitemap lists all three versions with alternates and `lastmod`.
- JSON-LD `inLanguage` includes `zh-Hant`; Open Graph locale for Traditional is the builder's call (e.g. `zh_TW`).
- `scripts/check-seo.mjs` checks three languages.

### Fonts

- No web CJK font is loaded today; the stacks list Simplified system fonts only. Traditional pages get Traditional system fonts first (e.g. PingFang TC, Noto Sans TC, Microsoft JhengHei; serif: Noto Serif TC, Songti TC).

### Switcher

- Three choices, EN / 简 / 繁, current one marked. It must fit the header at 375 px with tap targets of at least 44 px, in look A and look B.

## Rollout

1. Build on a branch. The pull request's Cloudflare preview URL is where Abby reviews `/zh-hant/` page by page.
2. Abby's corrections go into the overrides file; repeat until she approves.
3. Merge only after Abby approves. Automatic routing and the Traditional pages go live together.

## Checks before merge

- Unit tests for the `Accept-Language` mapping and every redirect decision (cookie, no cookie, bot, missing header, `/api`, `/c`).
- A build check that every `/zh/` page has a `/zh-hant/` twin, and that no Traditional page contains leftover Simplified-only characters except where an override says so.
- `check-seo` passes for three languages.
- Touch test at 375 px: device language zh-TW → Traditional; zh-CN → Simplified; en-AU → English; switch to each language and reload → stays; a booking run on a Traditional page produces a Traditional message.

## Calls made by the designer (owner to check)

- **Character standard:** Taiwan character forms, characters only, no phrase conversion (OpenCC `cn → tw` or equivalent). Hong Kong readers read these easily, and Abby's calendar uses Taiwan holidays. Date formatting on Traditional pages uses `zh-TW`; Open Graph locale `zh_TW`.
- **In-app browsers** (Xiaohongshu, WeChat): test on a real phone what they send in `Accept-Language`. If they do not pass on the phone's language, bring the finding back to the owner before adding any client-side fallback.
- **Privacy page:** add one line about the language cookie to the English and Simplified privacy text (the privacy facts must match the code; this overrides the "no change to existing text" non-goal). The language cookie is a necessary cookie, like the look cookie.

## Left to the builder

- The internal language key and type names (e.g. `'zh-hant'`), the cookie name, and how the switcher sets the cookie.
- The conversion library and the format of the overrides file.
- How the Traditional pages are produced (extra page files, a shared route, or a post-build step), as long as the anti-goals hold.
- The exact bot list and the Open Graph locale.
