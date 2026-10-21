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
| Supported choices, in-run (9 briefs, 36 choices) | 6 | 17 |
| Mean plan score, in-run (app-defined, 0–100) | 59 | 73 |
| **Supported choices, held-out anchors** (8 briefs, 32 choices) | **3** | **11** |
| Mean plan score, held-out anchors | 58 | 71 |
| Briefs where held-out support rose / fell | – | 5 / 0 |
| Draft choices not found in Qloo at all | 6 of 36 | – |

### Blind judge

9 pairs. Prefers the agent's plan in **0**, the draft in **7**, tie in **2**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.8 | 4.2 |
| specificity | 4.9 | 4.7 |
| coherence | 4.9 | 4.1 |
| constraints | 4.8 | 4.4 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 8 of 24; judge agent 0 / draft 5 / tie 1.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Judge | Stopped |
|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Vans → PLACES+FACES; CASisDEAD → slowthai | 0 → 2 | 0 → 2 | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Understated Tokyo utility with modular skate details and community-first energy → Playful industrial utility for Tokyo skate culture | 1 → 2 | 1 → 1 | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | none | 0 → 0 | – | tie | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Jordan Rakei → London Grammar; HAY → Acne Studios | 1 → 3 | 0 → 2 | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Sanrio → GU | 1 → 2 | 0 → 1 | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | High-energy urban performance aesthetic with technical details, inclusive casting and São Paulo street textures → Dynamic, sleek, inclusive technical performance | 1 → 2 | 1 → 2 | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | none | 0 → 0 | 0 → 0 | tie | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | María José Llergo → Carlos Sadness | 2 → 3 | 1 → 1 | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | Divine → Badshah; antiSOCIAL Lower Parel → The Habitat; Bold Mumbai street culture, gritty textures, local swagger → Bold homegrown color, texture, and pride | 0 → 3 | 0 → 2 | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | CASisDEAD | slowthai | weak → supported |
| Collaboration brand | Vans | PLACES+FACES | no support → supported |
| Pop-up venue | Village Underground | (same) | weak → weak |
| Creative direction | Understated industrial utility with raw, community-led skate energy | (same) | weak → weak |

Judge: _CASisDEAD brings stronger London specificity and fits the understated industrial direction, while Vans is relevant to skate culture despite being a generic global choice. Plan A’s PLACES+FACES collaboration is locally sharp, but slowthai is less rooted in East London and introduces reputational risk._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Wtaps, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Stuts | (same) | weak → weak |
| Collaboration brand | Asics | (same) | weak → weak |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Understated Tokyo utility with modular skate details and community-first energy | Playful industrial utility for Tokyo skate culture | weak → weak |

Judge: _Both use credible Tokyo-relevant choices, but B’s modular, community-first direction more precisely unifies the collaboration and pop-up around the brand’s understated, utilitarian attributes._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: –.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | – |
| Collaboration brand | ÖUS | (same) | – |
| Pop-up venue | Pista de Skate do Anhangabaú | (same) | – |
| Creative direction | Vivid DIY graphics, raw concrete energy and rebellious community pride | (same) | – |

Judge: _The plans are identical, pairing a São Paulo music act and skate brand with a recognisable central skate venue and a coherent creative direction that fits the rebellious, community-led, colourful brief._

Note: held-out anchors not found: Santa Cruz Skateboards

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Jordan Rakei | London Grammar | weak → supported |
| Collaboration brand | HAY | Acne Studios | weak → supported |
| Pop-up venue | Protein Studios Shoreditch | (same) | weak → weak |
| Creative direction | Calm modernism, tactile materials and crafted restraint | (same) | weak → weak |

Judge: _Jordan Rakei’s London-rooted, soulful sound better suits an intimate craft-coffee launch, while HAY aligns naturally with the calm, minimal direction. Plan A is polished but leans more toward globally familiar fashion and music choices than a distinctive London café scene._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Sanrio | GU | no support → supported |
| Pop-up venue | Laforet Museum Harajuku | (same) | unresolved → unresolved |
| Creative direction | pastel-clean skincare laboratory with playful kawaii accents | (same) | weak → weak |

Judge: _Both plans are concrete and distinctly Tokyo-focused, but B’s Sanrio collaboration directly matches the audience’s interests and strengthens the playful kawaii direction more cohesively than GU._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DJ Marky | (same) | weak → weak |
| Collaboration brand | Oakley | (same) | supported → supported |
| Pop-up venue | Casa das Caldeiras | (same) | weak → weak |
| Creative direction | High-energy urban performance aesthetic with technical details, inclusive casting and São Paulo street textures | Dynamic, sleek, inclusive technical performance | weak → supported |

Judge: _Both use credible São Paulo choices, but B creates a more locally textured, cohesive performance aesthetic; neither identifies the required ambassador or clearly defines the run-club event._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Ginebras | (same) | weak → weak |
| Collaboration brand | Mondo Sonoro | (same) | unresolved → unresolved |
| Pop-up venue | Sala El Sol | (same) | unresolved → unresolved |
| Creative direction | Warm neighbourhood energy, analogue gig-poster graphics and an unpretentious Madrid bar atmosphere | (same) | weak → weak |

Judge: _The plans are identical and use highly relevant Madrid indie references, with a concrete venue, partner, act, and cohesive creative direction that fits the brand._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | María José Llergo | Carlos Sadness | no support → weak |
| Collaboration brand | Camper | (same) | weak → weak |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Sun-washed Mediterranean minimalism; honest, tactile and modern | (same) | weak → weak |

Judge: _María José Llergo offers a stronger bridge to Rosalía’s audience and gives the Mediterranean direction a more contemporary Spanish cultural edge. Camper and Matadero Madrid are concrete, coherent choices that respect the sustainability constraint._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Divine | Badshah | no support → supported |
| Collaboration brand | almost gods | (same) | unresolved → unresolved |
| Pop-up venue | antiSOCIAL Lower Parel | The Habitat | no support → supported |
| Creative direction | Bold Mumbai street culture, gritty textures, local swagger | Bold homegrown color, texture, and pride | weak → weak |

Judge: _B tightly connects DIVINE, antiSOCIAL Lower Parel, and gritty Mumbai street culture for a credible homegrown launch. A is usable but Badshah and the broader creative direction feel less distinctly Mumbai._

## Cost

Mean 53 s per brief, 191 Qloo calls (counted before the cache), 5.1 model calls. Repair rounds used: 2, 1, 0, 2, 1, 1, 0, 1, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- The judge is a model, not people from these cities. No human review was run.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
