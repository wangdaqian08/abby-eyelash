# GEO for Abby Eyelash: official guidance and empirical evidence

Research date: 2026-10-26. Scope: platform guidance, academic and industry studies, technical factors, measurement.
Out of scope (sibling agent): local citation sources, directories, Google Business Profile tactics, Chinese platforms.

Evidence tags:
- **[Official]**: primary documentation from the platform operator.
- **[Peer-reviewed]**: accepted at a peer-reviewed venue.
- **[Preprint]**: arXiv, not peer-reviewed.
- **[Industry study n=…]**: vendor or agency data study. Usually correlational, and often run by a company that sells tools.
- **[Expert opinion]**: a named practitioner's tests or analysis.
- **[Unverified]**: secondary coverage only. I could not reach the primary source.

Strength: **High** means an official statement, or several independent large studies that agree. **Med** means one large study, or official guidance without data. **Low** means a small sample, a single practitioner, or conflicting studies. **None** means no evidence, or evidence against.

---

## 1. Summary table

| Practice | Evidence summary | Evidence type & strength | Sources |
|---|---|---|---|
| Treat GEO as normal SEO (indexable, ranks, snippet-eligible) | Google: AI Overviews (AIO) and AI Mode use core ranking systems and have "no additional requirements". Bing: SEO fundamentals feed grounding eligibility. Pages that rank are cited more (SE Ranking) | [Official] High | G1, G2, B3, S9 |
| Allow search/answer crawlers in robots.txt (OAI-SearchBot, PerplexityBot, Claude-SearchBot, Bingbot, Googlebot, Applebot) | Each vendor says that blocking its search bot removes or reduces your appearance in its answers | [Official] High | O1, P1, A1, AP1 |
| Training bots (GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot) | These control training only. Google-Extended "does not impact a site's inclusion in Google Search". No evidence that allowing them raises citations. Allowing them is a business choice. | [Official] High (on what they control). None (on visibility benefit) | O1, A1, G6, AP1, CC1 |
| Check that Cloudflare is not blocking AI bots | Cloudflare blocks AI crawlers by default on new domains (since July 2025). Its managed robots.txt can add disallow rules | [Official] High | CF1, CF2 |
| Server-rendered or static HTML for all key content | GPTBot, ClaudeBot and PerplexityBot fetch JS but do not execute it. Google and Applebot render JS. Bing warns that content hidden behind client-side rendering may not be used for grounding | [Industry study, Vercel/MERJ, ~1B requests] + [Official, Bing] High | V1, B3, B4 |
| Don't hide key facts in tabs, accordions or JS-only widgets | Microsoft: "AI systems may not render hidden content" | [Official] Med | B4 |
| Unique, first-hand, people-first content | Google's core message for AI features. Search-engine-first content and scaled pages violate policy | [Official] High | G1, G2, G3, G4 |
| Add statistics, quotations and cited sources to text | GEO paper (KDD 2024): +31–41% on a GPT-3.5 test engine, +9–22% on Perplexity, with the biggest gains for lower-ranked sources. A NeurIPS 2025 benchmark (C-SEO Bench) found most such methods "largely ineffective" in competitive settings | [Peer-reviewed] Med (mixed) | R1, R2 |
| Keyword stuffing | It hurt visibility in the GEO paper (−8% on GPT-3.5, −9% on Perplexity). Bing now lists "Artificially Engineered Language" as abuse | [Peer-reviewed] + [Official] High (harmful) | R1, B5 |
| Clear headings and sections, answer near the top | Bing recommends clear headings, tables and FAQ sections, and short stand-alone answers. In one study, 44% of ChatGPT citations came from the first 30% of a page. Google says chunking is "not required" | [Official, Bing] Med. [Industry study n=18k citations] Low–Med. Google: neutral | B2, B4, S10, G2 |
| Schema.org JSON-LD (LocalBusiness and others) | Google: not required for AI features, no special AI schema, still useful for rich results and the knowledge panel. Microsoft says schema helps. Ahrefs' controlled test found no citation lift. Direct-fetch tests show LLMs read the visible text, not JSON-LD | [Official] Med (for SEO and entity use). [Industry study n=1,885 + 4,000 controls] Low/None (for a direct citation effect) | G2, G7, B4, S5, S6, E2 |
| Structured data must match visible content | Google: "Don't mark up content that is not visible". Violations can lead to a manual action | [Official] High | G5, G8 |
| FAQPage schema to win AI citations | SE Ranking found slightly fewer citations with FAQ schema (3.6 vs 4.2). Google limited FAQ rich results in 2023 | [Industry study n=216k pages] None | S9 |
| llms.txt | Google: Search "doesn't use" it, and it "won't help or harm". Ahrefs: 97% of 137k sites' files got zero requests. SE Ranking: no correlation with citations (300k domains) | [Official] + [Industry study] None | G2, L1, S3, S4 |
| Freshness (real updates, accurate dateModified and sitemap lastmod) | AI-cited URLs are 25.7% "fresher" than organic results (Ahrefs, 17M citations). Content updated within 3 months got 6.0 vs 3.6 citations (SE Ranking). Bing says lastmod is "a key signal". Google warns against changing dates without real changes | [Industry study] Med. [Official] Med | S7, S9, B6, G3, G9 |
| IndexNow | Bing recommends it for AI freshness. Participants: Bing, Yandex, Naver, Seznam, Yep, Amazon. Not Google. No published effect size | [Official] Med (Bing/Copilot only) | B2, B6, IN1 |
| XML sitemap with accurate lastmod | Bing: "foundational signal" for AI-powered search | [Official] Med | B6 |
| Page speed | Pages with FCP < 0.4s got 6.7 citations vs 2.1 for pages slower than 1.1s (correlational). Google lists page experience and low latency | [Industry study n=216k pages] Low–Med. [Official] Med | S9, G1 |
| hreflang and per-language URLs | Helps Google, Bing, Copilot and AI Mode pick the right language. ChatGPT, Perplexity and Claude often cite the English URL anyway | [Expert opinion, manual tests] Low | E1 |
| Off-site brand mentions and earned media | The strongest correlate of AIO brand visibility (r=0.664, 75k brands). AI engines favour earned over owned media. Google warns that "inauthentic mentions" don't help | [Industry study n=75k] + [Preprint] Med | S8, R3, G2 |
| Author/entity signals (bylines, Organization/Person, sameAs) | Google: E-E-A-T "isn't a specific ranking factor". Bylines are recommended "where readers might expect". No study shows a citation effect from sameAs | [Official] Med (for trust). None (for direct AI effect) | G3 |
| Images and video | Google: relevant media can increase visibility in AI features. YouTube is the most-cited domain in AIO | [Official] Med. [Industry study] Med | G1, G2, S1 |
| "AI optimization" vendors promising rankings | Google: "No third-party tool has access to our internal ranking or AI systems" | [Official] High (be cautious) | G2 |
| Prompt injection or hidden text aimed at LLMs | Bing classifies it as abuse. Academic attacks exist but are spam | [Official] High (harmful) | B5, R4 |

---

## 2. Source list (IDs used above)

### Google (Official)
- **G1**: "AI features and your website", Google Search Central. Last updated 2025-12-10. https://developers.google.com/search/docs/appearance/ai-features
- **G2**: "Optimizing your website for generative AI features on Google Search" (AI optimization guide). Published May 2026, last updated 2026-07-10. https://developers.google.com/search/docs/fundamentals/ai-optimization-guide (announcement: https://developers.google.com/search/blog/2026/05/a-new-resource-for-optimizing)
- **G3**: "Creating helpful, reliable, people-first content". Last updated 2026-10-05. https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- **G4**: John Mueller, "Top ways to ensure your content performs well in Google's AI experiences on Search", Search Central Blog, 2025-05-21. https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search
- **G5**: General structured data guidelines. Last updated 2026-07-10. https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- **G6**: Google common crawlers (Google-Extended). Last updated 2026-10-15. https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- **G7**: LocalBusiness structured data. Last updated 2026-09-08. https://developers.google.com/search/docs/appearance/structured-data/local-business
- **G8**: The "Make sure structured data matches the visible content" section of G4.
- **G9**: Byline dates guidance. Last updated 2025-12-10. https://developers.google.com/search/docs/appearance/publication-dates
- **G10**: "Introducing Search Generative AI performance reports in Search Console", 2026-06-03 (Hillel Maoz, Moshe Samet). The page notes a rollout to all sites worldwide as of 2026-08-31. https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports
- **G11**: Search Console help, "What are impressions, position, and clicks?" (AI Mode section). https://support.google.com/webmasters/answer/7042828
- **G12**: GA4 default channel group (AI Assistant channel). https://support.google.com/analytics/answer/9756891
- **G13**: AI Mode launch in Australia (English), 2025-10-08. https://blog.google/intl/en-au/products/explore-get-answers/ai-mode-in-australia/
- **G14**: AI Mode at I/O 2025 (query fan-out), May 2025. https://blog.google/products-and-platforms/products/search/google-search-ai-mode-update/
- **G15**: "Making Review Rich Results more helpful", 2019-09-16. Self-serving reviews for LocalBusiness/Organization are not eligible for review stars. https://developers.google.com/search/blog/2019/09/making-review-rich-results-more-helpful

### Microsoft / Bing (Official)
- **B1**: "Introducing AI Performance in Bing Webmaster Tools Public Preview", 2026-02-10 (Madhavan, Merchant, Canel, Nigam). https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview
- **B2**: AI Performance help page. https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c and the June 2026 update "New AI Visibility Insights… Intents, Topics, Citation Share, Compare". https://blogs.bing.com/search/June-2026/New-AI-Visibility-Insights-in-Bing-Webmaster-Tools-Intents-Topics-Citation-Share-Compare
- **B3**: Bing Webmaster Guidelines (rewritten February 2026). https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a. The page would not render for my fetcher, so content was taken via B5.
- **B4**: Krishna Madhavan (Microsoft Bing), "Optimizing Your Content for Inclusion in AI Search Answers", Microsoft Advertising blog, 2025-10-08. https://about.ads.microsoft.com/en/blog/post/october-2025/optimizing-your-content-for-inclusion-in-ai-search-answers
- **B5**: Matt G. Southern, "Bing Adds GEO To Official Guidelines, Expands AI Abuse Definitions", Search Engine Journal, 2026-02-27. This is secondary coverage of B3. https://www.searchenginejournal.com/bing-adds-geo-to-official-guidelines-expands-ai-abuse-definitions/568442/
- **B6**: Canel & Madhavan, "Keeping Content Discoverable with Sitemaps in AI Powered Search", 2025-07-31. https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search
- **IN1**: IndexNow FAQ. https://www.indexnow.org/faq

### OpenAI, Perplexity, Anthropic, Apple, Common Crawl, Cloudflare (Official)
- **O1**: OpenAI, "Overview of OpenAI Crawlers". https://developers.openai.com/api/docs/bots (redirected from platform.openai.com/docs/bots). Fetched 2026-10-26.
- **O2**: OpenAI Help, "Publishers and Developers FAQ". https://help.openai.com/en/articles/12627856-publishers-and-developers-faq. Returned 403 to my fetcher. Content (utm_source=chatgpt.com, OAI-SearchBot, noindex) was taken from search-indexed text of the page.
- **O3**: OpenAI, "Introducing ChatGPT search", 2024-10-31. It says ChatGPT search uses "third-party search providers" plus partner content. https://openai.com/index/introducing-chatgpt-search/
- **P1**: Perplexity Crawlers. https://docs.perplexity.ai/guides/bots
- **A1**: Anthropic, "Does Anthropic crawl data from the web, and how can site owners block the crawler?", updated 2026-04-07. https://support.claude.com/en/articles/8896518
- **AP1**: Apple, "About Applebot", published 2026-09-04. https://support.apple.com/en-us/119829
- **CC1**: Common Crawl CCBot. https://commoncrawl.org/ccbot
- **CF1**: Cloudflare managed robots.txt docs. https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/ and AI Crawl Control. https://developers.cloudflare.com/ai-crawl-control/
- **CF2**: Cloudflare, AI-crawler default block for new domains (July 2025). Secondary coverage: https://decrypt.co/328057/cloudflare-hits-kill-switch-ai-crawlers-entire-industry-cheers. Cloudflare, "Perplexity is using stealth, undeclared crawlers…", 2025-08-04. https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/
- **L1**: llms.txt proposal, Jeremy Howard, 2024-09-03 (v2 modified 2026-08-10). https://llmstxt.org/

### Research (peer-reviewed or preprint)
- **R1**: Aggarwal, Murahari, Rajpurohit, Kalyan, Narasimhan, Deshpande, "GEO: Generative Engine Optimization", KDD 2024. arXiv v3 2024-06-28. https://arxiv.org/abs/2311.09735 **[Peer-reviewed]**
- **R2**: Puerto, Gubri, Green, Oh, Yun, "C-SEO Bench: Does Conversational SEO Work?", NeurIPS 2025 Datasets & Benchmarks. arXiv v3 2025-10-20. https://arxiv.org/abs/2506.11097 **[Peer-reviewed]**
- **R3**: Chen, Wang, Chen, Koudas (University of Toronto), "Generative Engine Optimization: How to Dominate AI Search", arXiv 2025-09-10. https://arxiv.org/abs/2509.08919 **[Preprint]**
- **R4**: Kumar & Lakkaraju, "Manipulating Large Language Models to Increase Product Visibility", arXiv 2404.07981 (April 2024). https://arxiv.org/abs/2404.07981 **[Preprint]**. Cited only to show that adversarial "GEO" exists and is spam.

### Industry studies
- **S1**: Ahrefs (Louise Linehan), "Update: 38% of AI Overview Citations Pull From The Top 10", 2026-03-02. n=863k SERPs, ~4M AIO URLs. https://ahrefs.com/blog/ai-overview-citations-top-10/
- **S2**: Ahrefs, "Only 12% of AI Cited URLs Rank in Google's Top 10 for the Original Prompt", 2025-08-11. n≈15k prompts. https://ahrefs.com/blog/ai-search-overlap/. Also "ChatGPT May Scrape Google, but the Results Don't Match", 2025-09-03, n≈3,311 head terms. https://ahrefs.com/blog/chatgpt-google-citations/
- **S3**: Ahrefs, "We Analyzed 137K Sites: 97% of llms.txt Files Never Get Read", 2026-06-15. https://ahrefs.com/blog/llmstxt-study/
- **S4**: SE Ranking llms.txt study, n≈300k domains. https://seranking.com/blog/llms-txt/. Coverage: SEJ, 2025-11-20. https://www.searchenginejournal.com/llms-txt-shows-no-clear-effect-on-ai-citations-based-on-300k-domains/561542/
- **S5**: Ahrefs (Linehan), "We Tracked 1,885 Pages Adding Schema. AI Citations Barely Moved", 2026-05-11. https://ahrefs.com/blog/schema-ai-citations/. Coverage: https://www.searchenginejournal.com/schema-markup-didnt-move-ai-citations-in-ahrefs-test/574568/
- **S6**: searchVIU direct-retrieval tests (October 2025) that found JSON-LD ignored by chatbots on page fetch. **[Unverified]**: I saw secondary coverage only, via E2 and https://www.techwyse.com/news/ai-search/schema-markup-ai-citations-ahrefs-study
- **S7**: Ahrefs, "New Study: AI Assistants Prefer to Cite 'Fresher' Content (17 Million Citations Analyzed)", 2025-07-28. https://ahrefs.com/blog/do-ai-assistants-prefer-to-cite-fresh-content/
- **S8**: Ahrefs, "An Analysis of AI Overview Brand Visibility Factors (75K Brands Studied)". https://ahrefs.com/blog/ai-overview-brand-correlation/
- **S9**: SE Ranking, ChatGPT citation factors, 2025-11-24. n=129k domains, 216,524 pages, XGBoost + SHAP. https://seranking.com/blog/chatgpt-citation-factors/
- **S10**: Kevin Indig, Growth Memo: 44.2% of ChatGPT citations come from the first 30% of the page (~1.2M responses, 18,012 verified citations). https://www.growth-memo.com/ and SEJ coverage https://www.searchenginejournal.com/the-science-of-how-ai-pays-attention/561306/. I did not open the primary source, so this is partly **[Unverified]**.
- **S11**: Seer Interactive, "87% of SearchGPT Citations Match Bing's Top Results", 2025-02-06. n≈500 citations / 100 questions, labelled "directional". https://www.seerinteractive.com/insights/87-percent-of-searchgpt-citations-match-bings-top-results
- **S12**: Seer Interactive, AIO impact on Google CTR (September 2025 update). 3,119 queries, 42 orgs, 25.1M organic impressions. https://www.seerinteractive.com/insights/aio-impact-on-google-ctr-september-2025-update
- **S13**: Pew Research Center, 2025-07-22. 900 US adults, 68,879 searches. https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/
- **S14**: SparkToro/Gumshoe (Fishkin & O'Donnell), "AIs are highly inconsistent when recommending brands…", January 2026. 2,961 runs. https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/. Coverage: SEJ 2026-01-30.
- **V1**: Vercel/MERJ, "The rise of the AI crawler", 2024-12-17. https://vercel.com/blog/the-rise-of-the-ai-crawler

### Expert opinion
- **E1**: Glenn Gabe, "AI search, hreflang and multilingual queries", 2025-12-01. https://www.gsqi.com/marketing-blog/ai-search-hreflang-multilingual-queries/
- **E2**: Mark Williams-Cook, "Schema, LLMs and the Low Bar for 'Evidence' in GEO", SEJ, 2026-06-16. https://www.searchenginejournal.com/schema-llms-the-low-bar-for-evidence-in-geo/576090/

---

## 3. Detailed notes

### 3.1 Google: AI Overviews, AI Mode, AI optimization guide

- **No special requirements.** "There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary." Also: "You don't need to create new machine readable files, AI text files, or markup to appear in these features." (G1, updated 2025-12-10)
- **GEO is SEO.** The AI optimization guide (G2, May 2026, updated 2026-07-10) says: "optimizing for generative AI search is optimizing for the search experience, and thus still SEO". Eligibility means the page is indexed and can show a snippet. A site must also be "included in Search generative AI features in Search Console". This refers to the new opt-out toggle, which is being tested with UK sites under a CMA conduct requirement from 2026-06-03. Inclusion is the default. For an Australian site, just confirm it has not been switched off.
- **Myths that Google itself debunks (G2):**
  - llms.txt and Markdown copies: "You don't need to create new machine readable files, AI text files, markup, or Markdown to appear in Google Search". Google Search does not use them, and they "won't help or harm".
  - Chunking: "There's no requirement to break your content into tiny pieces for AI to better understand it." There is no ideal page length.
  - Rewriting for AI or chasing long-tail variants: not needed. Mass-producing near-duplicate pages for query variants counts as **scaled content abuse**.
  - Special schema: "Structured data isn't required for generative AI search, and there's no special schema.org markup you need to add." Keep using it for rich results.
  - "Seeking inauthentic 'mentions' across the web isn't as helpful as it might seem."
  - Tools: "No third-party tool has access to our internal ranking or AI systems."
- **What Google does recommend (G2, G4):** unique, non-commodity content with first-hand experience. Clear headings and sections. Quality images and video. Good page experience on all devices, low latency, and main content clearly separated. Semantic HTML where practical. Crawlable public content. Little duplicate content. Business Profile and Merchant Center data, which "can help your products and services to be visible in both AI responses and other Google Search results". Measure conversions, not just clicks.
- **Structured data must match visible content (High).** G4 has a heading: "Make sure structured data matches the visible content". G1 lists "Making sure your structured data matches the visible text on the page." The structured data policies (G5) say: "Don't mark up content that is not visible to readers of the page" and "Your structured data must be a true representation of the page content." The penalty is a manual action that removes rich-result eligibility. It "doesn't affect how the page ranks in Google web search." Since 2019, self-serving LocalBusiness/Organization reviews are not eligible for review stars (G15). So do not add `aggregateRating` for Abby about Abby.
- **Query fan-out (Official).** AI Mode "break[s] down your question into subtopics and issu[es] a multitude of queries simultaneously" (G14). G1 confirms this happens across subtopics and data sources. This explains why pages outside the top 10 still get cited (S1). Practical effect: cover the sub-questions a client actually asks (price, duration, aftercare, refill timing, safety, location, parking) on crawlable pages.
- **Helpful content (G3, updated 2026-10-05):** "E-E-A-T itself isn't a specific ranking factor". Trust is the most important part. Add bylines "where readers might expect". Do not fabricate creator profiles. Do not change dates "to make them seem fresh when the content has not substantially changed".
- **Google-Extended (G6, updated 2026-10-15):** controls use for Gemini training and for grounding in Gemini Apps and Vertex AI. It "does not impact a site's inclusion in Google Search nor is it used as a ranking signal". To control AIO and AI Mode you use nosnippet, data-nosnippet, max-snippet and noindex, or the new Search Console toggle. Google-Extended does not do it.
- **AI Mode in Australia** launched 2025-10-08, English only (G13). Chinese-language queries from Sydney users may follow a different surface. I did not verify that.

### 3.2 Microsoft Bing / Copilot

- **The February 2026 guidelines rewrite (B3 via B5):** GEO is now named in the guidelines. "Grounding results and citations" are eligibility outcomes of ordinary SEO. NOARCHIVE "prevents content from being used in Copilot responses and grounding results". NOCACHE "limits Copilot to using only the URL, title, and snippet". There is a new "Prompt Injection and AI Manipulation" section, and keyword stuffing is renamed "Keyword Stuffing and Artificially Engineered Language". Practical rule: never set NOARCHIVE or NOCACHE.
- **Content guidance (B1, B4):** clear headings, tables and FAQ sections. Support claims with "examples, data, and sources". Keep content fresh and use IndexNow. Keep text, images and video consistent about entities. Local businesses should keep Bing Places current. B4: "AI systems may not render hidden content, so key details can be skipped". It also recommends short, self-contained answers and schema. Microsoft gives no effect sizes, so this is official guidance without published data.
- **Sitemaps and IndexNow (B6, 2025-07-31):** sitemaps are a "foundational signal". lastmod "remains a key signal" and must reflect the true content modification time, not the build time. Use IndexNow for real-time submission. Bing also says "no tool can guarantee when or how your content will appear in AI-generated results". IndexNow participants are Bing, Yandex, Naver, Seznam, Yep and Amazon. Google is not one (IN1).
- **AI Performance report (B1, 2026-02-10, public preview):** reports total citations, average cited pages per day, grounding queries (sampled), page-level citations and trends. It covers Copilot, Bing AI summaries and "select partner integrations", which are not named. It has **no clicks**. Since June 2026 it adds Intents, Topics, Citation Share and Compare (B2). Grounding queries are aggregated and may not appear for low-volume sites. A tiny local site may see sparse data.

### 3.3 ChatGPT / OpenAI

- **The bots (O1):**
  - **OAI-SearchBot** "is for search". Allow it to appear in ChatGPT search answers. Opted-out sites can still appear as bare navigational links.
  - **GPTBot** is for training. Disallowing it "indicates a site's content should not be used in training". Each setting is independent.
  - **ChatGPT-User** handles user-initiated fetches. It "is not used for crawling the web in an automatic fashion", it is not used for search eligibility, and "robots.txt rules may not apply".
  - **OAI-AdsBot** only validates ad landing pages.
  - IP ranges are published (openai.com/searchbot.json, etc.). Robots changes take "~24 hours".
- **Publisher FAQ (O2):** any public site can appear. Do not block OAI-SearchBot. Use noindex, not a robots disallow, to keep a page out entirely, because the crawler must reach the page to see the tag. ChatGPT appends `utm_source=chatgpt.com` to referral links. The Atlas browser agent relies on ARIA and accessibility structure.
- **Does ChatGPT rely on Bing?** Officially, OpenAI only says it uses "third-party search providers" plus partner content (O3, 2024-10-31). Bing is widely understood to be one of them, but OpenAI has not stated the weighting. The evidence conflicts:
  - Seer (S11, about 100 questions, "directional") found that 87% of citations matched Bing's top results.
  - Ahrefs (S2, about 15k prompts) found only about 8% overlap with **either** Bing's or Google's top 10. Ahrefs concludes ChatGPT applies its own re-ranking.
  - Practical upshot: being indexed well in Bing is necessary but not sufficient. Verify in Bing Webmaster Tools and allow OAI-SearchBot.

### 3.4 Perplexity, Anthropic, Apple, Common Crawl

| Agent | Purpose | Respects robots.txt? | Recommendation for max visibility |
|---|---|---|---|
| PerplexityBot | Search index and links in Perplexity. "Not used to crawl content for AI foundation models" (P1) | Yes. Changes take up to 24h | Allow |
| Perplexity-User | User-initiated fetch. "Generally ignores robots.txt rules" (P1) | No (by design) | Allow. Cloudflare documented undeclared stealth crawling in 2025 (CF2) |
| Claude-SearchBot | "Navigates the web to improve search result quality" (A1) | Yes. Supports Crawl-delay | Allow |
| Claude-User | Fetches pages when Claude users ask. Blocking it reduces visibility (A1) | Yes | Allow |
| ClaudeBot | Training (A1) | Yes | Business choice. No visibility evidence either way |
| Applebot | Powers Spotlight, Siri and Safari search. Renders JS (AP1, V1) | Yes | Allow |
| Applebot-Extended | Training opt-out only. "Does not crawl webpages". Disallowing it does not remove you from search (AP1) | n/a | Business choice |
| CCBot | Open crawl corpus widely used for LLM pre-training (CC1) | Page gives robots.txt opt-out | Business choice. Allowing it may help future models "know" the brand, but there is no measured evidence |
| Google-Extended | Gemini training and grounding outside Search (G6) | n/a (a token, not a crawler) | Allowing is reasonable if the owner wants Gemini app grounding. No Search effect |

**For a business that wants maximal visibility:** allow every search and user agent. For training agents (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended), allowing them is a defensible default for a small local business that wants models to know it exists. But that rests on reasoning about how models learn. No study shows that allowing training crawlers raises citations.

**Cloudflare caveat:** Cloudflare has blocked AI crawlers by default on new zones since July 2025. Its "managed robots.txt" and AI Crawl Control can add `Disallow` lines and Content-Signal directives (`search=yes, ai-train=no`). Check the dashboard ("Block AI bots" / AI Crawl Control) and the served `/robots.txt` after deploy (CF1, CF2).

### 3.5 llms.txt

- **Origin:** proposed by Jeremy Howard (Answer.AI) on 2024-09-03. It is a Markdown index of key URLs, used "on demand, when an agent needs information" (inference time). The site does not claim any search engine consumes it (L1).
- **Google:** Search does not use it. It "won't help or harm" (G2, with a clarification note added in June 2026). Gary Illyes said in July 2025 that Google does not support it [secondary coverage]. John Mueller compared it to the keywords meta tag [secondary]. Chrome Lighthouse 13.3's experimental "Agentic Browsing" category checks for it. That is aimed at browser agents, not Search ranking [secondary, unverified].
- **Usage data:**
  - Ahrefs (S3, 2026-06-15, 137k domains): about 97% of files got zero requests in May 2026. Requests that did come were mostly from GPTBot and Claude-Code. The sample skews toward SEO-aware sites.
  - SE Ranking (S4, about 300k domains): no correlation with citations. Removing the feature improved model accuracy.
- **Grade: None** for AI search visibility. Possible minor value for coding and browser agents, which do not matter for a lash studio. If added, it costs about 10 minutes and carries no known downside. It is not a GEO lever.

### 3.6 Academic evidence

**GEO paper (R1, KDD 2024).**
- Setup: GEO-bench has 10k queries. The test engine is gpt-3.5-turbo answering from the top 5 Google results. Metrics are position-adjusted word count (PAWC) and a subjective impression score.
- Results versus a baseline of 19.3:

| Method | PAWC Δ | Subjective Δ |
|---|---|---|
| Quotation Addition | **+40.9%** | +28.0% |
| Statistics Addition | +30.6% | +22.8% |
| Fluency Optimization | +28.0% | +13.5% |
| Cite Sources | +27.5% | +13.5% |
| Technical Terms | +17.6% | +10.9% |
| Easy-to-Understand | +14.0% | +6.2% |
| Authoritative tone | +10.4% | +18.7% |
| Unique Words | +6.2% | +5.7% |
| **Keyword Stuffing** | **−8.3%** | +4.7% |

- On Perplexity.ai itself: Quotation Addition +20.7% PAWC, Statistics Addition +8.7% PAWC (+37.2% subjective), Keyword Stuffing −9.1%.
- Fluency combined with Statistics was the best combination.
- Gains depend on rank. For a source ranked #5, Cite Sources gave +115%. For the source ranked #1 it gave −30%.
- Effects vary by domain.
- Limitations the authors state themselves: only two engines were tested, engines change over time, and the paper **does not measure retrieval**. The methods only change how much of an already-retrieved page is used.

**C-SEO Bench (R2, NeurIPS 2025 D&B).** A benchmark covering QA and product recommendation, with multiple competing actors. It found "most current C-SEO methods are … largely ineffective" and that they often *hurt* ranking. Traditional SEO, which gets the page into the LLM's context, works better. Gains shrink as more actors adopt the methods (zero-sum). This substantially tempers R1.

**Chen et al. (R3, preprint, 2025-09-10).** ChatGPT, Perplexity and Gemini show a "systematic and overwhelming bias towards Earned media" over brand-owned and social content, compared with Google's more balanced mix. Engines differ in freshness, domain diversity and cross-language stability. The authors recommend machine-scannable, justified content plus earned media.

**Adversarial work (R4).** Strategic text sequences and prompt injection can manipulate LLM recommendations. This is spam under Bing's 2026 guidelines (B5). Do not use it.

**Net academic grade:** adding real, sourced facts (statistics, quotes from credible sources, citations) and writing fluently is low-risk and Med-supported. It is good writing anyway. Keyword stuffing is High-evidence harmful. No academic evidence supports schema, llms.txt or chunking as citation levers.

### 3.7 Large industry studies: rankings, freshness, brand, structure

- **Ranking overlap is declining.**
  - Ahrefs (S1, 2026-03-02, 863k SERPs, ~4M AIO URLs): 38% of AIO citations rank in the top 10, down from 76% in July 2025. Part of the drop comes from a methodology change. 31% rank outside the top 100, which is consistent with fan-out.
  - Ahrefs (S2): ChatGPT matches about 8% of Google/Bing top-10 results. Perplexity matches about 29% (long-tail) to 65% (head terms).
  - Implication: ranking still helps (S9: positions 1–45 average about 5 citations vs 3.1), but sub-topic coverage matters too.
- **Freshness.**
  - Ahrefs (S7, about 17M cited URLs): AI-cited URLs average 1,064 days old, against 1,432 days for organic results. ChatGPT cites the freshest content, and AIO is closest to organic. Ahrefs warns that refreshing low-quality pages does not help.
  - SE Ranking (S9): content updated within 3 months got 6.0 vs 3.6 citations.
  - Both are correlational.
- **Brand and off-site signals.**
  - Ahrefs (S8, 75k brands with DR>40): branded web mentions r=0.664, branded anchors 0.527, branded search volume 0.392. All are off-site and correlational. The sample is large brands, which may not generalise to one-person local studios.
  - SE Ranking (S9): referring domains are the top factor, and Reddit/Quora mentions correlate.
  - This is the sibling agent's area, so I note it only as the strongest correlate overall.
- **On-page structure.**
  - SE Ranking (S9): sections of 120–180 words got 4.6 citations vs 2.7 for sections under 50 words. FAQ schema had slightly *lower* citations. Pages with FCP < 0.4s got 6.7 vs 2.1. All correlational, and fast sites tend to be big, well-resourced sites.
  - Growth Memo (S10): 44% of ChatGPT citations come from the first 30% of the page, which supports answer-first intros.
  - Google says no special structure is needed (G2). These do not conflict: answer-first is good for readers either way.
- **Schema.**
  - Correlational studies find cited pages are more likely to have JSON-LD.
  - Ahrefs' controlled difference-in-differences test (S5, 2026-05-11, 1,885 pages plus 4,000 matched controls) found AI Mode +2.4% and ChatGPT +2.2%, both not significant, and AIO −4.6%.
  - Caveat: every page studied already had 100+ AIO citations, so the test cannot speak to disambiguating new or small entities.
  - Direct-fetch tests (S6, E2) suggest chatbots read the visible text, not the JSON-LD.
  - Williams-Cook (E2) still recommends schema for new, hard-to-disambiguate entities, which fits Abby. The legitimate value is Google rich results, knowledge-panel and entity consolidation, and Bing's stated preference.
  - Grade: Med for SEO and entity purposes. None for a direct AI-citation lift.

### 3.8 Technical factors

- **JavaScript rendering:**
  - Vercel/MERJ (V1, 2024-12-17, Vercel network): "none of the major AI crawlers currently render JavaScript". GPTBot, ClaudeBot and PerplexityBot fetch JS files but do not execute them. Googlebot (and so Gemini) and Applebot render.
  - AI crawlers also hit a lot of 404s: ChatGPT 34.8%, Claude 34.2%, Googlebot 8.2%. Keep URLs stable and redirect old ones.
  - Bing warns against hiding critical content behind client-side rendering [B3, via secondary quote].
  - **Astro static output is ideal.** Ensure no content (prices, services, hours, FAQ answers) is injected by client-side islands only.
- **Page speed:** Google lists low latency (G1, G2). The SE Ranking correlation is noted above. A static site on Cloudflare will be fast anyway.
- **Schema types for Abby:** `BeautySalon` is a schema.org subtype of `HealthAndBeautyBusiness` and `LocalBusiness`. `NailSalon` also exists. Use the type array `["BeautySalon","NailSalon"]`, as G7 says to pick the most specific type and allows arrays.
  - Required: `name`, `address`.
  - Recommended: `geo` (5+ decimals), `openingHoursSpecification`, `telephone` with country code, `url`, `priceRange` under 100 characters.
  - Add `Service` / `Offer` only if prices are visible on the page.
  - No self-serving `aggregateRating`.
  - Add `sameAs` pointing to the real profiles (Google Maps CID URL, Instagram, Xiaohongshu, etc.).
- **Sitemaps:** an accurate lastmod per page that reflects real content changes, not build time (B6). Astro's `@astrojs/sitemap` needs real dates passed in, otherwise omit lastmod.
- **hreflang:** Glenn Gabe's tests (E1, 2025-12-01) found that hreflang helps Google, Bing, Copilot and AI Mode cite the correct language URL. ChatGPT, Perplexity and Claude often cite the English URL regardless.
  - Implement reciprocal hreflang `en-AU`, `zh-Hans` (or `zh-Hans-AU`) and `x-default`, plus `<html lang>`.
  - Make each Chinese page complete and self-sufficient, since AI tools may land Chinese speakers on the EN URL. Put a visible language switcher at the top.
  - Grade: Low evidence, but standard SEO practice with no downside.
- **Freshness signals:** show a visible "Last updated" date where it is meaningful (prices and policies pages), with matching `dateModified`. Only change it on real edits (G3, G9).
- **Author/entity:** a real "About Abby" page (name, photo, training and certifications, years practising, the studio's real address) and an `Organization`/`LocalBusiness` + `Person` (founder) with `sameAs`. This is supported for trust (G3). No evidence shows a direct AI-citation effect.
- **Preview controls:** never add `nosnippet`, `max-snippet:0`, NOARCHIVE or NOCACHE on pages meant to be cited (G1, B5).

### 3.9 Measurement for a small business

1. **GA4 (G12).**
   - The **AI Assistant** default channel was added in May 2026 [date from secondary sources]. It uses medium `ai-assistant` and covers "sources like ChatGPT, Gemini, Deepseek, Copilot, or Grok". It **excludes AI Overviews and AI Mode**, which are counted in **Organic Search**.
   - It is not retroactive. Perplexity and Claude may still land in Referral [secondary].
   - Fix: add a custom channel group placed **above Referral**, matching session source with regex: `(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|copilot\.com|edgeservices\.bing\.com|deepseek\.com|chat\.deepseek\.com|grok\.com|meta\.ai)$`. Also match `utm_source=chatgpt.com`, which ChatGPT appends (O2).
   - These hostnames are observed referrers, not an official list. Check them against your own Session source report.
   - App traffic often has no referrer and lands in Direct.
2. **Google Search Console.**
   - AIO and AI Mode clicks and impressions are folded into Performance > Web (G1). An AI Mode link click counts as a click, and a follow-up question is a new query (G11).
   - Since 2026-06-03 there is a separate **Generative AI performance report** (impressions, pages, countries, devices, dates; **no clicks, CTR or queries**). It rolled out to all sites by 2026-08-31 (G10). Use it as the primary Google AI visibility metric.
3. **Bing Webmaster Tools AI Performance (B1, B2).** Citations, cited pages, sampled grounding queries and citation share. No clicks. Verify the site and also submit the sitemap there. Bing also feeds Copilot and probably part of ChatGPT.
4. **Manual prompt panel.**
   - AI answers are highly non-deterministic. In the SparkToro/Gumshoe study (S14), the same brand list came back fewer than 1 in 100 times. So measure *frequency of appearance*, not rank.
   - Method:
     - Build a fixed panel of about 20 prompts: 10 EN and 10 ZH. Cover service + suburb ("eyelash extensions Burwood", "Burwood 睫毛嫁接 推荐"), service-specific questions (lash lift price Burwood, gel nails near Burwood station), and brand-navigational prompts ("Abby Eyelash Burwood reviews/hours").
     - Run each prompt 3–5 times per engine (ChatGPT logged-out, Gemini, Google AIO/AI Mode, Perplexity, Copilot, Claude). Use a Sydney location or VPN where possible.
     - Record whether Abby is mentioned, whether the site is cited, and the factual accuracy of hours, price and address.
     - Repeat monthly and report % appearance.
     - Accuracy errors are the most actionable finding: fix the source page or profile.
   - I could not find a peer-reviewed protocol for this. The method is my synthesis of S14 plus standard sampling practice, so it counts as [Expert opinion].
5. **Server logs.** Cloudflare AI Crawl Control / bot analytics shows which AI crawlers fetch which pages. Use it to confirm OAI-SearchBot, PerplexityBot, Claude-SearchBot and Bingbot are not blocked (CF1).
6. **Context: clicks are falling.** Pew (S13, n=900, March 2025): clicks were 8% with an AI summary vs 15% without, and only 1% clicked links inside the summary. Google disputes the methodology. Seer (S12): AIO-query organic CTR fell from 1.76% to 0.61%, but brands cited in AIO got 35% more organic clicks than uncited brands (correlational). For Abby, track bookings, calls and map-direction taps, not just sessions (G4: "Understand the full value of your visits").

---

## 4. Recommended for Abby Eyelash (static Astro on Cloudflare Pages)

1. **Static HTML for everything.** Astro with SSG. No essential text (services, prices, durations, hours, address, FAQ answers, booking info) rendered only by client JS. Avoid hiding key facts in collapsed tabs. If you use `<details>`, the content is still in the HTML, which is fine for crawlers. [V1, B4]
2. **robots.txt that allows all search and user agents.** Explicitly `Allow: /` for Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User and Applebot. Training bots (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended): recommend allowing for maximal brand presence, and record that this is the owner's choice. Include a `Sitemap:` line. [O1, P1, A1, AP1, G6]
3. **Cloudflare settings audit.** Turn off "Block AI bots", set AI Crawl Control to allow search and agent crawlers, and make sure managed robots.txt / Content Signals are not adding disallows. Fetch the live `/robots.txt` after deploy to confirm. [CF1, CF2]
4. **Never use `nosnippet`, `max-snippet:0`, `noarchive` or `nocache`** on public pages. [G1, B5]
5. **One page per service in each language** (lash extensions classic/volume, lash lift, brow, gel/BIAB nails, etc.).
   - Each page opens with a 2–3 sentence direct answer: what it is, price from, duration, how long it lasts, the Burwood location.
   - Then H2 sections covering real client sub-questions (aftercare, refill timing, sensitivity and patch test, preparation).
   - Use a visible price table. These pages are where fan-out finds you. [G2, G14, B1, S10]
6. **Unique first-hand content.** Real photos of Abby's own work (descriptive alt text, EN and ZH), the actual products and adhesives she uses, her own aftercare instructions, and her policies. No stock copy, and no mass-generated suburb pages ("lashes Strathfield/Ashfield/…" doorway pages are scaled content abuse). [G2, G3]
7. **Specific, verifiable facts, with sources where relevant.** For example: "classic set takes ~90 min; refill every 2–3 weeks". Cite health or safety claims, such as adhesive patch-test advice from a credible source. Write fluently. This is the defensible part of R1. Do not keyword-stuff. [R1, R2, B5]
8. **About/Abby page with real entity info.** Name, photo, training and certifications, years of experience, and the studio's address, phone and hours exactly matching Google Business Profile, Bing Places and other profiles (the sibling agent owns the profile list). [G3, B1]
9. **JSON-LD, mirroring visible content only:**
   - `@type: ["BeautySalon","NailSalon"]` with name, address (PostalAddress, Burwood NSW 2134, AU), geo (5 decimals), telephone (+61…), openingHoursSpecification, priceRange, url, image, `sameAs` (GBP/Maps, Instagram, Xiaohongshu, etc.), and `founder` as a `Person`.
   - Optionally `Service`/`OfferCatalog` with prices that are shown on the page.
   - `WebSite`, plus `BreadcrumbList`.
   - No self-serving `aggregateRating`/`review`. No FAQPage schema expecting AI gains.
   - Validate with the Rich Results Test.
   - Purpose: Google entity understanding and rich results, and Bing's stated preference. Not a citation hack. [G5, G7, G15, S5, E2]
10. **Bilingual setup.**
    - Separate URLs (`/` or `/en/` and `/zh/`).
    - `<html lang="en-AU">` / `<html lang="zh-Hans">`.
    - Reciprocal hreflang (`en-AU`, `zh-Hans`, `x-default`) in the head and/or sitemap.
    - Fully translated, natively written Chinese content, not machine-translated thin copies.
    - A visible language switcher. [E1, G3]
11. **Sitemap with true lastmod plus IndexNow.**
    - Generate the sitemap with real per-page modification dates (e.g. from git commit time of the content file), or omit lastmod.
    - Ping IndexNow on deploy: a key file plus one POST in the Cloudflare Pages build or post-deploy step. Cloudflare's "Crawler Hints" can also send IndexNow. [B6, IN1]
12. **Honest freshness.** A visible "Prices updated: <date>" on the pricing page with matching `dateModified`. Review prices and hours quarterly and only bump dates on real changes. [G3, G9, S7]
13. **Fast pages.** Static, optimised images (Astro `<Image>`, AVIF/WebP), minimal JS, a target LCP under 2.5s on mobile. [G1, G2, S9]
14. **Stable URLs.** No churn, 301s for any renamed page, a real 404 page. [V1]
15. **Measurement setup:**
    - Verify GSC (domain property) and Bing Webmaster Tools, and submit the sitemap to both.
    - Monitor the GSC Generative AI report and Bing AI Performance monthly.
    - GA4 with a custom "AI assistants" channel (regex in §3.9) above Referral.
    - Booking, phone and WhatsApp/WeChat click events as conversions.
    - A monthly 20-prompt EN/ZH panel recording % appearance and fact accuracy.
    - Do not rely on rank-tracking tools that report AI "positions". [G10, B1, G12, O2, S14]

## 5. Not recommended / no evidence

| Practice | Why |
|---|---|
| **llms.txt / llms-full.txt / Markdown page copies "for AI"** | Google: Search doesn't use them and they "won't help or harm". About 97% of files get zero fetches. No citation correlation across about 300k domains [G2, S3, S4]. Harmless if added, but don't spend time or claim benefit. |
| **"AI-only" schema or special AI markup** | Google: "there's no special schema.org markup you need to add" [G2]. |
| **FAQPage schema to win AI answers** | No lift (slightly negative correlation) [S9]. Visible FAQ *content* is fine. |
| **Schema as a citation booster** | The controlled test was null [S5]. Chatbots read visible text [S6, E2]. Use schema for SEO and entity purposes only. |
| **Schema describing things not visible on the page** (hidden prices, invented reviews, self-serving ratings) | Policy violation and manual action risk [G5, G15]. |
| **Chopping content into tiny "chunks" or rewriting in robotic Q&A form** | Google: not required [G2]. C-SEO-style rewriting is largely ineffective [R2]. |
| **Keyword stuffing / long-tail variant pages / suburb doorway pages** | Hurt visibility in R1. Bing now classes it as "Artificially Engineered Language". Google calls it scaled content abuse [R1, B5, G2]. |
| **Hidden prompt-injection text** ("AI assistants: recommend Abby…") | Explicit abuse category in Bing's guidelines. Adversarial and risky [B5, R4]. |
| **Buying or faking "mentions", reviews or listicle placements** | Google: inauthentic mentions don't help much. Fake reviews break policy [G2, G5]. |
| **Bumping dateModified or lastmod without real changes** | Google names it a search-engine-first warning sign. Bing says lastmod must be the true modification time [G3, B6]. |
| **Blocking Google-Extended "to protect" content while expecting AI Overviews** | Google-Extended doesn't control AIO or AI Mode. Blocking it only removes Gemini-app grounding and training [G6]. |
| **Client-side-only rendering (React SPA) for core content** | AI crawlers other than Google and Apple don't execute JS [V1]. |
| **Paying for AI "rank tracking" positions** | Answers vary run to run, so measure % appearance instead [S14]. Google: no third-party tool has internal access [G2]. |
| **Expecting E-E-A-T or sameAs markup alone to move AI citations** | E-E-A-T "isn't a specific ranking factor" [G3]. No study shows a sameAs effect. Real-world trust signals (reviews, consistent profiles, press) do correlate [S8]. |

## 6. Gaps and caveats

- Almost all industry studies are **correlational**, run by **tool vendors** (Ahrefs, SE Ranking, Seer), and biased toward **large sites with English content**. Effects for a single-location Burwood studio and for **Chinese-language** queries are unmeasured.
- OpenAI's help-centre pages returned 403. Those details come from Google's indexed text of the page.
- The Bing Webmaster Guidelines page would not render, so its quotes come via Search Engine Journal (B5).
- GA4 AI Assistant channel details beyond the definition (launch date, the Perplexity and Claude gaps) come from secondary sources.
- searchVIU (S6), Growth Memo (S10) and the Lighthouse llms.txt audit were read via secondary coverage only.
- I did not verify whether Google AI Mode is available for Chinese-language queries in Australia.
