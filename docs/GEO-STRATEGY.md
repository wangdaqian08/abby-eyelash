# Abby Eyelash — GEO / SEO Strategy (evidence-based)

Status: **DRAFT — awaiting owner approval.** Nothing in this document is implemented until approved.
Date: 2026-10-26.

Evidence base (full quotes, dates, sample sizes, caveats):
- `docs/research/geo-official-and-academic.md` — source IDs prefixed **OA-** (e.g. OA-G2 = Google AI optimization guide)
- `docs/research/geo-local-and-chinese.md` — source IDs prefixed **LC-** (e.g. LC-S1 = BrightLocal 2026 AI citation study)

## 0. Principles

1. **Only implement practices with documented evidence.** Each item below lists its evidence grade (High / Med / Low) and its sources. Items graded *None* are not built.
2. **GEO is SEO plus local entity signals.** Google states that AI Overviews and AI Mode use its core ranking systems and have "no additional requirements" (OA-G1, OA-G2). Bing says the same about SEO fundamentals and grounding (OA-B3, OA-B4).
3. **The website is not the biggest lever for local AI answers.** Google Business Profile is 28.6% of all local AI citations (LC-S1, n≈1.97M citations), so off-site owner actions (§3) matter as much as the site.
4. **No manipulation.** No keyword stuffing, doorway pages, hidden prompt text, fake date bumps, or self-serving review markup. These are classed as abuse or policy violations (OA-R1, OA-B5, OA-G3, OA-G5, LC-S24).
5. **Measure appearance frequency, not "AI rank".** AI answers are non-deterministic: the same brand list came back fewer than 1 in 100 times (OA-S14).

Known evidence limits: most studies are correlational, run by vendors, and sample US or English-language sites. None covers Australian beauty businesses or Chinese-language local queries. Effects for Abby are therefore inferred, not measured. §4 measures them ourselves.

## 1. On-site practices we WILL implement

| # | Practice | How we implement it | Evidence | Sources | Verified by |
|---|---|---|---|---|---|
| 1 | All key content in static HTML | Astro static output. Services, prices, durations, hours, address and FAQ answers are never rendered only by client JS. The scroll-reveal effect only runs once JS adds the `.js` class, so non-JS crawlers see everything. | **High**: GPTBot, ClaudeBot and PerplexityBot do not execute JS (~1B requests). Bing: CSR content may not ground. | OA-V1, OA-B3, OA-B4 | `curl` each page and grep for prices, hours and FAQ text |
| 2 | Key facts not hidden in collapsed UI | FAQ answers and price tables are **always visible**, with no accordions or tabs. *(Changes the design system: Accordion component dropped.)* | **Med**: Microsoft says "AI systems may not render hidden content". | OA-B4 | Visual check plus curl |
| 3 | robots.txt allows every search and answer bot | Explicit `Allow: /` for Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User and Applebot, plus a `Sitemap:` line. Training bots depend on decision **D2**. | **High**: each vendor says blocking its search bot removes you from its answers. | OA-O1, OA-P1, OA-A1, OA-AP1 | Fetch the live `/robots.txt` |
| 4 | Cloudflare does not block AI crawlers | After deploy: turn off "Block AI bots", allow search and agent crawlers in AI Crawl Control, and check that managed robots.txt adds no disallows. Documented as a deploy checklist item. | **High**: Cloudflare has blocked AI crawlers by default on new domains since July 2025. | OA-CF1, OA-CF2 | Live robots.txt plus Cloudflare bot analytics |
| 5 | No snippet-blocking directives | Never use `nosnippet`, `max-snippet:0`, `noarchive` or `nocache` on public pages. | **High** (official) | OA-G1, OA-B5 | Grep the build output |
| 6 | One page per service, per language | 5 service pages × EN/ZH. Each opens with a **2–3 sentence direct answer**: what it is, price from, duration, how long it lasts, and the Burwood location. Then H2 sections for real client questions (aftercare, refill timing, patch test, preparation) and a visible price table. | **Med**: Whitespark AI factor #2 (expert survey, n=47). Bing recommends clear headings and tables. 44% of ChatGPT citations come from the first 30% of a page (Low–Med). | LC-S5, OA-B2, OA-B4, OA-S10, OA-G14 | Content review checklist |
| 7 | **No suburb doorway pages** | We do **not** build "lashes Strathfield / Ashfield / Croydon…" pages. Burwood is the only location, because it is the only true one. | **High (harmful)**: scaled content abuse (Google). Keyword stuffing −8% (GEO paper). | OA-G2, OA-G3, OA-R1, OA-B5 | — |
| 8 | Location facts in body text, identical to Google Business Profile | Every page states the address, hours and phone in plain text, generated from `src/data/site.ts` (one source, so it always matches GBP). A short "how to find us" line with a walking reference to Burwood station and Westfield Burwood. | Suburb relevance: **Med** (LC-S5 #6, LC-S2). Landmarks: **Low** (no study, no cost). NAP consistency mainly gates eligibility. | LC-S2, LC-S5, LC-S23 | Diff the site against GBP before launch |
| 9 | Specific, verifiable first-party facts, with sources where relevant | Concrete numbers ("classic set ≈ 120 min; refill every 2–3 weeks"), the products and adhesive types used, and Abby's own aftercare steps. Health and safety claims (patch test, adhesive sensitivity) link to a credible source. Written fluently, with no stuffing. | **Med (mixed)**: GEO paper (KDD 2024) found statistics +31% and cited sources +28%; C-SEO Bench (NeurIPS 2025) found such rewrites largely ineffective in competition. We keep only the defensible part, which is real facts and real citations. | OA-R1, OA-R2 | Content review |
| 10 | About Abby with real entity info | Name, photo, training and certifications, years of experience, and products used. NAP matches GBP. Facts come from the owner (decision **D4**). | **Med** for trust (people-first content). No measured direct AI effect. | OA-G3, OA-B1 | — |
| 11 | JSON-LD that mirrors visible content only | Home: `["BeautySalon","NailSalon"]` with name, PostalAddress, geo, telephone, `openingHoursSpecification`, priceRange, image, `sameAs` (GBP, Instagram, Xiaohongshu), `founder` (Person), and `hasOfferCatalog` only with prices shown on the page. Service pages: `Service` + `Offer` (visible prices) + `BreadcrumbList`. Site: `WebSite`. **No `AggregateRating`/`Review`, no `FAQPage`.** | **Med** for entity and rich-result purposes (official). A controlled test showed **no citation lift**, so this is not a GEO hack. Self-serving review stars are ineligible. | OA-G5, OA-G7, OA-S5, OA-E2, LC-S24, OA-G15 | Rich Results Test plus Schema validator |
| 12 | Bilingual done properly | Separate URLs (`/`, `/zh/`). `<html lang="en-AU">` / `lang="zh-Hans"`. Reciprocal hreflang (`en-AU`, `zh-Hans`, `x-default`) in the head and sitemap. Natively written Chinese copy (Claude drafts, the owner reviews), not thin machine copies. Visible switcher. | **High** for the mechanics (Google docs). **Low** for AI benefit; ChatGPT and Perplexity often cite the EN URL anyway. | LC-S27, LC-S28, OA-E1 | hreflang validator |
| 13 | Truthful freshness | Each content file has an `updated` date. That date drives: a visible "Prices updated: …" line, `dateModified` in JSON-LD, and sitemap `lastmod`. It changes only when the content really changes. | **Med**: AI-cited URLs are 25.7% fresher (Ahrefs, 17M citations). Bing calls lastmod "a key signal". Google warns against fake date bumps. | OA-S7, OA-S9, OA-B6, OA-G3, OA-G9 | Sitemap check |
| 14 | XML sitemap and IndexNow | `@astrojs/sitemap` with i18n and true lastmod. An IndexNow key file plus a post-deploy ping script, activated once the domain exists. | **Med** (Bing/Copilot only; not Google) | OA-B6, OA-IN1 | Bing Webmaster Tools |
| 15 | Fast pages | Static HTML, Astro `<Image>` (AVIF/WebP, responsive, lazy below the fold), self-hosted fonts, JS only for booking, menu and theme preview. Target: LCP < 2.5s on mobile and Lighthouse ≥ 95. | **Low–Med** (correlational: FCP < 0.4s got 6.7 vs 2.1 citations). Page experience is listed by Google. | OA-S9, OA-G1 | Lighthouse audit |
| 16 | Real images with descriptive EN and ZH alt text | Abby's own work photos (placeholders until supplied). | **Med**: Google says relevant media can increase visibility in AI features. | OA-G1, OA-G2 | — |
| 17 | Stable URLs | Real 404 page, 301s for any rename, no URL churn. | Standard (OA-V1) | OA-V1 | — |
| 18 | Review links that follow policy | A neutral "Leave us a review on Google" link. No incentives and no gating (no "happy? → Google, unhappy? → email"). | **High** (Google policy plus ACCC) | LC-S25, LC-S26 | Copy review |
| 19 | Conversion helpers (not GEO signals) | Booking CTA on every page; `tel:` links; a WeChat ID and QR on ZH pages; a map link. | — (conversion) | LC §Recommended #8 | GA4 events |

## 2. Practices we will NOT implement (and why)

| Practice | Why not | Sources |
|---|---|---|
| **llms.txt / llms-full.txt** *(was in SPEC §9; removing it depends on decision D1)* | Google: Search "doesn't use" it and it "won't help or harm". 97% of files across 137k sites got zero fetches. No correlation with citations across ~300k domains. Evidence: **None**. | OA-G2, OA-S3, OA-S4 |
| **FAQPage schema** *(was in SPEC §9)* | Slightly negative correlation with citations (n=216k pages). Google limited FAQ rich results to gov/health sites. The visible FAQ content stays. | OA-S9 |
| `areaServed` listing neighbouring suburbs *(was in SPEC §9)* | Schema must mirror visible content. Listing suburbs invites doorway-style content. Burwood only. | OA-G5 |
| Self-serving `AggregateRating` / `Review` schema | Ineligible plus manual-action risk. | LC-S24, OA-G15 |
| Special "AI schema", chunked robotic Q&A rewrites | Google: no special markup; chunking is "not required". Rewrites are largely ineffective. | OA-G2, OA-R2 |
| Keyword stuffing, suburb doorway pages, hidden prompt-injection text | Harmful; classed as abuse by Bing and Google. | OA-R1, OA-B5, OA-R4 |
| Faking `dateModified` / `lastmod` | Named as a warning sign by Google. | OA-G3, OA-B6 |
| Optimising the website for DeepSeek / Doubao / Yuanbao / Kimi / Baidu | These cite China-ecosystem sources (WeChat articles, Toutiao/Douyin), n=16.8M citations. No evidence they surface small overseas sites. Chinese reach goes via Xiaohongshu and WeChat instead (§3). | LC-S33, LC-S34 |
| Self-published "Top 10 lash salons in Burwood" listicles | They often get cited but the recommendation goes to competitors. | LC-S19 |
| Paid "AI rank tracking" | Answers vary run to run. No third-party tool has internal access. | OA-S14, OA-G2 |

## 3. Off-site owner actions (prioritised; outside the codebase, but where most local AI visibility comes from)

Delivered as `docs/OWNER-ACTIONS.md`, a checklist in plain English with Chinese notes.

| Priority | Action | Evidence | Sources |
|---|---|---|---|
| 1 | **Google Business Profile**: primary category "Eyelash salon", secondary "Nail salon". Add every service with prices, real photos, the hours, and a description. Post updates. Use exactly the same NAP as the site. | **High** (28.6% of local AI citations; Gemini grounds in Maps) | LC-S1, LC-S2, LC-S3 |
| 2 | **Reviews system**: ask *every* client for a Google review (SMS or QR, no discount, no gating). Reply personally to every review, and in Chinese to Chinese reviews. Aim for a steady flow, not a burst. | **High** (Google); **Med** (other AI) | LC-S2, LC-S5, LC-S7, LC-S25, LC-S26 |
| 3 | **Xiaohongshu (RED) professional account**: real work photos, location tags, Chinese service terms (美睫, 嫁接睫毛, 睫毛翘, 手绘美甲, 光疗甲, 延长甲), "Burwood/悉尼宝活". This is the main Chinese discovery channel; RED blocks Western AI crawlers, so it works independently of the website. | **Med** (audience: 32.8% Chinese ancestry in Burwood) | LC-S29, LC-S30, LC-S32, LC-S38 |
| 4 | **Apple Business Connect** and **Bing Places** (import from GBP), about 30 minutes each. | **Med / Low–Med** | LC-S13, LC-S14 |
| 5 | **Facebook page**, plus **Yelp AU** claimed with identical NAP. | **Med** (Facebook #3 in AIO/AI Mode); **Low** for Yelp in AU | LC-S1, LC-S8, LC-S10 |
| 6 | **Earn third-party mentions**: local "best of" roundups, Sydney Chinese-language media, lash academy alumni lists. | **Med** (Whitespark AI #1; brand mentions r=0.664) | LC-S5, OA-S8 |
| 7 | 2–4 AU directories **once** (Localsearch, Yellow Pages AU, True Local, Hotfrog), then stop. | **Low** | LC-S1, LC-S23 |
| 8 | Business WeChat ID for bookings and a Moments presence. | **Low–Med** | LC-S33 |
| opt | **Fresha marketplace listing**: bookable inside ChatGPT and Claude since Aug 2026. Risk: a second booking system next to Google Calendar (double-booking). Decision **D5**. | **Med** for "can be surfaced"; **None** for ranking | LC-S17 |

## 4. Measurement plan (built in from day 1)

| Tool | What we track | Sources |
|---|---|---|
| **Google Search Console** (domain property, sitemap submitted) | Performance > Web (includes AIO/AI Mode clicks) **and** the Generative AI performance report (impressions; no clicks or queries). | OA-G10, OA-G11 |
| **Bing Webmaster Tools** | AI Performance: citations, cited pages, sampled grounding queries, citation share. Bing also feeds Copilot and probably part of ChatGPT. | OA-B1, OA-B2 |
| **GA4** | A custom channel group "AI assistants" placed **above Referral**, using the referrer regex from OA §3.9, plus `utm_source=chatgpt.com`. Conversions: `book_click`, `booking_submitted`, `message_click`, `map_click`, `social_click`, `review_click`. | OA-G12, OA-O2 |
| **Cloudflare bot analytics** | Confirms that OAI-SearchBot, PerplexityBot, Claude-SearchBot and Bingbot actually fetch pages. | OA-CF1 |
| **Monthly prompt panel** (`docs/geo-prompt-panel.md`) | 20 fixed prompts (10 EN, 10 ZH) × 3–5 runs × 6 engines (ChatGPT, Gemini, Google AIO/AI Mode, Perplexity, Copilot, Claude), run from a Sydney location. Record: Abby mentioned (%), site cited (%), and **fact accuracy** (hours, price, address). Accuracy errors get fixed at the source. | OA-S14 (method = expert synthesis) |
| **Business outcome** | Bookings, calls and direction taps, not just sessions (clicks fall when AI summaries appear: Pew, n=900). | OA-S13, OA-G4 |

## 5. Changes to SPEC.md if approved

- §9: remove `llms.txt` (subject to D1), remove `FAQPage` schema, remove `areaServed` neighbouring suburbs. Add robots.txt, Cloudflare audit, IndexNow, true `updated` dates, a visible "Prices updated" line, and the measurement plan above.
- §6 / design system: FAQ and price tables are always visible (no accordion).
- §7: dummy reviews are covered by decision D3.
- New docs: `docs/OWNER-ACTIONS.md`, `docs/geo-prompt-panel.md`, and a deploy checklist (Cloudflare AI-bot settings, GSC/BWT verification, IndexNow ping).

## 6. Decisions for the owner

- **D1** llms.txt: drop it (evidence: None). Recommended: drop.
- **D2** Training crawlers (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot): allow or block? There is no measured visibility benefit either way (OA-G6). Recommended: allow, since a small business has no content to protect and it maximises brand presence.
- **D3** Dummy reviews: show them in preview only, with a launch guard so the production build fails while dummy reviews are present. Publishing fabricated reviews on a live business site is misleading under Australian Consumer Law (LC-S26). Recommended: yes.
- **D4** About-Abby facts (training, certifications, years, products): placeholders until the owner provides them. Recommended: yes.
- **D5** Fresha marketplace listing: not now; revisit after launch. Recommended: not now.
