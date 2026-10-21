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
| Supported choices, in-run (9 briefs, 36 choices) | 9 | 30 |
| Mean plan score, in-run (app-defined, 0–100) | 59 | 82 |
| **Supported choices, held-out anchors** (8 briefs, 32 choices) | **5** | **18** |
| Mean plan score, held-out anchors | 57 | 76 |
| Briefs where held-out support rose / fell | – | 7 / 0 |
| Draft choices not found in Qloo at all | 4 of 36 | – |

### Blind judge

9 pairs. Prefers the agent's plan in **0**, the draft in **9**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.9 | 3.4 |
| specificity | 5.0 | 4.6 |
| coherence | 4.9 | 3.2 |
| constraints | 4.8 | 3.5 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 4 → 13 of 24; judge agent 0 / draft 6 / tie 0.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Judge | Stopped |
|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Vans → PLACES+FACES; Nia Archives → Skepta; Village Underground → Brixton Jamm | 0 → 3 | 0 → 2 | draft | Reached the repair-round limit |
| tokyo-sneakers | Tokyo | dev | Diaspora skateboards → Undercover; kzm → Otoboke beaver; Understated industrial utility with Tokyo skate-documentary energy → Classic industrial utility, community-built | 1 → 4 | 1 → 3 | draft | Every adjustable choice is supported |
| sao-paulo-skate | São Paulo | dev | Mad Rats → Rider; Tasha & Tracie → Charlie Brown JR.; Colour-saturated DIY skate energy; rebellious, raw and community-led → Bold, colorful graphics for a local skate-and-music session | 1 → 2 | – | draft | Reached the repair-round limit |
| london-coffee | London | heldout | HAY → Acne Studios; Protein Studios Shoreditch → Quo Vadis; Floating Points → Jamie xx | 1 → 4 | 0 → 1 | draft | Every adjustable choice is supported |
| tokyo-skincare | Tokyo | heldout | Casetify → Muji; Wednesday Campanella → ASIAN KUNG-FU GENERATION | 2 → 4 | 1 → 3 | draft | Every adjustable choice is supported |
| sao-paulo-running | São Paulo | heldout | Casa das Caldeiras → Bourbon Street Music Club; Technical street-running energy, inclusive spirit, bold motion graphics → Dynamic, sleek, inclusive performance; Emicida → Rael | 1 → 3 | 1 → 3 | draft | Reached the repair-round limit |
| madrid-beer | Madrid | heldout | Pompeii → Wallapop; Sala El Sol → National Music Auditorium; Ginebras → Miss Caffeina | 1 → 3 | 1 → 3 | draft | Reached the repair-round limit |
| madrid-sustainable | Madrid | heldout | JUDELINE → Carlos Sadness; Sun-washed Mediterranean minimalism; tactile, transparent and contemporary → Transparent Mediterranean craft with innovative silhouettes | 2 → 4 | 1 → 1 | draft | Every adjustable choice is supported |
| mumbai-sneakers | Mumbai | heldout | Divine → Badshah; antiSOCIAL Lower Parel → The Habitat; Almost Gods → Koovs | 0 → 3 | 0 → 2 | draft | Reached the repair-round limit |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Nia Archives | Skepta | weak → no support |
| Collaboration brand | Vans | PLACES+FACES | no support → supported |
| Pop-up venue | Village Underground | Brixton Jamm | weak → supported |
| Creative direction | Industrial utility, DIY skate energy, understated community warmth | (same) | weak → weak |

Judge: _Nia Archives and Village Underground give B a stronger East London connection, while Vans clearly serves the skate audience. A has credible London names, but Brixton is outside the target area._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Wtaps, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | kzm | Otoboke beaver | weak → weak |
| Collaboration brand | Diaspora skateboards | Undercover | unresolved → supported |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Understated industrial utility with Tokyo skate-documentary energy | Classic industrial utility, community-built | weak → supported |

Judge: _B’s kZm and Diaspora skateboards pairing is distinctly Tokyo, youth-relevant, and tightly aligned with the utilitarian, community-led skate brief; A is credible but less cohesive and locally focused._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: –.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | Charlie Brown JR. | – |
| Collaboration brand | Mad Rats | Rider | – |
| Pop-up venue | CavePool São Paulo Skate | (same) | – |
| Creative direction | Colour-saturated DIY skate energy; rebellious, raw and community-led | Bold, colorful graphics for a local skate-and-music session | – |

Judge: _B combines a current São Paulo act with a credible Brazilian skate brand and a concrete venue, creating a cohesive, colourful community-led session. A has strong local recognition, but Charlie Brown Jr. is not a viable current live act._

Note: held-out anchors not found: Santa Cruz Skateboards

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Floating Points | Jamie xx | weak → weak |
| Collaboration brand | HAY | Acne Studios | weak → supported |
| Pop-up venue | Protein Studios Shoreditch | Quo Vadis | weak → weak |
| Creative direction | Calm modernism, tactile materials and precise editorial restraint | (same) | weak → weak |

Judge: _Floating Points and Protein Studios feel especially rooted in London’s design-conscious creative scene, while HAY reinforces the calm, crafted minimalism. A is culturally strong but Jamie xx and Acne Studios feel more like high-profile fashion defaults than a tightly scaled café launch._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | ASIAN KUNG-FU GENERATION | weak → supported |
| Collaboration brand | Casetify | Muji | no support → supported |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Soft luminous minimalism with playful kawaii accents | (same) | weak → weak |

Judge: _Wednesday Campanella and Casetify better match Tokyo women in their twenties who follow playful beauty and pop culture, while Plan A’s rock act and restrained Muji collaboration feel less aligned despite the strong venue and direction._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Emicida | Rael | weak → weak |
| Collaboration brand | Oakley | (same) | supported → supported |
| Pop-up venue | Casa das Caldeiras | Bourbon Street Music Club | weak → supported |
| Creative direction | Technical street-running energy, inclusive spirit, bold motion graphics | Dynamic, sleek, inclusive performance | weak → supported |

Judge: _Emicida and Casa das Caldeiras feel distinctly rooted in São Paulo, while the technical street-running direction coherently matches the audience and brand. Neither plan clearly identifies a running ambassador, but B offers the stronger launch platform._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Ginebras | Miss Caffeina | weak → supported |
| Collaboration brand | Pompeii | Wallapop | no support → weak |
| Pop-up venue | Sala El Sol | National Music Auditorium | unresolved → supported |
| Creative direction | Warm neighborhood energy, analogue gig-poster graphics and an unpretentious Madrid bar atmosphere | (same) | supported → supported |

Judge: _Ginebras, Madrid-based Pompeii and the iconic Sala El Sol form a credible, cohesive local indie launch. Plan A’s formal National Music Auditorium clashes with the warm, unpretentious bar atmosphere._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Carlos Sadness | weak → weak |
| Collaboration brand | Camper | (same) | weak → weak |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Sun-washed Mediterranean minimalism; tactile, transparent and contemporary | Transparent Mediterranean craft with innovative silhouettes | weak → weak |

Judge: _JUDELINE has stronger relevance for young Madrid audiences and Rosalía fans, while Camper and Matadero are credible, locally resonant choices. Its Mediterranean creative direction also unifies the music, capsule and venue more clearly._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Divine | Badshah | no support → supported |
| Collaboration brand | Almost Gods | Koovs | unresolved → weak |
| Pop-up venue | antiSOCIAL Lower Parel | The Habitat | no support → supported |
| Creative direction | Bold Mumbai street culture, gritty typography and high-energy hip-hop visuals | (same) | weak → weak |

Judge: _B is distinctly Mumbai and homegrown, pairing DIVINE and Almost Gods with a credible hip-hop venue. A is concrete but leans on less locally resonant, more generic commercial choices._

## Cost

Mean 57 s per brief, 325 Qloo calls (counted before the cache), 5.8 model calls. Repair rounds used: 3, 3, 3, 3, 2, 3, 3, 2, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- The judge is a model, not people from these cities. No human review was run.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
