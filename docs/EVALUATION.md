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
| Supported choices, in-run (9 briefs, 36 choices) | 7 | 29 |
| Mean plan score, in-run (app-defined, 0–100) | 63 | 82 |
| **Supported choices, held-out anchors** (8 briefs, 32 choices) | **5** | **16** |
| Mean plan score, held-out anchors | 60 | 76 |
| Briefs where held-out support rose / fell | – | 6 / 0 |
| Draft choices not found in Qloo at all | 5 of 36 | – |

### Blind judge

9 pairs. Prefers the agent's plan in **0**, the draft in **9**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.9 | 3.6 |
| specificity | 4.8 | 4.6 |
| coherence | 4.9 | 3.4 |
| constraints | 4.8 | 3.8 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 10 of 24; judge agent 0 / draft 6 / tie 0.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Judge | Stopped |
|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Vans → PLACES+FACES; Nia Archives → slowthai; Understated industrial utility with DIY skate energy and a community-first tone → Understated industrial utility, oversized cuts, local skate collaborators | 1 → 4 | 1 → 4 | draft | Every adjustable choice is supported |
| tokyo-sneakers | Tokyo | dev | Asics → Undercover; Understated utility, Tokyo night textures, community skate energy → Playful industrial utility with community skate energy | 1 → 3 | 2 → 2 | draft | Further repairs stopped improving the plan |
| sao-paulo-skate | São Paulo | dev | ÖUS → Street League Skateboarding; Centro de Esportes Radicais → Pista De Skate Sumaré; Colour-saturated DIY skate graphics with rebellious, community-first energy → Bold-logo skate graphics with rebellious local-scene energy | 0 → 3 | – | draft | Reached the repair-round limit |
| london-coffee | London | heldout | HAY → Acne Studios; Protein Studios Shoreditch → Quo Vadis; Kelly Lee Owens → Jamie xx | 1 → 4 | 0 → 1 | draft | Every adjustable choice is supported |
| tokyo-skincare | Tokyo | heldout | Sanrio → Muji; ZeroBase Shibuya → Hilton Tokyo Bay; Wednesday Campanella → 宇多田ヒカル | 1 → 4 | 0 → 3 | draft | Every adjustable choice is supported |
| sao-paulo-running | São Paulo | heldout | Strava → Ironman Triathlon; High-energy urban performance lab with inclusive run-club warmth → Dynamic, welcoming performance built on technical function | 0 → 2 | 1 → 2 | draft | Reached the repair-round limit |
| madrid-beer | Madrid | heldout | CARIÑO → Miss Caffeina; Pompeii → Wallapop; Sala El Sol → Fundación Canal | 1 → 3 | 0 → 2 | draft | Reached the repair-round limit |
| madrid-sustainable | Madrid | heldout | María José Llergo → Carlos Sadness; Ecoalf → Mam Originals | 2 → 4 | 1 → 1 | draft | Every adjustable choice is supported |
| mumbai-sneakers | Mumbai | heldout | Divine → Raja Kumari; VegNonVeg → Skechers Factory Outlet - Dahisar, Mumbai; Norblack Norwhite → Koovs | 0 → 2 | 0 → 1 | draft | Reached the repair-round limit |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Nia Archives | slowthai | weak → supported |
| Collaboration brand | Vans | PLACES+FACES | no support → supported |
| Pop-up venue | Village Underground | (same) | supported → supported |
| Creative direction | Understated industrial utility with DIY skate energy and a community-first tone | Understated industrial utility, oversized cuts, local skate collaborators | weak → supported |

Judge: _B pairs a highly relevant London act and credible East London venue with a cohesive DIY, community-first skate direction; Vans is less locally distinctive than PLACES+FACES, but the overall launch is better aligned and lower-risk._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Wtaps, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | kzm | (same) | weak → weak |
| Collaboration brand | Asics | Undercover | weak → supported |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Understated utility, Tokyo night textures, community skate energy | Playful industrial utility with community skate energy | supported → weak |

Judge: _Both plans use credible Tokyo references, but B’s ASICS collaboration and night-textured utility direction align more tightly with sneaker collectors and the brand’s understated, community-led positioning._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: –.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | – |
| Collaboration brand | ÖUS | Street League Skateboarding | – |
| Pop-up venue | Centro de Esportes Radicais | Pista De Skate Sumaré | – |
| Creative direction | Colour-saturated DIY skate graphics with rebellious, community-first energy | Bold-logo skate graphics with rebellious local-scene energy | – |

Judge: _B combines São Paulo act Tasha & Tracie with Brazilian skate brand ÖUS and a credible local skate venue, creating a more cohesive, community-led launch than A’s globally oriented Street League collaboration._

Note: held-out anchors not found: Santa Cruz Skateboards

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Kelly Lee Owens | Jamie xx | weak → weak |
| Collaboration brand | HAY | Acne Studios | weak → supported |
| Pop-up venue | Protein Studios Shoreditch | Quo Vadis | weak → weak |
| Creative direction | Calm, tactile minimalism with warm neutrals, natural materials and precise typography | (same) | weak → weak |

Judge: _B feels more naturally embedded in London’s design-and-culture scene, with Kelly Lee Owens and Protein Studios creating a coherent Shoreditch launch context. HAY also aligns closely with the calm, crafted minimalism._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | 宇多田ヒカル | weak → supported |
| Collaboration brand | Sanrio | Muji | no support → supported |
| Pop-up venue | ZeroBase Shibuya | Hilton Tokyo Bay | unresolved → supported |
| Creative direction | Soft pastel minimalism with playful kawaii accents | (same) | weak → weak |

Judge: _Plan B tightly matches Tokyo beauty and pop-culture tastes through Wednesday Campanella, Sanrio, and a highly accessible Shibuya pop-up, while Plan A’s Muji pairing and Tokyo Bay hotel venue feel less youthful and culturally aligned._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Badsista | (same) | weak → weak |
| Collaboration brand | Strava | Ironman Triathlon | supported → supported |
| Pop-up venue | ARCA | (same) | weak → weak |
| Creative direction | High-energy urban performance lab with inclusive run-club warmth | Dynamic, welcoming performance built on technical function | weak → supported |

Judge: _B better connects São Paulo-local Badsista and ARCA with the audience-relevant Strava ecosystem and an inclusive technical run-club concept. Both plans omit the required ambassador._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | CARIÑO | Miss Caffeina | no support → supported |
| Collaboration brand | Pompeii | Wallapop | no support → weak |
| Pop-up venue | Sala El Sol | Fundación Canal | unresolved → supported |
| Creative direction | Cálido indie madrileño, cercano y sin pretensiones | (same) | weak → weak |

Judge: _B combines a Madrid indie act, a locally rooted fashion partner and the iconic Sala El Sol into a credible, warm night. A’s Fundación Canal and Wallapop feel less natural for this audience and occasion._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | María José Llergo | Carlos Sadness | no support → weak |
| Collaboration brand | Ecoalf | Mam Originals | weak → weak |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Sun-washed Mediterranean minimalism with an honest, contemporary tone | (same) | weak → weak |

Judge: _B pairs Madrid-founded Ecoalf with María José Llergo’s modern Spanish identity, directly matching the audience’s sustainability and Rosalía-adjacent interests. A is credible but less sharply aligned._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Divine | Raja Kumari | no support → weak |
| Collaboration brand | Norblack Norwhite | Koovs | weak → weak |
| Pop-up venue | VegNonVeg | Skechers Factory Outlet - Dahisar, Mumbai | unresolved → supported |
| Creative direction | Bold Mumbai street energy, gritty graphics, vivid color and homegrown hip-hop swagger | (same) | weak → weak |

Judge: _B tightly connects Mumbai hip-hop through DIVINE with homegrown streetwear label NorBlack NorWhite and sneaker-community venue VegNonVeg. A is concrete but Koovs and a Skechers outlet feel generic and less culturally credible._

## Cost

Mean 67 s per brief, 312 Qloo calls (counted before the cache), 5.7 model calls. Repair rounds used: 3, 3, 3, 3, 3, 3, 3, 2, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- The judge is a model, not people from these cities. No human review was run.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
