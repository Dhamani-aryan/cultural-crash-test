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
| Supported choices, in-run (9 briefs, 36 choices) | 9 | 27 |
| Mean plan score, in-run (app-defined, 0–100) | 64 | 82 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **7** | **18** |
| Mean plan score, held-out anchors | 61 | 75 |
| Briefs where held-out support rose / fell | – | 8 / 0 |
| Draft choices not found in Qloo at all | 9 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **9**, the draft in **0**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.4 | 3.9 |
| localFit | 2.4 | 3.5 |
| coherence | 2.2 | 3.9 |
| briefFit | 3.1 | 3.6 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **1**, the draft in **8**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.8 | 4.0 |
| specificity | 4.9 | 4.8 |
| coherence | 4.9 | 3.6 |
| constraints | 4.7 | 4.0 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 3 → 10 of 24; evidence judge agent 6 / draft 0 / tie 0; blind judge agent 0 / draft 6 / tie 0.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Slam City Skates → Fred Perry; Nia Archives → slowthai | 2 → 4 | 2 → 4 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Asics → Neighborhood; Understated industrial utility with Tokyo street-documentary energy → Minimalistic industrial utility with Tokyo street-documentary energy | 1 → 3 | 2 → 2 | agent | agent | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | Praça Roosevelt → Pista De Skate Sumaré; Colour-saturated DIY graphics, rebellious energy and community-first street style → Colorful DIY graphic designs with rebellious energy | 0 → 2 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | HAY → Allsaints; Floating Points → SBTRKT | 2 → 4 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | UNKNOWN HARAJUKU → Hasabon | 2 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | High-energy urban performance, inclusive community spirit and technical precision → Dynamic, sleek, functional urban running; Casa das Caldeiras → Bourbon Street Music Club | 0 → 2 | 1 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Sala El Sol → Wurlitzer Ballroom | 1 → 2 | 1 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Camper → Maria Escote; Sun-washed Mediterranean minimalism; honest, tactile and modern → Beach-inspired Mediterranean simplicity; honest, handcrafted and modern; JUDELINE → Miss Caffeina | 1 → 4 | 1 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | Bold Mumbai street culture, gritty local textures and high-energy hip-hop visuals → Bold homegrown color and crafted texture; Almost Gods → Koovs; VegNonVeg → antiSOCIAL Lower Parel | 0 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Nia Archives | slowthai | weak → supported |
| Collaboration brand | Slam City Skates | Fred Perry | unresolved → supported |
| Pop-up venue | Village Underground | (same) | supported → supported |
| Creative direction | Understated industrial utility with DIY skate energy | (same) | supported → supported |

Evidence judge: _Plan A has stronger direct audience evidence: slowthai ranks #1, Fred Perry #50, and its industrial/utilitarian direction ranks #2/#8; Plan B’s act is outside the top 50 and Slam City Skates is unverified. B has stronger venue coherence (#1), but A has broader verified coherence and role fit across its choices._

Blind judge: _Nia Archives and Slam City Skates give B a credible London youth-culture and skate connection, while fitting the community-led, understated industrial direction. A is concrete, but Fred Perry feels less skate-specific and slowthai is a weaker fit for this launch._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Keiju | (same) | weak → weak |
| Collaboration brand | Asics | Neighborhood | weak → weak |
| Pop-up venue | Ba-Tsu Art Gallery | (same) | supported → supported |
| Creative direction | Understated industrial utility with Tokyo street-documentary energy | Minimalistic industrial utility with Tokyo street-documentary energy | supported → supported |

Evidence judge: _Plan A has stronger audience and internal evidence: its utilitarian and minimalistic tags rank #5 and #3, the venue ranks #5 for coherence, and Neighborhood is explicitly a Japanese streetwear brand. Plan B’s Asics and Keiju fall outside the coherence top 50, while its creative tags are less coherent and no more locally distinctive._

Blind judge: _Neighborhood is more tightly aligned with Tokyo’s streetwear and skate culture than the broader sportswear positioning of ASICS, making A the more coherent fit; both plans are concrete but leave the community-led attribute underdeveloped._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | weak → weak |
| Collaboration brand | ÖUS | (same) | unresolved → unresolved |
| Pop-up venue | Praça Roosevelt | Pista De Skate Sumaré | unresolved → supported |
| Creative direction | Colour-saturated DIY graphics, rebellious energy and community-first street style | Colorful DIY graphic designs with rebellious energy | weak → supported |

Evidence judge: _Plan A has stronger support from the distinctive São Paulo skate venue, its #1 coherence ranking, and three audience-backed creative tags. Plan B's venue is unverified, its community tag lacks audience and local support, and its resolved choices have less coherence evidence._

Blind judge: _Both plans are strongly grounded in São Paulo skate culture, but Praça Roosevelt is the more iconic street-skating setting and Plan B’s community-first direction more fully connects the brief’s attributes._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Floating Points | SBTRKT | weak → weak |
| Collaboration brand | HAY | Allsaints | weak → supported |
| Pop-up venue | Protein Studios Shoreditch | (same) | weak → weak |
| Creative direction | Calm modernism, tactile materials and precise sensory details | (same) | weak → weak |

Evidence judge: _Plan A has stronger evidenced audience and internal fit: AllSaints ranks #36 for the audience and SBTRKT ranks #7 for coherence, while Plan B's named choices are outside the relevant top 50 except its creative direction's Minimalist Design at #16 for coherence. A is also more locally grounded because both SBTRKT and AllSaints originate in London's country, whereas HAY is Danish; both plans share the same locally nondistinctive venue and well-aligned creative direction._

Blind judge: _Floating Points has strong London credibility, while HAY closely matches the audience’s design sensibility and the calm, crafted aesthetic. AllSaints feels less distinctive and less coherent with Fieldwork’s minimal craft positioning._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Sanrio | (same) | no support → no support |
| Pop-up venue | UNKNOWN HARAJUKU | Hasabon | unresolved → supported |
| Creative direction | Soft-clean kawaii with luminous pastels and playful pop energy | (same) | weak → weak |

Evidence judge: _Both plans have strong evidence for Clean, country-local Japanese partners, and coherence between Wednesday Campanella, Sanrio, and the playful-pastel direction. Plan A is better supported because Hasabon is a Tokyo venue with #10 audience affinity and measurable plan coherence, while Plan B's venue is unverified._

Blind judge: _Both plans use highly relevant Tokyo pop-culture choices, but UNKNOWN HARAJUKU better connects the playful Sanrio and Wednesday Campanella direction with the target audience’s beauty-shopping circuit._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Tasha & Tracie | (same) | weak → weak |
| Collaboration brand | Strava | (same) | supported → supported |
| Pop-up venue | Casa das Caldeiras | Bourbon Street Music Club | weak → supported |
| Creative direction | High-energy urban performance, inclusive community spirit and technical precision | Dynamic, sleek, functional urban running | weak → supported |

Evidence judge: _Plan A has strong audience evidence for Strava, Bourbon Street Music Club, and its creative tags, with the venue and creative direction also showing São Paulo distinctiveness; Plan B relies mainly on Strava, while its venue, creative tags, and most coherence signals fall outside the top lists. Plan B more directly reflects all three brand attributes, but neither venue has a Qloo description establishing event-hosting capability._

Blind judge: _Casa das Caldeiras is a more distinctive São Paulo setting for a large, energetic community run launch, and B’s direction clearly unites inclusivity, performance and technical precision. Both plans lack an explicitly named ambassador._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | CARIÑO | (same) | no support → no support |
| Collaboration brand | Pompeii | (same) | unresolved → unresolved |
| Pop-up venue | Sala El Sol | Wurlitzer Ballroom | unresolved → supported |
| Creative direction | Warm neighborhood energy, analog gig-poster graphics, candid and unpretentious | (same) | supported → supported |

Evidence judge: _Both plans have audience-supported creative tags but no audience affinity for CARIÑO, while Pompeii is unverified. Plan A has additional support from Wurlitzer Ballroom’s audience affinity (0.735) and strong plan coherence (0.923), whereas Plan B’s venue is unverified._

Blind judge: _Both plans use strong Madrid-specific choices, but Sala El Sol is a more iconic, credible fit for the city’s indie audience and creates a more coherent live-music launch._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Miss Caffeina | weak → weak |
| Collaboration brand | Camper | Maria Escote | weak → supported |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Sun-washed Mediterranean minimalism; honest, tactile and modern | Beach-inspired Mediterranean simplicity; honest, handcrafted and modern | weak → weak |

Evidence judge: _Plan A has stronger audience and internal-plan rankings, with Maria Escote at #40, Matadero Madrid at #6, and strong coherence for Miss Caffeina (#1) and the venue (#2); its act and collaborator also have Spanish origins and Matadero is distinctive to Madrid. Plan B gains brief-fit support from Camper’s stated sustainability, but most of its choices and aesthetic tags fall outside the relevant top lists, while neither plan provides a Qloo description establishing Matadero’s hosting capability._

Blind judge: _B better connects Madrid’s young, Rosalía-adjacent audience with JUDELINE while Camper reinforces the modern Mediterranean capsule concept. Both are concrete and avoid fast-fashion collaborators, but B is more culturally cohesive._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DIVINE | (same) | unresolved → unresolved |
| Collaboration brand | Almost Gods | Koovs | unresolved → weak |
| Pop-up venue | VegNonVeg | antiSOCIAL Lower Parel | unresolved → supported |
| Creative direction | Bold Mumbai street culture, gritty local textures and high-energy hip-hop visuals | Bold homegrown color and crafted texture | weak → weak |

Evidence judge: _Plan A has strong evidence for antiSOCIAL (#3 audience venue and locally distinctive) and high coherence among its creative tags, venue, and Koovs, though Koovs itself is outside the audience top 50 and DIVINE is unverified. Plan B's act, brand, and venue are unverified, while all three creative tags are outside the audience and local characteristic lists._

Blind judge: _B pairs Mumbai-relevant DIVINE with homegrown streetwear label Almost Gods and sneaker hub VegNonVeg, creating a more cohesive, locally grounded launch than A’s less distinctive Koovs collaboration._

## Cost

Mean 88 s per brief, 377 Qloo calls (counted before the cache), 7.8 model calls. Repair rounds used: 2, 3, 4, 2, 1, 4, 2, 3, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
