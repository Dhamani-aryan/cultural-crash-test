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
2. **Held-out anchors.** Both plans re-scored by the same rubric, but with a *different* set of brands or artists standing for the same audience (for example Patta, A-Cold-Wall and Skepta instead of Stüssy, Palace and Carhartt). The agent never saw these anchors, so a gain here means the improvement carries beyond the exact signal it optimised. An anchor that either plan uses as a choice is swapped for a spare from the case: Qloo leaves signal entities out of its results, so it would otherwise test that choice against itself.
3. **Evidence-based judge (primary).** A model judge audits the two plans as A/B, blind to which is the agent's, in both orders (a preference counts only when both orders agree). For every choice it sees the same Qloo evidence, gathered with the held-out anchors, and Qloo's own description of what the choice is. It must judge from that evidence and the brief only, not from its own sense of who is famous. A choice Qloo doesn't know counts as unverified, not as bad.
4. **Blind preference judge (reference).** The same A/B setup with no evidence at all. That judge is choosing on its own taste rather than judging, and it is the model that wrote the draft, so its self-preference favours the draft. It is shown for transparency, not as the measure.

## Results

| Measure | LLM-only draft | Agent |
|---|---|---|
| Supported choices, in-run (9 briefs, 36 choices) | 5 | 26 |
| Mean plan score, in-run (app-defined, 0–100) | 62 | 81 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **4** | **17** |
| Mean plan score, held-out anchors | 56 | 72 |
| Briefs where held-out support rose / fell | – | 8 / 0 |
| Draft choices not found in Qloo at all | 8 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **8**, the draft in **0**, tie in **1**. The two orders agreed on 8 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.1 | 3.5 |
| localFit | 2.4 | 3.1 |
| coherence | 2.1 | 3.2 |
| briefFit | 3.1 | 3.4 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **0**, the draft in **8**, tie in **1**. The two orders agreed on 8 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.5 | 4.2 |
| specificity | 4.6 | 4.3 |
| coherence | 4.7 | 3.7 |
| constraints | 4.8 | 4.2 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 11 of 24; evidence judge agent 6 / draft 0 / tie 0; blind judge agent 0 / draft 5 / tie 1.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Utilitarian streetwear, understated graphics, community-led energy → Utilitarian streetwear with monochrome graphics and urban edge | 2 → 3 | 2 → 3 | tie | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Shibuya Parco → Buaisō; Understated workwear utility meets Tokyo street culture; community-led and tactile → Understated workwear utility with an industrial edge; community-led and tactile; Beams → Neighborhood | 0 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | Colour-saturated DIY skate graphics; rebellious, community-led energy → Colorful logo-led skate graphics with a laid-back, surf-inspired edge; Centro Cultural São Paulo → Matilha Cultural | 0 → 2 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Quiet minimalism, tactile materials, warm analogue tones → Crafted understated elegance in a neutral palette with clean lines; The Truman Brewery → The Table Café; Khruangbin → Ghostpoet; HAY → Allsaints | 0 → 4 | 0 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Beams Japan → Honey Mi Honey; Beams → Niko And... | 2 → 4 | 1 → 2 | agent | tie | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | Energetic, inclusive technical running; bold São Paulo street visuals → Dynamic, sleek technical performance | 0 → 1 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Sala El Sol → Wurlitzer Ballroom; Carolina Durante → Miss Caffeina; Warm, unpretentious Madrid indie; intimate live-night energy → Warm, comfortable Madrid indie with cultural roots and intimate live-night energy | 0 → 3 | 0 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Honest Mediterranean modernism; sun-washed tones, natural textures, understated energy → Honest Mediterranean modernism with handcrafted details and sustainable materials; JUDELINE → Juanito Makandé | 1 → 3 | 1 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | antiSOCIAL Mumbai → The Habitat; Bewakoof → Koovs; Bold Mumbai streetwear; gritty, high-energy hip-hop → Bold, vibrant Mumbai streetwear with rich textures and quirky hip-hop energy | 0 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Ezra Collective | (same) | no support → no support |
| Collaboration brand | Fred Perry | (same) | supported → supported |
| Pop-up venue | Village Underground | (same) | supported → supported |
| Creative direction | Utilitarian streetwear, understated graphics, community-led energy | Utilitarian streetwear with monochrome graphics and urban edge | weak → supported |

Evidence judge: _The plans share the same evidence for the act, collaboration and venue: audience affinity is absent for the act, weak for Fred Perry, and stronger for the venue, while the venue and act are London-origin or located there but not shown as locally distinctive. A’s creative direction has stronger audience rankings, while B’s uses the brief’s understated and community-led attributes; neither direction coheres strongly with the other choices, so the evidence does not establish an overall advantage._

Blind judge: _Both plans use recognisable London choices, though Ezra Collective and Fred Perry are broader cultural fits than direct East London skate references. B better reflects the brief’s understated, community-led attributes; A’s “urban edge” and monochrome direction are less clearly aligned._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Nujabes, Kapital (left out because a plan uses them as a choice: Neighborhood).

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Cornelius | (same) | no support → no support |
| Collaboration brand | Beams | Neighborhood | weak → weak |
| Pop-up venue | Shibuya Parco | Buaisō | no support → supported |
| Creative direction | Understated workwear utility meets Tokyo street culture; community-led and tactile | Understated workwear utility with an industrial edge; community-led and tactile | weak → weak |

Evidence judge: _Both plans have a locally originated act and collaboration brand, but neither shows audience affinity for those choices; A’s venue has audience affinity (#37) and plan coherence (#32), while B’s venue has neither. A’s creative tags are also more coherent with the rest of its plan, though neither plan’s tags are shown as audience-characteristic or locally distinctive._

Blind judge: _Both plans use recognisable Tokyo choices and fit the understated, utility-led brief. B’s BEAMS collaboration and Shibuya PARCO pop-up make the launch more concrete and accessible to Tokyo streetwear and sneaker collectors._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme, Emicida.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | FBC | (same) | weak → weak |
| Collaboration brand | Piet | (same) | unresolved → unresolved |
| Pop-up venue | Centro Cultural São Paulo | Matilha Cultural | weak → supported |
| Creative direction | Colour-saturated DIY skate graphics; rebellious, community-led energy | Colorful logo-led skate graphics with a laid-back, surf-inspired edge | weak → supported |

Evidence judge: _A has stronger audience and coherence evidence: Matilha Cultural ranks #1 for the audience and plan, and its creative tags rank well; B’s venue and most creative tags have weak audience or coherence signals. B’s venue is distinctive to São Paulo, but neither plan’s act has a strong audience or local signal, and Piet is unverified._

Blind judge: _Both plans name strong São Paulo fits in FBC and Piet, but B’s DIY, rebellious direction aligns more closely with the brief than A’s surf-inspired edge. Centro Cultural São Paulo also gives B a concrete, community-facing venue for the launch._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Khruangbin | Ghostpoet | weak → weak |
| Collaboration brand | HAY | Allsaints | weak → supported |
| Pop-up venue | The Truman Brewery | The Table Café | unresolved → supported |
| Creative direction | Quiet minimalism, tactile materials, warm analogue tones | Crafted understated elegance in a neutral palette with clean lines | weak → supported |

Evidence judge: _A has audience evidence for AllSaints and The Table Café, and its aesthetics include a top-five audience signal; Ghostpoet and AllSaints are also identified as British, with Ghostpoet placed in London. B’s act and brand are outside the audience and plan top 50, its aesthetics have little local support, and the venue is unverified; its descriptions do not establish a clear role-fit failure._

Blind judge: _B’s HAY collaboration and tactile, warm minimalism align closely with the audience and brand, though Khruangbin is a less locally rooted choice; A has a stronger London music connection but feels less coherent with its venue and AllSaints pairing._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Beams | Niko And... | supported → supported |
| Pop-up venue | Beams Japan | Honey Mi Honey | no support → supported |
| Creative direction | Gentle, playful Tokyo pop: clean skincare meets colorful Harajuku-inspired graphics. | (same) | weak → weak |

Evidence judge: _A has stronger audience evidence for its collaboration brand and venue (ranks #2 and #4), plus a venue described as locally distinctive; its venue also links coherently with Niko And.... B’s brand has audience affinity and links well with the act, but its venue is unverified for audience and coherence and is not locally distinctive; both plans share an act outside the audience top 50 and a creative direction whose Playful tag is not supported as characteristic._

Blind judge: _Both use a recognisable Tokyo act and concrete local partners and venues, with a creative direction that fits the brand. A leans more fashion-forward and playful; B’s BEAMS pairing is coherent but less specifically beauty- or Harajuku-coded._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Emicida | (same) | weak → weak |
| Collaboration brand | Havaianas | (same) | no support → no support |
| Pop-up venue | Parque Ibirapuera | (same) | unresolved → unresolved |
| Creative direction | Energetic, inclusive technical running; bold São Paulo street visuals | Dynamic, sleek technical performance | weak → supported |

Evidence judge: _Both plans share the same act, collaboration brand, and unverified venue; Emicida is outside the audience’s top 50, while Havaianas has no returned audience affinity, though both are described as Brazilian. A’s creative tags rank highly for this audience and are distinctive to São Paulo, whereas B’s Energetic and Community tags are not characteristic and only Technical ranks (19th); neither plan has evidence of creative-direction coherence with its other choices._

Blind judge: _Both plans use highly recognizable São Paulo choices, but B’s street visuals and explicit inclusive running direction better match the energetic, inclusive brief. A’s sleek performance direction is relevant but less clearly expresses those attributes._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Carolina Durante | Miss Caffeina | weak → supported |
| Collaboration brand | La Virgen | (same) | unresolved → unresolved |
| Pop-up venue | Sala El Sol | Wurlitzer Ballroom | unresolved → supported |
| Creative direction | Warm, unpretentious Madrid indie; intimate live-night energy | Warm, comfortable Madrid indie with cultural roots and intimate live-night energy | weak → supported |

Evidence judge: _A has stronger direct audience evidence: Miss Caffeina ranks #3, Wurlitzer #41, and its creative tags include two top-five audience aesthetics; its choices also show measured coherence. B’s act is outside the top 50, its venue and partner are unverified, and its creative direction includes a tag not characteristic of Madrid, though both acts are described as Spanish indie bands and both plans leave the partner unverified._

Blind judge: _Both plans use concrete Madrid indie acts, a local beer partner, and suitable venues. B’s Carolina Durante and Sala El Sol feel especially aligned with the audience and the brief’s warm, unpretentious live-night positioning._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Juanito Makandé | weak → weak |
| Collaboration brand | Thinking MU | (same) | unresolved → unresolved |
| Pop-up venue | La Casa Encendida | (same) | supported → supported |
| Creative direction | Honest Mediterranean modernism; sun-washed tones, natural textures, understated energy | Honest Mediterranean modernism with handcrafted details and sustainable materials | weak → weak |

Evidence judge: _Both plans share the same audience-supported venue, while their acts are outside the audience and plan top 50; the collaboration brand is unverified in both. A has some local-country evidence for its act and coherence evidence for Handcrafted and Sustainable, whereas B’s creative-direction tags lack audience, local, and plan-coherence support; neither act’s description establishes a clear role fit._

Blind judge: _Both plans name a credible sustainable collaborator and Madrid venue, and respect the no-fast-fashion constraint. JUDELINE and B’s understated, sun-washed direction feel especially aligned with the brief’s modern Madrid audience and Mediterranean attributes._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DIVINE | (same) | unresolved → unresolved |
| Collaboration brand | Bewakoof | Koovs | weak → weak |
| Pop-up venue | antiSOCIAL Mumbai | The Habitat | unresolved → supported |
| Creative direction | Bold Mumbai streetwear; gritty, high-energy hip-hop | Bold, vibrant Mumbai streetwear with rich textures and quirky hip-hop energy | weak → weak |

Evidence judge: _A has stronger evidence for the event venue (#7 with this audience and #1 in plan coherence) and for several creative-direction tags; B’s venue and act are unverified, and its audience and local signals for the direction are weak. Both collaboration brands are outside the audience’s top 50, and the descriptions identify each as an online fashion brand, while neither act has Qloo evidence._

Blind judge: _Both plans use Mumbai-relevant DIVINE and a clear streetwear direction, but B’s Bewakoof collaboration better fits the homegrown brief and audience, while antiSOCIAL is a specific, credible hip-hop event venue. A is plausible, though Koovs is a less aligned collaboration choice._

## Cost

Mean 47 s per brief, 354 Qloo calls (counted before the cache), 7.9 model calls. Repair rounds used: 1, 3, 4, 4, 2, 3, 4, 2, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
