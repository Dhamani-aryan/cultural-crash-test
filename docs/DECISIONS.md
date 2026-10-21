# Decisions

Newest first. Each entry: date, decision, evidence.

## 2026-10-21: Run 9 — namesakes, origin from descriptions, one-box brief

Fixes since run 8:
- Wrong namesakes are flagged as ambiguous instead of tested. Qloo's only "Divine" is an American performer, not the Mumbai rapper.
- Origin is read from company descriptions ("a Japanese entertainment company"). Sanrio had no other origin signal.
- A user's venue is tested in its own event-friendly category.
- The draft can't name the launching brand as its own collaborator.
- Plain-words briefs.

**Run 9 results:**
- **Held-out supported:** 7 → 18 of 36; 8 briefs up, 0 down.
- **Evidence judge:** 9 / 0 / 0, and 6 / 0 / 0 on the held-out briefs.
- **Blind reference judge:** 1 / 8 / 0.
- **DIVINE is no longer swapped.**

## 2026-10-21: Runs 7–8 — local-only upgrades and fixed gates

**São Paulo diagnosis.** Upgrades only tried the agent's own suggestions, even though Qloo's audience list had Brazilian acts in it, and creative direction was never upgraded.
- Upgrades now draw on the agent's suggestions *and* the audience list, but every candidate must be from the city's own country (venues: in it).
- Creative direction can be upgraded, keeping the words this audience already leans to.
- A popular local name with no returned affinity is left alone.

**Gate bugs found in run 7:**
- **DC Shoes passed as Brazilian.** Its key markets include Brazil. Origin now comes from Wikipedia categories first; key markets count only when there is exactly one.
- **Hilton Tokyo Bay passed the venue gate.** It is tagged `resort_hotel` / genre `hotel`. The gate now matches hotel-type words in any category or genre tag.

**Results:**

| Run | Held-out supported (of 36) | Rose / fell | Evidence judge (agent / draft / tie) | Held-out briefs only | Blind reference judge |
|---|---|---|---|---|---|
| 7 | 4 → 18 | 8 / 0 | 9 / 0 / 0 | 6 / 0 / 0 | 0 / 9 / 0 |
| 8 | 4 → 22 | 9 / 0 | 9 / 0 / 0 | 6 / 0 / 0 | 0 / 9 / 0 |

**Still imperfect.** Some swaps are evidence-supported but a weaker creative idea, such as Sanrio → Uniqlo for a skincare brand, and DIVINE → Badshah. The blind judge, which sees no evidence and is the model that wrote the draft, prefers the draft in every brief.

## 2026-10-21: Run 6 — measurement fixes, upgrade rounds, and an evidence-based judge

**Why the agent was losing.** Re-running three lost briefs and tracing every decision showed that the agent was mostly *mis-measuring* good picks, then replacing them:
- **Name collisions.** "Divine" resolved to an American entity, not DIVINE the Mumbai rapper. Names now resolve preferring the target market's origin, then popularity (`findInMarket`).
- **Key markets read as origin.** HAY looked "from US, JP". A foreign choice missing from the city's list is now thin evidence. The contradiction is a *generic global default*: absent here, but big in other world cities or the US.
- **Popular local names with no affinity.** Qloo returns none for very popular local names under a city signal (Sanrio in Tokyo). For a name from here, that's thin evidence, not a contradiction.
- **Empty package tag lists** were scored as "outside the top 0". They're now "not measured".

**Better answers, not just fewer mistakes.** Once nothing in the plan is contradicted, spare rounds try to *upgrade* thinly supported choices. Only the agent's own role-sensible suggestions count as candidates, and a swap is kept only if Qloo then rates the new choice Supported.

**The judge now audits evidence.** The primary judge sees the same held-out Qloo evidence for both plans, plus Qloo's description of each choice. It is blind to which plan is the agent's, runs in both orders, and is told to judge from evidence, not taste. The no-evidence judge is kept as a labelled reference, because it is choosing rather than judging.

**Run 6 results:**

| Measure | LLM-only draft | Agent |
|---|---|---|
| Supported choices, held-out anchors (36 choices) | 3 | 10 |
| Briefs where held-out support rose / fell | – | 5 / 0 |
| Evidence judge preference (agent / draft / tie) | – | 7 / 0 / 2 |
| Evidence judge, 6 held-out briefs only | – | 5 / 0 / 1 |
| Blind reference judge, same scale | – | 1 / 3 / 5 (was 0 / 9 / 0 in runs 1–3) |

## 2026-10-21: Five evaluation rounds — Qloo evidence vs. a blind LLM judge

All five runs used the same 9 briefs. The left number in each Qloo column is the LLM-only draft; the right number is the agent's final plan, both scored the same way.

| Run | Change to the agent | In-run supported (of 36) | Held-out supported | Judge: agent / draft / tie |
|---|---|---|---|---|
| 1 | Original loop | 7 → 29 | 5 → 16 of 32 | 0 / 9 / 0 |
| 2 | Role gate (venue kind, brand business) + model veto | 9 → 30 | 5 → 18 | 0 / 9 / 0 |
| 3 | Agent proposes its own candidates, scored in Qloo; up to 3 tried per round; more rounds | 8 → 34 | 6 → 23 | 0 / 9 / 0 |
| 4 | Replace only choices the evidence contradicts; keep thin and unknown ones, flagged | 5 → 13 | 6 → 10 | 1 / 5 / 3 |
| 5 | Anchor used as a choice tested against the other anchors | 6 → 17 | 3 → 11 | 0 / 7 / 2 |

**Findings:**
- **Qloo support always improves, with no losses.** On held-out anchors, support never fell in any brief in any run.
- **The more the agent changes, the more it gains on Qloo's measures, and the more the judge prefers the draft.** The judge is the model that wrote the draft, and it never sees the evidence. It mostly rewards the canonical, best-known local names, which the model already knows. Qloo's affinity for the anchor brands' fans often ranks those names lower: Jordan Rakei, CASisDEAD, Sanrio, María José Llergo.
- **Real faults the judge exposed, all fixed:**
  - wrong-role swaps (hotels, apps, outlets);
  - swapping authentic local picks that Qloo doesn't list;
  - anchors failing against themselves.
- **Run-to-run variance is high,** because the draft itself differs every run. With 9 briefs, differences of one or two judgements are noise.

## 2026-10-21: Pivot to Cultural Crash-Test; agent loop and rubric crash-v1 (`src/lib/crashtest/`)

The owner chose the Crash-Test spec over Transcreate. Transcreate stays at the tag `transcreate-final`. Its Qloo engine is reused here: the client, the locality gates (`checkPick`), role tags and measured city coverage.

**Live findings that shaped the design** (`research/crashtest/c1–c6`):
- **Explainability works.** `feature.explainability` returns each seed's contribution per result, so each audience-affinity finding names its strongest anchor.
- **Audience × city × candidate scoring works.** With `filter.results.entities`, Skepta scores 0.962 for a Stüssy/Palace/Carhartt audience in London and isn't returned in Tokyo.
- **Seeded lists are audience-shaped but not local.** Kendrick Lamar is #2 for that London audience. So locality is its own dimension, measured with the control-city gates.
- **Venues need a category filter.** Without one, seeded places return hotels.
- **Creative direction can be tested.** Tag insights (`filter.type=urn:tag`, `filter.tag.types=aesthetic_property / emotional_tone`) give an audience's aesthetics per city. "Playful" is #1 in Tokyo and absent from London's top 15, where Industrial and Utilitarian lead.

**Design decisions:**
- **No-support choices get no total.** If Qloo returns nothing for a choice under the audience and city signals, it gets no total. The other dimensions renormalising gave Vans a 1.00, which made correct repairs look worse and got them reverted.
- **Progress counts supported choices first,** then the repaired choice's status, then the plan score. Score alone can't compare a plan where a choice moved from "no support" (no score) to scored.
- **A creative direction is supported only when every word of it is in the audience's list.** Half-matching directions passed on the average before.
- **A locked choice that isn't supported** doesn't block acceptance (nothing can change it), but it is recorded as an open risk.
- **Repair prompts** may not predict sales or engagement. The expected effect names which test should improve.

**First live demo run** (London, the founder's choices Travis Scott, BOXPARK Shoreditch locked, "playful pastel Y2K"; thorough depth):
- Travis Scott: *No support found* → slowthai (#1 for the audience; strongest link Palace).
- Vans (drafted): *No support* → END. Clothing (#2).
- Creative direction → "Industrial utility in monochrome" (#2, #6, #7 in London).
- Result: 1 of 4 → 4 of 4 supported, score 68 → 90. That took 350 Qloo calls, 6 model calls and about 70 s.

## 2026-10-21: Engine v2 after the first evaluation (`eval/`, `docs/EVALUATION.md`)

The first full evaluation (13 texts, 35 city outputs, blind judge) showed the model alone beating Transcreate 26 to 7, even though 96% of Transcreate's picks passed Qloo's locality checks against 35% of the model's. The judge's reasons pointed to real faults, not just bias:

1. **Recall.** Qloo's location-only lists rank what is *distinctive* in a city, so the everyday answer is often missing: Greggs for Dunkin' in London, El Retiro in Madrid, Peep Show for The Office.
   - **Fix:** the agent proposes up to 4 local names per reference (`src/lib/agent/propose.ts`). Each must resolve in Qloo and pass the same gates. Proposals that pass are always shown to the decide step, and rejected ones are listed as evidence ("Agent suggestions Qloo turned down").
2. **Iconic local picks rejected as "global".** Rosalía and Anitta are known worldwide, but they are *the* local answer.
   - **Fix:** an entity from the target market skips the global and US-familiarity gates; those gates are for imports. "From here" means origin tags or nationality, a release in that country for TV and film, or, for a place, being in that country.
   - **Proposals outside the city list** pass on local origin, or when Qloo's affinity for them under the city's location signal beats New York's (Paquita Salas 0.998 vs 0.876, Greggs present in London and absent in NYC). TV shows and places often surface under neither signal, so origin is the main evidence for them.
3. **Role scores that couldn't tell chains apart.** Every candidate sat around 0.1, and ordering apps (Deliveroo, Swiggy) ranked next to coffee chains because Dunkin' has an app.
   - **Fix:** Wikipedia categories become country-neutral *kinds* ("Fast-food chains of the United Kingdom" → "fast-food chains", "Doughnut shops"). These are scored on full records for the whole pool (`kindOf` in `src/lib/engine/role.ts`). App genres are left out of brand pools and weigh 0.5 in role.
4. **Too many keeps.** Stranger Things, Shake Shack and Taylor Swift stayed as they were, and the judge read the copy as less local.
   - **Fix:** keep only functional references ("works with your iPhone") or when nothing fits.
5. **Obscure picks.** The fame weight went from 0.15 to 0.30: role 0.40, locality 0.20, audience 0.10, fame 0.30.
6. **Translated titles.** Qloo lists many local shows under an English translation ("No One Could Live Here"). Shows and films now use a Latin-script aka in the city's language ("Aquí no hay quien viva", "A Grande Família"). Brands keep their display name, because their other names are legal entities ("Greggs plc").

**Measurement fixes:**
- The judge now rates every pair in both orders and counts only consistent preferences.
- One shared pick check (`src/lib/agent/check.ts`) judges both sides. It uses the pick's own category lists, so Transcreate doesn't pass by construction.
- The model-only comparison in the UI uses that same check.

Results per run are in `docs/EVALUATION.md`.

## 2026-10-21: First live runs of the full agent (`scripts/run-demo.ts`)

All three demo texts run end to end: about 50 s, ~230 Qloo calls and 8–11 model calls each. Fixed along the way:

- **Qloo 429s.** One translation fans out to dozens of requests. The client now keeps 4 in flight, backs off longer on 429, and shares identical in-flight requests.
- **Wrong entity.** The extractor wrote "The Office (U.S. TV series)", which resolved to another show via the top-result fallback. Resolution now tries the plain name and the written span, and only accepts close matches; otherwise the reference is flagged.
- **One model timeout sank the whole run.** A market now retries once, then returns the original text with its references flagged.
- **Guard false positives** ("We're", "Nykaa's", "Glossier-level") forced the clunky fallback. The guard now splits on apostrophes and hyphens.
- **Prompt fixes:** reasons in English; prefer a strong local candidate over keeping a famous American reference; natural articles around swapped names.
- **Fairer model-only check:** a model-only swap counts as local only if it's in the city's own Qloo list for its kind and category, looked up by its stated kind.

Results now (selected):
- **Ad script:**
  - Madrid: *Paquita Salas*, Mercadona, Puerta del Sol.
  - London: *People Just Do Nothing*, Marks & Spencer, Brixton Market.
  - São Paulo: *Monica and Friends*, Pão de Açúcar; Times Square kept.
- **Product page:**
  - Tokyo: Shiba Park, Gen Hoshino, Seijo Ishii.
  - São Paulo: Ibirapuera, Gloria Groove, Pão de Açúcar.
  - Madrid: Aitana, Lidl.
- **Pitch:**
  - Glossier → Nykaa (Mumbai) and Ettusais (Tokyo).
  - Chipotle → Café Coffee Day / Matsuya / Tortilla.

**Known limits:**
- **Peloton has no local equivalent.** Qloo files it under fashion/athletic and has no fitness-brand tag, so it's kept or flagged. The model-only version suggests Cult.fit and Fiit, which is better here; the comparison view shows that honestly.
- **Madrid's El Retiro is missed.** It exists in Qloo (popularity 0.999) but no location query surfaces it, so Central Park → Madrid gives the Temple of Debod.
- **London's model-only picks are strong too** (Fiit, Beauty Pie, Pret, all in London's list). Qloo's advantage is clearest in Tokyo, Mumbai and São Paulo.

## 2026-10-21: Places rank by fame, with in-city co-affinity

Sweep: Central Park, Times Square, Whole Foods, SNL, Home Alone, Beyoncé × 5 markets.

- The superstar gate was removing famous landmarks (Hyde Park). Places are physically local, so they skip that gate and use Qloo popularity as *fame*.
- A city's "distinctive" list can miss its most famous places. For places only, the pool also includes what the anchor's fans like *inside* the target city (`signal.interests.entities` + `filter.location.query`). That's safe because the location filter pins it to the city.
- **Results:**
  - Central Park → Hyde Park (London), Ibirapuera Park (São Paulo), Hanging Garden (Mumbai), Hibiya Park (Tokyo).
  - Times Square → Shibuya Crossing (Tokyo), Puerta del Sol (Madrid), Girgaon Chowpatty (Mumbai).
  - SNL → Late Motiv / La resistencia (Madrid), Zee Comedy Show (Mumbai), Never Mind the Buzzcocks (London), LOL Brasil.
  - Beyoncé → Utada Hikaru (Tokyo), Craig David / Jessie Ware (London), Iza (São Paulo).
  - Home Alone → *Minha Mãe é uma Peça 3* (São Paulo), Bollywood family comedies (Mumbai).
- **Weak:** Whole Foods → Mumbai returns department stores (Shoppers Stop); Madrid returns Pescanova and Lidl. Retail categories are broad, so the agent should prefer "keep or describe" when role overlap is low.

## 2026-10-21: Equivalence engine v1 (`src/lib/engine/`)

Tested live with `scripts/try-equivalents.ts` on Chipotle, Trader Joe's, The Office and Taylor Swift across all 5 markets.

- **Cross-city affinity comparison doesn't work.** Under a location signal, Qloo leaves out entities that aren't distinctive there (Starbucks and KFC vanish from New York's list), so a missing score means "unknown". Locality is now *presence in other cities' top-100 lists*: 4 control cities. Those lists are identical for every anchor, so they cache well.
- **Gates, in order:**
  1. *global*: in ≥ 2 control lists, or Qloo popularity ≥ 0.998. The biggest local stars top out around 0.997 (Utada Hikaru, Caetano Veloso, Rosalía); global stars are 0.999+.
  2. *familiar in source*: in a New York, LA, Chicago or San Francisco list. The US audience already has it (In-N-Out, Jamba Juice).
  3. *foreign origin*: brands use the `key_market` tags; chains use Wikipedia categories; artists use the nationality in their short description. Insights results omit these tags, so the top 12 get a full-record re-check.
  4. *foreign release*: TV and film `release_country` must match.
  5. *duplicates*: name and aka match; identical audience skew plus ≥ 0.5 role overlap ("Jin Akanishi" / "赤西仁"); one name extending another ("Anushka" / "Anushka Manchanda").
- **Score:** 0.45 role (weighted Jaccard over character tags, scaled to the pool) + 0.25 locality + 0.15 audience (age/gender cosine) + 0.15 fame (rank in the target city). Factual tags (Wikipedia categories, competitor brands, business model) are excluded from role, because they pulled US entities back in.
- **Examples after the gates:**
  - Chipotle → Goiko, Telepizza (Madrid); Café Coffee Day, Behrouz Biryani (Mumbai); Sushiro, Matsuya (Tokyo); Nando's, Wagamama, Greggs (London); Casa do Pão de Queijo (São Paulo).
  - Trader Joe's → Zaffari, Pão de Açúcar (São Paulo).
  - The Office → People Just Do Nothing (London), Paquita Salas (Madrid), TVF Pitchers (Mumbai).
  - Taylor Swift → Aitana (Madrid), DUDA BEAT and Pabllo Vittar (São Paulo), Sunidhi Chauhan (Mumbai).
- **Known weak spots:**
  - The Office → Tokyo returns romantic comedies (Japan has few workplace sitcoms in Qloo's top list).
  - Tokyo artists include idol-actors.
  - Brand role scores are low in absolute terms (~0.05–0.15), so locality and fame carry more of the ranking there.

## 2026-10-21: Launch markets and per-domain confidence

- **Source market:** United States (New York as Qloo's reference location). US entities have the richest tags and the deepest data, and US content is what gets localized most.
- **Target markets:** Tokyo, London, Mumbai, São Paulo, Madrid.
- **Evidence:** `scripts/measure-coverage.ts` → `data/coverage.json`, 12 cities. For each city and domain, it takes the top 150 results under a location-only signal. *Distinct* is the share of the top 50 that appear in at most one other city; for places, category depth across 8 common venue categories.
- **Excluded:** Seoul (brands 0.48, places 0.29), Paris (TV 0.52, film 0.16, brands 0.50), Berlin (film 0.18), Mexico City (Madrid covers Spanish with stronger data), Sydney and Toronto (media too close to US and UK).
- **Grades** (`src/lib/markets.ts`): media and brands are *strong* at distinct ≥ 0.8 and *usable* at ≥ 0.4; places are *strong* at category depth ≥ 0.45 and *usable* at ≥ 0.3. Anything *off* is flagged for a human, not translated. Overrides from measured translation quality go into `OVERRIDES`, with evidence recorded here.
- Books and podcasts are not supported. In every city we probed, their location-only results were dominated by US titles.

## 2026-10-20: Translation method (from research/translator/)

- **Rejected:** entity signal + location signal, which returns US brands in Tokyo (Costco, Le Creuset), and ranking a local pool by co-affinity with the anchor, which pulls back to US chains (In-N-Out in Tokyo). Co-affinity measures what the *same people* like, not what plays the *same role* elsewhere.
- **Chosen:** build a local pool from a location-only signal, then score each candidate on role similarity (shared role tags), locality (target-city affinity percentile vs. control cities) and audience similarity (demographics).
- Batch `filter.results.entities` in groups of ≤ 50. The API caps `take` at 50, so larger lists silently lose their scores.
