# Abby Eyelash — Website Spec

Agreed with the owner on 2026-10-26. This is the source of truth for all build work.

## 1. Business
- **Name:** Abby Eyelash · **Owner/artist:** Abby (solo — the only technician)
- **Location:** Burwood NSW 2134, Sydney, Australia (street address = placeholder until provided)
- **Services:** eyelash extensions, lash lift, handcrafted nails (hand-painted custom nail art), nail polish, nail extensions
- **Goal:** presentation site whose technical design, from day 1, maximises traffic (SEO + GEO) and booking conversions.

## 2. Stack & hosting
- **Astro + Tailwind CSS**, static output. Booking API = **Cloudflare Pages Functions** (`/functions`).
- Hosting: **Cloudflare Pages** (free). No domain yet → site URL lives in one config value.
- Content edited in files (JSON/Markdown), **no CMS**.
- All business facts (NAP, hours, socials, prices, booking rules) live in **one config/content source** so a single edit updates the whole site + schema.

## 3. Languages
- English default at `/`, Simplified Chinese at `/zh/`, Traditional Chinese at `/zh-hant/` (2026-11-10, design: `docs/superpowers/specs/2026-11-09-traditional-chinese-design.md`). Language switcher EN / 简 / 繁 in the header and footer. `hreflang` (en-AU, zh-Hans, zh-Hant, x-default) on every page. Claude translates; owner reviews.
- **Traditional is converted, not written:** the `/zh-hant/` pages are built from the Simplified text and converted to Taiwan character forms after the build (`scripts/zh-hant.mjs`, OpenCC cn → tw, characters only). Wording fixes: `src/i18n/zh-hant-fixes.json`. Review sheet: `npm run build && npm run review:zh-hant`.
- **Automatic language** (`functions/_middleware.ts`, rules in `src/lib/i18n.ts`): a choice made in the switcher is remembered (cookie `lang`, 1 year); without one, a phone set to Chinese gets its Chinese (zh-TW/HK/MO → Traditional, other Chinese → Simplified); a phone in any other language is never moved, so a Chinese link stays Chinese. Crawlers and link previews are never redirected.

## 4. Pages
- **Home** — long single-scroll page modelled on the reference demo (https://linter-stick-70077518.figma.site/):
  Header → Hero → Services → About → **Gallery (new)** → Reviews → **FAQ (new)** → Hours & Contact (map + book/call buttons) → Footer.
- **5 service pages** (each with price table, duration, process, aftercare, FAQ, CTA, schema):
  `/eyelash-extensions-burwood`, `/lash-lift-burwood`, `/handcrafted-nails-burwood`, `/nail-polish-burwood`, `/nail-extensions-burwood` (+ `/zh/...` mirrors).
- **Booking page** `/book` (+ `/zh/book`).
- No blog for now.
- Demo copy is kept in spirit but rewritten for Abby Eyelash / Burwood (demo is "S.H.E Nails", Truganina VIC — none of its business facts are reused).

## 5. Services & prices (AUD)
Prices and durations live in `src/data/prices.csv` (owner-editable, see `docs/PRICES.md`); this table is a summary as of 2026-10-30.

| Service | Options | Price |
|---|---|---|
| Eyelash Extensions | Japanese classic natural/full · Hybrid natural/full · Styled · Bottom lashes (add-on) · Infill 2/3/4 wk · Removal | $80/$110 · $110/$140 · from $130 · $25/$35 · 50/70/85% of set · $10–$20 |
| Keratin Lash Lift | No tint | $80 |
| Powder Brows | One free touch-up within 3 months | $480 (was $580) |
| Gel Nails | Solid · Cat-eye · Aurora · French (builder gel included) | $70 · $110 · $110 · $120 |
| Hand-painted Nail Art | Custom design | Price on request |
| Nail Extensions | Add-on to any nail design | $6 per nail |

Service cards on Home show price + duration and link to their service page.

## 6. Visual design
- Base language from demo: editorial, Playfair Display (headings) + DM Sans (body), heading pattern "Line one / *italic accent phrase*", eyebrow labels, max-width 1152px, 96px section rhythm. Since 2026-11-06: soft corners (16px cards/media, pill buttons) and tone-step separation instead of hairline card borders — relaxed, lively, professional, clean (see design-system/MASTER.md §3–4).
- Chinese fonts: the device's own (Noto Serif SC / Noto Sans SC if installed, then Songti SC / PingFang SC / Microsoft YaHei). No CJK web font download.
- **4 colour themes as CSS tokens** (`[data-theme]`):
  - **A Mocha nude (default)** — text `#3B2A24`, primary `#8B6A5C`, accent/latte `#D9C4B2`, cream background
  - **B Rose & champagne** — `#B76E79`, `#C9A27E`
  - **C Sage & cream**
  - **D Plum (demo)** — `#7d3f5e`, `#c4856a`, `#faf7f4`
  - A **preview theme switcher** is shown during preview only; removed after the owner picks one.
- Interactions (mobile first): staggered section entrances, hero load sequence, press feedback on every control, animated mobile menu, header edge on scroll, page crossfade; on desktop also card lift + colour fill and photo zoom on hover. Transform/opacity only (no CLS), content always in the HTML without JS (SEO/GEO), all motion off under `prefers-reduced-motion`. Visible keyboard focus states.
- Photos: owner provides later → `public/images/<service>/`; placeholders until then. Images optimised (WebP/AVIF, responsive sizes, lazy below the fold).

## 7. Reviews
- Dummy data **for preview only** (D3: production build with `LAUNCH=1` fails while dummy reviews exist): 6 reviews (mixed English/Chinese names), Google "G" mark, stars, dates, 4.9 rating display, "Read all reviews on Google" link.
- **Do NOT emit Review/AggregateRating schema for dummy reviews** (Google policy). Add only when real reviews are wired in.

## 8. Booking
**UI** (reference: `reference/customer-booking-UI.png`, `reference/customer-booking-UI-3.png`; `reference/calendar.png` is a staff view and is NOT built):
- Desktop 3 panes: left rail (Abby photo, title, vertical stepper: 1 Services → 2 Date → 3 Time → 4 Details), middle month calendar (available days as filled circles, unavailable/past greyed, prev/next month), right time-slot list (selected slot shows inline "Next" button).
- Step 1: one or more services (check-boxes; since 2026-11-06 lashes, brows and nails can be combined in one visit, done back to back). Each ticked service gets its own option and add-ons; the total time and price show underneath.
- Step 4 details form: Full name, Phone (AU), Email, Notes (optional), "Book Appointment", plus a summary (services, date, time, duration, price, deposit). To change services the client goes back to step 1.
- Mobile: one step at a time, stacked.
- Success screen + "Add to my calendar" (.ics / Google Calendar link).

**Availability rules** (config):
- Hours: Mon–Fri 9:00–19:00, Sat 9:00–18:00, Sun 10:00–17:00 (Australia/Sydney).
- 30-min slot grid; slot valid only if service duration fits before closing and doesn't overlap busy time.
- 15-min buffer between appointments. Min notice 3 h. Max advance 60 days.
- Any event in Abby's calendar = busy; customers only ever see "unavailable", never event details.

**Backend** (Cloudflare Pages Functions):
- `GET /api/availability?items=<service>/<option>/<addon:n,…>;…&month=YYYY-MM` → free start times for the combined length, from Abby's Google Calendar (service account; calendar shared with it as "see all event details"; only ❤️ events count).
- **Booking by message (2026-11-08):** the site takes no bookings. Step 5 hands the customer a pre-filled SMS / WhatsApp to Abby (`src/lib/booking-message.ts`), ending with a short `/c/<code>` link: `POST /api/request` stores the request in PostgreSQL (schema `abby`, kept 24 h, `src/lib/db.ts`), and `functions/c/[code].ts` redirects to Google Calendar's new-event page, filled in (`❤️ ⏳ <name> – <service>`). Abby taps Save, then confirms with the customer. No database → the message goes out without the link.
- **Busy times = ❤️ events only (2026-11-09):** `events.list` (read-only), and only events whose title starts with ❤️ block slots (`bookedIntervals`, `src/lib/google-calendar.ts`). Personal and all-day events like "rent" never block. The calendar is shared with "See all event details".
- **Demo mode** when Google credentials are absent: mocked availability.
- No customer confirmation email until a domain exists (then add Resend). No online payments: the deposit ($20 per service, $30 for powder brows, added up; no WeChat Pay) is paid by bank transfer after booking; Abby sends the bank details when she confirms. Returning-client "no deposit" by phone lookup is a post-launch idea (docs/REQUIREMENTS-2026-10.md §三).
- Secrets only in Cloudflare env vars. `docs/SETUP-booking.md` gives Abby step-by-step Google Cloud + calendar sharing setup.

## 9. SEO / GEO / analytics
**Governed by `docs/GEO-STRATEGY.md` (approved 2026-10-26, D1–D5 accepted).** That document is authoritative; summary:
- Static HTML for all key facts; FAQ answers and price tables always visible (no accordions).
- robots.txt allows all search/answer bots and training bots (D2); Cloudflare AI-bot blocking audited at deploy.
- One page per service per language, answer-first intro, visible price table, real FAQ, location facts in body text from `site.ts`. No suburb doorway pages.
- JSON-LD mirrors visible content: `BeautySalon`+`NailSalon`, `Service`/`Offer`, `BreadcrumbList`, `WebSite`. **No** `FAQPage`, `AggregateRating`/`Review`, `areaServed` suburb lists, **no llms.txt** (D1).
- Truthful `updated` dates → visible "Prices updated", `dateModified`, sitemap `lastmod`. IndexNow after domain exists.
- hreflang en-AU / zh-Hans / x-default; natively written Chinese.
- Measurement: GSC (incl. Generative AI report), Bing Webmaster Tools AI Performance, GA4 with custom "AI assistants" channel + conversion events, monthly EN/ZH prompt panel.
- Off-site owner actions in `docs/OWNER-ACTIONS.md`.

## 10. FAQ / policy
- FAQ (always visible, no accordion) covers: prep & aftercare, how long lashes/nails last, refills, sensitive eyes/allergy patch test, parking/transport in Burwood, payment methods, cancellation.
- Placeholder cancellation policy: "Please give at least 24 hours' notice to cancel or reschedule."

## 11. Placeholders the owner must replace before launch
Street name (no house number — home studio), phone, email, socials, prices, photos, GA4/GSC IDs, Google Calendar credentials, domain, Google Business Profile link, real reviews, chosen theme.
