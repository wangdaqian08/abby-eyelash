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
- English default at `/`, Simplified Chinese at `/zh/`. Language switcher in header. `hreflang` (en-AU, zh-Hans, x-default) on every page. Claude translates; owner reviews.

## 4. Pages
- **Home** — long single-scroll page modelled on the reference demo (https://linter-stick-70077518.figma.site/):
  Header → Hero → Services → About → **Gallery (new)** → Reviews → **FAQ (new)** → Hours & Contact (map + book/call buttons) → Footer.
- **5 service pages** (each with price table, duration, process, aftercare, FAQ, CTA, schema):
  `/eyelash-extensions-burwood`, `/lash-lift-burwood`, `/handcrafted-nails-burwood`, `/nail-polish-burwood`, `/nail-extensions-burwood` (+ `/zh/...` mirrors).
- **Booking page** `/book` (+ `/zh/book`).
- No blog for now.
- Demo copy is kept in spirit but rewritten for Abby Eyelash / Burwood (demo is "S.H.E Nails", Truganina VIC — none of its business facts are reused).

## 5. Services & placeholder prices (AUD, owner replaces before launch)
| Service | Option | Duration (min) | Price |
|---|---|---|---|
| Eyelash Extensions | Japanese classic natural/full · Hybrid natural/full · Styled · Bottom natural/full · Infill 2/3/4 wk · Removal | placeholder | $80/$110 · $110/$140 · from $130 · $25/$35 · 50/70/85% of set · $10–$20 (owner menu 2026-10-29) |
| Lash Lift | Lift & Tint | 60 | $80 |
| Handcrafted Nails | Hand-painted custom nail art | 90 | from $80 |
| Nail Polish | Gel manicure / Regular polish | 45 / 30 | $50 / $35 |
| Nail Extensions | BIAB / Gel-X / Infill | 90 / 90 / 60 | $85 / $95 / $65 |

Service cards on Home show price + duration and link to their service page.

## 6. Visual design
- Base language from demo: editorial, Playfair Display (headings) + DM Sans (body), sharp corners, heading pattern "Line one / *italic accent phrase*", eyebrow labels, hairline dividers, max-width 1152px, 96px section rhythm.
- Chinese font fallback: Noto Serif SC / Noto Sans SC (subset, `font-display: swap`).
- **4 colour themes as CSS tokens** (`[data-theme]`):
  - **A Mocha nude (default)** — text `#3B2A24`, primary `#8B6A5C`, accent/latte `#D9C4B2`, cream background
  - **B Rose & champagne** — `#B76E79`, `#C9A27E`
  - **C Sage & cream**
  - **D Plum (demo)** — `#7d3f5e`, `#c4856a`, `#faf7f4`
  - A **preview theme switcher** is shown during preview only; removed after the owner picks one.
- Interactions: cards lift + soft shadow on hover (plus demo's colour-fill effect), button hover colour + press scale, subtle scroll fade-in. All motion disabled under `prefers-reduced-motion`. Visible keyboard focus states.
- Photos: owner provides later → `public/images/<service>/`; placeholders until then. Images optimised (WebP/AVIF, responsive sizes, lazy below the fold).

## 7. Reviews
- Dummy data **for preview only** (D3: production build with `LAUNCH=1` fails while dummy reviews exist): 6 reviews (mixed English/Chinese names), Google "G" mark, stars, dates, 4.9 rating display, "Read all reviews on Google" link.
- **Do NOT emit Review/AggregateRating schema for dummy reviews** (Google policy). Add only when real reviews are wired in.

## 8. Booking
**UI** (reference: `reference/customer-booking-UI.png`, `reference/customer-booking-UI-3.png`; `reference/calendar.png` is a staff view and is NOT built):
- Desktop 3 panes: left rail (Abby photo, title, vertical stepper: 1 Service → 2 Date → 3 Time → 4 Details), middle month calendar (available days as filled circles, unavailable/past greyed, prev/next month), right time-slot list (selected slot shows inline "Next" button).
- Step 4 details form: Full name, Phone (AU), Email, Service, Service option, Notes (optional), "Book Appointment". Copy: "Fill in your information and we'll get back to you to confirm your appointment."
- Mobile: one step at a time, stacked.
- Success screen + "Add to my calendar" (.ics / Google Calendar link).

**Availability rules** (config):
- Hours: Mon–Fri 9:00–19:00, Sat 9:00–18:00, Sun 10:00–17:00 (Australia/Sydney).
- 30-min slot grid; slot valid only if service duration fits before closing and doesn't overlap busy time.
- 15-min buffer between appointments. Min notice 3 h. Max advance 60 days.
- Any event in Abby's calendar = busy; customers only ever see "unavailable", never event details.

**Backend** (Cloudflare Pages Functions):
- `GET /api/availability?date|month&service` → free/busy from Abby's Google Calendar (service account; calendar shared with it, "make changes to events").
- `POST /api/book` → validate input server-side, verify **Cloudflare Turnstile**, re-check slot is still free, insert event `⏳ PENDING – <name> – <service>` (details in description), email Abby via **Web3Forms**.
- Abby confirms manually (call/SMS) and renames the event.
- **Demo mode** when Google credentials are absent: mocked availability, booking only emails (or logs).
- No customer confirmation email until a domain exists (then add Resend). No payments/deposits.
- Secrets only in Cloudflare env vars. `SETUP.md` gives Abby step-by-step Google Cloud + calendar sharing + Web3Forms + Turnstile setup.

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
Street name (no house number — home studio), phone, email, socials, prices, photos, GA4/GSC IDs, Google Calendar credentials, Web3Forms key, Turnstile keys, domain, Google Business Profile link, real reviews, chosen theme.
