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
| Mean plan score, in-run (app-defined, 0–100) | 62 | 85 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **4** | **22** |
| Mean plan score, held-out anchors | 60 | 79 |
| Briefs where held-out support rose / fell | – | 9 / 0 |
| Draft choices not found in Qloo at all | 11 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **9**, the draft in **0**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.3 | 4.2 |
| localFit | 2.0 | 3.6 |
| coherence | 1.9 | 3.9 |
| briefFit | 2.7 | 3.6 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **0**, the draft in **9**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.7 | 3.8 |
| specificity | 4.9 | 4.6 |
| coherence | 4.9 | 3.5 |
| constraints | 4.8 | 3.9 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 14 of 24; evidence judge agent 6 / draft 0 / tie 0; blind judge agent 0 / draft 6 / tie 0.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Vans → Dxpe Chef; CASisDEAD → Skepta; Village Underground → Brixton Jamm | 1 → 4 | 1 → 4 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Hender Scheme → Wacko Maria; WAG GALLERY → THE A.I.R BUILDING; Understated industrial utility with raw skate documentation and a muted technical palette → Playful industrial utility | 0 → 3 | 1 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | Pista de Skate do Parque Cândido Portinari → Pista De Skate Sumaré; Colour-saturated DIY skate energy with rebellious graphics and a community-first tone → Colorful rebellious skate energy with authentic local roots | 0 → 2 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Warm minimalism, tactile craftsmanship, quietly cultured → Calm neutral minimalism with crafted precision; Jordan Rakei → Ghostpoet; HAY → Herschel Supply Co | 1 → 4 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Sanrio → Uniqlo; ZeroBase Shibuya → Jazz House ALFIE | 2 → 4 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | ARCA → Bourbon Street Music Club; High-energy urban performance lab; inclusive, technical and kinetic → Dynamic, inclusive technical urban performance | 0 → 2 | 1 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Sala El Sol → Wurlitzer Ballroom; Carolina Durante → Miss Caffeina; Warm neighborhood energy, candid gig photography and unfussy Madrid character → Warm cultural energy, candid gig photography, and intimate Madrid character | 0 → 3 | 0 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Thinking MU → Arizona Vintage; Sun-washed Mediterranean minimalism; honest, tactile and modern → Handcrafted Mediterranean simplicity with modern honesty; JUDELINE → Miss Caffeina | 1 → 4 | 1 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | Divine → Badshah; Bold Mumbai street culture with gritty, homegrown hip-hop energy → Vibrant, texture-rich homegrown Mumbai street culture; Almost Gods → Koovs; VegNonVeg Mumbai → antiSOCIAL Lower Parel | 0 → 4 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | CASisDEAD | Skepta | weak → supported |
| Collaboration brand | Vans | Dxpe Chef | no support → supported |
| Pop-up venue | Village Underground | Brixton Jamm | weak → supported |
| Creative direction | Understated industrial utility with raw skate energy | (same) | supported → supported |

Evidence judge: _Plan A has ranked audience affinity for all three scored choices, London-linked Skepta and Dxpe Chef, and strong plan-level links around Brixton Jamm and the industrial aesthetic. Plan B has no Vans affinity, weak/outside-top-50 act and venue evidence, and its act is tied to Korea rather than London; neither venue has a Qloo description confirming hosting suitability._

Blind judge: _CASisDEAD and Village Underground give B a sharper East London fit and coherent industrial mood, while Vans is generic but directly skate-relevant; A’s Brixton venue pulls the launch away from its stated audience geography._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Stuts | (same) | weak → weak |
| Collaboration brand | Hender Scheme | Wacko Maria | unresolved → supported |
| Pop-up venue | WAG GALLERY | THE A.I.R BUILDING | unresolved → supported |
| Creative direction | Understated industrial utility with raw skate documentation and a muted technical palette | Playful industrial utility | supported → weak |

Evidence judge: _Plan A has verified audience support for Wacko Maria (#19), THE A.I.R BUILDING (#3), and the Industrial and Utilitarian directions, plus strong measured plan coherence led by the venue (#1). Plan B leaves its collaboration brand and venue unverified, while its only resolved act is outside the audience’s top 50 and no cross-choice coherence was measured._

Blind judge: _Both use credible Tokyo references, but B better unifies Hender Scheme, WAG GALLERY, and raw skate documentation around the brand’s understated, utilitarian, community-led positioning._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | weak → weak |
| Collaboration brand | ÖUS | (same) | unresolved → unresolved |
| Pop-up venue | Pista de Skate do Parque Cândido Portinari | Pista De Skate Sumaré | unresolved → supported |
| Creative direction | Colour-saturated DIY skate energy with rebellious graphics and a community-first tone | Colorful rebellious skate energy with authentic local roots | weak → supported |

Evidence judge: _Plan A has verified audience and local support from Pista De Skate Sumaré, plus strong venue–act coherence (0.959; Tasha & Tracie link 1.00) and audience-ranked creative tags. Plan B leaves both the venue and collaboration brand unverified, while its Community tag lacks audience, local, and coherence support._

Blind judge: _Both plans use highly relevant São Paulo cultural choices, but B’s more concrete creative direction makes the launch slightly more actionable and cohesive._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Jordan Rakei | Ghostpoet | weak → weak |
| Collaboration brand | HAY | Herschel Supply Co | weak → supported |
| Pop-up venue | Protein Studios Shoreditch | (same) | weak → weak |
| Creative direction | Warm minimalism, tactile craftsmanship, quietly cultured | Calm neutral minimalism with crafted precision | weak → supported |

Evidence judge: _Plan A has stronger audience evidence through Herschel (#28) and three top-50 aesthetics, plus stronger internal links, while Plan B’s act, brand, and most coherence signals fall outside the top 50. A also has more UK-origin evidence, though neither plan’s venue description verifies its ability to host the launch._

Blind judge: _B pairs a London-relevant artist and Shoreditch venue with HAY’s design credibility, creating a cohesive warm, crafted launch. A is usable, but Herschel feels more generic and less aligned with the audience’s refined minimalism._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Sanrio | Uniqlo | no support → supported |
| Pop-up venue | ZeroBase Shibuya | Jazz House ALFIE | unresolved → supported |
| Creative direction | Gentle pastel futurism with playful, clean kawaii details | (same) | weak → weak |

Evidence judge: _Plan A has stronger audience evidence through Uniqlo (#9) and Jazz House ALFIE (#6), while Plan B has no audience affinity for Sanrio and no Qloo evidence for its venue. Both use a Japan-origin act and on-brief creative direction, but neither venue’s ability to host the pop-up is verified by a Qloo description._

Blind judge: _B tightly matches Tokyo beauty-pop culture through Sanrio, Wednesday Campanella, and a visible Shibuya pop-up venue, all unified by the kawaii-futurist direction. A is concrete but Uniqlo feels generic and Jazz House ALFIE is poorly aligned with a playful skincare launch._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DJ Nyack | (same) | unresolved → unresolved |
| Collaboration brand | Strava | (same) | supported → supported |
| Pop-up venue | ARCA | Bourbon Street Music Club | weak → supported |
| Creative direction | High-energy urban performance lab; inclusive, technical and kinetic | Dynamic, inclusive technical urban performance | weak → supported |

Evidence judge: _Plan A has stronger São Paulo audience evidence: Bourbon Street Music Club ranks #1, all three creative tags rank in the audience’s top 50, and its venue and creative direction show strong plan coherence. Both plans have an unverified act and lack Qloo descriptions confirming that their venues can host a run event, while Strava is credibly relevant to running but not locally distinctive._

Blind judge: _Both use credible São Paulo talent and concrete partners, but ARCA better supports a large, kinetic run-club activation than the more music-led Bourbon Street venue._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Carolina Durante | Miss Caffeina | weak → supported |
| Collaboration brand | Pompeii | (same) | unresolved → unresolved |
| Pop-up venue | Sala El Sol | Wurlitzer Ballroom | unresolved → supported |
| Creative direction | Warm neighborhood energy, candid gig photography and unfussy Madrid character | Warm cultural energy, candid gig photography, and intimate Madrid character | weak → supported |

Evidence judge: _Plan A has stronger audience evidence through Miss Caffeina (#3), supported aesthetics, and measurable high coherence with Wurlitzer Ballroom. Plan B has fewer resolved choices, an act outside the audience’s top 50, and weaker or unmeasured coherence and local evidence._

Blind judge: _Both plans are concrete and distinctly Madrid, but Carolina Durante and the iconic Sala El Sol create a particularly credible, unpretentious neighborhood-indie launch that aligns closely with the audience._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Miss Caffeina | weak → weak |
| Collaboration brand | Thinking MU | Arizona Vintage | unresolved → supported |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Sun-washed Mediterranean minimalism; honest, tactile and modern | Handcrafted Mediterranean simplicity with modern honesty | weak → weak |

Evidence judge: _Plan A has stronger audience evidence through Arizona Vintage (#12), Matadero Madrid (#6), and high coherence for Miss Caffeina (#1), while its vintage collaborator is consistent with the sustainability brief and is not identified as fast fashion. Plan B shares the strong venue but has no Qloo evidence for its collaborator, and its act and creative tags fall outside the relevant top lists._

Blind judge: _B better connects Rosalía-adjacent Spanish music with a credible sustainable label, while its Mediterranean direction and Matadero setting form a cohesive Madrid launch._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Divine | Badshah | no support → weak |
| Collaboration brand | Almost Gods | Koovs | unresolved → weak |
| Pop-up venue | VegNonVeg Mumbai | antiSOCIAL Lower Parel | unresolved → supported |
| Creative direction | Bold Mumbai street culture with gritty, homegrown hip-hop energy | Vibrant, texture-rich homegrown Mumbai street culture | weak → supported |

Evidence judge: _Plan A has strong audience and cross-plan evidence, including antiSOCIAL at #3 and highly ranked Rich Textures and Cultural Pride, while its act and partner are India-origin and role-relevant. Plan B has no affinity or coherence support, two unverified choices, weak aesthetic rankings, and Qloo identifies Divine as a US dance-scene performer rather than a Mumbai hip-hop act._

Blind judge: _B directly connects Mumbai’s sneaker scene with DIVINE, Almost Gods, and VegNonVeg, creating a cohesive, distinctly homegrown launch. A has a credible venue but Badshah and Koovs feel less locally rooted and culturally focused._

## Cost

Mean 104 s per brief, 415 Qloo calls (counted before the cache), 9.1 model calls. Repair rounds used: 3, 4, 4, 3, 2, 4, 4, 3, 4.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
