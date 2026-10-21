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
| Supported choices, in-run (9 briefs, 36 choices) | 5 | 30 |
| Mean plan score, in-run (app-defined, 0–100) | 59 | 82 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **5** | **22** |
| Mean plan score, held-out anchors | 59 | 76 |
| Briefs where held-out support rose / fell | – | 9 / 0 |
| Draft choices not found in Qloo at all | 8 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **8**, the draft in **1**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.3 | 3.8 |
| localFit | 2.6 | 3.6 |
| coherence | 2.2 | 3.5 |
| briefFit | 3.0 | 3.4 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **0**, the draft in **6**, tie in **3**. The two orders agreed on 6 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.7 | 3.6 |
| specificity | 4.6 | 4.3 |
| coherence | 4.7 | 3.8 |
| constraints | 4.8 | 4.2 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 13 of 24; evidence judge agent 5 / draft 1 / tie 0; blind judge agent 0 / draft 5 / tie 1.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Dr. Martens → Fred Perry; Nia Archives → Skepta; Utilitarian skate style, understated visuals, community-first energy → Utilitarian skate style, monochrome visuals, authentic community energy | 1 → 4 | 1 → 4 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Beams Japan → PARADISE TOKYO / WACKO MARIA; Utilitarian skatewear, understated Tokyo street style, community-led → Industrial utilitarian skatewear with oversized silhouettes; Suchmos → Harunemuri; Beams → Neighborhood | 0 → 4 | 1 → 2 | agent | tie | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | Galeria Olido → Cabaret da Cecília; Colourful DIY skate zine; rebellious, community-first energy → Bold-logo, colourful DIY skate-zine with rebellious, community-led energy | 0 → 2 | 1 → 3 | agent | tie | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Coal Drops Yard → Alfies Antique Market; Calm, crafted minimalism with warm tones and intimate live music → Understated elegance, minimal design, and a neutral palette; Jordan Rakei → James Blake; HAY → Herschel Supply Co | 0 → 4 | 0 → 4 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Beams Japan → Honey Mi Honey; Beams → Niko And... | 2 → 4 | 1 → 2 | agent | tie | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | Energetic, inclusive performance; São Paulo street-run grit → Dynamic, technical performance with sleek functional design; Parque Ibirapuera → Casarìa SP | 0 → 2 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Sala El Sol → Wurlitzer Ballroom; Hinds → Miss Caffeina | 1 → 3 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Thinking MU → Arizona Vintage; Mediterranean minimalism, honest materials, modern warmth → Modern aesthetics, handcrafted sustainability; JUDELINE → Juanito Makandé | 1 → 4 | 1 → 2 | draft | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | Puma → Skult; Bold Mumbai streetwear; gritty, high-energy hip-hop → Bold, vibrant homegrown street craft; antiSOCIAL, Mumbai → The Habitat | 0 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Nia Archives | Skepta | weak → supported |
| Collaboration brand | Dr. Martens | Fred Perry | weak → supported |
| Pop-up venue | Village Underground | (same) | supported → supported |
| Creative direction | Utilitarian skate style, understated visuals, community-first energy | Utilitarian skate style, monochrome visuals, authentic community energy | weak → supported |

Evidence judge: _A has strong audience rankings for Skepta, Village Underground, and all three creative tags, plus strong plan coherence; its choices are London-linked, though the venue and aesthetics are not especially distinctive locally. B’s act and collaboration brand are unverified for this audience and show weak plan coherence, while its creative direction includes a tag not characteristic of London; Qloo’s descriptions support the act, brand, and venue roles in both plans._

Blind judge: _Both plans use a recognisable East London venue and fit the skate/streetwear brief, but Nia Archives and Dr. Martens make B feel more aligned with the audience and understated, community-led direction. Skepta and Fred Perry are credible London choices, though A’s high-profile framing feels less community-first._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Suchmos | Harunemuri | weak → weak |
| Collaboration brand | Beams | Neighborhood | supported → weak |
| Pop-up venue | Beams Japan | PARADISE TOKYO / WACKO MARIA | no support → supported |
| Creative direction | Utilitarian skatewear, understated Tokyo street style, community-led | Industrial utilitarian skatewear with oversized silhouettes | weak → supported |

Evidence judge: _A’s venue has strong audience and plan affinity (#5 and #3), with Neighborhood as its strongest link; B’s venue has no reported affinity, so it earns no venue-fit credit. Both plans include Tokyo-country choices and audience-aligned utilitarian direction, while B’s Beams scores strongly but its creative direction includes a community tag not characteristic in Tokyo._

Blind judge: _A pairs Tokyo-native Harunemuri and Neighborhood with a concrete streetwear venue and a coherent industrial direction that suits the brand. B is also locally recognizable, but Beams collaboration and venue feel less distinct for a skate-and-sneaker collector launch._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Black Alien | (same) | supported → supported |
| Collaboration brand | Piet | (same) | unresolved → unresolved |
| Pop-up venue | Galeria Olido | Cabaret da Cecília | unresolved → supported |
| Creative direction | Colourful DIY skate zine; rebellious, community-first energy | Bold-logo, colourful DIY skate-zine with rebellious, community-led energy | weak → supported |

Evidence judge: _Both plans have the same audience-supported, locally rooted act, and Piet is unverified in both; A additionally has an audience-ranked venue, while B's venue is unverified. A’s creative direction includes audience-ranked bold logos, whereas B’s community element is not characteristic in the evidence; neither plan has strong evidence that its choices cohere as a whole._

Blind judge: _Both plans pair São Paulo-relevant choices—Black Alien and Piet—with a colourful, rebellious DIY skate-zine direction that fits the brief. The venues are specific, but the plans give no event details that clearly establish which is the better skate-session setting._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Jordan Rakei | James Blake | weak → supported |
| Collaboration brand | HAY | Herschel Supply Co | weak → supported |
| Pop-up venue | Coal Drops Yard | Alfies Antique Market | no support → supported |
| Creative direction | Calm, crafted minimalism with warm tones and intimate live music | Understated elegance, minimal design, and a neutral palette | weak → supported |

Evidence judge: _A has stronger audience evidence: James Blake and Alfies rank highly, and the creative direction has audience-affinity signals; B’s act, brand, and creative tags are mostly outside the audience’s top 50 or unverified. A’s venue and James Blake also show plan coherence, while B’s venue is locally distinctive but has no affinity evidence; both venue descriptions are insufficient to verify event-hosting suitability._

Blind judge: _B’s HAY, Coal Drops Yard and Jordan Rakei form a recognisably London, design-led launch, and its warm, intimate direction fits the café’s calm craft. A is concrete and broadly on-brief, but Herschel feels less aligned with the audience and Alfies less connected to the launch’s minimal design cues._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Beams | Niko And... | supported → supported |
| Pop-up venue | Beams Japan | Honey Mi Honey | no support → supported |
| Creative direction | Gentle, playful Tokyo pop with clean pastel visuals | (same) | weak → weak |

Evidence judge: _Both plans have a well-ranked collaboration brand, an act outside the audience’s top 50, and the same creative direction; A’s venue ranks #4 for the audience and is locally distinctive, while B’s venue affinity is unreturned and it is not distinctive. Qloo’s descriptions identify both collaboration brands as Japanese brands, but do not establish either as a skincare partner; the venue and act descriptions do not verify event-hosting or audience fit._

Blind judge: _Both plans use a recognisable Tokyo pop act and a coherent local retail direction. A edges ahead because Honey Mi Honey and Niko And… feel more specifically aligned with playful, feminine beauty culture for women in their twenties than Beams’ broader lifestyle positioning._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | LiNikEr | (same) | weak → weak |
| Collaboration brand | Track&field | (same) | weak → weak |
| Pop-up venue | Parque Ibirapuera | Casarìa SP | unresolved → supported |
| Creative direction | Energetic, inclusive performance; São Paulo street-run grit | Dynamic, technical performance with sleek functional design | weak → supported |

Evidence judge: _Both plans have the same unranked act and collaboration brand, and neither description establishes that they can serve as an ambassador or credible product partner; A’s venue is ranked #12 for the audience and described as distinctive, while B’s venue is unverified. A’s creative tags rank well for the audience and are locally distinctive, whereas B’s audience tags are mostly unranked and its Urban tag is not locally distinctive; neither plan provides evidence that its venue can host the event._

Blind judge: _Both plans use locally relevant names, but Parque Ibirapuera is a natural, recognisable setting for a São Paulo run-club launch, and B’s inclusive street-run direction fits the brief especially well. Casarìa SP feels less connected to running, while A’s sleek functional direction is less clearly energetic and inclusive._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Hinds | Miss Caffeina | weak → supported |
| Collaboration brand | La Virgen | (same) | unresolved → unresolved |
| Pop-up venue | Sala El Sol | Wurlitzer Ballroom | unresolved → supported |
| Creative direction | Warm, local indie energy; unpolished and welcoming | (same) | weak → weak |

Evidence judge: _A has strong audience evidence for Miss Caffeina (#3, with a strong Love of Lesbian link) and measured coherence with Wurlitzer Ballroom; B’s Hinds is outside the audience’s top 50, and its other choices are unverified. Both plans share creative tags with mixed local signals, while Qloo’s descriptions support both acts as indie bands and cannot verify either partnership or venue role._

Blind judge: _Both plans pair Madrid-relevant acts and La Virgen with a clear, fitting local venue and direction. Hinds and Sala El Sol make B especially resonant for Madrid indie fans._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Juanito Makandé | weak → weak |
| Collaboration brand | Thinking MU | Arizona Vintage | unresolved → supported |
| Pop-up venue | La Casa Encendida | (same) | supported → supported |
| Creative direction | Mediterranean minimalism, honest materials, modern warmth | Modern aesthetics, handcrafted sustainability | weak → weak |

Evidence judge: _A has stronger audience and local evidence: Arizona Vintage and the venue rank well, and the act and collaborator are placed in Madrid’s country; however, Qloo describes Arizona Vintage as offering mainstream brands and does not establish it as a sustainable collaborator, so the no-fast-fashion constraint is unverified. B’s Thinking MU is also unverified, and its act and creative direction have weak evidence, but the evidence does not establish a constraint violation, giving B a slight brief-fit edge._

Blind judge: _B pairs Madrid-relevant JUDELINE and sustainable Barcelona label Thinking MU with a fitting local venue and a clear Mediterranean direction. A has a concrete venue and act, but Arizona Vintage is an unclear fit for the no-fast-fashion constraint and the concept feels less cohesive._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DIVINE | (same) | unresolved → unresolved |
| Collaboration brand | Puma | Skult | no support → weak |
| Pop-up venue | antiSOCIAL, Mumbai | The Habitat | unresolved → supported |
| Creative direction | Bold Mumbai streetwear; gritty, high-energy hip-hop | Bold, vibrant homegrown street craft | weak → weak |

Evidence judge: _A has stronger measured Mumbai audience and plan coherence evidence: The Habitat ranks #2 for the audience and #1 with Skult, while two creative tags rank locally (#12 and #34). B’s Puma has no returned audience affinity and is described as a global default, and its creative tags show limited local support; DIVINE is unverified in both plans, and antiSOCIAL is unverified, not evidence against B._

Blind judge: _Both use the locally resonant DIVINE and fit the bold, homegrown brief, but B’s Mumbai antiSOCIAL event and gritty hip-hop direction form a clearer, more usable launch package. Puma is a global rather than homegrown collaborator, though it aligns with the audience’s sneaker interests._

## Cost

Mean 64 s per brief, 412 Qloo calls (counted before the cache), 8.8 model calls. Repair rounds used: 3, 4, 4, 4, 2, 4, 3, 3, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
