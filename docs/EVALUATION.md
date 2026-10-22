# Evaluation

**Run:** 2026-10-22 · **Briefs:** 9 (3 dev, 6 held out) across 5 cities · **Mode:** live Qloo and model calls, thorough depth (≤ 3 repair rounds, ≤ 700 Qloo calls)

Reproduce with `npm run live eval/run.ts`, then `npm run live eval/report.ts`. Raw outputs stay in the git-ignored `eval/out/` (they contain Qloo-derived data). The briefs are in [`eval/cases.ts`](../eval/cases.ts). Launching brands are fictional; audience anchors are real.

## What is compared

| Condition | What it is |
|---|---|
| **LLM-only draft** | The model's first plan from the brief alone, with no Qloo data. It is the agent's own first step, so both conditions share the same model, brief and constraints. |
| **Agent** | The plan after the crash-test loop: resolve in Qloo, test every choice, repair the weakest, re-test, stop on acceptance, stall or budget. |

Three measurements, from least to most independent:

1. **In-run scores.** Both plans as the agent's evaluator scored them during the run. The agent optimises exactly this, so a gain here shows the loop does what it claims. It does **not** show the plan is better.
2. **Held-out anchors.** Both plans re-scored by the same rubric, but with a *different* set of brands or artists standing for the same audience (for example Patta, A-Cold-Wall and Skepta instead of Stüssy, Palace and Carhartt). The agent never saw these anchors, so a gain here means the improvement carries beyond the exact signal it optimised. An anchor that either plan uses as a choice is swapped for a spare from the case: Qloo leaves signal entities out of its results, so it would otherwise test that choice against itself.
3. **Evidence-based judge (primary).** A model judge audits the two plans as A/B, blind to which is the agent's, in both orders (a preference counts only when both orders agree). For every choice it sees the same Qloo evidence, gathered with the held-out anchors, and Qloo's own description of what the choice is. It must judge from that evidence and the brief only, not from its own sense of who is famous. A choice Qloo doesn't know counts as unverified, not as bad.
4. **Blind preference judge (reference).** The same A/B setup with no evidence at all. That judge is choosing on its own taste rather than judging, and it is the model that wrote the draft, so its self-preference favours the draft. It is shown for transparency, not as the measure.

## Results

| Measure | LLM-only draft | Agent |
|---|---|---|
| Supported choices, in-run (9 briefs, 36 choices) | 5 | 27 |
| Mean plan score, in-run (app-defined, 0–100) | 63 | 83 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **4** | **18** |
| Mean plan score, held-out anchors | 60 | 75 |
| Briefs where held-out support rose / fell | – | 9 / 0 |
| Draft choices not found in Qloo at all | 9 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **9**, the draft in **0**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.3 | 3.5 |
| localFit | 2.7 | 3.2 |
| coherence | 2.3 | 3.8 |
| briefFit | 3.2 | 3.5 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **0**, the draft in **9**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.8 | 3.9 |
| specificity | 4.7 | 4.6 |
| coherence | 4.8 | 3.9 |
| constraints | 4.9 | 4.0 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 12 of 24; evidence judge agent 6 / draft 0 / tie 0; blind judge agent 0 / draft 6 / tie 0.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Nia Archives → Skepta; Utilitarian skate-shop textures, understated graphics, and a community-led East London club-night energy → Utilitarian skate-shop textures, restrained monochrome graphics, and industrial East London club-night energy | 2 → 4 | 1 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Beams Japan → PARADISE TOKYO / WACKO MARIA; Understated utility, Tokyo skate culture, community-led energy → Classic skate utility with industrial edge; KID FRESINO → Harunemuri; Beams → Neighborhood | 0 → 4 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | Colour-saturated DIY skate graphics, rebellious and community-led → Bold-logo skate graphics in vivid, colorful palettes; Galeria Olido → Cabaret da Cecília | 0 → 2 | 1 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Quiet modernism, tactile craft, warm minimalism → Neutral, understated craft; 180 The Strand → BISTROTHEQUE; Floating Points → James Blake | 0 → 3 | 0 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Laforet Harajuku → BAPE STORE® HARAJUKU | 1 → 2 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | Centro Cultural São Paulo → Estação Pinheiros; High-energy urban utility; inclusive, technical, and street-smart → Dynamic, inclusive urban technical performance | 0 → 2 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Sala El Sol → Wurlitzer Ballroom; Carolina Durante → Miss Caffeina | 1 → 3 | 1 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Mediterranean minimalism, sun-washed tones and honest, tactile materials → Modern Mediterranean craft with avant-garde silhouettes and an honest, sustainable edge; Camper → Maria Escote; JUDELINE → Miss Caffeina | 1 → 4 | 1 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | VegNonVeg → Skult; antiSOCIAL Mumbai → The Habitat; Bold Mumbai streetwear, hip-hop energy, and homegrown pride → Vibrant, embroidered streetwear with homegrown cultural pride | 0 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Wood Wood (left out because a plan uses them as a choice: Skepta).

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Nia Archives | Skepta | weak → supported |
| Collaboration brand | Fred Perry | (same) | weak → weak |
| Pop-up venue | Village Underground | (same) | supported → supported |
| Creative direction | Utilitarian skate-shop textures, understated graphics, and a community-led East London club-night energy | Utilitarian skate-shop textures, restrained monochrome graphics, and industrial East London club-night energy | weak → supported |

Evidence judge: _A has stronger audience evidence: Skepta ranks #10, while B’s act is outside the top 50; A’s creative-direction tags also rank more strongly than B’s. Both plans share the same venue and collaboration brand, and both acts are described as British music artists, but A’s cross-plan coherence evidence is stronger; neither plan shows a distinctive local venue._

Blind judge: _Both plans use a recognisable East London venue and a concrete local collaboration, with a clear fit for the brief. Nia Archives gives B a stronger community-led, current London music connection, while Skepta makes A feel more like a high-profile headline booking than an understated community launch._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Nujabes, Kapital (left out because a plan uses them as a choice: Neighborhood).

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | KID FRESINO | Harunemuri | weak → weak |
| Collaboration brand | Beams | Neighborhood | weak → weak |
| Pop-up venue | Beams Japan | PARADISE TOKYO / WACKO MARIA | no support → supported |
| Creative direction | Understated utility, Tokyo skate culture, community-led energy | Classic skate utility with industrial edge | weak → weak |

Evidence judge: _Both plans have unverified audience affinity for their acts and collaboration brands, and neither creative direction is characteristic of this audience or Tokyo; A has stronger evidence through its venue, ranked #2 for the audience and #3 for plan coherence, while B’s venue has no affinity data. Both plans’ descriptions indicate Japanese acts and fashion brands, and Tokyo venues, but the evidence does not establish stronger role fit for either._

Blind judge: _Both plans name credible Tokyo collaborators and venues, but B’s BEAMS choices and KID FRESINO feel especially legible to local streetwear audiences and align with the brief’s understated, community-led direction. A is concrete and coherent, though its industrial edge is less clearly tied to the stated attributes._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme, Emicida.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Black Alien | (same) | supported → supported |
| Collaboration brand | ÖUS | (same) | unresolved → unresolved |
| Pop-up venue | Galeria Olido | Cabaret da Cecília | unresolved → weak |
| Creative direction | Colour-saturated DIY skate graphics, rebellious and community-led | Bold-logo skate graphics in vivid, colorful palettes | weak → supported |

Evidence judge: _Both plans have the same strong audience evidence for Black Alien, while A adds audience-supported creative tags (especially Bold Logos) and a locally situated venue; B’s venue is unverified and two creative tags are outside the local top 50. ÖUS is unverified in both, and Qloo’s venue descriptions do not establish either venue’s event-hosting suitability._

Blind judge: _Both plans use São Paulo-relevant Black Alien and ÖUS, but Galeria Olido gives B a stronger public, community-facing fit for a skate-session launch. Its DIY direction also directly reinforces the rebellious, community-led attributes while keeping the colourful brief._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver (left out because a plan uses them as a choice: Floating Points).

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Floating Points | James Blake | weak → supported |
| Collaboration brand | HAY | (same) | weak → weak |
| Pop-up venue | 180 The Strand | BISTROTHEQUE | unresolved → supported |
| Creative direction | Quiet modernism, tactile craft, warm minimalism | Neutral, understated craft | weak → supported |

Evidence judge: _A has stronger direct audience evidence: James Blake ranks #4 and BISTROTHEQUE #28, while B’s act is outside the top 50 and its venue is unverified; A’s aesthetic tags also rank more strongly. A’s James Blake, venue, and aesthetic show some plan coherence, whereas B’s listed coherence signals are outside the top 50, though HAY is outside the top 50 for both plans and neither venue’s role can be verified from a Qloo description._

Blind judge: _Both plans have credible London names and a coherent craft-led mood. Floating Points and 180 The Strand feel especially suited to a design-minded London audience, while James Blake and BISTROTHEQUE are somewhat less tightly aligned with the calm, minimal brief._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Atarashii Gakko | (same) | no support → no support |
| Collaboration brand | Sanrio | (same) | no support → no support |
| Pop-up venue | Laforet Harajuku | BAPE STORE® HARAJUKU | no support → supported |
| Creative direction | Clean, playful Tokyo pop with soft colors and bold character details | (same) | weak → weak |

Evidence judge: _Both plans share unverified audience affinity for the act and collaboration brand, while the creative direction has limited audience support (only Clean ranks, at #3). A is better supported because its venue ranks #15 with this audience, is distinctive in Tokyo, and has a strong coherence link to Sanrio; B’s venue has no returned affinity and is not distinctive. Qloo’s descriptions identify the act as a Japanese girl group and Sanrio as a Japanese entertainment company, but provide no further evidence of creator suitability._

Blind judge: _Both plans use locally relevant creators and Sanrio, but Laforet Harajuku is a stronger fit for Tokyo beauty and pop-culture shoppers than BAPE STORE® HARAJUKU. The shared creative direction is coherent; B’s venue better supports the gentle, playful skincare launch._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tuyo | (same) | unresolved → unresolved |
| Collaboration brand | Oakley | (same) | weak → weak |
| Pop-up venue | Centro Cultural São Paulo | Estação Pinheiros | weak → supported |
| Creative direction | High-energy urban utility; inclusive, technical, and street-smart | Dynamic, inclusive urban technical performance | weak → supported |

Evidence judge: _A has stronger audience and coherence evidence: Estação Pinheiros ranks #5 for the audience and #5 with the rest of the plan, while Oakley and the technical and dynamic direction also have audience or coherence support. B’s venue is locally distinctive but outside the audience and plan top 50, and its energetic direction lacks local audience evidence; Tuyo is unverified in both plans._

Blind judge: _Both plans use locally relevant Tuyo and Oakley, but Centro Cultural São Paulo is a clearer, more established public-facing event venue than Estação Pinheiros. B’s street-smart direction also ties the urban setting to the brief’s energetic, inclusive, technical attributes._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Carolina Durante | Miss Caffeina | weak → supported |
| Collaboration brand | La Virgen | (same) | unresolved → unresolved |
| Pop-up venue | Sala El Sol | Wurlitzer Ballroom | unresolved → supported |
| Creative direction | Warm, local Madrid indie: candid gig-poster graphics, intimate energy, unpretentious conviviality | (same) | supported → supported |

Evidence judge: _A has stronger direct audience evidence: Miss Caffeina ranks #3 and Wurlitzer Ballroom #41, while Carolina Durante is outside the top 50 and B’s venue and partner are unverified. Both acts are described as Spanish indie bands and both plans share audience-relevant creative tags, but A also has measured plan coherence between its act and venue; unverified choices do not count as evidence against either plan._

Blind judge: _Both plans pair recognisable Madrid indie acts and the local craft brewery La Virgen with fitting venues and a coherent, unpretentious direction. Carolina Durante and Sala El Sol give B a particularly strong fit with Madrid’s indie audience._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana (left out because a plan uses them as a choice: Camper).

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Miss Caffeina | weak → weak |
| Collaboration brand | Camper | Maria Escote | weak → supported |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Mediterranean minimalism, sun-washed tones and honest, tactile materials | Modern Mediterranean craft with avant-garde silhouettes and an honest, sustainable edge | weak → weak |

Evidence judge: _A has stronger audience and coherence evidence: Maria Escoté ranks #40 for the audience and the act and venue link strongly to the rest of the plan; its venue is also locally distinctive, while B’s choices mostly fall outside the relevant top 50. Both collaboration brands are described as fashion or footwear brands, and neither is identified as fast fashion; Qloo’s descriptions do not establish sustainability for Maria Escoté, so neither plan fully verifies that aspect of the brief._

Blind judge: _B pairs a Madrid-recognisable venue and act with Camper’s Mediterranean design identity and a direction that fits Marea’s attributes. A is locally grounded too, but Maria Escoté’s collaboration is not clearly shown to meet the no-fast-fashion constraint._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DIVINE | (same) | unresolved → unresolved |
| Collaboration brand | VegNonVeg | Skult | unresolved → weak |
| Pop-up venue | antiSOCIAL Mumbai | The Habitat | unresolved → supported |
| Creative direction | Bold Mumbai streetwear, hip-hop energy, and homegrown pride | Vibrant, embroidered streetwear with homegrown cultural pride | weak → weak |

Evidence judge: _A has measured audience affinity for The Habitat and Cultural Pride, plus a strong coherence link between the venue and Skult; Skult is described as athleisure, though its audience affinity is outside the top 50. B’s act, partner, and venue are unverified, and its resolved creative-direction signals are limited to Cultural Pride (#3) and Urban (#45), with no coherence measurement._

Blind judge: _Both plans use Mumbai-relevant DIVINE and homegrown streetwear cues, but VegNonVeg and antiSOCIAL make B the more clearly sneaker- and hip-hop-focused launch pairing. A is concrete too, though its embroidered direction feels less directly tied to the sneaker drop._

## Cost

Mean 57 s per brief, 161 Qloo calls (counted before the cache), 8.1 model calls. Repair rounds used: 2, 4, 4, 4, 1, 3, 3, 3, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
