# Evaluation

**Run:** 2026-10-21 · **Cases:** 13 texts (3 dev, 10 held out), 35 market outputs · **Mode:** live (Qloo + model, no saved results)

Reproduce with `npm run live eval/run.ts`, then `npm run live eval/report.ts`. Raw outputs stay in the git-ignored `eval/out/`. Every text was written for this project; the three dev cases are the demo texts the agent was tuned on, the rest were written afterwards and never used for tuning.

## What is compared

| Condition | What it is |
|---|---|
| **Transcreate** | The full agent: extract references, resolve them in Qloo, propose local candidates, search the city's taste data, gate and rank by role, locality, audience and fame, decide (swap, keep, flag or search another kind of culture), rewrite with a name guard. |
| **Model alone** | The same model, given the same text and cities, asked to localize it with no Qloo data (`src/lib/agent/baseline.ts`). |

Every pick from both sides then goes through **the same Qloo checks** (`src/lib/agent/check.ts`). They use the pick's own category lists, not the ones the engine searched, so Transcreate doesn't pass by construction.

## 1. Are the picks actually local?

| Check (same Qloo test for both) | Transcreate | Model alone |
|---|---|---|
| Found in Qloo at all | 71 / 71 (100%) | 66 / 81 (81%) |
| From the target country (origin, release or location) | 70 / 71 (99%) | 63 / 81 (78%) |
| In the city's own taste list for its kind | 42 / 71 (59%) | 28 / 81 (35%) |
| Of foreign origin (another country's brand, artist or show) | 0 / 71 (0%) | 0 / 81 (0%) |
| Also in a US city's list (an American would know it too) | 3 / 71 (4%) | 4 / 81 (5%) |
| Known everywhere (in 2+ other cities' lists, or a global superstar) | 4 / 71 (6%) | 4 / 81 (5%) |
| **Passes every locality check** | 71 / 71 (100%) | 63 / 81 (78%) |
| Mean role overlap with the original (tag Jaccard) | 0.15 | 0.13 |

## 2. Blind judge

A model judge, playing a resident of each city, sees the original and both rewrites as A and B, scores each and states a preference. Every pair is judged **twice with the order swapped**; a preference counts only when both orders agree, otherwise it is a tie, which cancels position bias. **Caveat:** the judge is the same model family as the "model alone" condition, so self-preference bias may remain. This is a check on readability and fit, not a substitute for native reviewers.

Judged market outputs: 33. Preferred: **Transcreate 12**, model alone 14, tie 7.

| Mean score (1–5) | Transcreate | Model alone |
|---|---|---|
| Recognisable to locals | 4.4 | 4.7 |
| Same job as the original | 4.0 | 3.9 |
| Reads naturally | 3.9 | 4.2 |

| Split | Markets | Transcreate preferred | Model alone preferred | Tie |
|---|---|---|---|---|
| Dev (tuned on) | 9 | 3 | 5 | 1 |
| Held out | 24 | 9 | 9 | 6 |

## 3. Behaviour checks

Deterministic expectations: global functional references stay (iPhone, Google Calendar), invented names stay, a text with no references comes back unchanged, no film swaps where Qloo's film data for the city is too thin (London), every chosen name appears in the output, and no rewrite needed the fallback.

**81 / 82** deterministic checks passed.

| Case | Market | Check | Result |
|---|---|---|---|
| Newsletter | mumbai | every chosen name is in the text | The Local Train |

## 4. Technical

| Metric | Result |
|---|---|
| Cases completed | 13 / 13 |
| Market outputs | 35 |
| References found in Qloo | 26 / 28 |
| Decisions: swap / keep / flag | 71 / 1 / 7 |
| Agent searched another kind of culture | 1 times |
| Rewrites that needed the substitution fallback | 0 |
| Mean time per case (live, 2–3 markets + comparison) | 56 s |
| Mean Qloo calls per case | 285 |

## Per market

✗ marks a pick that fails at least one locality check; "not in Qloo" means Qloo has no entity by that name.

| Case | Market | Transcreate | Model alone | Judge prefers |
|---|---|---|---|---|
| Startup pitch (dev) | tokyo | Peloton → Lean Body; Glossier → Botanist; Chipotle → Matsuya Foods | Peloton → SOELU ✗not in Qloo; Glossier → SHIRO ✗; Chipotle → Yoshinoya | baseline |
| Startup pitch (dev) | mumbai | Glossier → Nykaa; Chipotle → Café Coffee Day (flagged Peloton) | Peloton → Cult.fit; Glossier → Nykaa; Chipotle → Faasos | baseline |
| Startup pitch (dev) | london | Glossier → Beauty Pie; Chipotle → Pret A Manger (flagged Peloton) | Peloton → Fiit; Glossier → Beauty Pie; Chipotle → Pret | transcreate |
| TV ad script (dev) | madrid | The Office → Aquí no hay quien viva; Trader Joe's → Mercadona; Times Square → Puerta del Sol | The Office → Aquí no hay quien viva; Trader Joe's → Mercadona; Times Square → Puerta del Sol | transcreate |
| TV ad script (dev) | sao-paulo | The Office → A Grande Família; Trader Joe's → Sadia; Times Square → Beco do Batman | The Office → A Grande Família; Trader Joe's → Sadia; Times Square → Avenida Paulista ✗not in Qloo | baseline |
| TV ad script (dev) | london | The Office → Friday Night Dinner; Trader Joe's → Marks & Spencer; Times Square → Leicester Square | The Office → Peep Show; Trader Joe's → Tesco; Times Square → Leicester Square | tie |
| Product page (dev) | tokyo | Central Park → Shiba Park; Taylor Swift → yoasobi; Whole Foods → Seijo Ishii | Central Park → Yoyogi Park; Taylor Swift → Hikaru Utada ✗not in Qloo; Whole Foods → Seijo Ishii | baseline |
| Product page (dev) | sao-paulo | Central Park → Ibirapuera Park; Taylor Swift → Anitta; Whole Foods → St Marche | Central Park → Ibirapuera Park; Taylor Swift → Anitta; Whole Foods → Pão de Açúcar | transcreate |
| Product page (dev) | madrid | Central Park → Temple of Debod; Taylor Swift → Aitana; Whole Foods → El Corte Inglés | Central Park → El Retiro ✗; Taylor Swift → Aitana; Whole Foods → El Corte Inglés | baseline |
| Newsletter | mumbai | Olivia Rodrigo → The Local Train; Saturday Night Live → Koffee with Karan; Target → Shoppers Stop | Olivia Rodrigo → Dhvani Bhanushali; Saturday Night Live → The Kapil Sharma Show; Target → DMart | tie |
| Newsletter | madrid | Olivia Rodrigo → Amaia; Saturday Night Live → La revuelta; Target → Hipercor | Olivia Rodrigo → Aitana; Saturday Night Live → La Revuelta; Target → El Corte Inglés | tie |
| Newsletter | sao-paulo | Olivia Rodrigo → Manu Gavassi; Saturday Night Live → Lady Night; Target → Lojas Americanas | Olivia Rodrigo → Luísa Sonza; Saturday Night Live → Lady Night; Target → Magazine Luiza ✗not in Qloo | transcreate |
| Social post | london | Dunkin' → Greggs; Starbucks → Costa Coffee | Dunkin' → Greggs; Starbucks → Costa Coffee | tie |
| Social post | tokyo | Dunkin' → Mister Donut (kept Starbucks) | Dunkin' → Doutor; Starbucks → Tully's Coffee ✗not in Qloo | baseline |
| Social post | mumbai | Dunkin' → Nescafé; Starbucks → Café Coffee Day | Dunkin' → Chai Point ✗not in Qloo; Starbucks → Café Coffee Day | baseline |
| Travel app | tokyo | Hollywood Walk of Fame → Kaminarimon Gate; Shake Shack → CLINTON ST. BAKING COMPANY | Hollywood Walk of Fame → Shibuya Crossing; Shake Shack → Ichiran ✗ | baseline |
| Travel app | madrid | Hollywood Walk of Fame → Puerta del Sol; Shake Shack → Goiko | Hollywood Walk of Fame → Puerta del Sol; Shake Shack → Goiko | transcreate |
| Travel app | london | Hollywood Walk of Fame → Leicester Square; Shake Shack → Dishoom | Hollywood Walk of Fame → Leicester Square; Shake Shack → Dishoom | tie |
| Streaming promo | mumbai | Stranger Things → Typewriter; Parks and Recreation → Panchayat | Stranger Things → Aahat; Parks and Recreation → Office Office | transcreate |
| Streaming promo | sao-paulo | Stranger Things → Cidade Invisível; Parks and Recreation → A Grande Família | Stranger Things → Invisible City; Parks and Recreation → A Grande Família | transcreate |
| Streaming promo | madrid | Stranger Things → The Ministry of Time; Parks and Recreation → Aquí no hay quien viva | Stranger Things → El internado; Parks and Recreation → Aquí no hay quien viva | baseline |
| Fitness class | london | Eminem → Dizzee Rascal (flagged Rocky) | Rocky → Fighting with My Family; Eminem → Stormzy | transcreate |
| Fitness class | tokyo | Rocky → Tomorrow's Joe; Eminem → AK-69 | Rocky → Hajime no Ippo ✗not in Qloo; Eminem → AK-69 | baseline |
| Fitness class | sao-paulo | Rocky → 10 Segundos para Vencer; Eminem → Karol Conka | Rocky → Mais Forte que o Mundo; Eminem → Mano Brown | tie |
| Retail banner | mumbai | Costco-sized → Big Bazaar Food; Nordstrom-level → Taj Hotels Resorts and Palaces; Amazon Prime → Swiggy | Costco → DMart; Nordstrom → Taj; Amazon Prime → Blinkit | baseline |
| Retail banner | sao-paulo | Costco-sized → Assaí Atacadista; Nordstrom-level → Rede Angeloni; Amazon Prime → Rappi Brasil | Costco → Atacadão ✗not in Qloo; Nordstrom → Fasano ✗not in Qloo; Amazon Prime → Mercado Livre | baseline |
| Retail banner | london | Costco-sized → B & M; Nordstrom-level → John Lewis; Amazon Prime → Deliveroo | Costco → Aldi; Nordstrom → John Lewis; Amazon Prime → Deliveroo | tie |
| Restaurant menu | tokyo | Magnolia Bakery → Ginza Cozy Corner; Bon Iver → 青葉市子; the High Line → Shibuya Sky | Magnolia Bakery → Fairycake Fair ✗not in Qloo; Bon Iver → Ichiko Aoba; High Line → Shibuya Sky | baseline |
| Restaurant menu | london | Magnolia Bakery → GAIL's Bakery; Bon Iver → Laura Marling; the High Line → Sky Garden | Magnolia Bakery → Lola’s Cupcakes ✗not in Qloo; Bon Iver → Ben Howard; High Line → Sky Garden | baseline |
| No references | london | — | — | — |
| No references | madrid | — | — | — |
| Global brands only | tokyo | — (flagged iPhone, Google Calendar) | iPhone → Sony Xperia ✗not in Qloo; Google Calendar → TimeTree | transcreate |
| Global brands only | mumbai | — (flagged iPhone, Google Calendar) | iPhone → Samsung Galaxy ✗not in Qloo; Google Calendar → Zoho Calendar ✗not in Qloo | transcreate |
| Invented brand | madrid | — | Brindle & Pike → Pan.Delirio | transcreate |
| Invented brand | sao-paulo | — | Brindle & Pike → PÃO Padaria Artesanal ✗not in Qloo | transcreate |

## Judge's reasons

- **Startup pitch, tokyo** (prefers baseline): SOELU, SHIRO, and Yoshinoya closely match the fitness-subscription, stylish-beauty, and inexpensive-meal roles of the originals. A’s “Matsuya Foods habit” sounds unnatural, and Lean Body and Botanist are weaker matches.
- **Startup pitch, mumbai** (prefers baseline): Cult.fit and Faasos are highly familiar in Mumbai and closely preserve the fitness-subscription and habitual fast-food comparisons. Café Coffee Day is recognisable, but a coffee habit is a weaker match for Chipotle than Faasos.
- **Startup pitch, london** (prefers transcreate): Pret and Beauty Pie are familiar London references, though Beauty Pie lacks some of Glossier’s design-led cachet. Peloton is more recognisable and better conveys a slick premium subscription than Fiit.
- **TV ad script, madrid** (prefers transcreate): Both use familiar Madrid references with suitable connotations, but “a frozen pizza from Mercadona” sounds more natural than “a Mercadona frozen pizza.”
- **TV ad script, sao-paulo** (prefers baseline): Both use familiar, homely references, but Avenida Paulista better matches Times Square as an iconic, heavily crowded urban destination. Beco do Batman is recognisable but more niche and neighbourhood-scale.
- **TV ad script, london** (prefers tie): Both versions use familiar London references and read naturally. A better preserves the cosy viewing and slightly upmarket grocery associations of the original, while Tesco and Peep Show feel less equivalent.
- **Product page, tokyo** (prefers baseline): Yoyogi Park in April evokes an iconic, pleasant picnic season, while Shiba Park in rainy June is a weaker fit. Hikaru Utada and Seijo Ishii are highly recognisable, and B reads naturally for Tokyo.
- **Product page, sao-paulo** (prefers transcreate): Both use familiar São Paulo references, though June is cooler than the original’s summer picnic setting. St Marche better matches Whole Foods’ premium-grocery connotation, while Pão de Açúcar is more mainstream.
- **Product page, madrid** (prefers baseline): El Retiro is a more natural Madrid equivalent to Central Park for an iconic summer picnic, while the Temple of Debod is less directly comparable. Aitana and El Corte Inglés are familiar, though the latter is not quite the same kind of upscale-grocery reference as Whole Foods.
- **Newsletter, mumbai** (prefers tie): B’s Dhvani Bhanushali and DMart are closer functional matches, but “a The Kapil Sharma Show afterparty” is conspicuously unnatural. A reads more smoothly, though The Local Train and the relatively premium Shoppers Stop shift the original’s tone.
- **Newsletter, madrid** (prefers tie): Aitana is a closer mainstream-pop match for Olivia Rodrigo, but Hipercor better matches Target’s accessible hypermarket role; El Corte Inglés feels more premium.
- **Newsletter, sao-paulo** (prefers transcreate): Both versions use familiar Brazilian references, but Americanas is a closer match to Target as an affordable variety retailer. Manu Gavassi also better preserves Olivia Rodrigo’s youthful pop-cultural connotation.
- **Social post, london** (prefers tie): The adaptations are identical, and both Greggs and Costa Coffee are highly recognisable in London while preserving the original contrast between a convenient, no-fuss chain and a routine coffee-chain visit.
- **Social post, tokyo** (prefers baseline): Doutor better captures Dunkin’s inexpensive, convenient, early-opening coffee-shop role in Tokyo, while Tully’s is a natural local counterpart to Starbucks.
- **Social post, mumbai** (prefers baseline): Chai Point is a familiar, convenient café chain and matches Dunkin’s no-fuss, early-opening role better. Nescafé is recognisable, but as a packaged coffee brand it clashes with the reference to opening early.
- **Travel app, tokyo** (prefers baseline): Shibuya Crossing and Ichiran are instantly recognisable in Tokyo and closely match the original’s tourist-icon and popular-food-queue functions. A is plausible, but CLINTON ST. BAKING is less widely known and the styling feels less natural.
- **Travel app, madrid** (prefers transcreate): Puerta del Sol and Goiko are familiar Madrid references and broadly preserve the tourist-landmark and popular-burger-chain roles. “A line at Goiko” sounds much more natural in English than “a Goiko line.”
- **Travel app, london** (prefers tie): The versions are identical, and both Leicester Square and Dishoom are highly recognisable London references that naturally convey a tourist hotspot and a popular restaurant with long queues.
- **Streaming promo, mumbai** (prefers transcreate): A feels more contemporary and better preserves the original mix of supernatural weirdness and warm, character-led comedy. B uses iconic references, but Aahat and Office Office are more campy and satirical than the originals.
- **Streaming promo, sao-paulo** (prefers transcreate): “Cidade Invisível” is the familiar Brazilian title and pairs naturally with the iconic, warm comedy “A Grande Família”; “Invisible City” is less immediately recognisable in São Paulo.
- **Streaming promo, madrid** (prefers baseline): “El internado” is a widely recognised Spanish mystery series with a suitably eerie tone, while “The Ministry of Time” unnaturally translates the established title “El Ministerio del Tiempo.”
- **Fitness class, london** (prefers transcreate): Rocky is the more iconic and natural reference for a training montage, while Dizzee Rascal gives the music reference a recognisably London feel. Fighting with My Family is familiar but does not evoke workout montages as immediately.
- **Fitness class, tokyo** (prefers baseline): Hajime no Ippo is a widely recognised boxing reference and reads naturally in this phrasing, while “Tomorrow’s Joe” is an unnatural rendering of Ashita no Joe. AK-69 suitably preserves the original’s tough, workout-oriented rap association.
- **Fitness class, sao-paulo** (prefers tie): Both use familiar Brazilian references, but A preserves the original’s boxing-film setup and pairs it with Karol Conka’s energetic musical image. B has stronger São Paulo resonance through Mano Brown, though the MMA film is a slightly weaker match for Rocky.
- **Retail banner, mumbai** (prefers baseline): DMart, Taj, and Blinkit are familiar Mumbai references that neatly convey value, premium service, and speed. “Big Bazaar Food-sized” sounds awkward and dated, while Swiggy is a less precise benchmark for rapid delivery.
- **Retail banner, sao-paulo** (prefers baseline): Atacadão, Fasano and Mercado Livre are all highly recognisable in São Paulo, and they convey discount scale, premium service and fast e-commerce delivery effectively. Angeloni is less familiar locally, while “Rede Angeloni-level” sounds less natural.
- **Retail banner, london** (prefers tie): Aldi is a more immediately recognisable shorthand for low prices, while John Lewis and Deliveroo clearly convey attentive service and speed. B&M is familiar but “B&M-sized savings” sounds less natural and less closely matches Costco’s value association.
- **Restaurant menu, tokyo** (prefers baseline): Fairycake Fair is a closer match for a distinctive cupcake bakery, and Ichiko Aoba carries a suitably intimate indie-folk association. B also reads more naturally in English, though Shibuya Sky is not quite the same kind of reference as the High Line.
- **Restaurant menu, london** (prefers baseline): Lola’s is a direct, well-known London cupcake equivalent, while GAIL’s is recognisable but not especially associated with cupcakes. Ben Howard and the Sky Garden also match the original references’ indie-folk and iconic-view roles naturally.
- **Global brands only, tokyo** (prefers transcreate): iPhone and Google Calendar are functional references that should remain unchanged, as in A. B's substitutions are familiar in Tokyo but alter product compatibility and functionality.
- **Global brands only, mumbai** (prefers transcreate): A correctly preserves the functional product references and reads naturally in Mumbai. B improperly changes compatibility from iPhone and Google Calendar to Samsung Galaxy and Zoho Calendar.
- **Invented brand, madrid** (prefers transcreate): Brindle & Pike appears to be an invented campaign brand and should remain unchanged. Pan.Delirio is recognisable in Madrid, but substituting it changes the campaign reference.
- **Invented brand, sao-paulo** (prefers transcreate): Brindle & Pike is an established invented brand from the previous campaign and should remain unchanged. B needlessly replaces it with a generic, awkwardly mixed-language bakery name.

## What this does not show

- That native readers prefer these rewrites. A review form for native speakers in each city is the next step.
- Quality in other cities: only the five launch markets are supported, by design.
- Stability: model steps (extraction, proposals, decisions) can vary between runs; the Qloo engine itself is deterministic.
