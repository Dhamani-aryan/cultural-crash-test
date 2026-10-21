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
| Found in Qloo at all | 50 / 50 (100%) | 68 / 81 (84%) |
| In the city's own taste list for its kind | 49 / 50 (98%) | 31 / 81 (38%) |
| Of foreign origin (another country's brand, artist or show) | 0 / 50 (0%) | 1 / 81 (1%) |
| Also in a US city's list (an American would know it too) | 1 / 50 (2%) | 3 / 81 (4%) |
| Known everywhere (in 2+ other cities' lists, or a global superstar) | 1 / 50 (2%) | 4 / 81 (5%) |
| **Passes every locality check** | 48 / 50 (96%) | 28 / 81 (35%) |
| Mean role overlap with the original (tag Jaccard) | 0.14 | 0.12 |

## 2. Blind judge

A model judge, playing a resident of each city, sees the original and both rewrites as A and B in a per-case random order, scores each and states a preference. **Caveat:** the judge is the same model family as the "model alone" condition, so if anything it is biased towards that side's choices. This is a check on readability and fit, not a substitute for native reviewers.

Judged market outputs: 33. Preferred: **Transcreate 7**, model alone 26, tie 0.

| Mean score (1–5) | Transcreate | Model alone |
|---|---|---|
| Recognisable to locals | 4.0 | 4.6 |
| Same job as the original | 3.5 | 4.2 |
| Reads naturally | 3.4 | 4.4 |

| Split | Markets | Transcreate preferred | Model alone preferred | Tie |
|---|---|---|---|---|
| Dev (tuned on) | 9 | 1 | 8 | 0 |
| Held out | 24 | 6 | 18 | 0 |

## 3. Behaviour checks

Deterministic expectations: global functional references stay (iPhone, Google Calendar), invented names stay, a text with no references comes back unchanged, no film swaps where Qloo's film data for the city is too thin (London), every chosen name appears in the output, and no rewrite needed the fallback.

**86 / 88** deterministic checks passed.

| Case | Market | Check | Result |
|---|---|---|---|
| Newsletter | mumbai | every chosen name is in the text | The Local train |
| Retail banner | mumbai | keeps Amazon | removed or changed |

## 4. Technical

| Metric | Result |
|---|---|
| Cases completed | 13 / 13 |
| Market outputs | 35 |
| References found in Qloo | 26 / 28 |
| Decisions: swap / keep / flag | 50 / 20 / 9 |
| Agent searched another kind of culture | 0 times |
| Rewrites that needed the substitution fallback | 0 |
| Mean time per case (live, 2–3 markets + comparison) | 53 s |
| Mean Qloo calls per case | 331 |

## Per market

✗ marks a pick that fails at least one locality check; "not in Qloo" means Qloo has no entity by that name.

| Case | Market | Transcreate | Model alone | Judge prefers |
|---|---|---|---|---|
| Startup pitch (dev) | tokyo | Peloton → Lean Body; Glossier → Ettusais; Chipotle → Matsuya Foods | Peloton → SOELU ✗not in Qloo; Glossier → SHIRO ✗; Chipotle → Sukiya ✗ | baseline |
| Startup pitch (dev) | mumbai | Peloton → HealthifyMe; Chipotle → Café Coffee Day (kept Glossier) | Peloton → cult.fit ✗; Glossier → Nykaa; Chipotle → Faasos ✗ | baseline |
| Startup pitch (dev) | london | Peloton → Fiit; Chipotle → Tortilla (kept Glossier) | Peloton → Fiit; Glossier → Beauty Pie; Chipotle → Pret ✗ | transcreate |
| TV ad script (dev) | madrid | Trader Joe's → Mercadona; Times Square → Puerta del Sol (kept The Office) | The Office → Aquí no hay quien viva ✗; Trader Joe's → Mercadona; Times Square → Puerta del Sol | baseline |
| TV ad script (dev) | sao-paulo | Trader Joe's → Sadia (kept The Office; flagged Times Square) | The Office → A Grande Família ✗; Trader Joe's → Pão de Açúcar; Times Square → Avenida Paulista ✗not in Qloo | baseline |
| TV ad script (dev) | london | The Office → People Just Do Nothing; Trader Joe's → Marks & Spencer; Times Square → Brixton Market | The Office → Peep Show ✗; Trader Joe's → Tesco; Times Square → Leicester Square ✗ | baseline |
| Product page (dev) | tokyo | Central Park → Hibiya Park; Whole Foods → Seijo Ishii (kept Taylor Swift) | Central Park → Yoyogi Park ✗; Taylor Swift → Hikaru Utada ✗not in Qloo; Whole Foods → Seijo Ishii | baseline |
| Product page (dev) | sao-paulo | Central Park → Ibirapuera Park; Taylor Swift → Gloria Groove; Whole Foods → St Marche | Central Park → Ibirapuera Park; Taylor Swift → Anitta ✗; Whole Foods → Pão de Açúcar | baseline |
| Product page (dev) | madrid | Central Park → Temple of Debod; Taylor Swift → Aitana; Whole Foods → Lidl | Central Park → El Retiro ✗; Taylor Swift → Rosalía; Whole Foods → Mercadona | baseline |
| Newsletter | mumbai | Olivia Rodrigo → The Local train; Saturday Night Live → Zee Comedy Show; Target → Shoppers Stop | Olivia Rodrigo → Dhvani Bhanushali ✗; Saturday Night Live → The Kapil Sharma Show ✗; Target → DMart ✗ | baseline |
| Newsletter | madrid | Olivia Rodrigo → Aitana; Saturday Night Live → Late Motiv de Andreu Buenafuente; Target → Mercadona | Olivia Rodrigo → Aitana; Saturday Night Live → La Resistencia; Target → El Corte Inglés | baseline |
| Newsletter | sao-paulo | Olivia Rodrigo → DUDA BEAT; Saturday Night Live → LOL: Last One Laughing Brazil; Target → Outlet Premium São Paulo | Olivia Rodrigo → Luísa Sonza ✗; Saturday Night Live → The Noite ✗; Target → Magazine Luiza ✗not in Qloo | baseline |
| Social post | london | Dunkin' → Pret A Manger ✗ (kept Starbucks) | Dunkin' → Greggs; Starbucks → Costa ✗ | baseline |
| Social post | tokyo | Dunkin' → Mister Donut (kept Starbucks) | Dunkin' → Doutor ✗; Starbucks → Excelsior Caffé ✗not in Qloo | baseline |
| Social post | mumbai | Dunkin' → Café Coffee Day (kept Starbucks) | Dunkin' → Café Coffee Day; Starbucks → Barista ✗not in Qloo | transcreate |
| Travel app | tokyo | Hollywood Walk of Fame → Kaminarimon Gate (kept Shake Shack) | Hollywood Walk of Fame → Shibuya Crossing ✗; Shake Shack → Ichiran ✗ | baseline |
| Travel app | madrid | Hollywood Walk of Fame → Puerta del Sol; Shake Shack → Goiko | Hollywood Walk of Fame → Gran Vía; Shake Shack → Goiko | baseline |
| Travel app | london | Hollywood Walk of Fame → London Eye ✗ (kept Shake Shack) | Hollywood Walk of Fame → Leicester Square ✗; Shake Shack → Dishoom ✗ | baseline |
| Streaming promo | mumbai | Parks and Recreation → TVF Pitchers (kept Stranger Things) | Stranger Things → Ghoul; Parks and Recreation → Panchayat ✗ | baseline |
| Streaming promo | sao-paulo | Parks and Recreation → Run for Your Lives (kept Stranger Things) | Stranger Things → Invisible City ✗; Parks and Recreation → A Grande Família ✗ | baseline |
| Streaming promo | madrid | Parks and Recreation → The Countryside (kept Stranger Things) | Stranger Things → El Ministerio del Tiempo; Parks and Recreation → Paquita Salas | baseline |
| Fitness class | london | Eminem's → Stormzy (flagged Rocky) | Rocky → Chariots of Fire ✗; Eminem → Stormzy | transcreate |
| Fitness class | tokyo | — (kept Eminem's; flagged Rocky) | Rocky → Hajime no Ippo ✗not in Qloo; Eminem → AK-69 ✗ | baseline |
| Fitness class | sao-paulo | — (kept Eminem's; flagged Rocky) | Rocky → Mais Forte que o Mundo ✗; Eminem → Emicida | transcreate |
| Retail banner | mumbai | Costco → Big Bazaar Food; Nordstrom → Shoppers Stop; Amazon Prime → Swiggy | Costco → DMart ✗; Nordstrom → Taj ✗; Amazon Prime → Blinkit ✗ | baseline |
| Retail banner | sao-paulo | Costco → Outlet Premium São Paulo; Nordstrom → Rede Angeloni (kept Amazon Prime) | Costco → Assaí ✗not in Qloo; Nordstrom → Fasano ✗not in Qloo; Amazon Prime → Mercado Livre ✗ | baseline |
| Retail banner | london | Nordstrom → Marks & Spencer (kept Amazon Prime; flagged Costco) | Costco → Aldi ✗; Nordstrom → John Lewis ✗; Amazon Prime → Argos ✗ | transcreate |
| Restaurant menu | tokyo | the High Line → Shibuya Sky (kept Magnolia Bakery, Bon Iver) | Magnolia Bakery → Fairycake Fair ✗not in Qloo; Bon Iver → Ichiko Aoba ✗; High Line → Shibuya Sky | baseline |
| Restaurant menu | london | Bon Iver → Lianne La Havas; the High Line → The Garden at 120 (kept Magnolia Bakery) | Magnolia Bakery → Hummingbird Bakery ✗not in Qloo; Bon Iver → Ben Howard ✗; High Line → Sky Garden ✗ | baseline |
| No references | london | — | — | — |
| No references | madrid | — | — | — |
| Global brands only | tokyo | — (flagged iPhone, Google Calendar) | iPhone → Xperia ✗not in Qloo; Google Calendar → TimeTree | transcreate |
| Global brands only | mumbai | — (flagged iPhone, Google Calendar) | iPhone → OnePlus; Google Calendar → Zoho Calendar ✗not in Qloo | transcreate |
| Invented brand | madrid | — | Brindle & Pike → Pan.Delirio | baseline |
| Invented brand | sao-paulo | — | Brindle & Pike → A Padeira ✗ | baseline |

## Judge's reasons

- **Startup pitch, tokyo** (prefers baseline): SOELU, SHIRO, and Sukiya are familiar Tokyo references that closely match the original's sleek fitness, stylish beauty, and habitual fast-casual roles. “Matsuya Foods habit” sounds unnatural, and Ettusais is a weaker branding analogue.
- **Startup pitch, mumbai** (prefers baseline): B uses widely known Mumbai references and better preserves the original contrasts: cult.fit suggests a polished fitness subscription, Nykaa conveys beauty-led branding, and Faasos matches a recurring fast-food habit.
- **Startup pitch, london** (prefers transcreate): Tortilla closely matches Chipotle as a casual burrito habit, while Glossier preserves the original premium, design-led branding reference. B feels slightly more London-specific, but Beauty Pie and Pret are less exact functional matches.
- **TV ad script, madrid** (prefers baseline): “Aquí no hay quien viva” is an iconic, nostalgic Madrid-friendly substitute for a comfort rewatch, while Mercadona and Puerta del Sol are familiar and functionally apt. B is understandable, but retaining “The Office” makes it feel less locally tailored.
- **TV ad script, sao-paulo** (prefers baseline): A uses familiar São Paulo references that preserve the cosy sitcom-night and busy-landmark contrasts. B’s Sadia pizza is recognisable, but the unchanged US references make it feel much less locally written.
- **TV ad script, london** (prefers baseline): Peep Show, Tesco and Leicester Square are instantly familiar London references, with Leicester Square closely matching Times Square’s tourist-heavy connotation. B sounds plausible, but M&S is more premium than Trader Joe’s and Brixton Market is less equivalent to Times Square.
- **Product page, tokyo** (prefers baseline): Yoyogi Park is more strongly associated with casual picnics, and Hikaru Utada is a natural local counterpart to Taylor Swift. Seijo Ishii is recognisable as an upscale grocer, though its tote is less iconic than Whole Foods’.
- **Product page, sao-paulo** (prefers baseline): Both use familiar São Paulo references, but Anitta is a closer match for Taylor Swift’s mainstream pop-star role. St Marche better matches Whole Foods’ premium positioning, though Pão de Açúcar is more universally recognisable and reads more naturally.
- **Product page, madrid** (prefers baseline): El Retiro is Madrid’s clearest equivalent to Central Park, and Rosalía better matches Taylor Swift’s star power. Neither supermarket fully captures Whole Foods’ premium image, but Mercadona is a closer fit than discount-focused Lidl.
- **Newsletter, mumbai** (prefers baseline): Dhvani Bhanushali, The Kapil Sharma Show, and DMart are widely familiar in Mumbai, and DMart closely matches Target’s mass-market role. B’s references are less universally recognisable, while Shoppers Stop feels more premium than Target.
- **Newsletter, madrid** (prefers baseline): Aitana and La Resistencia are highly recognisable, and their pairing sounds natural for Madrid. El Corte Inglés is more premium than Target, but Mercadona is primarily a supermarket and “Late Motiv de Andreu Buenafuente” feels clunky.
- **Newsletter, sao-paulo** (prefers baseline): A uses widely familiar references and Magazine Luiza is a reasonable mass-market counterpart to Target, though The Noite is not quite equivalent to SNL. B’s comedy-show and premium-outlet references miss the original’s iconic-party and everyday-shopping connotations.
- **Social post, london** (prefers baseline): Both versions use familiar London high-street brands, but Greggs better matches Dunkin’s affordable, no-fuss character, while Costa is a natural substitute for Starbucks.
- **Social post, tokyo** (prefers baseline): Doutor naturally conveys an affordable, unfussy, ubiquitous coffee stop in Tokyo, while Excelsior Caffé is also familiar. Mister Donut is highly recognisable, but it is less strongly associated with everyday coffee and early-opening convenience.
- **Social post, mumbai** (prefers transcreate): Café Coffee Day and Starbucks are highly recognisable in Mumbai, and their mainstream-versus-premium contrast broadly matches the original. Barista is familiar but less ubiquitous and current, making B’s comparison less effective.
- **Travel app, tokyo** (prefers baseline): Shibuya Crossing is a strong equivalent to the touristy Hollywood landmark, while Ichiran is a locally familiar reference known for long food queues. A is understandable, but keeping Shake Shack makes it feel less naturally adapted for Tokyo.
- **Travel app, madrid** (prefers baseline): Both references are widely known in Madrid, but Gran Vía better matches the Walk of Fame’s entertainment-district connotations. “A Goiko line” is understandable but not a particularly natural or iconic Madrid comparison.
- **Travel app, london** (prefers baseline): Leicester Square and Dishoom are highly recognisable London references, and Dishoom’s famously long queues preserve the original image of popular, sought-after food. A is understandable, but retaining Shake Shack makes it feel less specifically London.
- **Streaming promo, mumbai** (prefers baseline): Panchayat closely matches the warm, comic public-service feel of Parks and Recreation, while Ghoul supplies the eerie contrast, though it is darker than Stranger Things. The fully Indian pairing feels more naturally tailored to Mumbai readers.
- **Streaming promo, sao-paulo** (prefers baseline): Invisible City and A Grande Família are widely recognisable Brazilian references that preserve the supernatural-plus-warm-comedy contrast. “Run for Your Lives” is obscure and does not clearly fill the Parks and Recreation role.
- **Streaming promo, madrid** (prefers baseline): El Ministerio del Tiempo and Paquita Salas are highly recognisable Spanish series and preserve the original mix of supernatural weirdness and warm comedy. “The Countryside” is not a recognisable equivalent to Parks and Recreation and sounds like a mistranslation.
- **Fitness class, london** (prefers transcreate): Both references are widely recognisable in London, and Stormzy is a natural local substitute for Eminem. B works better because Rocky carries the same intense gym-training connotation, whereas Chariots of Fire suggests more stately endurance running.
- **Fitness class, tokyo** (prefers baseline): Hajime no Ippo is an iconic Japanese boxing reference, while AK-69 credibly supplies the hard-edged workout-music association. The pairing feels more locally tailored to Tokyo without changing the original’s energetic tone.
- **Fitness class, sao-paulo** (prefers transcreate): Rocky and Eminem are widely recognisable in São Paulo and strongly evoke intense training. The Brazilian substitutions are relevant, but neither is as iconic or as closely associated with workout culture.
- **Retail banner, mumbai** (prefers baseline): DMart, Taj, and Blinkit are highly recognisable in Mumbai, and the line reads naturally, though Taj is not the same kind of retailer as Nordstrom. A preserves the department-store comparison better, but “Big Bazaar Food-sized” sounds awkward and dated.
- **Retail banner, sao-paulo** (prefers baseline): Assaí, Fasano, and Mercado Livre are familiar in São Paulo and clearly convey discount scale, premium service, and fast delivery. B feels less local and less natural, especially because Angeloni has limited relevance in São Paulo and “Outlet Premium São Paulo-scale savings” is awkward.
- **Retail banner, london** (prefers transcreate): A preserves the original contrasts better: Costco still suggests scale and Amazon Prime is synonymous with fast delivery, though Marks & Spencer is not a perfect Nordstrom equivalent. B is locally familiar, but Aldi lacks the bulk-size association and Argos is a weaker benchmark for delivery speed.
- **Restaurant menu, tokyo** (prefers baseline): B’s Fairycake Fair and Ichiko Aoba are credible Tokyo-facing equivalents with similarly boutique and mellow associations. A’s unchanged American references make it feel less locally written.
- **Restaurant menu, london** (prefers baseline): A uses familiar London references throughout, with Hummingbird Bakery and Sky Garden neatly matching the original’s trendy, scenic tone. B’s Garden at 120 fits well, but Magnolia Bakery feels imported and less locally natural.
- **Global brands only, tokyo** (prefers transcreate): Both versions use familiar products and read naturally in Tokyo, but iPhone and Google Calendar are more universally recognisable and preserve the original references exactly.
- **Global brands only, mumbai** (prefers transcreate): iPhone and Google Calendar are widely recognised in Mumbai and pair naturally. OnePlus is familiar, but Zoho Calendar is less mainstream and weakens the reference.
- **Invented brand, madrid** (prefers baseline): Pan.Delirio is a well-known Madrid artisan bakery and feels like a natural local substitution, though “tiny” is not entirely accurate given its multiple locations. Brindle & Pike has no clear local recognition.
- **Invented brand, sao-paulo** (prefers baseline): A Padeira sounds plausibly local and preserves the image of a small bakery, though it is not a broadly recognisable São Paulo reference. Brindle & Pike feels unfamiliar and distinctly less natural for the city.

## What this does not show

- That native readers prefer these rewrites. A review form for native speakers in each city is the next step.
- Quality in other cities: only the five launch markets are supported, by design.
- Stability: model steps (extraction, proposals, decisions) can vary between runs; the Qloo engine itself is deterministic.
