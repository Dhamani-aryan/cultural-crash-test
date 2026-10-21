# Evaluation

**Run:** 2026-10-21 · **Briefs:** 9 (3 dev, 6 held out) across 5 cities · **Mode:** live Qloo and model calls, thorough depth (≤ 3 repair rounds, ≤ 700 Qloo calls)

Reproduce with `npm run live eval/run.ts`, then `npm run live eval/report.ts`. Raw outputs stay in the git-ignored `eval/out/` (they contain Qloo-derived data). The briefs are in [`eval/cases.ts`](../eval/cases.ts). Launching brands are fictional; audience anchors are real.

## What is compared

| Condition | What it is |
|---|---|
| **LLM-only draft** | The model's first plan from the brief alone, with no Qloo data. It is the agent's own first step, so both conditions share the same model, brief and constraints. |
| **Agent** | The plan after the crash-test loop: resolve in Qloo, test every choice, repair the weakest, re-test, stop on acceptance, stall or budget. |

Three measurements, from least to most independent:

1. **In-run scores.** Both plans as the agent's evaluator scored them during the run. The agent optimises exactly this, so a gain here shows the loop does what it claims. It does **not** show the plan is better.
2. **Held-out anchors.** Both plans re-scored by the same rubric, but with a *different* set of brands or artists standing for the same audience (for example Patta, A-Cold-Wall and Skepta instead of Stüssy, Palace and Carhartt). The agent never saw these anchors, so a gain here means the improvement carries beyond the exact signal it optimised.
3. **Blind judge.** A model judge compares the two plans as A/B, in both orders. A preference counts only when both orders agree; otherwise it's a tie. The judge is the same model family that wrote the draft, so any self-preference bias favours the draft.

## Results

| Measure | LLM-only draft | Agent |
|---|---|---|
| Supported choices, in-run (9 briefs, 36 choices) | 5 | 13 |
| Mean plan score, in-run (app-defined, 0–100) | 59 | 73 |
| **Supported choices, held-out anchors** (8 briefs, 32 choices) | **6** | **10** |
| Mean plan score, held-out anchors | 57 | 71 |
| Briefs where held-out support rose / fell | – | 4 / 0 |
| Draft choices not found in Qloo at all | 8 of 36 | – |

### Blind judge

9 pairs. Prefers the agent's plan in **1**, the draft in **5**, tie in **3**. The two orders agreed on 8 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.8 | 4.4 |
| specificity | 5.0 | 5.0 |
| coherence | 4.9 | 4.3 |
| constraints | 4.9 | 4.8 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 4 → 8 of 24; judge agent 1 / draft 5 / tie 0.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Judge | Stopped |
|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | none | 0 → 0 | 0 → 0 | tie | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Keiju → YURUFUWA GANG | 1 → 1 | 2 → 2 | tie | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | none | 0 → 0 | – | tie | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | HAY → Le Labo Fragrances | 0 → 1 | 0 → 1 | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Sanrio → GU | 2 → 3 | 1 → 2 | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | Strava → Ironman Triathlon; High-energy urban performance, inclusive community spirit, technical precision → Dynamic, sleek, functional running for everyone | 0 → 2 | 1 → 2 | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | CARIÑO → Viva Suecia; Vans → Jimmy Lion | 1 → 2 | 1 → 1 | agent | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | JUDELINE → Carlos Sadness | 1 → 2 | 1 → 1 | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | Divine → Badshah; Bold Mumbai street culture, gritty gully energy, vivid graphics → Vibrant Mumbai motifs with bold homegrown energy | 0 → 2 | 0 → 1 | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wu-lu | (same) | weak → weak |
| Collaboration brand | Slam City Skates | (same) | unresolved → unresolved |
| Pop-up venue | The Truman Brewery | (same) | unresolved → unresolved |
| Creative direction | Understated industrial utility, DIY skate energy and community-first warmth | (same) | weak → weak |

Judge: _The plans are identical and combine credible London skate and music references with an appropriate East London venue and a coherent, understated community-led direction._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Wtaps, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Keiju | YURUFUWA GANG | weak → weak |
| Collaboration brand | Asics | (same) | weak → weak |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Understated Tokyo utility with skate-documentary grit | (same) | supported → supported |

Judge: _Both plans are highly specific and Tokyo-relevant, but YURUFUWA GANG’s underground, community-oriented energy better complements the skate-documentary grit and understated utility positioning._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: –.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | – |
| Collaboration brand | ÖUS | (same) | – |
| Pop-up venue | Praça Roosevelt | (same) | – |
| Creative direction | Colour-saturated DIY skate energy; rebellious, raw and community-led | (same) | – |

Judge: _The plans are identical and use highly relevant São Paulo references that coherently support a colourful, rebellious, community-led skate launch._

Note: held-out anchors not found: Santa Cruz Skateboards

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Erland Cooper | (same) | weak → weak |
| Collaboration brand | HAY | Le Labo Fragrances | weak → supported |
| Pop-up venue | Protein Studios Shoreditch | (same) | weak → weak |
| Creative direction | Quiet modernism, tactile materials and warm minimalism | (same) | weak → weak |

Judge: _Both plans feel credible for design-minded London coffee drinkers, with Erland Cooper and Protein Studios reinforcing a calm, crafted launch. HAY connects more naturally than Le Labo to the café’s tactile, warm-minimal design direction._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Sanrio | GU | no support → supported |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Soft, playful futurism with translucent pastels and clean clinical details | (same) | weak → weak |

Judge: _Both are concrete, Tokyo-relevant plans, but Sanrio directly reflects the audience’s stated interests and strengthens the playful skincare concept more than GU._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | weak → weak |
| Collaboration brand | Strava | Ironman Triathlon | supported → supported |
| Pop-up venue | Casa das Caldeiras | (same) | weak → weak |
| Creative direction | High-energy urban performance, inclusive community spirit, technical precision | Dynamic, sleek, functional running for everyone | weak → supported |

Judge: _Both plans use strong São Paulo choices, but B’s Strava collaboration directly matches the audience and creates a more coherent urban run-club launch. Ironman makes A feel more endurance-event focused than inclusive city-running focused._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | CARIÑO | Viva Suecia | no support → weak |
| Collaboration brand | Vans | Jimmy Lion | no support → weak |
| Pop-up venue | Sala El Sol | (same) | unresolved → unresolved |
| Creative direction | Warm neighborhood energy, analog gig-poster graphics, relaxed and unpretentious | (same) | supported → supported |

Judge: _Viva Suecia and Madrid-born Jimmy Lion align closely with the audience’s Spanish indie tastes and the local, approachable positioning. B is cohesive, but Vans feels more like a generic global default._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Carlos Sadness | weak → weak |
| Collaboration brand | Thinking MU | (same) | unresolved → unresolved |
| Pop-up venue | La Casa Encendida | (same) | supported → supported |
| Creative direction | Sun-washed Mediterranean minimalism; tactile, transparent and optimistic | (same) | weak → weak |

Judge: _Both plans pair a credible sustainable Spanish collaborator with a well-known Madrid cultural venue and a coherent Mediterranean direction. JUDELINE gives B a more current, Rosalía-adjacent cultural edge for Madrid’s 20–35 audience._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Divine | Badshah | no support → supported |
| Collaboration brand | Almost Gods | (same) | unresolved → unresolved |
| Pop-up venue | VegNonVeg Mumbai | (same) | unresolved → unresolved |
| Creative direction | Bold Mumbai street culture, gritty gully energy, vivid graphics | Vibrant Mumbai motifs with bold homegrown energy | weak → weak |

Judge: _B is more tightly rooted in Mumbai through DIVINE and its gully-focused creative direction, creating a more coherent fit for the stated audience. A is strong but Badshah feels broader and less distinctly Mumbai._

## Cost

Mean 54 s per brief, 201 Qloo calls (counted before the cache), 5.0 model calls. Repair rounds used: 0, 1, 0, 1, 1, 2, 2, 1, 2.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- The judge is a model, not people from these cities. No human review was run.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
