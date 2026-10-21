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
3. **Evidence-based judge (primary).** A model judge audits the two plans as A/B, blind to which is the agent's, in both orders (a preference counts only when both orders agree). For every choice it sees the same Qloo evidence, gathered with the held-out anchors, and Qloo's own description of what the choice is. It must judge from that evidence and the brief only, not from its own sense of who is famous. A choice Qloo doesn't know counts as unverified, not as bad.
4. **Blind preference judge (reference).** The same A/B setup with no evidence at all. That judge is choosing on its own taste rather than judging, and it is the model that wrote the draft, so its self-preference favours the draft. It is shown for transparency, not as the measure.

## Results

| Measure | LLM-only draft | Agent |
|---|---|---|
| Supported choices, in-run (9 briefs, 36 choices) | 6 | 18 |
| Mean plan score, in-run (app-defined, 0–100) | 61 | 74 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **3** | **10** |
| Mean plan score, held-out anchors | 59 | 69 |
| Briefs where held-out support rose / fell | – | 5 / 0 |
| Draft choices not found in Qloo at all | 8 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **7**, the draft in **0**, tie in **2**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.6 | 3.6 |
| localFit | 2.6 | 3.0 |
| coherence | 2.5 | 3.3 |
| briefFit | 2.9 | 3.5 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **1**, the draft in **3**, tie in **5**. The two orders agreed on 6 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.7 | 4.7 |
| specificity | 5.0 | 4.9 |
| coherence | 4.7 | 4.6 |
| constraints | 4.9 | 4.8 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 7 of 24; evidence judge agent 5 / draft 0 / tie 1; blind judge agent 0 / draft 3 / tie 3.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Vans → Maharishi; Nia Archives → Skepta | 0 → 2 | 0 → 2 | agent | agent | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Understated Tokyo utility with modular skate fixtures, raw materials and community-first energy → Playful industrial utility for Tokyo skate culture; Hender Scheme → Neighborhood | 1 → 3 | 1 → 1 | agent | tie | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | none | 0 → 0 | 0 → 0 | tie | tie | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Warm minimalism, tactile craft and quietly social energy → Serene, precise, understated craft | 1 → 2 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | none | 3 → 3 | 1 → 1 | tie | tie | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | Mercado Livre Arena Pacaembu → Parque Villa-Lobos | 0 → 1 | 0 → 1 | agent | tie | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Vans → Arizona Vintage; Sala El Sol → Maravillas Club; Carolina Durante → Rufus T. Firefly | 0 → 2 | 0 → 1 | agent | tie | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Thinking MU → Brava Fabrics; JUDELINE → Delaporte | 1 → 3 | 1 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | antiSOCIAL Lower Parel → The Habitat; Bold Mumbai street energy, gritty textures and homegrown hip-hop swagger → Vibrant, textured homegrown hip-hop celebration | 0 → 2 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Nia Archives | Skepta | weak → supported |
| Collaboration brand | Vans | Maharishi | no support → supported |
| Pop-up venue | Village Underground | (same) | weak → weak |
| Creative direction | Understated industrial utility with DIY skate energy and a community-first tone | (same) | weak → weak |

Evidence judge: _Plan A has stronger audience evidence through Skepta (#11), Maharishi (#5), and highly ranked Industrial direction, while Skepta is also the rest of the plan’s #1 act. Both plans have similar country-level local signals and the same nondistinctive venue, but Plan B lacks affinity data for Vans and has weaker coherence evidence overall._

Blind judge: _A forms a distinctly London, utilitarian streetwear proposition through Skepta, Maharishi and Village Underground. B is credible and energetic, but Vans feels more like a global skate default than a locally distinctive collaborator._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | kzm | (same) | weak → weak |
| Collaboration brand | Hender Scheme | Neighborhood | unresolved → weak |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Understated Tokyo utility with modular skate fixtures, raw materials and community-first energy | Playful industrial utility for Tokyo skate culture | weak → weak |

Evidence judge: _Plan A has broader verified support: Neighborhood has 0.921 audience affinity and a documented streetwear/collaboration role, while Ba-Tsu ranks #10 for the audience and #4 for coherence. Plan B’s venue is highly coherent (#1), but Hender Scheme is unverified and its creative tags show weaker coherence, with Understated #43, Utilitarian #34, and Community outside the top 50._

Blind judge: _Neighborhood is the stronger match for Tokyo’s streetwear and skate audience, while kzm and Ba-Tsu Art Gallery reinforce local credibility. B has sharper creative direction, but Hender Scheme leans more artisanal than skate-led._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | weak → weak |
| Collaboration brand | ÖUS | (same) | unresolved → unresolved |
| Pop-up venue | Parque Zilda Natel | (same) | unresolved → unresolved |
| Creative direction | DIY skate energy, saturated colour and rebellious community spirit | (same) | weak → weak |

Evidence judge: _The plans are identical: both have strong evidence for Rebellious, moderate support for Vivid Colors, and a high-affinity act outside the audience’s top 50; the act is Brazilian but not evidenced as São Paulo-local. ÖUS and Parque Zilda Natel are unverified, limiting evidence for role and brief fit._

Blind judge: _The plans are identical, and their São Paulo-specific act, skate brand, and venue form a concrete, coherent launch that matches the rebellious, community-led, colourful brief._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Kokoroko | (same) | weak → weak |
| Collaboration brand | HAY | (same) | weak → weak |
| Pop-up venue | Protein Studios Shoreditch | (same) | weak → weak |
| Creative direction | Warm minimalism, tactile craft and quietly social energy | Serene, precise, understated craft | weak → supported |

Evidence judge: _The plans share the same moderately supported act, partner, and venue, including a British act and London venue but no top-50 audience or coherence placements. Plan A is better supported because all three creative-direction tags rank in the audience and plan aesthetic top 50, while Plan B has only “warmth” in the audience top 50 and none of its tags in the plan coherence top 50._

Blind judge: _Both plans pair strong London relevance with concrete, audience-appropriate choices; B’s tactile, quietly social direction connects Kokoroko, HAY and the café launch more cohesively while retaining the required calm minimalism._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Sanrio | (same) | no support → no support |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Gentle pastel futurism with playful kawaii details and a clean, luminous tone | (same) | weak → weak |

Evidence judge: _The plans are identical and have identical evidence: strong venue and Clean audience signals, Japanese/Tokyo-local choices, and good measured links among the act, venue, and playful/pastel direction. Sanrio has no audience or overall coherence affinity, and the venue lacks a Qloo description confirming its ability to host the pop-up._

Blind judge: _The plans are identical, with highly relevant Tokyo pop-culture choices and a cohesive direction that matches the gentle, playful, clean brief._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | weak → weak |
| Collaboration brand | Asics | (same) | weak → weak |
| Pop-up venue | Mercado Livre Arena Pacaembu | Parque Villa-Lobos | unresolved → supported |
| Creative direction | High-energy urban performance: technical graphics, vivid color and inclusive street-running culture | (same) | weak → weak |

Evidence judge: _Both plans have strong audience evidence for Asics but weaker evidence for Tasha & Tracie and mixed creative-direction support. Plan A is better supported because Parque Villa-Lobos ranks #1 for both audience and plan coherence and is confirmed in São Paulo, while Plan B's venue is unverified; neither plan clearly identifies an ambassador._

Blind judge: _Both plans use credible São Paulo references and align with the energetic, inclusive, technical brief. Villa-Lobos is the stronger, more natural setting for a city run-club launch than the event-oriented Pacaembu arena._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Carolina Durante | Rufus T. Firefly | weak → weak |
| Collaboration brand | Vans | Arizona Vintage | no support → weak |
| Pop-up venue | Sala El Sol | Maravillas Club | unresolved → supported |
| Creative direction | Warm Madrid indie energy with neighborhood-bar intimacy and unfussy analog visuals | (same) | weak → weak |

Evidence judge: _Plan A has stronger evidence through Maravillas Club’s #6 audience and #2 coherence rankings, plus an evidenced Spanish partner and locally resonant Intimate and Laid-Back direction. Plan B lacks Qloo evidence for Vans and Sala El Sol, while Vans is identified as a non-distinctive global default and only Intimate shows strong internal coherence._

Blind judge: _Carolina Durante and Sala El Sol are especially resonant with Madrid’s indie audience, making B the stronger local launch despite Vans being a generic global partner. A is cohesive and locally credible, but its cultural choices are slightly less immediately recognizable._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Delaporte | weak → weak |
| Collaboration brand | Thinking MU | Brava Fabrics | unresolved → weak |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Sun-washed Mediterranean minimalism; tactile, transparent and contemporary | (same) | weak → weak |

Evidence judge: _Both plans have strong venue evidence but weak aesthetic evidence; B has slightly stronger venue-to-plan coherence. A is better supported overall because Delaporte and Matadero are distinctive to Madrid, while Brava Fabrics is verified as sustainable and ethical; B's collaborator is unverified, including against the no-fast-fashion constraint._

Blind judge: _Both are concrete, sustainable and locally legible, but JUDELINE’s contemporary Spanish profile and Thinking MU’s Mediterranean design language align more closely with the Rosalía-adjacent audience and creative direction._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | MC Altaf | (same) | unresolved → unresolved |
| Collaboration brand | Almost Gods | (same) | unresolved → unresolved |
| Pop-up venue | antiSOCIAL Lower Parel | The Habitat | no support → supported |
| Creative direction | Bold Mumbai street energy, gritty textures and homegrown hip-hop swagger | Vibrant, textured homegrown hip-hop celebration | weak → supported |

Evidence judge: _Plan A has substantially stronger audience evidence: The Habitat ranks #2 with 0.878 affinity, while its creative tags rank #3, #4, and #34; Plan B's venue has no affinity and only Cultural Pride reaches the top 50. Plan B is more locally distinctive and its direction more explicitly matches the brand attributes, but its act and collaboration remain unverified, as do Plan A's._

Blind judge: _Both plans use credible homegrown names, but antiSOCIAL Lower Parel and the explicitly Mumbai-rooted creative direction make B more natural and cohesive for the city’s sneaker and hip-hop audience._

## Cost

Mean 101 s per brief, 362 Qloo calls (counted before the cache), 8.0 model calls. Repair rounds used: 3, 3, 3, 3, 1, 3, 4, 2, 4.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
