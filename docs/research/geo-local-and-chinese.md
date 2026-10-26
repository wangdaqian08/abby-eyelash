# GEO for a local business: sources AI assistants use, reviews, and Chinese-language discovery

Project: Abby Eyelash (solo lash and nail studio, Burwood NSW 2134)
Researched: 2026-10-26
Scope: local-business GEO only. Crawler and Google/Bing official docs, the GEO academic paper and measurement are covered in a sibling document.

## Evidence key

- **[Official]**: platform documentation, policy or regulator text.
- **[Peer-reviewed]**: academic, peer-reviewed.
- **[Industry study n=…]**: vendor or agency data study. Vendors sell local-SEO and listings services, so each one has a commercial interest. Sample size and method are given where the publisher discloses them.
- **[Expert opinion]**: practitioner survey or commentary.
- **[Unverified]**: secondary report, or a claim with no published method.

Strength grades: **High** means official text, or a large study replicated by others. **Med** means one large disclosed study, or several smaller studies that agree. **Low** means a small or undisclosed study, or opinion only. **None** means nothing was found.

**Main limitation:** almost all large studies sample US locations (BrightLocal's 2026 citation study also has UK and AU locations but no AU breakdown). No study found covers beauty services in Australia, and none covers Chinese-language local queries about Australia. Results for Australia are inferred from these studies.

---

## Summary table

| Practice | Evidence summary | Evidence type & strength | Sources |
|---|---|---|---|
| Complete, accurate Google Business Profile (GBP) | GBP was 28.6% of all local AI citations. It appeared for 94% of businesses and for almost every location in Google AI Overviews and AI Mode. Gemini grounds local answers in Maps data on more than 250M places. Google says complete, accurate info helps local ranking. | Official + [Industry study n=1.97M citations, 1,355 locations US/UK/AU]. **High** | [S1], [S2], [S3], [S4] |
| Reviews on GBP: count, rating, recency, replies | Google says more reviews and positive ratings help local ranking, and recommends replying. Whitespark's 2026 AI factors put high Google rating at #8 and third-party review authority/diversity at #5 and #11. SOCi found ChatGPT-recommended locations average 4.3★. US consumers expect recent reviews (74% want ones from the last 3 months) and replies (89%). | Official + [Expert opinion n=47] + [Industry study n≈350k locations] + [Survey n=1,002 US]. **High for Google; Med for other AI assistants** | [S2], [S5], [S6], [S7] |
| Yelp listing (claimed and complete) | Yelp is ChatGPT's main local source in US data: about 80% of ChatGPT local answers (BrightLocal) and 95.8% of business-card grounding (Steady Demand). Yelp licensed its data to OpenAI in July 2026. Perplexity also integrates Yelp. **But Yelp cut back outside North America in 2016, so yelp.com.au coverage is thin. No AU-specific data was found.** | [Industry study n=1.97M; n=2,880 prompts] + news of the licensing deal. **High (US); Low (AU)** | [S1], [S8], [S9], [S10], [S11] |
| Apple Business Connect / Apple Maps | Apple says it controls how a business appears in Maps, Wallet and Siri. Its "Brand and Location Management" feature is listed for Australia. Apple Maps' share of consumers reading reviews doubled (14%→27%, US). ChatGPT cited Apple listings only 600 times out of about 1.97M citations. | Official + [Survey n=1,002 US]. **Med (Siri/Apple Maps); Low (other AI assistants)** | [S12], [S13], [S7], [S1] |
| Bing Places | Microsoft surfaces Bing Places in Bing, Maps and Copilot. Bing Places can import a profile from GBP. Meta told NearMedia that Bing Places is one of Meta AI's local sources. No official Copilot sourcing documentation was found. | [Unverified]/vendor guides + one press report. **Low–Med** | [S14], [S15] |
| Facebook business page | Facebook was the #3 cited source in AI Overviews and AI Mode (6.6k and 37k citations), and was used by ChatGPT in BrightLocal's 2025 test. | [Industry study n=1.97M]. **Med** | [S1], [S16] |
| Fresha (or another beauty booking marketplace) listing | Fresha's live inventory (availability, price, reviews) can be searched and booked inside ChatGPT and Claude through MCP, as of Aug 2026. No citation-rate data was found. | Company announcement. **Med for "can be surfaced"; None for ranking effect** | [S17] |
| "Best of" lists and unstructured mentions (local media, blogs) | Whitespark 2026 AI factors: #1 expert-curated "best of" lists, #3 prominence on industry domains, #4 and #7 unstructured citations. An Australian agency test found ChatGPT draws on aggregators, "best of" blogs, Reddit and ProductReview. Self-published listicles often do not lead to a recommendation. | [Expert opinion n=47] + [Industry study n≈330 answers, AU]. **Med (survey, not measured)** | [S5], [S18], [S19] |
| Dedicated page per service + suburb/neighbourhood relevance on own site | Whitespark 2026 AI factors: #2 dedicated page for each service, #6 geographic keyword relevance, #10 scannable structure. In AU tests, an AI engine cited a business's own site most for recommendation queries. Restaurants with a website had higher AI visibility (26.2% vs 16.7%, n=10k US). Websites were 44% of local citations in Yext's data and 58% of ChatGPT sources in Dec 2024, before ChatGPT switched to Yelp. | [Expert opinion n=47] + [Industry studies]. **Med** | [S5], [S18], [S20], [S21], [S22] |
| NAP (name, address, phone) consistency across directories | A controlled Yext/LSG test found consistency mainly affects *eligibility* for the local pack, not rank once listed. Experts rate citations as less important than before. SOCi says inconsistent listings reduce AI confidence, but gives no figures. No measured AI-accuracy study was found. | [Industry study, 1.3k locations] + [Expert opinion]. **Med (do it once); Low for further gains** | [S23], [S6] |
| AU general directories (True Local, Yellow Pages AU, Hotfrog, Localsearch, StartLocal) | Only localsearch.com.au appeared in the BrightLocal AU data (30 citations, car repair only). In one AU trades test, Claude and Gemini cited Yellow Pages and Localsearch. No evidence for beauty, True Local or Hotfrog. | [Industry study] / practitioner checklists. **Low** | [S1], [S18] |
| Reddit (r/sydney etc.) | Forums were 2% of local citations in Yext's data. In BrightLocal's Dec 2024 test Reddit was 0%. In the AU test ChatGPT and Perplexity cited Reddit for trades. Seeding posts yourself breaks Reddit rules and risks a ban. | [Industry studies]. **Low** | [S20], [S22], [S18] |
| Review schema (stars) on own LocalBusiness pages | Google: if the business controls the reviews about itself, its LocalBusiness/Organization pages are **ineligible** for review stars. | Official. **High (do not do it)** | [S24] |
| Asking for reviews | Google allows asking all customers for genuine reviews. Not allowed: incentives (discounts, freebies), review gating (asking only happy customers), staff quotas, or requiring specific content. Australian Consumer Law (ACCC): incentives must apply to positive and negative reviews alike, and must be disclosed. Selective solicitation has been prosecuted. | Official (Google, ACCC). **High** | [S25], [S26] |
| Simplified Chinese pages with hreflang (zh-Hans) | Google's official hreflang rules apply. Google AI Mode supports Chinese (since Oct 2025). Google and ChatGPT work normally in Australia, so a zh-Hans page can serve Chinese-language queries made there. | Official. **High (mechanics); Low (no data that it wins local AI answers)** | [S27], [S28] |
| Xiaohongshu (RED) notes and profile | Burwood: 32.8% of residents have Chinese ancestry and 19.9% speak Mandarin (2021 Census). Chinese-Australians use RED heavily for local discovery (no Sydney beauty data). RED blocks Googlebot and all AI bots in robots.txt, so RED content is mostly invisible to Western AI assistants. RED's own AI search, 点点 (Diandian), answers from in-app notes. | Official robots.txt + [Survey, Lowy] + news. **Med (for reaching Chinese customers); None (for website GEO)** | [S29], [S30], [S31], [S32] |
| Chinese AI assistants (Doubao, Yuanbao, DeepSeek, Kimi, Qwen) citing an overseas website | Large Chinese studies show these assistants cite China-ecosystem sources: Yuanbao cites WeChat Official Accounts, and Doubao cites Toutiao/Douyin (3 of its top 5 sources). No evidence was found that any of them surfaces a small overseas .com.au site for local queries. | [Industry study n=16.8M citations; n=9,786 questions]. **None for the website; Low–Med for in-ecosystem content** | [S33], [S34] |
| Dianping (大众点评) listing | Dianping's overseas operation targets Chinese *tourists*, mainly restaurants (Must-Eat lists). It blocks GPTBot and ByteSpider. No evidence was found of Sydney beauty coverage or use by local residents. | News. **Low** | [S35], [S29] |
| WeChat Official Account / Channels | WeChat is still widely used by Chinese-Australians (47% daily in Lowy's 2022 wave), and Yuanbao favours Official Account articles. No evidence was found on WeChat Search (搜一搜) local discovery for AU merchants. | [Survey] + [Industry study]. **Low–Med** | [S30], [S33] |

---

## Detailed notes

### 1. Where AI assistants get local business recommendations

**Google AI Overviews / AI Mode / Gemini**
- BrightLocal, "Where to get local citations for AI search" (2026-08-26) [Industry study]: 1,355 locations (US, UK, AU), 60,970 checks (5 prompts × 9 lat/long grid points), 1,967,762 citations across 116,670 domains, on AI Overviews, AI Mode and ChatGPT. GBP = 28.63% of all citations and appeared for 94.17% of businesses. Top sources in AI Overviews: GBP 108k, Yelp 12k, Facebook 6.6k, Tripadvisor 3.8k. Top sources in AI Mode: GBP 455k, Yelp 76k, Facebook 37k. Beauty/Wellness/Fitness was only 2.05% of locations and has no separate breakdown. AU locations were included but have no separate breakdown; localsearch.com.au was the only AU domain in the data. https://www.brightlocal.com/resources/ai-directory-sources/ [S1]
- Google Gemini API documentation, "Grounding with Google Maps" [Official]: Maps covers more than 250M places, and the tool returns place details, reviews, photos and hours, with citations. https://ai.google.dev/gemini-api/docs/maps-grounding [S3]
- In Dec 2025 the Gemini app started showing local results as Maps cards with ratings and review summaries (9to5Google, 2025-12-11) [Unverified/news]. https://9to5google.com/2025/12/11/gemini-app-google-maps-visual/ [S4]
- Google Business Profile Help, "Tips to improve your local ranking" (undated, ©2026) [Official]: Google ranks local results on relevance, distance and prominence. Prominence includes links and reviews. "More reviews and positive ratings can help your business's local ranking." "Businesses with complete and accurate info are more likely to show up." https://support.google.com/business/answer/7091 [S2]
- SOCi 2026 Local Visibility Index (press release, 2026-01-28) [Industry study n≈350k locations, 2,751 multi-location brands; method not on page]: ChatGPT recommended 1.2% of locations, against 35.9% appearing in the Google 3-pack. ChatGPT-recommended locations averaged 4.3★. Secondary reports say listing data was about 68% accurate on ChatGPT/Perplexity and 100% on Gemini. https://www.soci.ai/news/in-ai-driven-discovery-few-brands-are-chosen-most-disappear/ [S6]

**ChatGPT**
- OpenAI Help Center, "ChatGPT search" [Official, last read via search snippets because the page returned 403 to fetching]: ChatGPT "may share your location with trusted third-party providers that help provide more local information, such as nearby business listings." It does not name the providers. https://help.openai.com/en/articles/9237897-chatgpt-search [S36]
- Axios, 2026-07-23 [news]: Yelp is licensing reviews, photos and business info to OpenAI on a non-exclusive basis, and ChatGPT shows them with Yelp branding. https://axios.com/2026/07/23/yelp-reviews-chatgpt-geo-partnership [S8]
- Steady Demand (Ben Fisher), 2026-08-21 [Industry study n=2,880 prompts + 1,728 cross-check prompts, 12 verticals × 12 US metros, collected within 72h]: Yelp was in ChatGPT's business-card grounding in 95.83% of runs (93.75% for hair salons). Foursquare: 0.00%. Google: 4.62% of business cards. https://www.steadydemand.com/chatgpts-local-results-arent-coming-from-foursquare-and-probably-never-really-were/ [S9]
- **Myth flag:** the widely repeated "about 70% of ChatGPT local results come from Foursquare" traces to one consultant's 50-prompt Spanish test (May 2025) that only counted first-ranked results. A larger 2026 test found 0%. Treat the claim as unsupported/outdated [S9].
- **ChatGPT's sources change quickly:** BrightLocal Dec 2024 found business websites = 58% of ChatGPT local sources, directories 15%, Reddit 0%, and Yelp/Facebook/Google Maps absent [S22]. By Aug 2026 Yelp dominated [S1], [S9]. Any ChatGPT-specific tactic can expire with the next data deal.
- **Gap for Australia:** Yelp cut back internationally in 2016 but kept its 32 country sites live without local sales (TechCrunch 2016-11-03 [news]) https://techcrunch.com/2016/11/03/yelp-lays-off-175-in-sales-and-marketing-as-it-retrenches-internationally/ [S10]. No evidence was found on which provider backs ChatGPT's business cards in Sydney. The Dossis Digital AU test [S18] found ChatGPT citing aggregators/listicles (starworks.com.au), Reddit and ProductReview for trades.
- Dossis Digital, "How AI picks local businesses in Australia" (June 2026) [Industry study, 84 questions, about 330 answers, 12 trades, AU capitals; author calls it "directional"]: ChatGPT kept the same businesses in only 8% of repeat runs (Gemini 24%, Perplexity 38%, Claude 89%). The business's own website was the most-cited source for recommendation queries in every engine. Engines often justify a pick by quoting its review count and rating. https://dossisdigital.com.au/ai-search-australia/ [S18]

**Perplexity**: integrates Yelp data through Yelp Fusion (Maginative report [news]) https://www.maginative.com/article/perplexity-enhances-ai-search-engine-with-direct-yelp-data-integration/ [S11]. BrightLocal 2025-07-22 [Industry study, 20 searches × 4 engines]: Perplexity used Yelp in every niche, plus MapQuest, Instagram and YouTube. https://www.brightlocal.com/blog/ai-search-using-listings-sources/ [S16]. In Yext's data Perplexity used the widest mix of sources [S20].

**Microsoft Copilot / Bing Places**: no Microsoft document was found that states Copilot's local sourcing. Vendor guides say Bing Places feeds Bing, Maps and Copilot, and that Bing Places can import directly from GBP [Unverified] https://whitespark.ca/guides/the-ultimate-guide-to-your-bing-places-listing/ [S14].

**Apple (Siri / Apple Maps / Apple Intelligence)**: Apple newsroom (Jan 2023, apple.com/au) [Official]: Business Connect controls how a business appears across Maps, Wallet and Siri. https://www.apple.com/au/newsroom/2023/01/introducing-apple-business-connect/ [S12]. Business Connect has since been folded into "Apple Business", and Apple support (2026-04-14) lists "Brand and Location Management" for Australia [Official] https://support.apple.com/en-nz/126603 [S13]. Place-card ratings and reviews historically came from Yelp and Tripadvisor (TechCrunch 2023) [news]. Current AU review sources were not verified.

**Meta AI**: NearMedia [news/expert] reports that Meta named Bing Places, Facebook Places, Foursquare, Google Maps and Yelp as its local data sources. https://www.nearmedia.co/facebook-local-search-local-products-whats-after-reviews-chatgpt-erosion/ [S15]. **Low** (single secondary source).

**Large-sample studies at a glance**

| Study | Date | n / method | Engines | Key local finding |
|---|---|---|---|---|
| BrightLocal citation sources [S1] | 2026-08-26 | 1.97M citations, 1,355 locations US/UK/AU | AIO, AI Mode, ChatGPT | GBP 28.6% of citations; ChatGPT relies on Yelp (about 80% of answers) |
| Steady Demand [S9] | 2026-08-21 | 2,880 prompts, 12 US metros | ChatGPT | Yelp 95.8% of business cards, Foursquare 0% |
| Yext [S20] | 2025-10-09 | 6.8M citations, 1.6M responses, 4 industries (no beauty) | Gemini, ChatGPT, Perplexity | Websites 44%, listings 42%, reviews/social 8%, forums 2% |
| SOCi LVI [S6] | 2026-01-28 | about 350k locations, multi-location brands | ChatGPT, Gemini, Perplexity | ChatGPT recommends 1.2% of locations; rating is a gate |
| Whitespark LSRF [S5] | 2025-11-06 | 47 experts, 187 factors (opinion survey) | "AI search visibility" | Best-of lists, service pages, mentions, ratings |
| Local Falcon restaurants (via Steady Demand index) [S21] | 2026-06-12 | 10,000 US restaurants | Google AI | 74.9% never recommended; a website lifts visibility from 16.7% to 26.2% |
| Dossis Digital [S18] | 2026-06 | about 330 answers, AU, trades | ChatGPT, Gemini, Perplexity, Claude | Own site most-cited; ChatGPT unstable (8% repeat) |

No study isolates solo beauty studios or Australia. Studies of multi-location brands (SOCi, Yext) may not apply to a solo studio.

### 2. Australian citation/directory landscape (ranked by evidence)

1. **Google Business Profile**: **High**. Dominates Google's AI surfaces [S1] [S2] [S3].
2. **Yelp (yelp.com.au)**: **High for ChatGPT/Perplexity in the US, unknown for AU** [S1] [S9] [S10]. Claiming the listing is cheap, so do it, but don't expect AU traction.
3. **Facebook page** (and Instagram, cited by Perplexity [S16]): **Med** [S1].
4. **Apple Business Connect / Apple Business**: **Med** for Siri/Maps. US consumers using Apple Maps for reviews rose to 27% [S7] [S13].
5. **Bing Places**: **Low–Med**. Free, and importing from GBP takes minutes [S14] [S15].
6. **Fresha** (very common booking platform for AU beauty businesses): **Med** for being bookable inside ChatGPT/Claude [S17]. No ranking data.
7. **"Best of" editorial lists / local media** (Sydney lifestyle media, Chinese-language Sydney media, local blogs): **Med (expert-ranked #1)** [S5]. The business has to earn these. Paying for listicle placement is a weaker and riskier signal [S19].
8. **Localsearch.com.au, Yellow Pages AU, True Local, Hotfrog, StartLocal, Word of Mouth**: **Low**. Hardly any citations in measured data [S1]; cited for trades in one AU test [S18]; no beauty evidence. List the business on 2–4 of them once, with identical NAP, and stop there.
9. **Reddit (r/sydney, r/AusBeauty)**: **Low** [S20] [S22] [S18]. Do not self-promote.

**NAP consistency**: the Yext / Local SEO Guide test found consistency matters mainly for *eligibility* to show, not for ranking gains https://www.localseoguide.com/?p=8565 [S23]. Practitioners (Shaw, Hawkins) say citations matter less than they used to. Conclusion: make NAP identical everywhere once, then spend effort on reviews and content.

### 3. Reviews as a GEO/local signal

- Google [Official]: more reviews and positive ratings help local ranking, and replying is recommended [S2]. Google's review help page says: "As best practice, reply to reviews"; "A mix of positive and negative feedback often feels more trustworthy." https://support.google.com/business/answer/3474122 [S37]
- Whitespark 2026 [Expert opinion n=47] https://whitespark.ca/local-search-ranking-factors/ [S5]. Local pack factors: high Google rating #6 (score 181), quantity of Google reviews with text #9, recency #11, sustained influx #14, positive sentiment #42, reviews with photos #43. AI-visibility factors: authority of third-party review sites #5, high Google rating #8, diversity of review sites #11, quantity of third-party reviews #13/#20.
- BrightLocal Local Consumer Review Survey 2026 (2026-02-11) [Survey n=1,002 US adults]: 45% used AI tools for local recommendations (6% the year before). 74% care about reviews from the last 3 months. 89% expect replies. 50% are put off by templated replies. 31% only use businesses rated 4.5★+. https://www.brightlocal.com/research/local-consumer-review-survey/ [S7]
- **Review text keywords**: no measured evidence was found that keywords in review text cause AI recommendations. Claims seen were vendor surveys or undisclosed studies. **Low/Unverified.** Google's policy also forbids requiring specific content in reviews [S25], so do not script customers' reviews.
- **Reviews are not enough on their own**: Local Falcon found 70.9% of restaurants with 1,000+ reviews were still not recommended by AI [S21]. Third-party mentions also matter.
- **Review schema**: Google review snippet documentation (updated 2026-09-08) [Official]: "If the entity that's being reviewed controls the reviews about itself, their pages that are using LocalBusiness or any other type of Organization structured data are ineligible for star review feature." https://developers.google.com/search/docs/appearance/structured-data/review-snippet [S24]. **Do not add self-serving AggregateRating/Review markup.** Showing real testimonials as visible text, attributed and unedited, is fine.
- **Soliciting reviews**: Google Maps user contributed content policy, "Fake engagement" [Official] https://support.google.com/contributionpolicy/answer/7400114 [S25]. Allowed: asking customers for genuine reviews. Prohibited: incentives (discounts, free services), selectively soliciting positive reviews or discouraging negative ones, staff quotas or on-premises pressure, and requiring specific content. ACCC [Official]: incentives for reviews must apply whether the review is positive or negative and must be disclosed, and omitting negative reviews can be misleading. https://www.accc.gov.au/consumers/advertising-and-promotions/online-reviews-for-product-and-services [S26] (page returned 403 to fetching; wording confirmed via search snippets and law-firm summaries). Safest approach: no incentive at all, and send every client the same request.

### 4. Chinese-speaking customers in Sydney

**Audience facts**
- Burwood Council Community Snapshot 2024 (2021 Census) [Official]: 32.8% Chinese ancestry (NSW 7.2%). https://www.burwood.nsw.gov.au/files/assets/public/v/2/burwood-community-snapshot-2024.pdf. NSW Health profile: Mandarin speakers = 19.9% of Burwood LGA, the highest share of any NSW council. [S38]
- Lowy Institute "Being Chinese in Australia" (2022 wave) [Survey]: daily use is YouTube 58%, Facebook 49%, WeChat 47%, Instagram 38%, TikTok/Douyin 26%. Xiaohongshu was the most-used site in the "other" category. WeChat news use is declining. https://charts.lowyinstitute.org/features/chinese-communities/topics/media-use-and-news-habits [S30]. Note: this predates RED's 2025 surge. A secondary report quotes ABC (Mar 2025) giving RED more than 700k monthly AU users [Unverified] https://www.digitalcrew.com.au/blogs-and-insights/xiaohongshu-australia-why-the-platform-keeps-growing-in-2026/
- Peer-reviewed: a 2025 study of new Chinese migrant enterprises in Auckland found Xiaohongshu is a key promotion channel [Peer-reviewed (Elsevier/ScienceDirect journal); full text not accessible, so the journal name and details are unverified]. https://www.sciencedirect.com/science/article/pii/S1568484925000358 [S31]

**Xiaohongshu (RED)**
- robots.txt (fetched 2026-10-26) [Official]: `User-agent: Googlebot Disallow: /`. Baiduspider, bingbot and Sogou may crawl only `/explore` and the note sitemaps. `User-agent: * Disallow: /`, which blocks GPTBot, ClaudeBot, PerplexityBot and others. https://www.xiaohongshu.com/robots.txt [S29]. **So posting on RED does almost nothing for Google/ChatGPT visibility, and the website does almost nothing for RED's search.** They are separate channels.
- 点点 (Diandian) is RED's AI life-search assistant. RED acquired the team in Dec 2025, and in Sep 2026 RED merged its "问一问" search into it. It answers from in-app notes plus web info. RED says about 70% of MAU use search (cls.cn, chinaventure [news]). https://www.cls.cn/detail/2218380, https://m.chinaventure.com.cn/news/78-20260911-393218.html [S32]. No public documentation explains how it picks local merchants. Reasonable inference: genuine customer notes that tag the store's POI/location, plus an active business account. **Low (mechanism not documented).**

**Dianping / Meituan**: Dianping's overseas business anchors on Chinese tourists and restaurant Must-Eat lists (KrASIA [news]). https://kr-asia.com/meituans-dianping-grows-overseas-by-catering-to-chinese-tourists [S35]. Its robots.txt blocks GPTBot and ByteSpider [S29]. No evidence was found of Sydney nail/lash coverage. **Low.** Check whether a listing already exists for the studio and claim it if so. Don't invest beyond that.

**WeChat**: still the main messaging channel. Yuanbao's web search covers Official Accounts and Channels, and NewRank found Official Accounts about 10% of Yuanbao citations [S33]. No evidence was found that WeChat Search (搜一搜) helps AU local discovery. A WeChat ID/QR for bookings is a conversion aid, not a GEO signal. **Low–Med.**

**Chinese AI assistants**
- NewRank (新榜智汇), 2026-02-26 [Industry study n=16.84M source URLs, 1.43M Q&A sessions, Dec 2025]: Doubao's top sources are Toutiao and Douyin (3 of its top 5 are ByteDance properties). Yuanbao's top source is WeChat Official Accounts (about 10%). DeepSeek: Sohu, Baidu Baike, NetEase. Kimi: WeChat and Sohu. Every named site is Chinese. https://news.qq.com/rain/a/20260226A06TCX00 [S33]
- 鲸牙启量 (Jingya) [Industry study, 9,786 questions, Feb–Jul 2026, six platforms incl. Qwen/ERNIE]: Doubao cites sources in only 22.3% of answers. No local-life or overseas results. https://developer.volcengine.com/articles/7664109080730370094 [S34]
- **Conclusion**: there is no evidence that DeepSeek, Doubao, Kimi, Qwen or Yuanbao would surface a small Sydney .com.au page. Their citation pools come from China's own content platforms. To reach these assistants, content would have to sit on those platforms (WeChat Official Account articles, Douyin, Zhihu), which is not worth it for a solo studio. **None for the website.**
- **Chinese speakers in Sydney can use Google, Google Maps and ChatGPT normally** (no firewall). That is where a zh-Hans page can help. Google AI Mode added Chinese in Oct 2025 (Google blog 2025-10-07, language list confirmed by Engadget) https://blog.google/products-and-platforms/products/search/ai-mode-expands-languages-locations/ [S28]. **No study was found measuring Chinese-language local AI answers in Australia**, so the benefit is plausible but unmeasured.
- hreflang, Google "Localized versions" (updated 2026-09-21) [Official]: language code required, region optional. Use script subtags such as `zh-Hans` (example `zh-Hans-US`). Every version must list itself and all alternates, and links must be reciprocal or they are ignored. `x-default` is the fallback. "Google doesn't use hreflang or the HTML lang attribute to detect the language". Google detects language from visible content, so the Chinese page needs genuinely Chinese body text, not just a translated menu. https://developers.google.com/search/docs/specialty/international/localized-versions [S27]
- Baidu indexing of offshore sites without an ICP licence: only vendor commentary found, nothing measured. **None.** Do not pursue Baidu.

### 5. Content patterns evidenced to win local AI citations

| Pattern | Evidence | Strength |
|---|---|---|
| One page per service (lash extensions classic/volume, lash lift, nail art, gel, extensions) | Whitespark AI #2, local organic #1 [S5] | Med (expert survey) |
| Suburb/neighbourhood relevance (Burwood, Burwood station, Westfield Burwood, Strathfield/Croydon nearby) | Whitespark AI #6 "Geographic keyword relevance of content" [S5]. Google relevance factor [S2]. **No study isolates landmark mentions.** | Med for suburb; Low for landmarks |
| Scannable structure / FAQ format | Whitespark AI #10 [S5]. FAQ-specific local evidence: none found. (Google limits FAQ rich results to authoritative gov/health sites; see sibling doc.) | Low–Med |
| Niche focus (lash + nail specialist) | Whitespark AI #9 [S5] | Med (expert) |
| Own website existing and citable | Local Falcon: 26.2% vs 16.7% AI visibility [S21]. Own site most-cited in AU test [S18]. Yext: websites 44% [S20] | Med |
| Pricing transparency | No measured local-AI evidence found. AU test: cost queries cited government and cost-guide sites, rarely a business's own site [S18]. Fresha exposes prices to ChatGPT/Claude [S17]. GBP supports services with prices [S39] | Low (still useful for users and conversion) |
| First-party facts (hours, address, accreditation, products used, aftercare, patch-test policy) | Accuracy gap on ChatGPT/Perplexity [S6]. Whitespark "volume of quality content" #14 [S5] | Low–Med |
| Identical facts on website and GBP | Whitespark lists website–GBP match as a factor (secondary report, rank not verified) | Low |

---

## Recommended for Abby Eyelash: on-site (website)

1. **One indexable page per core service, in EN and zh-Hans**: what it is, duration, price range, aftercare, who it suits, refill intervals. (Whitespark AI #2, [S5])
2. **State location facts plainly in body text on every page**: "Shop X, [street], Burwood NSW 2134, [n]-minute walk from Burwood station / opposite Westfield Burwood", plus hours and phone, written identically to GBP. (Relevance [S2]; geo relevance [S5]. Landmarks: Low evidence but no cost.)
3. **Visible price list in HTML text**, not an image, in both languages. (Low GEO evidence, but it matches the GBP services feature [S39] and Fresha data [S17].)
4. **Real Simplified Chinese body copy** (not machine-only), reciprocal hreflang `en-AU` / `zh-Hans-AU` (or `zh-Hans`) + `x-default`, with separate URLs per language. ([S27])
5. **A short FAQ per service page** with first-party answers (allergies, patch tests, lash retention, gel removal, booking/cancellation). Present it as normal content, not as a way to get FAQ rich results. (Low–Med [S5])
6. **LocalBusiness / BeautySalon / NailSalon JSON-LD with NAP, geo, hours and sameAs links** to GBP, Instagram, RED, Fresha and Facebook. **No self-serving AggregateRating/Review markup** ([S24]). Showing real reviews as visible text is fine.
7. **Link to the review profiles** with a neutral "Leave us a review on Google" link. No incentive copy, and no "happy? review us / unhappy? email us" split ([S25], [S26]).
8. A booking button that deep-links to Fresha (or whichever platform is used) and a WeChat QR on the zh-Hans pages. These help conversion; they are not GEO signals.

## Recommended: off-site (owner actions, prioritised)

1. **Google Business Profile** (highest impact): correct primary category (e.g. "Eyelash salon") plus secondary "Nail salon". Add every service with prices, real photos, hours, and a description in English (GBP has one description field). Post updates. **High** [S1] [S2] [S3]
2. **Reviews system**: ask *every* client (no gating, no discount) for a Google review soon after the appointment, by SMS or QR. Reply to every review, personally rather than with a template, and reply in Chinese to Chinese reviews. Aim for a steady flow over time, not a burst. **High** [S2] [S5] [S7] [S25] [S26]
3. **Fresha (or the current booking platform) marketplace profile**: complete it with services, prices and reviews. It is bookable inside ChatGPT and Claude. **Med** [S17]
4. **Xiaohongshu business/professional account**: post genuine work photos with location tags, Chinese service names (美睫, 嫁接睫毛, 睫毛翘, 手绘美甲, 光疗甲, 延长甲) and "Burwood/悉尼宝活". Encourage clients to post their own notes, without paying for them. This is the main Chinese-discovery channel, separate from the website. **Med (audience) / None (website GEO)** [S29] [S30] [S32]
5. **Apple Business Connect (Apple Business)** and **Bing Places** (import from GBP). One-off, about 30 minutes each. **Med / Low–Med** [S13] [S14]
6. **Claim Yelp AU and Facebook page** with identical NAP. **Med (Facebook) / Low for AU (Yelp)** [S1] [S10]
7. **Earn third-party mentions**: local "best lash/nail in Burwood/Inner West" roundups, Sydney Chinese-language media and community sites, and supplier or educator directories (lash academy alumni lists). Whitespark's #1 AI factor. **Med** [S5]
8. **2–4 AU directories once** (Localsearch, Yellow Pages AU, True Local, Hotfrog) with identical NAP, then stop. **Low** [S1] [S23]
9. **WeChat**: a business WeChat ID for bookings and a Moments presence. No Official Account unless there is capacity to publish regularly. **Low–Med** [S33]

## Not recommended / no evidence

- **Self-serving review stars schema** on own pages: ineligible under Google policy [S24].
- **Review incentives, discounts-for-reviews, or review gating**: prohibited by Google [S25] and risky under ACL/ACCC [S26].
- **Treating Foursquare as "the ChatGPT data source"**: a myth by 2026; a larger test found 0% [S9].
- **Mass directory submissions / citation-building packages** beyond the core few: low marginal value [S23] [S1].
- **Optimising the website for DeepSeek/Doubao/Yuanbao/Kimi/Qwen**: no evidence they surface small overseas sites [S33] [S34].
- **Baidu SEO / ICP licensing**: no evidence it helps, and Baidu is irrelevant to Sydney residents.
- **Expecting RED or Dianping content to appear in Google/ChatGPT answers**: both block those crawlers [S29].
- **Scripting review content or keyword-stuffing reviews**: forbidden ("require specific content") [S25], and no evidence that review keywords cause AI picks.
- **Self-published "Top 10 lash salons in Burwood" listicles that rank yourself #1**: AI Overviews often cite them but then recommend competitors (Lily Ray, n=100 queries, via [S19]) [Expert opinion].
- **Reddit self-promotion**: low citation share [S20] and against community rules.
- **"llms.txt" or similar for local visibility**: no local evidence found (see sibling doc for the general verdict).

---

## Source list

- [S1] BrightLocal, "Where to get local citations for AI search", 2026-08-26. https://www.brightlocal.com/resources/ai-directory-sources/ [Industry study n=1,967,762 citations / 1,355 locations]
- [S2] Google Business Profile Help, "Tips to improve your local ranking on Google", undated (©2026). https://support.google.com/business/answer/7091 [Official]
- [S3] Google AI for Developers, "Grounding with Google Maps". https://ai.google.dev/gemini-api/docs/maps-grounding [Official]
- [S4] 9to5Google, "Gemini app Google Maps visual results", 2025-12-11. https://9to5google.com/2025/12/11/gemini-app-google-maps-visual/ [news]
- [S5] Whitespark, "2026 Local Search Ranking Factors", 2025-11-06. https://whitespark.ca/local-search-ranking-factors/ [Expert opinion survey n=47, 187 factors]
- [S6] SOCi, 2026 Local Visibility Index press release, 2026-01-28. https://www.soci.ai/news/in-ai-driven-discovery-few-brands-are-chosen-most-disappear/ [Industry study n≈350,000 locations]
- [S7] BrightLocal, Local Consumer Review Survey 2026, 2026-02-11. https://www.brightlocal.com/research/local-consumer-review-survey/ [Survey n=1,002 US]
- [S8] Axios, "Exclusive: Yelp partners with ChatGPT to surface reviews", 2026-07-23. https://axios.com/2026/07/23/yelp-reviews-chatgpt-geo-partnership [news]
- [S9] Steady Demand, "ChatGPT's local results aren't coming from Foursquare", 2026-08-21. https://www.steadydemand.com/chatgpts-local-results-arent-coming-from-foursquare-and-probably-never-really-were/ [Industry study n=2,880 + 1,728 prompts]
- [S10] TechCrunch, "Yelp lays off 175 … retrenches internationally", 2016-11-03. https://techcrunch.com/2016/11/03/yelp-lays-off-175-in-sales-and-marketing-as-it-retrenches-internationally/ [news]
- [S11] Maginative, "Perplexity enhances AI search engine with direct Yelp data integration". https://www.maginative.com/article/perplexity-enhances-ai-search-engine-with-direct-yelp-data-integration/ [news]
- [S12] Apple Newsroom (AU), "Introducing Apple Business Connect", 2023-01. https://www.apple.com/au/newsroom/2023/01/introducing-apple-business-connect/ [Official]
- [S13] Apple Support, "Available services and features for Apple Business", 2026-04-14. https://support.apple.com/en-nz/126603 [Official]
- [S14] Whitespark, "The ultimate guide to your Bing Places listing". https://whitespark.ca/guides/the-ultimate-guide-to-your-bing-places-listing/ [Expert opinion]
- [S15] NearMedia, "Facebook (Local) Search …". https://www.nearmedia.co/facebook-local-search-local-products-whats-after-reviews-chatgpt-erosion/ [news/expert; Low]
- [S16] BrightLocal, "AI search makes local listings more important than ever", 2025-07-22. https://www.brightlocal.com/blog/ai-search-using-listings-sources/ [Industry study n=20 searches × 4 engines]
- [S17] Compare the Cloud, "Fresha becomes first beauty marketplace to go live on both ChatGPT and Claude", 2026-08-11 (Business Wire release 2026-08-04). https://www.comparethecloud.net/news/fresha-becomes-first-beauty-marketplace-to-go-live-on-both-chatgpt-and-claude [Company announcement]
- [S18] Dossis Digital, "How AI picks local businesses in Australia: 2026 study", 2026-06. https://dossisdigital.com.au/ai-search-australia/ [Industry study ≈330 answers, AU trades; directional]
- [S19] The HOTH, "AI cites listicles" (summarises Lily Ray n=100 queries; Haigler n>2M citations). https://thehoth.com/blog/ai-cites-listicles/ [Expert opinion / secondary; vendor sells listicle placement]
- [S20] Yext, "AI doesn't rank, it cites. And 86% of its sources are brand-managed", 2025-10-09. https://www.yext.com/blog/ai-citations-86-percent-of-sources-are-brand-managed [Industry study n=6.8M citations / 1.6M responses]
- [S21] Steady Demand, "Local Search & AI Industry Research Index" (incl. Local Falcon restaurant study 2026-06-12, n=10,000), 2026-08-29, updated 2026-10-25. https://www.steadydemand.com/?p=4964 ; Local Falcon research: https://www.localfalcon.com/research [Industry study]
- [S22] BrightLocal, "Uncovering ChatGPT search sources", 2024-12. https://www.brightlocal.com/research/uncovering-chatgpt-search-sources/ [Industry study]
- [S23] Local SEO Guide, Yext duplicate-suppression / NAP consistency test. https://www.localseoguide.com/?p=8565 [Industry study, 1.3k+ locations]
- [S24] Google Search Central, "Review snippet structured data", updated 2026-09-08. https://developers.google.com/search/docs/appearance/structured-data/review-snippet [Official]
- [S25] Google Maps user contributed content policy, "Fake engagement". https://support.google.com/contributionpolicy/answer/7400114 [Official]
- [S26] ACCC, "Online reviews for products and services". https://www.accc.gov.au/consumers/advertising-and-promotions/online-reviews-for-product-and-services [Official; fetch blocked, confirmed via search snippets]
- [S27] Google Search Central, "Tell Google about localized versions of your page", updated 2026-09-21. https://developers.google.com/search/docs/specialty/international/localized-versions [Official]
- [S28] Google blog, "AI Mode expands to more languages and locations", 2025-10-07. https://blog.google/products-and-platforms/products/search/ai-mode-expands-languages-locations/ [Official]; Chinese named in Engadget coverage https://engadget.com/ai/google-search-ai-mode-is-now-available-in-more-languages-and-regions-043540278.html [news]
- [S29] robots.txt of xiaohongshu.com and dianping.com, fetched 2026-10-26. https://www.xiaohongshu.com/robots.txt , https://www.dianping.com/robots.txt [Official]
- [S30] Lowy Institute, "Being Chinese in Australia: media use & news habits" (2022 wave). https://charts.lowyinstitute.org/features/chinese-communities/topics/media-use-and-news-habits [Survey]
- [S31] "Exploring Xiaohongshu's role in business promotion among new Chinese migrant enterprises", ScienceDirect, 2025. https://www.sciencedirect.com/science/article/pii/S1568484925000358 [Peer-reviewed; full text not read]
- [S32] cls.cn on 点点 (Diandian) https://www.cls.cn/detail/2218380 ; ChinaVenture, 2026-09-11 https://m.chinaventure.com.cn/news/78-20260911-393218.html [news]
- [S33] NewRank (新榜智汇), "我们深度分析了超1600万条AI引用数据", 2026-02-26. https://news.qq.com/rain/a/20260226A06TCX00 [Industry study n=16.84M citations]
- [S34] 鲸牙启量 (Jingya), "不同 AI 平台引用哪些信源？", data to 2026-07-18. https://developer.volcengine.com/articles/7664109080730370094 [Industry study n=9,786 questions]
- [S35] KrASIA, "Meituan's Dianping grows overseas by catering to Chinese tourists", 2026. https://kr-asia.com/meituans-dianping-grows-overseas-by-catering-to-chinese-tourists [news]
- [S36] OpenAI Help Center, "ChatGPT search". https://help.openai.com/en/articles/9237897-chatgpt-search [Official; fetch blocked, content via search snippets]
- [S37] Google Business Profile Help, "Manage customer reviews". https://support.google.com/business/answer/3474122 [Official]
- [S38] Burwood Council Community Snapshot 2024 https://www.burwood.nsw.gov.au/files/assets/public/v/2/burwood-community-snapshot-2024.pdf ; Cancer Institute NSW multicultural profile https://www.cancer.nsw.gov.au/getmedia/42777f94-2e9b-4aba-9ca5-31b2f96c874d/SCTASK3865227-Multicultural-comm-profile-report-Language-FA.pdf [Official]
- [S39] Google Business Profile Help, "Add or edit services". https://support.google.com/business/answer/9455399 [Official]
