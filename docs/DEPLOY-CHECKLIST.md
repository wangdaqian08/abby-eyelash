# Deploy checklist — Abby Eyelash

Use this list for the first launch, and parts F–H again after any big change. Work through it in order and tick each box.
"Dashboard" means the Cloudflare dashboard at <https://dash.cloudflare.com/>.
This list covers the website and its tracking. The business profiles (Google Business Profile, Xiaohongshu…) are in `docs/OWNER-ACTIONS.md`. The online booking keys are in `docs/SETUP-booking.md`.

---

## A. Before the first public launch

- [ ] **Run `npm run check:go-live` first.** One list of every go-live reminder: BLOCK (fix in code), WARN (needs Abby), BY HAND (settings in this checklist). It fails while any BLOCK remains. Add new reminders to `scripts/check-go-live.mjs`.
- [ ] Every value marked `PLACEHOLDER` in `src/data/site.ts` and `src/data/services.ts` is real: address, phone, email, socials, Google review link, and prices. The address, phone and hours must be **exactly** the same as on Google Business Profile.
- [ ] Prices and durations live in `src/data/prices.csv` (how-to: `docs/PRICES.md`). When you change a row, set its `更新日期` to today's date; a service's `updated` is the latest date among its rows. Change it **only** when the content really changes. That date is published as "Prices updated", in the page data and in the sitemap, and Google warns against fake date bumps ([Google: creating helpful content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)).
- [ ] Dummy reviews are replaced by real ones. The build fails on purpose while `LAUNCH=1` is set and dummy reviews remain (decision D3).
- [ ] You know the final domain, e.g. `https://www.abbyeyelashes.com`. Until it exists, the site runs on `https://abby-eyelash.pages.dev`.
- [ ] **Privacy.** Once GA4 is on, the site sets Google Analytics cookies and the booking form collects names, phone numbers and emails. Read the OAIC's guidance on whether the Australian Privacy Act applies to a small business, and add a short privacy notice to the site if needed: <https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business>. The site has no cookie-banner framework. Decide with an adviser whether you need one, for example if you advertise to visitors in the EU.

## B. Create the Cloudflare Pages project

The code must be in a GitHub or GitLab repository. Docs: <https://developers.cloudflare.com/pages/get-started/git-integration/>.

1. Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick the repository.
2. Project name: `abby-eyelash`. This name gives the address `abby-eyelash.pages.dev`.
3. Build settings:
   | Setting | Value |
   |---|---|
   | Framework preset | Astro |
   | Build command | `npm run build && node scripts/indexnow.mjs --write-key dist` |
   | Build output directory | `dist` |
   | Root directory | *(leave empty)* |

   The second half of the build command writes the IndexNow key file (part H) and does nothing while `INDEXNOW_KEY` is empty.
4. **Node version.** Astro 7 needs Node **22.23.4 or newer**, but Cloudflare's build image defaults to 22.16.0. Add the variable `NODE_VERSION` = `24` (see step C). Docs: <https://developers.cloudflare.com/pages/configuration/build-image/>.
5. **Save and Deploy**.

## C. Environment variables

Dashboard → **Workers & Pages** → `abby-eyelash` → **Settings** → **Variables and Secrets** → **Production**.
Docs: <https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables>.

| Name | Value | Type | Why |
|---|---|---|---|
| `NODE_VERSION` | `24` | Text | Build needs Node ≥ 22.23.4 |
| `SITE_URL` | your real address, e.g. `https://www.abbyeyelashes.com` (no trailing slash). Leave it unset while you only have `pages.dev`. | Text | Canonical URLs, hreflang, sitemap, robots.txt and JSON-LD are all built from it |
| `PUBLIC_GA4_ID` | `G-XXXXXXXXXX` (part G) | Text | Turns on Google Analytics. Empty = no analytics at all |
| `LAUNCH` | `1` | Text | Launch guard: the build fails while dummy reviews remain |
| `INDEXNOW_KEY` | 32 random letters and digits (part H) | Text | IndexNow key file |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_CALENDAR_ID` | see `docs/SETUP-booking.md` part D | Text | Booking calendar |
| `GOOGLE_PRIVATE_KEY` | see `docs/SETUP-booking.md` part D | **Secret** | Booking calendar (free/busy only) |
| `BOOKING_DEMO` | `1` **only for a preview before Google Calendar is connected**. Delete it at launch | Text | Allows demo booking (fake times, nothing saved). Without it, a missing Google value makes the booking page show an error with your phone number instead of made-up free times |

Compatibility date: **Settings → Runtime** → the compatibility date for Production and Preview must be **2026-08-04 or later**, or the `nodejs_compat` flag must be on. Otherwise the database driver behind the 📅 link stops the Functions runtime from starting, and the whole site fails.

The `PUBLIC_…`, `SITE_URL`, `LAUNCH` and `INDEXNOW_KEY` values are read **while the site is built**. After you change one, go to **Deployments** → latest → **⋯** → **Retry deployment**.

### C2. Rate limit the booking API (5 minutes)

Cloudflare dashboard → your domain → **Security** → **WAF** → **Rate limiting rules** → **Create rule**: name "booking api", match *URI Path starts with* `/api/`, **20 requests per 1 minute** per IP, action **Block** for 1 minute. This stops scripts from exhausting the Google Calendar quota or flooding the calendar with fake requests. (Needs the custom domain; the free plan includes one rate-limiting rule.)

## D. Custom domain (once you have one)

1. `abby-eyelash` project → **Custom domains** → **Set up a custom domain** → enter it → follow the DNS steps. Docs: <https://developers.cloudflare.com/pages/configuration/custom-domains/>.
2. Pick **one** address (with or without `www`) and set `SITE_URL` to exactly that. Redirect the other one to it with a Cloudflare redirect rule: <https://developers.cloudflare.com/rules/url-forwarding/>.
3. Retry the deployment (step C).

## E. Make sure Cloudflare does not block AI search crawlers

Since July 2025, Cloudflare can block AI crawlers by default and can add its own lines to `robots.txt`. The site's own `robots.txt` allows search engines, AI answer engines **and** AI training crawlers (decision D2). Cloudflare must not override it. Do this on the **domain** (zone) once the custom domain is added. Plain `*.pages.dev` addresses have no zone settings.

1. Dashboard → your domain → **Security** → **Settings** → filter **Bot traffic**.
   - **Block AI bots** (older setting, being phased out from 15 Sept 2026): set it to **Do not block (off)**. Docs: <https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/>.
   - **Configure AI bot policies**: set **Search**, **Agent** and **Training** all to **Allow**. Note that new domains created after 15 Sept 2026 block Training and Agent bots "on pages with ads" by default. This site has no ads, but set Allow anyway.
2. **Managed robots.txt / Bot Preference Sync**: make sure it is **off**, or that all policies are Allow. When it is on, Cloudflare puts its own `Disallow` lines for GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended and others, plus a `Content-signal: … ai-train=no` line, **in front of** our file. Docs: <https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/>.
3. Dashboard → your domain → **AI Crawl Control** → **Crawlers** tab. In the **Actions** column, set every crawler to **Allow**, especially OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, Applebot and Bingbot. Docs: <https://developers.cloudflare.com/ai-crawl-control/features/manage-ai-crawlers/>.
4. **Bot Fight Mode** (Security → Bots) can challenge good bots on the free plan. If AI Crawl Control later shows search crawlers getting errors, turn it off. Docs: <https://developers.cloudflare.com/bots/get-started/bot-fight-mode/>.

## F. Checks after every deploy (5 minutes)

Replace `https://SITE` with your address.

- [ ] **robots.txt is ours and unmodified.** Open `https://SITE/robots.txt` in a browser. It must start with `User-agent: *` / `Allow: /`. It must list Googlebot, bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, Perplexity-User, ClaudeBot, Claude-SearchBot, Claude-User, Applebot, Applebot-Extended, Google-Extended and CCBot, each with `Allow: /`, and end with `Sitemap: https://SITE/sitemap-index.xml`. If there are extra `Disallow: /` or `Content-signal` lines at the top, Cloudflare added them: repeat part E.
- [ ] **Sitemap.** Open `https://SITE/sitemap-index.xml`, then the `sitemap-0.xml` it links to. Every page appears with your real domain, in both EN and ZH.
- [ ] **Automatic SEO check (developer).** Run `npm run build && npm run check:seo` locally with the same `SITE_URL`. It must end with `✓ all SEO checks passed`. It checks canonicals, hreflang pairs, page language, title and description length and uniqueness, JSON-LD (no FAQPage/Review/AggregateRating), banned robots directives, robots.txt and sitemap coverage.
- [ ] **Rich Results Test.** Test the home page and one service page at <https://search.google.com/test/rich-results>. You should see "Local business" with no errors on the home page, and "Breadcrumbs" on service pages. Then paste the same URLs into <https://validator.schema.org/>: 0 errors.
- [ ] **hreflang.** Test `https://SITE/` and `https://SITE/zh/` at <https://technicalseo.com/tools/hreflang/>. Each page must show en-AU, zh-Hans and x-default, all returning 200 and pointing back to each other. Google's rules: <https://developers.google.com/search/docs/specialty/international/localized-versions>.
- [ ] **404.** Open `https://SITE/this-does-not-exist`. You should see the bilingual "Page not found" page. The browser's network tab (or <https://httpstatus.io/>) must show status **404**, not 200.
- [ ] **No-JS content.** Open a service page, then View Source (Ctrl+U / ⌥⌘U). The prices, hours and address are readable in the source text.

## G. Google tools

### G1. Google Search Console (where Google, AI Overviews and AI Mode traffic shows up)

1. Go to <https://search.google.com/search-console> → **Add property** → **Domain** → enter your domain without `https://`.
2. Verify by DNS. If Search Console lists Cloudflare as the provider, click **Start verification** and log in. Otherwise copy the `google-site-verification=…` TXT value, then in Cloudflare open your domain → **DNS** → **Records** → **Add record**: Type `TXT`, Name `@`, Content = the value. Click **Verify** in Search Console. **Never delete this record.** Docs: <https://support.google.com/webmasters/answer/9008080>.
3. **Sitemaps** (left menu) → enter `sitemap-index.xml` → **Submit**. Status should become "Success". Docs: <https://support.google.com/webmasters/answer/7451001>.
4. **Settings → Search generative AI**: confirm it says the site is **included** (the default). Google lists this as a requirement for appearing in AI Overviews and AI Mode ([Google: optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)). Excluding removes the site from those features within 1–2 days. Docs: <https://support.google.com/webmasters/answer/16908024>.
5. Where to look each month:
   - **Performance → Search results**: clicks and impressions, including AI Overviews and AI Mode ([Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)).
   - **Performance → Generative AI** report (rolled out to all sites by 31 Aug 2026): impressions in Google's AI features by page, country and device. It shows no clicks and no queries. Announcement: <https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports>. If the menu name differs, look under **Performance** for "Generative AI".

### G2. Google Analytics 4

1. <https://analytics.google.com/> → **Admin** → **Create** → **Property**. Use time zone **Australia/Sydney** and currency **AUD**. Then create a **Web** data stream for your domain. Docs: <https://support.google.com/analytics/answer/9304153>.
2. Copy the **Measurement ID** (`G-…`) into `site.google.ga4Id` in `src/data/site.ts` (or `PUBLIC_GA4_ID`, part C) and redeploy. Check: `npm run check:ga4` runs the live site in a phone-size browser (cookie choice respected; `page_view` and `book_click` reach Google with `style_variant` and `lang`) — save its output in `docs/verification/`. Before a deploy: `npm run start`, then `LOCAL=1 npm run check:ga4`. The SMS / WhatsApp tap itself needs a real phone: book on the live site, tap **Send by SMS**, then look at **Reports → Realtime** (Admin → Events lags by hours). Without the ID, the site loads no analytics code at all.
3. **AI assistants channel.** GA4's own "AI Assistant" channel leaves out some AI tools (Perplexity and Claude may land in Referral), so add a custom group. Docs: <https://support.google.com/analytics/answer/13051316>.
   1. **Admin** → **Data display** → **Channel groups** → **Create new channel group**. Name: `Channels incl. AI`.
   2. **Add new channel**. Name: `AI assistants`. **Add condition group**: **Source** · **partially matches regex** · paste exactly (GA4's plain "matches regex" must match the whole source, so it would miss e.g. `www.perplexity.ai`; the pattern carries its own anchors):
      ```
      (^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|copilot\.com|edgeservices\.bing\.com|deepseek\.com|chat\.deepseek\.com|grok\.com|meta\.ai)$
      ```
      ChatGPT also adds `utm_source=chatgpt.com` to its links, and the regex matches that source too. **Save channel**.
   3. Use **Reorder** to drag `AI assistants` **above Referral** → **Apply** → **Save group**. GA4 uses the first channel that matches, so this order matters.
   4. These hostnames are referrers people have observed, not an official list. Every few months, check **Reports → Acquisition → Traffic acquisition → Session source** for new AI sources and add them. Source: `docs/research/geo-official-and-academic.md` §3.9.
4. **Key events (conversions).** The site sends these events:
   | Event | When |
   |---|---|
   | `booking_start` | a customer picks a service on `/book` |
   | `booking_submitted` | a booking request is saved (with value in AUD) |
   | `book_click`, `message_click`, `map_click`, `social_click`, `review_click` | taps on links that carry a `data-track` attribute |

   Mark `booking_submitted`, `book_click`, `message_click` and `map_click` as key events. An event that already shows under **Admin** → **Data display** → **Events** → **Recent events**: click its **star**. One that hasn't fired yet: **Create event** → enter the name → **Create with code** (the site sends it; "Create without code" would make a new event from page views) → turn on **Mark as key event** → **Don't set a default key event value** (the site sends the AUD value; the default is US$1) → **Create**. Done 2026-11-10 for all four (`docs/verification/2026-11-10-ga4.md`). Docs: <https://support.google.com/analytics/answer/13128484>.

## H. Bing (Copilot, Bing AI answers, and part of ChatGPT search)

1. <https://www.bing.com/webmasters/> → sign in → **My Sites** → **Import**. Sign in with the same Google account as Search Console and import the site. It is verified automatically and the sitemap comes with it. Docs: <https://blogs.bing.com/webmaster/september-2019/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools>.
2. Check that the site's **Sitemaps** page lists `https://SITE/sitemap-index.xml`. If it doesn't, add it.
3. Monthly: open **AI Performance** (<https://aka.ms/BWTAIpref>). It shows citations in Copilot and Bing AI answers, which pages were cited, sample "grounding queries" and citation share. A small site may show little data at first. Docs: <https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview>.

### H1. IndexNow (tells Bing and others about changes straight away; Google does not use it)

Protocol: <https://www.indexnow.org/documentation>.

1. Make a key: 32 random letters and digits, e.g. from `node -e "console.log(crypto.randomUUID().replace(/-/g,''))"`. Put it in `INDEXNOW_KEY` (part C) and retry the deployment. The build command writes `dist/<key>.txt`, and IndexNow requires that file on the live site. The key is public by design, so it is fine for it to be visible, but keep it out of the code repository.
2. Check that `https://SITE/<key>.txt` shows the key.
3. After each deploy that changed content, run this on your computer:
   ```sh
   SITE_URL=https://SITE INDEXNOW_KEY=<key> npm run indexnow            # add --dry-run to preview
   ```
   It reads the live sitemap and submits every URL. `HTTP 200` or `202` means it worked. The script does nothing for `*.pages.dev` or an unset `SITE_URL`. Don't run it more than needed: too many requests return 429.

## I. Monthly routine (15 minutes)

- **Redeploy once a month** (Deployments → latest → ⋯ → Retry deployment) even if nothing changed. The page data lists the next six "3rd Sunday" openings and is computed at build time, so a site that is never rebuilt eventually stops showing them.

- Search Console: Performance and Generative AI report. Bing: AI Performance. GA4: the **AI assistants** channel and key events.
- Cloudflare → AI Crawl Control: confirm that OAI-SearchBot, PerplexityBot, Claude-SearchBot and Bingbot fetch pages and are not blocked.
- Run the EN/ZH prompt panel in `docs/geo-prompt-panel.md` and fix any wrong facts (hours, prices, address) at the source.

## J. Style A/B test (look A = normal pages, look B = liquid glass)

One build holds both looks. Look B pages are built under `/look-b/` (`src/pages/look-b/`), and `functions/_middleware.ts` serves them at the normal URLs to visitors drawn into B (cookie `style`, 30 days). `/api/*` is never split. The `/look-b/` paths are not in the sitemap, are disallowed in robots.txt and return 404 when opened directly. Settings live in `src/data/ab-test.ts`. `npm run check:go-live` blocks launch while `bPercent` is 0. Components pick their markup with `lookOf(Astro.url)`; the booking script reads `<html data-look="B">`.

1. Before changing anything visual during the test, run `npm run check:looks` and look at both columns.
2. GA4 → Admin → Custom definitions: add `style_variant` as an **event**-scoped dimension and as a **user**-scoped dimension. Mark `book_click` and `booking_submitted` as key events.
3. At launch: `bPercent: 50`, commit, deploy. Check: open the site in two private windows until one shows the glass header; response header `x-style-variant` says which look you got; `?style=A` / `?style=B` forces one (also locally).
4. Decision rule, fixed before the start: run until **each look has at least 50 `booking_submitted` and at least 4 weeks have passed** (stop at 8 weeks at the latest). The look with the higher share of users with `booking_submitted` wins; `book_click`, engagement and returning users are supporting signals. Don't stop early on a good day. During the test change content only (photos, prices, text), not the design.
5. End: delete the losing look: its `lookB ? … : …` branches, the B rules in `global.css` (or the A ones), `src/pages/look-b/`, the middleware and the `ab-test` check.
