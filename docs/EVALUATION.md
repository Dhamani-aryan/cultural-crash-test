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
| Supported choices, in-run (9 briefs, 36 choices) | 8 | 34 |
| Mean plan score, in-run (app-defined, 0–100) | 61 | 85 |
| **Supported choices, held-out anchors** (8 briefs, 32 choices) | **6** | **23** |
| Mean plan score, held-out anchors | 59 | 80 |
| Briefs where held-out support rose / fell | – | 7 / 0 |
| Draft choices not found in Qloo at all | 8 of 36 | – |

### Blind judge

9 pairs. Prefers the agent's plan in **0**, the draft in **9**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.9 | 3.5 |
| specificity | 4.9 | 4.6 |
| coherence | 5.0 | 3.5 |
| constraints | 4.8 | 3.8 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 4 → 17 of 24; judge agent 0 / draft 6 / tie 0.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Judge | Stopped |
|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Slam City Skates → PLACES+FACES; Joy Orbison → slowthai; Village Underground → The Old Blue Last | 1 → 4 | 1 → 3 | draft | Every adjustable choice is supported |
| tokyo-sneakers | Tokyo | dev | Diaspora skateboards → Undercover; Understated Tokyo utility with modular skate details and a community-first tone → Industrial utility with deconstructed skate details; Stuts → Otoboke beaver | 1 → 4 | 1 → 3 | draft | Every adjustable choice is supported |
| sao-paulo-skate | São Paulo | dev | ÖUS → DC Shoes; Praça Roosevelt → Pista De Skate Sumaré; Tasha & Tracie → Dead Fish; colour-saturated DIY skate energy; rebellious, raw and community-first → Logo-forward, colourful DIY skate graphics; Dead Fish → Planet Hemp | 0 → 3 | – | draft | Further repairs stopped improving the plan |
| london-coffee | London | heldout | Jordan Rakei → London Grammar; HAY → Acne Studios; Warm minimalism, tactile craft, quietly considered → Serene precision and understated craft; Protein Studios Shoreditch → Quo Vadis | 0 → 4 | 0 → 3 | draft | Every adjustable choice is supported |
| tokyo-skincare | Tokyo | heldout | Sanrio → GU; Hz - Shibuya → Red Shoes; Wednesday Campanella → ASIAN KUNG-FU GENERATION | 1 → 4 | 0 → 3 | draft | Every adjustable choice is supported |
| sao-paulo-running | São Paulo | heldout | Strava → Ironman Triathlon; High-energy urban performance lab with inclusive, technical visuals → Dynamic, sleek, inclusive performance | 1 → 3 | 2 → 3 | draft | Further repairs stopped improving the plan |
| madrid-beer | Madrid | heldout | Vans → Arizona Vintage; Sala El Sol → Maravillas Club; Carolina Durante → Miss Caffeina; Arizona Vintage → Hawkers | 1 → 4 | 1 → 4 | draft | Every adjustable choice is supported |
| madrid-sustainable | Madrid | heldout | Sun-washed Mediterranean minimalism; tactile, transparent and contemporary → Innovative, handcrafted Mediterranean modernity | 3 → 4 | 1 → 1 | draft | Every adjustable choice is supported |
| mumbai-sneakers | Mumbai | heldout | Divine → Badshah; Gully Gang → Koovs; antiSOCIAL Mumbai → The Habitat; Bold Mumbai street culture, gritty typography and high-energy hip-hop visuals → Bold homegrown Mumbai artistry with vibrant color, layered texture, and reworked motifs | 0 → 4 | 0 → 3 | draft | Every adjustable choice is supported |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Joy Orbison | slowthai | weak → supported |
| Collaboration brand | Slam City Skates | PLACES+FACES | unresolved → supported |
| Pop-up venue | Village Underground | The Old Blue Last | weak → weak |
| Creative direction | Understated industrial utility with DIY skate-zine energy | (same) | supported → supported |

Judge: _B combines an iconic London skate shop, a locally resonant electronic act, and a credible Shoreditch venue into a cohesive East London launch. A is recognisable and usable, but its music choice is less naturally aligned with the understated, community-led positioning._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Wtaps, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Stuts | Otoboke beaver | weak → weak |
| Collaboration brand | Diaspora skateboards | Undercover | unresolved → supported |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Understated Tokyo utility with modular skate details and a community-first tone | Industrial utility with deconstructed skate details | weak → supported |

Judge: _B’s STUTS and Diaspora Skateboards pairing feels distinctly rooted in Tokyo’s hip-hop and skate communities, while its modular utility direction directly supports the brand attributes. A is concrete and credible, but Otoboke Beaver and Undercover create a broader punk-fashion mix that feels less community-led._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: –.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | Planet Hemp | – |
| Collaboration brand | ÖUS | DC Shoes | – |
| Pop-up venue | Praça Roosevelt | Pista De Skate Sumaré | – |
| Creative direction | colour-saturated DIY skate energy; rebellious, raw and community-first | Logo-forward, colourful DIY skate graphics | – |

Judge: _B pairs São Paulo act Tasha & Tracie with Brazilian skate brand ÖUS and iconic Praça Roosevelt, creating a distinctly local, cohesive launch. A is concrete but leans on non-local Planet Hemp and global-default DC Shoes._

Note: held-out anchors not found: Santa Cruz Skateboards

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Jordan Rakei | London Grammar | weak → supported |
| Collaboration brand | HAY | Acne Studios | weak → supported |
| Pop-up venue | Protein Studios Shoreditch | Quo Vadis | weak → weak |
| Creative direction | Warm minimalism, tactile craft, quietly considered | Serene precision and understated craft | weak → supported |

Judge: _Jordan Rakei and Protein Studios feel rooted in London’s design-conscious creative scene, while HAY and the tactile direction form a coherent calm, crafted launch. A is polished but Acne Studios feels less locally grounded and Quo Vadis less naturally aligned with a minimal coffee opening._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | ASIAN KUNG-FU GENERATION | weak → supported |
| Collaboration brand | Sanrio | GU | no support → supported |
| Pop-up venue | Hz - Shibuya | Red Shoes | unresolved → supported |
| Creative direction | clean pastel glow, playful and gentle | (same) | weak → weak |

Judge: _Wednesday Campanella, Sanrio, and a Shibuya pop-up venue closely match Tokyo beauty and pop-culture tastes while reinforcing the playful pastel direction. Plan A is locally recognizable but skews toward rock and casual fashion rather than the audience’s stated interests._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Emicida | (same) | weak → weak |
| Collaboration brand | Strava | Ironman Triathlon | supported → supported |
| Pop-up venue | Praça das Artes | (same) | supported → supported |
| Creative direction | High-energy urban performance lab with inclusive, technical visuals | Dynamic, sleek, inclusive performance | weak → supported |

Judge: _B pairs São Paulo-native Emicida and a central-city venue with Strava, creating a more relevant and coherent urban-running launch than the triathlon-oriented Ironman collaboration. Neither plan identifies the required ambassador._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Carolina Durante | Miss Caffeina | weak → supported |
| Collaboration brand | Vans | Hawkers | no support → supported |
| Pop-up venue | Sala El Sol | Maravillas Club | unresolved → supported |
| Creative direction | Warm neighborhood gig energy with lo-fi graphics and an unpretentious DIY tone | (same) | supported → supported |

Judge: _Carolina Durante and the iconic Sala El Sol create a distinctly Madrid indie proposition, while Vans supports the live-music positioning despite being global. Plan A is credible, but Hawkers feels less rooted in Madrid’s scene._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Guitarricadelafuente | (same) | weak → weak |
| Collaboration brand | Camper | (same) | weak → weak |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Sun-washed Mediterranean minimalism; tactile, transparent and contemporary | Innovative, handcrafted Mediterranean modernity | weak → weak |

Judge: _Both plans combine locally resonant Spanish talent, a credible non-fast-fashion collaborator and a strong Madrid venue. B’s tactile, transparent, sun-washed direction more precisely expresses Marea’s honest, Mediterranean and modern attributes._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Divine | Badshah | no support → supported |
| Collaboration brand | Gully Gang | Koovs | unresolved → weak |
| Pop-up venue | antiSOCIAL Mumbai | The Habitat | unresolved → supported |
| Creative direction | Bold Mumbai street culture, gritty typography and high-energy hip-hop visuals | Bold homegrown Mumbai artistry with vibrant color, layered texture, and reworked motifs | weak → supported |

Judge: _B is distinctly rooted in Mumbai’s hip-hop scene through DIVINE, Gully Gang, and antiSOCIAL, with a cohesive street-led direction. A is usable but leans on less locally resonant, more generic commercial choices._

## Cost

Mean 110 s per brief, 483 Qloo calls (counted before the cache), 9.3 model calls. Repair rounds used: 3, 3, 6, 4, 3, 4, 4, 1, 4.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- The judge is a model, not people from these cities. No human review was run.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
