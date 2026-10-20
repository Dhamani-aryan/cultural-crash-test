# Cultural Translator: product and build plan

**Working name:** Transcreate. "Transcreation" is the localization industry's own term for adapting meaning rather than words, so the name itself shows judges we know the field.
**Status:** plan, 2026-10-20. Nothing built yet.
**Deadline:** Oct 30, 11:45 PM ET (Oct 31, 9:15 AM IST). **Target:** submit Oct 29. That gives about **9 working days**, alongside submitting Common Ground.

Every Qloo claim below was checked against the live hackathon API on 2026-10-20 (about 450 calls). Raw responses stayed out of the repo, as Qloo's terms require. The numbers in this plan are summaries.

---

## 1. The idea in one paragraph

Normal translation handles words. Most of the meaning in ads, pitches, comedy and game dialogue sits in **cultural references**: brands, artists, shows and places. Those break when the content goes to another country. Transcreate takes a piece of text, finds every cultural reference, works out the **job** each one does for its home audience, and uses Qloo's taste graph to find **what does that same job for a matching audience in the target city**. It then rewrites the text with the local equivalents. Each swap comes with an evidence card. References with no good local equivalent are flagged for a human to rethink.

**Who it's for:** marketing and localization teams adapting US campaigns, streaming and dubbing teams handling comedy, game studios localizing dialogue, and startups pitching in new markets. All of them pay human transcreators today, which is slow and expensive and depends on whoever happens to be in the room.

---

## 2. Why this is a real problem and not a toy

- Transcreation is an established, paid service line at every large localization agency, priced well above plain translation because it needs a person who knows both cultures.
- The usual failures are well known: jokes that land at home and confuse abroad, brand comparisons the audience has never heard of, and "local" swaps that are actually stereotypes or ten years out of date.
- **An LLM alone does this badly in a specific, measurable way.** It falls back on the most famous or most stereotyped example (Muji for anything Japanese, Bollywood for anything Indian), it can't tell you who actually likes the swap, and it can't show evidence. We'll measure this (section 9).

**Things not to claim in the pitch:** no invented market-size figures. Cite only sources we've read. "Localization agencies already charge separately for transcreation" is safe and true.

---

## 3. What the live API showed (and how it shaped the design)

### 3.1 The naive approach fails
Asking "brands like Trader Joe's, located in Tokyo" (`signal.interests.entities=TJ` + `signal.location.query=Tokyo`) returns **US brands** (Costco, Le Creuset, Williams-Sonoma). The entity signal overwhelms the location. Ranking a local pool by "fans of Chipotle also like…" fails the same way: in Tokyo it returns In-N-Out and Panda Express. **Co-affinity measures what the same people like. It does not measure what plays the same role somewhere else.**

### 3.2 What works: local pool, then role matching
1. **Location-only signals are strongly local.** `signal.location.query=Tokyo` with no other signal returns Utada Hikaru, Tokyo MER, Muji and Sacai. Mumbai returns Prateek Kuhad, Sacred Games and Sabyasachi.
2. **Brand entities carry rich role tags.** Trader Joe's has: competitor brands (Whole Foods, Aldi), core values (Value, Quality, Community), lifestyle (Curated Living, Gourmet Home Cooking), customer segment (Urban Dwellers), cultural relevance (Foodie Culture) and aesthetic (Hand-Drawn Signage). Media entities have genre, theme and emotional-tone tags. Results come back with about 100 tags each.
3. **`urn:demographics`** returns an age and gender affinity vector for any list of entities in one call, so we can check whether a candidate's audience looks like the anchor's.
4. **Local lift:** score the same candidate list under the target city's location signal and under control cities, using `filter.results.entities` in batches of up to 50 (the API cap). What scores higher in the target city than elsewhere is genuinely local.

Combined, these gave believable results in the probe, before any tuning:

| Anchor (US) | London | Mumbai | Tokyo | Madrid |
|---|---|---|---|---|
| Chipotle | Nando's, Wagamama, Greggs | Behrouz Biryani, The Good Bowl | Sushiro (スシロー), Ginza Cozy Corner (銀座コージーコーナー) | Goiko, Telepizza, Vips |
| The Office | Gavin & Stacey, People Just Do Nothing | Bhabi Ji Ghar Par Hai, Sandwiched Forever | Tatami Time Machine Blues, Towako Omameda… | Pequeñas coincidencias, Mira lo que has hecho |
| Taylor Swift | Pixie Lott, RAYE, Cheryl | (pool still too global, needs tuning) | Japanese pop idols | Aitana, Chenoa, Ruth Lorenzo |

### 3.3 Known problems to fix in the engine
- **Raw lift saturates** (affinities cluster near 1). Use percentile ranks of target-city affinity against control cities, not raw differences.
- **Global chains leak into local pools** (Starbucks in Tokyo, Applebee's and IHOP in São Paulo). Penalize entities whose affinity is high in *every* control city (they're global, not local). Try `wikipedia_category` country-of-origin tags as a second signal, but **check first**, because tag coverage varies.
- **Duplicate entities across scripts** (Jin Akanishi / 赤西仁, Changmin / 최강창민). Deduplicate by `akas` and by an identical demographic vector.
- **Genre filters can globalize a pool.** Adding Taylor Swift's genre tags as `filter.tags` pulled the Mumbai pool back to Ariana Grande and Katy Perry. Build the pool from location only, plus the broad category tag (e.g. `genre:brand:dining`), and let the role score handle genre.
- Results for books and podcasts are **US-dominated in every city**, so they're not supported as targets (section 4).

---

## 4. Which cities, and why

### 4.1 How we measured
For 28 cities, we pulled the top 50 artists, TV shows, films and brands under a location-only signal, and up to 200 places. **Distinctiveness** is the share of a city's top 50 that appears in at most one other city's list. A high value means Qloo has a culture specific to that city; a low value means the list is generic global or US content.

US cities score lowest (New York 0.14–0.40, San Francisco 0.06–0.40). That doesn't mean their data is thin. It means they share one American culture. US data is in fact the **richest source-side data** (most tags, most reviewed places). So the product translates **from the US outward**.

### 4.2 Results (distinctiveness by domain; places = share with external reviews)

| City | Artists | TV | Film | Brands | Places reviewed | Verdict |
|---|---|---|---|---|---|---|
| **Tokyo** | 0.98 | 0.98 | 0.98 | 0.44 (fashion global) | 0.57 | **Launch.** Strongest overall, and the most dramatic demo |
| **Mumbai** | 0.82 | 0.74 | 0.50 | 0.90 | 0.47 | **Launch.** Strong across all domains, huge market |
| **Madrid** | 0.90 | 0.78 | 0.42 | 0.84 | 0.46 | **Launch.** Covers Spanish; dining translations were the best of any city |
| **São Paulo** | 0.96 | 0.82 | 0.34 | 0.80 | 0.39 | **Launch, but dining off.** Music and TV excellent; the dining pool fills with US chains |
| **London** | 0.64 | 0.52 | 0.18 | 0.60 | 0.39 | **Launch.** Culturally close to the US, which makes it a good "subtle" demo, and US→UK adaptation is a real everyday job |
| Mexico City | 0.82 | 0.60 | 0.26 | 0.54 | 0.35 | Optional: second Spanish market; dining weak |
| Seoul | 0.90 | 0.78 | 0.68 | 0.36 | 0.13 | Hold: brands are global fashion, few reviewed places |
| Istanbul, Jakarta, Bangkok, Manila, Lagos | high | high | mixed | mixed | 0.22–0.35 | "Data looks promising, next wave". Mention as future, not launch |
| Paris, Berlin, Amsterdam, Milan | 0.72–0.92 | 0.22–0.44 | ≤0.14 | 0.36–0.52 | 0.28–0.53 | Hold: media pools are too US-heavy for now |

### 4.3 Launch set
**Source:** United States (New York as the reference location).
**Targets:** Tokyo · Mumbai · Madrid · São Paulo · London.

They cover five languages and cultural regions, all large localization markets.

### 4.4 A domain confidence matrix, shown in the product
The UI shows a coverage map: ●●● strong, ●● usable, ○ off.

| | Music | TV | Film | Brands / dining | Places |
|---|---|---|---|---|---|
| Tokyo | ●●● | ●●● | ●●● | ●● (dining ●●●, fashion ○) | ●●● |
| Mumbai | ●●● | ●●● | ●● | ●●● | ●●● |
| Madrid | ●●● | ●●● | ●● | ●●● | ●● |
| São Paulo | ●●● | ●●● | ○ | ○ (dining) | ●● |
| London | ●● | ●● | ○ | ●●● | ●● |

When a reference falls in a ○ cell, the agent says *"Qloo's data for this category in São Paulo is mostly global chains, so we won't guess"* and flags it for human review. This honesty is a selling point. Pitch line: *"We launched only where the taste data is strong enough to trust, and the product tells you where that is."*

Freeze this matrix from a scripted measurement (`scripts/measure-cities.ts`) and put the numbers in the README.

---

## 5. Product experience

### 5.1 Main flow (one page, three panes)
1. **Paste** the content: an ad script, pitch, product page, sitcom scene or game dialogue. Or pick one of three demo pieces we wrote ourselves (no copyrighted scripts).
2. **Choose markets:** up to 3 of the 5 target cities. Optionally choose the audience: an age band (Qloo's buckets) and a tone (keep the joke / keep the prestige / keep the value message).
3. **Watch the agent work:** a live step list ("found 6 references → resolved 5 in Qloo → translating Chipotle for Mumbai…").
4. **Result:** the original on the left and one column per market on the right.
   - Every swapped reference is highlighted. Hover or tap for the **evidence card**: the anchor's role ("affordable, everyday, healthy-ish fast-casual; skews 18–34"), the chosen local equivalent with its Qloo description and image, why it matches (shared role tags, audience similarity, how local it is), and 2 runners-up you can swap in with one click.
   - Red **"doesn't travel"** flags with a suggested approach ("drop the comparison, describe the benefit directly").
   - A **"Plain AI" toggle** shows what the same model writes without Qloo, with its swaps labelled *unverified* or *stereotype/famous default*.
5. **Export:** copy each version, or download a localization brief (a table of swaps with evidence) of the kind an agency hands to a client.

### 5.2 The demo moment
Paste: *"We're the Peloton of cooking, with Glossier-level branding, and cheaper than your Chipotle habit."* Choose Tokyo, Mumbai and London. Three different, believable pitches appear, each swap clickable to its evidence. Flip to "Plain AI" and the swaps turn generic. Finish with one red flag that the agent refused to translate, and explain why.

### 5.3 Design direction
Editorial, like Common Ground's redesign: typography-led, colour only for data (one colour per market), a diff-style highlight for swaps. No card grids. It must work on a phone, because judges may open it there.

---

## 6. The agent (what makes it "agentic")

The rules require an agentic tool, an agent framework, or Qloo inside an existing agent. Transcreate is all three: an agent loop inside the app, plus an **MCP tool** so Claude, ChatGPT or any agent can call `transcreate`.

**Loop** (the LLM decides; code enforces):
1. **Extract.** The LLM returns reference spans with a type guess and the *job* each one does in the sentence ("a comparison meaning cheap and cult-loved"). The schema is validated.
2. **Resolve.** Tool `qloo_search` finds the entity. If a match is ambiguous, the agent picks one using the context and records why; low confidence goes to the user.
3. **Understand.** Tool `role_profile` loads the entity's tags, description and demographics to build its "role fingerprint".
4. **Translate.** Tool `find_equivalent(entity, city, domain)` runs the deterministic engine (section 7). **The LLM never invents an equivalent.**
5. **Decide.** The agent reviews the candidates and chooses one of:
   - keep the top match;
   - pick a runner-up for a contextual reason (e.g. the sentence needs a food brand, not a café);
   - call `find_equivalent` in **another domain**, for example when no TV equivalent works but a local sports ritual does;
   - flag "doesn't travel".

   Every decision is logged and shown.
6. **Rewrite.** The LLM writes the localized text using only the chosen entities. A **guard** removes any proper noun that isn't in the original text or the evidence ledger, a pattern carried over from Common Ground.
7. **Self-check.** A critic pass checks that the joke or claim still works, that the tone survived, and that nothing in the new text is offensive or stereotyped. One revision round at most.

**Baseline:** the same model and prompt, with no Qloo tools, run in parallel for the comparison toggle.

---

## 7. The equivalence engine (deterministic)

```
anchor entity A, target city C, domain D
  1. Local pool: insights(filter.type=D, signal.location.query=C, [broad category tag]), 2 pages → ~100
  2. Score pool under C and 3 control cities (filter.results.entities, batches of 50)
       local_pct  = percentile of affinity under C within pool
       global_pct = mean percentile under the control cities
       locality   = local_pct − global_pct   (high = specific to C)
  3. role_sim  = weighted Jaccard over role tag types (genre/category, core_value, lifestyle,
                 customer_segment, cultural_relevance, emotional_tone, theme), tag weights by type
  4. audience  = cosine(demographics(A), demographics(candidate))
  5. score = 0.40·role_sim + 0.35·locality + 0.15·audience + 0.10·category_match
       hard gates: same broad category (unless the agent chose a cross-domain swap),
                   locality > 0, not a duplicate (akas / same demographic vector), sensitive-topic filter
  6. Return top 3 with every component, so the evidence card can explain them
```

- Calls per reference and city: 2 pool + about 8 scoring + 1 demographics ≈ **11 calls**. A 6-reference text across 3 cities is about 200 calls. Cache aggressively: pools by city and domain are reusable across all users, and anchors repeat. Pre-warm the pools for the launch set.
- **Weights are tuned on a labelled dev set and then frozen**, with a held-out set for reporting (section 9).
- Rule from Common Ground: **the engine is reproducible**. The same input gives the same equivalents.

---

## 8. What to take from Common Ground, and what to leave

**Take (copy into the new repo; it's your MIT code):**

| Piece | Why it's needed |
|---|---|
| `src/lib/qloo/*` (client, http with 429 retry/backoff, normalize, types) | Battle-tested. Extend with `/entities`, `urn:demographics`, `signal.location.*` and batched `filter.results.entities` |
| `src/lib/llm/*` (client + `structured.ts` Zod validation with repair) | Every agent step returns validated JSON |
| `src/lib/cache/*` + Upstash setup + rate limits | Live runs make ~200 Qloo calls; judges need replays to be instant |
| The evidence ledger and title-guard idea (`engine/ledger.ts`, the guard in `agent/`) | The core promise that the LLM never invents cultural entities |
| The streamed-SSE single-POST API pattern | Proven on Vercel serverless |
| The MCP endpoint pattern (`server/mcp.ts`) | Turns the translator into a tool for other agents almost for free |
| Eval harness shape (`eval/run.ts`, `report.ts`) and the model-only baseline idea | Gives credible numbers for the judges |
| Repo hygiene: no committed Qloo data, synthetic fixtures, `DECISIONS.md`, `.env.example` | Rules and Qloo-terms compliance |

**Leave behind:** the bridge engine and bilateral scoring, Compare-based themes, group intake and join links, program, invitation and critic prompts, organizer settings and all UI screens. None of them fit this problem.

---

## 9. Proving it works (evaluation)

1. **Dev and held-out sets:** 40 US anchors (brands, chains, artists, shows, films, places, events) × 5 cities. Tune on 25 and report on 15.
2. **Automatic checks:** share of swaps that are local (the entity's geocode or origin is in the target country, or its locality percentile is above a threshold), same category, no duplicates, reproducible on rerun, latency.
3. **Native-speaker review: the strongest evidence we can get.** Ask 2–3 people from each target city (friends, Discord, LinkedIn) to rate blind pairs (Transcreate swap vs plain-LLM swap): *"Would a 25-year-old here get this reference? Does it carry the same feeling?"* Even 10 raters with ~150 ratings is a credible, unusual result for a hackathon.
4. **Baseline comparison:** the share of plain-LLM swaps that (a) can't be found in Qloo, (b) are the same famous default across contexts, and (c) natives rated as dated or stereotyped. Report it honestly, including where the LLM does fine.
5. **Limits section:** percentiles are relative; equivalence isn't proven reception; coverage is limited to the matrix.

---

## 10. Build plan: 9 days

| Day | Date | Work | Done when |
|---|---|---|---|
| 1 | Oct 21 | New public repo (MIT), Next.js scaffold, port the Qloo, LLM and cache modules, add `/entities`, demographics and location params. `scripts/measure-cities.ts` freezes the matrix | Ping scripts pass; matrix numbers stored (git-ignored raw) |
| 2 | Oct 22 | Equivalence engine v1 (section 7): pool, batched scoring, locality percentiles, role similarity, audience, gates, dedupe. Unit tests on synthetic fixtures | Chipotle / The Office / Taylor Swift give sensible top 3 in all 5 cities |
| 3 | Oct 23 | Label the 25-anchor dev set (quick pass), tune weights, global-chain penalty, freeze. Pre-warm city pools | Dev-set hit rate recorded in `DECISIONS.md` |
| 4 | Oct 24 | Agent: extract → resolve → understand → translate → decide (cross-domain tool) → rewrite → guard → critic. Plain-LLM baseline. SSE API | End-to-end CLI run on the 3 demo texts |
| 5 | Oct 25 | UI part 1: input, market picker, live progress, side-by-side result with highlighted swaps | Full flow works in the browser |
| 6 | Oct 26 | UI part 2: evidence cards, runner-up swap, "doesn't travel" flags, Plain-AI toggle, coverage map, export brief, mobile | Demo story runs start to finish |
| 7 | Oct 27 | MCP tool. Deploy to Vercel + Upstash. Warm demo cache. Rate limits. Send the native-review form out **in the morning** so answers arrive by day 8 | Live URL works; smoke test passes |
| 8 | Oct 28 | Eval run (held-out + baseline), collect native ratings, README with numbers and limits, screenshots | `docs/EVALUATION.md` written |
| 9 | Oct 29 | 2–3 minute video, Devpost text, final check against the rules checklist (section 11), **submit** | Submitted, with a day of buffer |

**Cut list if behind** (cut in this order): export brief → MCP tool → audience age picker → London (keep 4 cities) → the critic pass. **Never cut:** evidence cards, the Plain-AI comparison, the coverage map and replayable demos.

---

## 11. Rules checklist (from the official rules)

- [ ] **Separate, substantially different submission.** Multiple entries are allowed only if each is "unique and substantially different". Use a new repo, a new demo URL and a new Devpost entry. Don't reuse Common Ground's name, screenshots or copy. Each project can win at most one prize.
- [ ] **Working software that uses the Qloo API** and is agentic (agent loop + MCP tool). It must install and run as shown in the video and description.
- [ ] **A functional demo link**, free and with no restriction until **Nov 16, 11:45 PM ET**. No login, or include credentials. Keep the Qloo key, LLM sign-in and Upstash alive through judging. Replays protect against rate limits.
- [ ] **A public GitHub repo** with all source, assets and setup instructions, and an **open-source licence detected in the repo's About section** (MIT file at the root; check that GitHub shows it).
- [ ] **A text description** of features and functionality, in English.
- [ ] **A video.** Not strictly required, but judges "may judge solely on the text, images and video". Treat it as required.
- [ ] **IP:** demo texts are original, written by us. No copied ads, scripts or lyrics. Brand names appear only as references in analysis. Qloo images are shown via Qloo URLs, not re-hosted.
- [ ] **Qloo terms:** no Qloo responses in the public repo (synthetic fixtures only); private server-side cache only.
- [ ] **Third-party terms:** we must be authorized to use every API. **Risk:** Common Ground serves its LLM through a personal ChatGPT subscription backend. Check that this is acceptable for a public app, or switch this project to a standard API key with a spending cap, so judging isn't at risk.
- [ ] **Eligibility:** Brazil residents can't enter. Using São Paulo as a *target market* is fine, but don't recruit a Brazil-resident teammate as an entrant. Each team member must meet the age-of-majority rule.
- [ ] **No changes after Oct 30, 11:45 PM ET**, so submit by Oct 29.

---

## 12. Judging criteria → what wins each one

| Criterion | Our answer |
|---|---|
| **Technological implementation** | A non-trivial engine using location signals, batched shortlist scoring across control cities, role-tag similarity, demographics, an agent with tools, a guard, reproducibility, MCP. About 10 Qloo features, not 1 |
| **Design** | One coherent flow from paste to export, evidence on every swap, an honest coverage map, mobile-ready, instant replays |
| **Potential impact** | A named, paying audience (localization and transcreation teams, marketers, dubbing, games, startups), a specific workflow it shortens, and native-speaker ratings as proof |
| **Quality of the idea** | Not a recommender: it uses the taste graph as **a map of what plays which role in which culture**. Unusual, clearly needs Qloo, and the "launched only where the data is strong" stance shows we understand it |

---

## 13. Open questions to settle on day 1
1. Repo name, product name, and whether the domain is free.
2. Which LLM to use (see the risk in section 11).
3. Whether `wikipedia_category` country tags are dependable enough for a "local origin" check (needs a probe).
4. Whether reverse translation (Tokyo → US) gets the same quality. If it does, it's a strong "any direction" stretch demo; if not, keep US as the only source.
