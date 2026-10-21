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
| Supported choices, in-run (9 briefs, 36 choices) | 8 | 28 |
| Mean plan score, in-run (app-defined, 0–100) | 64 | 85 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **4** | **18** |
| Mean plan score, held-out anchors | 61 | 77 |
| Briefs where held-out support rose / fell | – | 8 / 0 |
| Draft choices not found in Qloo at all | 8 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **9**, the draft in **0**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.5 | 3.8 |
| localFit | 2.7 | 3.5 |
| coherence | 2.3 | 3.7 |
| briefFit | 3.1 | 3.6 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **0**, the draft in **9**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.9 | 3.7 |
| specificity | 4.9 | 4.7 |
| coherence | 5.0 | 3.6 |
| constraints | 4.8 | 3.8 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 10 of 24; evidence judge agent 6 / draft 0 / tie 0; blind judge agent 0 / draft 6 / tie 0.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | CASisDEAD → slowthai; Village Underground → Rough Trade East; Understated industrial utility with raw skate-film energy and a community-first tone → Industrial utility with authentic raw skate-film energy | 0 → 3 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Asics → Supreme; Understated Tokyo utility: modular workwear, concrete textures and community skate energy → Minimalistic Tokyo utility with urban skate energy | 1 → 3 | 2 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | ÖUS → DC Shoes; Praça Roosevelt → Pista De Skate Sumaré; Colour-saturated DIY skate energy with rebellious graphics and a community-first tone → Colorful DIY skate energy with rebellious graphics and an authentic local tone | 0 → 3 | 0 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Warm minimalism, tactile craft and quietly considered hospitality → Serene precision and understated craft; Nala Sinephro → Ghostpoet; HAY → Acne Studios | 1 → 4 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Laforet Museum Harajuku → Hilton Tokyo Bay | 2 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | ARCA → Bourbon Street Music Club; High-energy urban performance lab; inclusive, technical and kinetic → Dynamic, sleek, technical performance lab | 1 → 3 | 1 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Sala El Sol → Wurlitzer Ballroom | 1 → 2 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Sun-washed Mediterranean minimalism with honest materials and a contemporary, soulful tone → Sustainable Mediterranean simplicity with modern aesthetics | 2 → 3 | 1 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | antiSOCIAL Lower Parel → The Habitat; Bold Mumbai street energy, gritty textures and sneaker-culture attitude → Vibrant, richly crafted Mumbai street culture; Yashraj → Badshah; Almost Gods → Koovs | 0 → 4 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | CASisDEAD | slowthai | weak → supported |
| Collaboration brand | Vans | (same) | no support → no support |
| Pop-up venue | Village Underground | Rough Trade East | weak → weak |
| Creative direction | Understated industrial utility with raw skate-film energy and a community-first tone | Industrial utility with authentic raw skate-film energy | weak → supported |

Evidence judge: _Plan A has the strongest audience evidence: slowthai ranks #1, its Industrial and Utilitarian tags rank #2 and #8, and Rough Trade East ranks #5 for coherence with the plan. Plan B’s act and venue fall outside the relevant top 50s, while its Community tag lacks audience, local, and coherence support; both plans use a skateboarding brand and London venue, though the venue descriptions do not verify event-hosting capability._

Blind judge: _CASisDEAD and Village Underground give B a distinctly East London identity, while its restrained, community-first creative direction closely matches the brand. A is usable but slowthai is a less locally grounded and more contentious choice._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | BIM | (same) | unresolved → unresolved |
| Collaboration brand | Asics | Supreme | weak → supported |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Understated Tokyo utility: modular workwear, concrete textures and community skate energy | Minimalistic Tokyo utility with urban skate energy | supported → supported |

Evidence judge: _Plan A has stronger audience evidence: Supreme ranks #32 and its creative tags rank #3, #5, and #22, while Asics is outside the top 50 and Plan B’s tags are mostly lower-ranked. Both use the distinctive Ba-Tsu Art Gallery and country-origin brands, but Supreme’s described streetwear and skateboarding focus fits the collaboration brief more directly._

Blind judge: _B pairs Tokyo-relevant BIM, ASICS and Ba-Tsu Art Gallery with a concrete utilitarian direction that closely matches the brand, while A’s Supreme collaboration feels more globally generic and less understated._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | weak → weak |
| Collaboration brand | ÖUS | DC Shoes | unresolved → supported |
| Pop-up venue | Praça Roosevelt | Pista De Skate Sumaré | unresolved → supported |
| Creative direction | Colour-saturated DIY skate energy with rebellious graphics and a community-first tone | Colorful DIY skate energy with rebellious graphics and an authentic local tone | weak → supported |

Evidence judge: _Plan A has strong audience evidence for DC Shoes (#8), Pista De Skate Sumaré (#2), and all three creative tags, while its venue and creative direction also show strong coherence and São Paulo distinctiveness. Plan B leaves its brand and venue unverified, and its Community tag lacks audience, local, and coherence support; neither plan fully verifies the act as São Paulo-local rather than merely Brazilian._

Blind judge: _B is more distinctly São Paulo: ÖUS, Praça Roosevelt, and Tasha & Tracie create a credible local skate-and-street-culture mix. A is solid, but DC Shoes feels more like a generic global choice._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Nala Sinephro | Ghostpoet | weak → weak |
| Collaboration brand | HAY | Acne Studios | weak → supported |
| Pop-up venue | Protein Studios Shoreditch | (same) | weak → weak |
| Creative direction | Warm minimalism, tactile craft and quietly considered hospitality | Serene precision and understated craft | weak → supported |

Evidence judge: _Plan A has stronger audience evidence through Acne Studios (#10) and three top-50 creative-direction tags, while Plan B’s act, collaborator, venue, and minimalist aesthetic all fall outside their relevant top 50s. A is also more coherent, with Ghostpoet and Acne Studios ranking #35 and #25 for the rest of the plan, though neither plan has strong city-distinctive evidence._

Blind judge: _Nala Sinephro’s London resonance and HAY’s warm, tactile minimalism align especially well with the audience and create a more cohesive expression of calm, crafted hospitality._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Sanrio | (same) | no support → no support |
| Pop-up venue | Laforet Museum Harajuku | Hilton Tokyo Bay | unresolved → supported |
| Creative direction | Soft pastel futurism with playful character details and a clean, gentle glow | (same) | weak → weak |

Evidence judge: _Both plans have the same Japan-origin act and collaborator and the same mixed aesthetic evidence, but Plan A adds a Qloo-verified, locally distinctive venue ranked #3 for the Tokyo audience and #17 for coherence. Plan B’s venue is not in Qloo, so it earns no audience, local, coherence, or role-fit credit._

Blind judge: _Laforet Museum Harajuku directly connects with Tokyo’s young fashion and pop-culture audience, while Hilton Tokyo Bay is outside Tokyo in Chiba and feels less coherent with the playful beauty positioning._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tropkillaz | (same) | weak → weak |
| Collaboration brand | Oakley | (same) | supported → supported |
| Pop-up venue | ARCA | Bourbon Street Music Club | weak → supported |
| Creative direction | High-energy urban performance lab; inclusive, technical and kinetic | Dynamic, sleek, technical performance lab | weak → supported |

Evidence judge: _Plan A has stronger audience and city evidence: Bourbon Street Music Club ranks #1 for the audience and #2 for coherence, while its creative tags rank strongly and distinctively in São Paulo. Plan B better states the brand attributes, but ARCA and several creative signals have weaker audience and coherence support; neither venue has a Qloo description confirming suitability for a run-club event._

Blind judge: _ARCA better supports a large, high-energy São Paulo running launch, and B’s direction more clearly unites the energetic, inclusive and technical attributes. Both plans lack a named ambassador and concrete run-club event mechanics._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | CARIÑO | (same) | no support → no support |
| Collaboration brand | Pompeii | (same) | unresolved → unresolved |
| Pop-up venue | Sala El Sol | Wurlitzer Ballroom | unresolved → supported |
| Creative direction | Warm neighborhood indie; candid, analog and unpretentious | (same) | weak → weak |

Evidence judge: _Plan A adds a Madrid venue with measured audience affinity (0.735) and strong coherence with the plan (0.923, led by CARIÑO at 1.00), while Plan B’s venue is unverified. Both share moderate support for the creative direction, no audience affinity for CARIÑO, and no evidence for Pompeii._

Blind judge: _Both plans are concrete and distinctly Madrid, but Sala El Sol’s iconic local indie identity makes B a stronger fit for the audience and the warm, unpretentious live-night concept._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | María José Llergo | (same) | no support → no support |
| Collaboration brand | Twothirds | (same) | weak → weak |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Sun-washed Mediterranean minimalism with honest materials and a contemporary, soulful tone | Sustainable Mediterranean simplicity with modern aesthetics | weak → weak |

Evidence judge: _Both plans have strong evidence for distinctive Matadero Madrid and a sustainable, non-fast-fashion collaborator, but no audience affinity for the act and only moderate creative-direction signals. Plan A is better supported internally because Sustainable ranks #8 and Simplicity #2 for the rest of its plan, versus Plan B's Natural Materials #3, Contemporary #37, and Minimalist outside the top 50._

Blind judge: _Both plans pair credible Spanish cultural choices with a sustainable collaborator and a strong Madrid venue. B’s more vivid creative direction connects the Mediterranean, honest, modern attributes into a clearer launch concept._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Yashraj | Badshah | unresolved → weak |
| Collaboration brand | Almost Gods | Koovs | unresolved → weak |
| Pop-up venue | antiSOCIAL Lower Parel | The Habitat | no support → supported |
| Creative direction | Bold Mumbai street energy, gritty textures and sneaker-culture attitude | Vibrant, richly crafted Mumbai street culture | weak → supported |

Evidence judge: _Plan A has a #7 audience venue, strongly ranked aesthetics, and measurable cross-plan coherence, while its act and fashion collaborator have high standalone affinities despite missing the top 50. Plan B's act and collaborator are unverified, its venue has no audience affinity, and none of its creative tags rank for audience, locality, or coherence._

Blind judge: _Yashraj, Almost Gods and antiSOCIAL form a distinctly Mumbai, homegrown streetwear and hip-hop launch, while Plan A leans on broader commercial names with weaker local relevance._

## Cost

Mean 84 s per brief, 348 Qloo calls (counted before the cache), 7.6 model calls. Repair rounds used: 3, 3, 4, 3, 1, 3, 2, 1, 4.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
