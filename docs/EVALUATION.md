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
| Found in Qloo at all | 70 / 70 (100%) | 64 / 81 (79%) |
| From the target country (origin, release or location) | 69 / 70 (99%) | 59 / 81 (73%) |
| In the city's own taste list for its kind | 38 / 70 (54%) | 25 / 81 (31%) |
| Of foreign origin (another country's brand, artist or show) | 0 / 70 (0%) | 1 / 81 (1%) |
| Also in a US city's list (an American would know it too) | 3 / 70 (4%) | 3 / 81 (4%) |
| Known everywhere (in 2+ other cities' lists, or a global superstar) | 5 / 70 (7%) | 4 / 81 (5%) |
| **Passes every locality check** | 70 / 70 (100%) | 59 / 81 (73%) |
| Mean role overlap with the original (tag Jaccard) | 0.15 | 0.12 |

## 2. Blind judge

A model judge, playing a resident of each city, sees the original and both rewrites as A and B in a per-case random order, scores each and states a preference. **Caveat:** the judge is the same model family as the "model alone" condition, so if anything it is biased towards that side's choices. This is a check on readability and fit, not a substitute for native reviewers.

Judged market outputs: 33. Preferred: **Transcreate 7**, model alone 23, tie 3.

| Mean score (1–5) | Transcreate | Model alone |
|---|---|---|
| Recognisable to locals | 4.3 | 4.8 |
| Same job as the original | 3.7 | 4.4 |
| Reads naturally | 3.7 | 4.4 |

| Split | Markets | Transcreate preferred | Model alone preferred | Tie |
|---|---|---|---|---|
| Dev (tuned on) | 9 | 1 | 7 | 1 |
| Held out | 24 | 6 | 16 | 2 |

## 3. Behaviour checks

Deterministic expectations: global functional references stay (iPhone, Google Calendar), invented names stay, a text with no references comes back unchanged, no film swaps where Qloo's film data for the city is too thin (London), every chosen name appears in the output, and no rewrite needed the fallback.

**73 / 82** deterministic checks passed.

| Case | Market | Check | Result |
|---|---|---|---|
| TV ad script | madrid | every chosen name is in the text | No One Could Live Here |
| TV ad script | sao-paulo | every chosen name is in the text | Big Family |
| Newsletter | mumbai | every chosen name is in the text | The Local train |
| Newsletter | sao-paulo | every chosen name is in the text | Lojas Americanas |
| Travel app | tokyo | every chosen name is in the text | CLINTON ST. BAKING COMPANY |
| Streaming promo | sao-paulo | every chosen name is in the text | Invisible City, Big Family |
| Fitness class | tokyo | every chosen name is in the text | Tomorrow's Joe |
| Retail banner | sao-paulo | every chosen name is in the text | Rappi Brasil |
| Retail banner | london | every chosen name is in the text | B & M |

## 4. Technical

| Metric | Result |
|---|---|
| Cases completed | 13 / 13 |
| Market outputs | 35 |
| References found in Qloo | 26 / 28 |
| Decisions: swap / keep / flag | 70 / 1 / 8 |
| Agent searched another kind of culture | 1 times |
| Rewrites that needed the substitution fallback | 0 |
| Mean time per case (live, 2–3 markets + comparison) | 57 s |
| Mean Qloo calls per case | 282 |

## Per market

✗ marks a pick that fails at least one locality check; "not in Qloo" means Qloo has no entity by that name.

| Case | Market | Transcreate | Model alone | Judge prefers |
|---|---|---|---|---|
| Startup pitch (dev) | tokyo | Peloton → Lean Body; Glossier → Ettusais; Chipotle → Matsuya Foods | Peloton → SOELU ✗not in Qloo; Glossier → SHIRO ✗; Chipotle → Sukiya ✗ | baseline |
| Startup pitch (dev) | mumbai | Peloton → HealthifyMe; Glossier → Nykaa; Chipotle → Café Coffee Day | Peloton → Cult.fit; Glossier → Nykaa; Chipotle → Chaayos | baseline |
| Startup pitch (dev) | london | Glossier → Oliver Bonas; Chipotle → Pret A Manger (flagged Peloton) | Peloton → Fiit; Glossier → Beauty Pie; Chipotle → Pret | baseline |
| TV ad script (dev) | madrid | The Office → No One Could Live Here; Trader Joe's → Mercadona; Times Square → Puerta del Sol | The Office → Aquí no hay quien viva; Trader Joe's → Mercadona; Times Square → Puerta del Sol | tie |
| TV ad script (dev) | sao-paulo | The Office → Big Family; Trader Joe's → Sadia; Times Square → Beco do Batman | The Office → A Grande Família; Trader Joe's → Pão de Açúcar; Times Square → Avenida Paulista ✗not in Qloo | baseline |
| TV ad script (dev) | london | The Office → Gavin & Stacey; Trader Joe's → Lidl; Times Square → Leicester Square | The Office → Peep Show; Trader Joe's → Tesco; Times Square → Leicester Square | baseline |
| Product page (dev) | tokyo | Central Park → Hibiya Park; Taylor Swift → yoasobi; Whole Foods → Seijo Ishii | Central Park → Yoyogi Park; Taylor Swift → Hikaru Utada ✗not in Qloo; Whole Foods → Seijo Ishii | baseline |
| Product page (dev) | sao-paulo | Central Park → Ibirapuera Park; Taylor Swift → Anitta; Whole Foods → St Marche | Central Park → Ibirapuera Park; Taylor Swift → Anitta; Whole Foods → Casa Santa Luzia ✗not in Qloo | transcreate |
| Product page (dev) | madrid | Central Park → Temple of Debod; Taylor Swift → Aitana (flagged Whole Foods) | Central Park → El Retiro ✗; Taylor Swift → Rosalía; Whole Foods → Sánchez Romero | baseline |
| Newsletter | mumbai | Olivia Rodrigo → The Local train; Saturday Night Live → Koffee with Karan; Target → Shoppers Stop | Olivia Rodrigo → Dhvani Bhanushali; Saturday Night Live → The Kapil Sharma Show; Target → DMart | baseline |
| Newsletter | madrid | Olivia Rodrigo → Amaia; Saturday Night Live → La Revuelta; Target → Hipercor | Olivia Rodrigo → Aitana; Saturday Night Live → La Revuelta; Target → El Corte Inglés | transcreate |
| Newsletter | sao-paulo | Olivia Rodrigo → Manu Gavassi; Saturday Night Live → Altas Horas; Target → Lojas Americanas | Olivia Rodrigo → Luísa Sonza; Saturday Night Live → Altas Horas; Target → Carrefour ✗ | baseline |
| Social post | london | Dunkin' → Greggs; Starbucks → Costa Coffee | Dunkin' → Greggs; Starbucks → Costa Coffee | tie |
| Social post | tokyo | Dunkin' → Mister Donut (kept Starbucks) | Dunkin' → Doutor Coffee ✗not in Qloo; Starbucks → Tully's Coffee ✗not in Qloo | baseline |
| Social post | mumbai | Dunkin' → Nescafé; Starbucks → Café Coffee Day | Dunkin' → Café Coffee Day; Starbucks → Barista ✗not in Qloo | baseline |
| Travel app | tokyo | Hollywood Walk of Fame → Kaminarimon Gate; Shake Shack → CLINTON ST. BAKING COMPANY | Hollywood Walk of Fame → Shibuya Crossing; Shake Shack → Ichiran ✗ | baseline |
| Travel app | madrid | Hollywood Walk of Fame → Puerta del Sol; Shake Shack → Goiko | Hollywood Walk of Fame → Plaza Mayor; Shake Shack → La Campana ✗not in Qloo | baseline |
| Travel app | london | Hollywood Walk of Fame → Leicester Square; Shake Shack → Dishoom | Hollywood Walk of Fame → Leicester Square; Shake Shack → Dishoom | transcreate |
| Streaming promo | mumbai | Stranger Things → Typewriter; Parks and Recreation → Panchayat | Stranger Things → Aahat; Parks and Recreation → Office Office | transcreate |
| Streaming promo | sao-paulo | Stranger Things → Invisible City; Parks and Recreation → Big Family | Stranger Things → Cidade Invisível; Parks and Recreation → A Grande Família | tie |
| Streaming promo | madrid | Stranger Things → Paraíso; Parks and Recreation → Camera café | Stranger Things → El Ministerio del Tiempo; Parks and Recreation → Aquí no hay quien viva | baseline |
| Fitness class | london | Eminem → Dizzee Rascal (flagged Rocky) | Rocky → Bend It Like Beckham; Eminem → Stormzy | transcreate |
| Fitness class | tokyo | Rocky → Tomorrow's Joe; Eminem → AK-69 | Rocky → Hajime no Ippo ✗not in Qloo; Eminem → AK-69 | baseline |
| Fitness class | sao-paulo | Rocky → 10 Segundos para Vencer; Eminem → Karol Conka | Rocky → Mais Forte que o Mundo; Eminem → Emicida | baseline |
| Retail banner | mumbai | Costco → Brand Factory; Nordstrom → Oberoi Hotels & Resorts; Amazon Prime → Swiggy | Costco → D-Mart ✗not in Qloo; Nordstrom → Taj; Amazon Prime → Blinkit | baseline |
| Retail banner | sao-paulo | Costco → Assaí Atacadista; Amazon Prime → Rappi Brasil (flagged Nordstrom) | Costco → Atacadão ✗not in Qloo; Nordstrom → Fasano ✗not in Qloo; Amazon Prime → Mercado Livre | baseline |
| Retail banner | london | Costco → B & M; Nordstrom → John Lewis; Amazon Prime → Argos | Costco → Aldi; Nordstrom → John Lewis; Amazon Prime → Deliveroo | baseline |
| Restaurant menu | tokyo | Magnolia Bakery → Ginza Cozy Corner; Bon Iver → 青葉市子; the High Line → Shibuya Sky | Magnolia Bakery → HARBS; Bon Iver → Ichiko Aoba; High Line → SHIBUYA SKY | baseline |
| Restaurant menu | london | Magnolia Bakery → GAIL's Bakery; Bon Iver → Ben Howard; the High Line → Sky Garden | Magnolia Bakery → Hummingbird Bakery ✗not in Qloo; Bon Iver → Ben Howard; High Line → Primrose Hill | baseline |
| No references | london | — | — | — |
| No references | madrid | — | — | — |
| Global brands only | tokyo | — (flagged iPhone, Google Calendar) | iPhone → Xperia ✗not in Qloo; Google Calendar → TimeTree | transcreate |
| Global brands only | mumbai | — (flagged iPhone, Google Calendar) | iPhone → Samsung Galaxy ✗not in Qloo; Google Calendar → Zoho Calendar ✗not in Qloo | transcreate |
| Invented brand | madrid | — | Brindle & Pike → Pan.Delirio | baseline |
| Invented brand | sao-paulo | — | Brindle & Pike → Padoca do Maní ✗not in Qloo | baseline |

## Judge's reasons

- **Startup pitch, tokyo** (prefers baseline): SOELU closely matches Peloton as a polished fitness subscription, while SHIRO and Sukiya neatly convey stylish branding and an everyday inexpensive food habit. A is less natural because “Matsuya Foods habit” uses the corporate name rather than the familiar “Matsuya.”
- **Startup pitch, mumbai** (prefers baseline): Cult.fit better matches Peloton’s sleek, premium fitness-subscription connotations, while Chaayos feels like a plausible recurring urban habit in Mumbai. HealthifyMe is recognisable but is more app-like and less aspirational.
- **Startup pitch, london** (prefers baseline): Beauty Pie and Pret closely preserve the polished beauty-brand and everyday lunch-habit comparisons, while “Pret” sounds naturally London. Fiit is less universally recognisable than Peloton, but it is still a credible local fitness-subscription analogue.
- **TV ad script, madrid** (prefers tie): The adaptations are identical, and Aquí no hay quien viva, Mercadona, and Puerta del Sol are highly recognisable Madrid references that closely match the original’s nostalgic, everyday, and crowded-city connotations.
- **TV ad script, sao-paulo** (prefers baseline): Pão de Açúcar closely matches Trader Joe’s as a grocery retailer, while Avenida Paulista better captures Times Square’s iconic big-city crowds. Sadia is a food brand rather than a store, and Beco do Batman is a smaller tourist spot.
- **TV ad script, london** (prefers baseline): A uses familiar London references and natural British phrasing, with Peep Show providing a fitting nostalgic comedy substitute. B is recognisable, but Lidl feels more overtly budget-oriented and “waiting in line” sounds less natural in London copy.
- **Product page, tokyo** (prefers baseline): Yoyogi Park is a more natural Tokyo picnic reference, while Seijo Ishii matches Whole Foods’ upscale-grocery connotation. A’s lowercase “yoasobi” looks unpolished, though YOASOBI is a closer contemporary-pop match for Taylor Swift.
- **Product page, sao-paulo** (prefers transcreate): Both use strong São Paulo references and preserve the upscale-grocery comparison, but St. Marche is more broadly recognisable across the city than Casa Santa Luzia.
- **Product page, madrid** (prefers baseline): El Retiro, Rosalía, and the upscale Sánchez Romero are all familiar and closely preserve the original references’ roles. B is plausible, but the Temple of Debod is less strongly associated with picnics, and Whole Foods feels unlocalized.
- **Newsletter, mumbai** (prefers baseline): A best preserves the youthful pop, mainstream entertainment, and affordable big-box-shopping associations, though “a The Kapil Sharma Show” is awkward. B reads more smoothly, but The Local Train and Shoppers Stop shift the tone toward indie music and more premium retail.
- **Newsletter, madrid** (prefers transcreate): Aitana is a closer mainstream-pop match for Olivia Rodrigo, but Hipercor better captures Target’s practical, mass-market shopping role than the more upscale El Corte Inglés. Amaia and La Revuelta are still highly recognisable and the line sounds natural in Madrid.
- **Newsletter, sao-paulo** (prefers baseline): Luísa Sonza better matches Olivia Rodrigo’s current pop-star energy, and Carrefour works more naturally than Americanas as a drive-to big-box destination. All references are widely recognisable in São Paulo.
- **Social post, london** (prefers tie): The adaptations are identical, and both Greggs and Costa Coffee are highly recognisable London references that preserve the original's accessible, no-fuss chain comparison.
- **Social post, tokyo** (prefers baseline): Doutor is a familiar, inexpensive, no-fuss coffee chain in Tokyo and fits the intended comparison well; Mister Donut is recognisable but is associated more with doughnuts than everyday coffee.
- **Social post, mumbai** (prefers baseline): Café Coffee Day and Barista are familiar Mumbai café chains, so B preserves the original chain-versus-chain comparison. A’s Nescafé reference and “ready early” wording do not naturally convey an unfussy café that opens early.
- **Travel app, tokyo** (prefers baseline): Shibuya Crossing and Ichiran are instantly recognisable Tokyo references, and the notorious Ichiran queue preserves the original joke naturally. A is plausible, but CLINTON ST. BAKING is less broadly familiar.
- **Travel app, madrid** (prefers baseline): Plaza Mayor and La Campana are highly recognisable, and La Campana’s famous, inexpensive takeaway sandwiches make its queue a strong street-food comparison. Goiko is well known, but its sit-down gourmet-burger positioning makes the analogy less apt.
- **Travel app, london** (prefers transcreate): Leicester Square and Dishoom are familiar London references with suitable touristy and popular-restaurant connotations; “queue” sounds naturally British, while “line” feels American.
- **Streaming promo, mumbai** (prefers transcreate): Typewriter and Panchayat closely preserve the supernatural-weird and warm-comedic contrast of the originals. Aahat and Office Office are highly familiar, but feel more dated and more horror-driven and cynical.
- **Streaming promo, sao-paulo** (prefers tie): The adaptations are identical, and both Brazilian series are widely recognisable; Cidade Invisível supplies the supernatural strangeness while A Grande Família brings warm ensemble comedy, though the unchanged English descriptors make the copy slightly less natural for São Paulo.
- **Streaming promo, madrid** (prefers baseline): El Ministerio del Tiempo and Aquí no hay quien viva are widely recognised and neatly reproduce the original mix of supernatural weirdness and warm ensemble comedy. Paraíso is less familiar, while Camera café is less cosy and character-driven.
- **Fitness class, london** (prefers transcreate): Both adaptations use references familiar to Londoners, but Rocky remains a much stronger fit for an intense training montage. Dizzee Rascal also preserves the original's energetic rap association while adding a clear London connection.
- **Fitness class, tokyo** (prefers baseline): Both boxing anime and AK-69 are familiar references in Tokyo, but Hajime no Ippo more directly evokes energetic training sequences, making it the closer match for Rocky.
- **Fitness class, sao-paulo** (prefers baseline): Emicida is strongly associated with São Paulo and feels like a natural local counterpart to Eminem, while Mais Forte que o Mundo preserves the motivational fight-film framing. A has the closer boxing reference, but Karol Conká feels less specifically local and less suited to the workout-playlist connotation.
- **Retail banner, mumbai** (prefers baseline): D-Mart, Taj, and Blinkit are instantly recognisable in Mumbai and closely match the original’s value, premium-service, and speed cues. Brand Factory feels less current, while Swiggy is a weaker benchmark for rapid delivery.
- **Retail banner, sao-paulo** (prefers baseline): A uses widely known São Paulo references and preserves the bargain, premium-service, and speedy-delivery contrasts, though Fasano is hospitality rather than retail. B leaves Nordstrom unexplained and “Assaí Atacadista-sized” sounds less natural.
- **Retail banner, london** (prefers baseline): Both are highly recognisable, but Aldi conveys broad, familiar savings more naturally, while Deliveroo is a clearer shorthand for very fast delivery than Argos.
- **Restaurant menu, tokyo** (prefers baseline): Both use familiar Tokyo references, but HARBS better matches Magnolia Bakery’s upscale café appeal, while Ichiko Aoba and SHIBUYA SKY read naturally in English. Ginza Cozy Corner feels more mass-market, and the Japanese-script artist name is awkward within the sentence.
- **Restaurant menu, london** (prefers baseline): Hummingbird Bakery is a strong London equivalent for cupcake-focused Magnolia, while GAIL's is familiar but not especially associated with cupcakes; both view references work, though Primrose Hill feels more naturally local.
- **Global brands only, tokyo** (prefers transcreate): Both versions use familiar services in Tokyo, but iPhone and Google Calendar are more universally recognisable and make B read more naturally.
- **Global brands only, mumbai** (prefers transcreate): iPhone and Google Calendar are widely recognised and commonly used in Mumbai. Samsung Galaxy is familiar, but Zoho Calendar is less mainstream and makes A feel less natural.
- **Invented brand, madrid** (prefers baseline): Pan.Delirio is a well-known Madrid artisan bakery and naturally replaces the fictional-sounding original while preserving its boutique appeal. Brindle & Pike is unlikely to mean anything to ordinary Madrid readers.
- **Invented brand, sao-paulo** (prefers baseline): Padoca do Maní is a recognisable São Paulo bakery with the boutique, campaign-friendly feel of the original, though calling it “tiny” is slightly awkward. Brindle & Pike has no evident local resonance and sounds imported.

## What this does not show

- That native readers prefer these rewrites. A review form for native speakers in each city is the next step.
- Quality in other cities: only the five launch markets are supported, by design.
- Stability: model steps (extraction, proposals, decisions) can vary between runs; the Qloo engine itself is deterministic.
