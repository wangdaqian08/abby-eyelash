# AI-visibility prompt panel — monthly protocol

Purpose: once a month, ask AI assistants the questions real clients ask, and record how often Abby Eyelash appears and whether the facts are right. Source plan: `docs/GEO-STRATEGY.md` §4; method: `docs/research/geo-official-and-academic.md` §3.9.

Evidence note: there is no peer-reviewed protocol for this. The method below is an expert synthesis of the SparkToro study plus standard repeat-sampling practice (grade: expert opinion).

## 1. Why we measure appearance frequency, not rank

AI answers are not stable. In the SparkToro/Gumshoe study (2,961 runs), the same brand list came back fewer than 1 time in 100 ([SparkToro, Jan 2026](https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/)). An Australian trades test found ChatGPT kept the same businesses in only 8% of repeat runs (Gemini 24%, Perplexity 38%, Claude 89%; small, "directional" study) ([Dossis Digital](https://dossisdigital.com.au/ai-search-australia/)). So one run says nothing. We repeat each prompt and report **the share of runs in which Abby appears**. We do not report "position #3".

We also do not pay for "AI rank tracking" tools: answers vary run to run, and no third-party tool has internal access to Google's systems (see `docs/GEO-STRATEGY.md` §2).

## 2. The 20 prompts

Fixed. Do not change wording month to month, or results are not comparable. If a prompt must change, add a new ID and keep the old one.
Only the two "brand" prompts per language name Abby. All others must not.

**English (EN)**

| ID | Type | Prompt |
|---|---|---|
| E01 | Service + suburb | best eyelash extensions in Burwood |
| E02 | Service + suburb | hand painted nail art Burwood Sydney |
| E03 | Near station | eyelash extensions near Burwood station |
| E04 | Near station | gel nails near Burwood station |
| E05 | Service-specific | Is a lash lift or lash extensions better for short straight lashes? Where can I get either in Burwood? |
| E06 | Service-specific | Where can I get powder brows (semi-permanent brows) in Burwood, and how much do they cost? |
| E07 | Price | how much do eyelash extensions cost in Burwood Sydney |
| E08 | Price | how much is a gel manicure in Burwood NSW |
| E09 | Brand | Abby Eyelash Burwood opening hours and address |
| E10 | Brand | Abby Eyelash Burwood reviews and prices |

**Simplified Chinese (ZH)**

| ID | Type | Prompt |
|---|---|---|
| Z01 | Service + suburb | 悉尼 Burwood 哪里嫁接睫毛比较好 |
| Z02 | Service + suburb | Burwood 手绘美甲推荐 |
| Z03 | Near station | Burwood 火车站附近的美睫店 |
| Z04 | Near station | Burwood 火车站附近做光疗甲 |
| Z05 | Service-specific | 睫毛翘睫和嫁接睫毛哪个更适合我？Burwood 有推荐的店吗？ |
| Z06 | Service-specific | Burwood 哪里可以做半永久雾眉？大概多少钱？ |
| Z07 | Price | Burwood 嫁接睫毛一般多少钱 |
| Z08 | Price | Burwood 做光疗美甲大概多少钱 |
| Z09 | Brand | Abby Eyelash Burwood 营业时间和地址 |
| Z10 | Brand | Abby Eyelash Burwood 评价怎么样？价格多少？ |

If the studio gets a Chinese name, add it as new prompts Z11–Z12 (keep Z09–Z10 as they are).

## 3. Engines and runs

| Engine | How to run it |
|---|---|
| ChatGPT | Logged out, new chat each run, search on |
| Gemini | gemini.google.com, new chat each run |
| Google AI Overviews / AI Mode | google.com.au search, then AI Mode; note which one answered |
| Perplexity | New thread each run |
| Microsoft Copilot | New conversation each run |
| Claude | New chat each run, web search on |

- **3 runs per prompt per engine** (use 5 if you have time and want tighter numbers). 20 prompts × 6 engines × 3 runs = 360 answers. This is long; the first round is the slowest. If time is short, do EN and ZH on alternate months, or drop to 3 engines, but keep the choice the same every month.
- **Sydney location:** use a browser with location set to Sydney, or a Sydney VPN where possible. Use a private/incognito window and a signed-out session where the engine allows it.
- Same day or same week each month. Note the date and any known changes (new reviews, profile edits) in the notes column.
- Chinese prompts go in as written (Simplified Chinese). Record in the notes if the answer came back in English.

## 4. What to record (one row per run)

| Field | Meaning |
|---|---|
| `mentioned` | Y/N: Abby Eyelash named in the answer (any position) |
| `cited` | Y/N: the website (our domain) shown as a source/link |
| `cited_url` | The exact URL cited (blank if none). Note if the EN page was cited for a ZH prompt. |
| `hours_ok` | Y / N / NA: hours stated and match the website and Google Business Profile (NA if hours not given) |
| `price_ok` | Y / N / NA: price stated and matches the website price list |
| `address_ok` | Y / N / NA: address stated and matches the website exactly |
| `notes` | Wrong value seen, source the engine used, competitor names, anything odd |

Check facts against `src/data/site.ts` and `src/data/services.ts`, not from memory.

### CSV (copy and paste)

```csv
date,engine,prompt_id,lang,run,mentioned,cited,cited_url,hours_ok,price_ok,address_ok,notes
2026-11-26,ChatGPT,E09,EN,1,Y,Y,https://example.com/,Y,NA,N,"Gave old shop number; source was Yelp listing"
2026-11-26,Perplexity,Z07,ZH,2,N,N,,NA,NA,NA,"Listed 3 other salons; none from Burwood"
```

(Example rows only. Replace `example.com` with the real domain.) One CSV per month, or one file with a new `date` each month.

## 5. How to compute % appearance

Do it per engine and overall, **separately for discovery prompts (IDs 01–08) and brand prompts (09–10)**. Brand prompts are expected to work; discovery prompts show whether new clients find Abby.

- **Mention rate** = rows with `mentioned = Y` ÷ total rows, for the group.
- **Citation rate** = rows with `cited = Y` ÷ total rows.
- **Accuracy rate** = per fact (hours, price, address): `Y` ÷ (`Y` + `N`), ignoring `NA`.
- Also report by language (EN vs ZH) and by engine.

Example: discovery prompts, ChatGPT, EN: 8 prompts × 3 runs = 24 rows; Abby mentioned in 3 → 3 ÷ 24 = **12.5%**.

Compare month to month. With 24 rows per cell, treat small changes (a few percentage points) as noise; look at trends over several months. Context to keep in mind: the data comes from AI answers that vary; no result here proves cause and effect.

## 6. When an answer has a wrong fact

Accuracy errors are the most actionable finding.

1. Open the answer's sources (or the engine's cited links). Find where the wrong fact came from.
2. Fix it at the source:
   - Our website: fix the page (and `src/data/site.ts` or `services.ts`), update the visible "Prices updated" date only if content truly changed.
   - Google Business Profile, Apple Business Connect, Bing Places, Facebook, Yelp, directories: edit the listing to match `site.ts` exactly.
   - Third-party page we do not control: ask the owner to correct it.
3. Log the fix in `notes`, and re-check the same prompts next month. Search engines take time to re-read pages; The site pings IndexNow after deploys to speed up re-reading by Bing/Copilot ([Bing: sitemaps in AI search](https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search), [IndexNow FAQ](https://www.indexnow.org/faq)); Google has no equivalent.
4. If the engine invents a fact that no source contains, note it and move on; we cannot fix that.

## 7. Also check monthly (same sitting)

| Tool | Where | What to note | Source |
|---|---|---|---|
| Google Search Console: Generative AI performance report | Search Console, Performance area (rolled out to all sites by 2026-08-31) | Impressions, pages, countries. No clicks or queries. Use as the main Google AI visibility metric. AI Overview / AI Mode clicks also appear in Performance > Web. | [Google blog](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports), [GSC help](https://support.google.com/webmasters/answer/7042828) |
| Bing Webmaster Tools: AI Performance | Bing Webmaster Tools | Citations, cited pages, sampled grounding queries, citation share. No clicks. | [Bing blog](https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview), [Bing help](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c), [June 2026 update](https://blogs.bing.com/search/June-2026/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare) |
| GA4: "AI assistants" channel | GA4 > Acquisition > Traffic acquisition, channel group "AI assistants" (custom group placed above Referral, regex in research §3.9) | Sessions, `book_click`, `booking_submitted`, `message_click`, `map_click` from that channel | [GA4 default channels](https://support.google.com/analytics/answer/9756891), [OpenAI publishers FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) |

Cautions: GA4's built-in AI Assistant channel excludes AI Overviews and AI Mode (those count as Organic Search). AI app traffic often arrives with no referrer and shows as Direct. So GA4 under-counts AI traffic. The referrer list is observed, not official; check it against your own Session source report. Clicks tend to fall when AI summaries appear, so judge success by bookings, calls and direction taps, not only sessions ([Pew, n=900](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/)).

## 8. Monthly report (keep it to 5 lines)

1. Discovery mention rate: overall, EN, ZH, and per engine.
2. Brand-prompt mention rate and citation rate.
3. Accuracy: hours / price / address, errors found and fixed.
4. GSC Generative AI impressions, Bing citations, GA4 AI-assistant sessions and bookings.
5. Changes made last month (profile edits, new reviews, new mentions) and what to do next.

*Last updated: 2026-10-26.*
