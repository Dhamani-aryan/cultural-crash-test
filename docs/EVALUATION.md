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
| Supported choices, in-run (9 briefs, 36 choices) | 4 | 26 |
| Mean plan score, in-run (app-defined, 0–100) | 65 | 85 |
| **Supported choices, held-out anchors** (8 briefs, 32 choices) | **3** | **16** |
| Mean plan score, held-out anchors | 60 | 78 |
| Briefs where held-out support rose / fell | – | 6 / 0 |
| Draft choices not found in Qloo at all | 7 of 36 | – |

### Evidence-based judge (primary)

8 pairs. Prefers the agent's plan in **7**, the draft in **0**, tie in **1**. The two orders agreed on 8 of 8.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 1.9 | 3.4 |
| localFit | 2.4 | 3.3 |
| coherence | 2.1 | 3.9 |
| briefFit | 3.1 | 3.6 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **0**, the draft in **6**, tie in **3**. The two orders agreed on 7 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.7 | 3.9 |
| specificity | 4.6 | 4.5 |
| coherence | 4.6 | 3.7 |
| constraints | 4.8 | 4.1 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 14 of 24; evidence judge agent 6 / draft 0 / tie 0; blind judge agent 0 / draft 4 / tie 2.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Vans → Fred Perry; Nia Archives → Skepta; Utilitarian skate-shop grit; understated graphics, warm community energy → Utilitarian industrial grit with traditional skate-shop roots | 1 → 4 | 1 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Beams Japan → Supreme Shibuya; Understated utility, skate culture, and Tokyo jazz warmth → Classic industrial utility; Beams → Neighborhood | 0 → 3 | – | – | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | none | 0 → 0 | 0 → 0 | tie | tie | Further repairs stopped improving the plan |
| london-coffee | London | heldout | Coal Drops Yard → Alfies Antique Market; Calm, crafted minimalism; warm tones and intimate live music → Neutral palette, understated elegance, crafted minimalism; Jordan Rakei → James Blake; HAY → Herschel Supply Co | 0 → 4 | 0 → 4 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Shibuya Parco → NEWoMan Shinjuku; Gentle, playful kawaii with clean, luminous skincare visuals → Gentle, refined skincare with bright colors and whimsical kawaii visuals | 1 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | Adidas → Mizuno; Casa das Caldeiras → Terra Quintal; Technical streetwear, high-energy and welcoming → Technical, dynamic, sleek design | 0 → 3 | 0 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Sala El Sol → Wurlitzer Ballroom; Carolina Durante → Miss Caffeina; Warm, unpolished Madrid indie; intimate gig-poster energy → Warm, approachable Madrid indie with intimate gig-poster energy | 0 → 3 | 0 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | JUDELINE → Miss Caffeina | 2 → 3 | 2 → 2 | agent | tie | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | The Bombay Canteen → Gateway Taproom, BKC; Bold Mumbai streetwear, hip-hop energy, and homegrown pride → Bold, vibrant Mumbai streetwear with intricate embroidery and homegrown pride; Bhaane → Koovs | 0 → 3 | 0 → 1 | agent | tie | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Wood Wood (left out because a plan uses them as a choice: Skepta).

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Nia Archives | Skepta | weak → supported |
| Collaboration brand | Vans | Fred Perry | no support → weak |
| Pop-up venue | Village Underground | (same) | supported → supported |
| Creative direction | Utilitarian skate-shop grit; understated graphics, warm community energy | Utilitarian industrial grit with traditional skate-shop roots | weak → weak |

Evidence judge: _A has stronger audience and plan-coherence evidence: Skepta ranks #10 for the audience and #3 with the rest of the plan, while B’s act is outside the top 50 on both measures and its collaboration brand has no returned affinity. A’s utilitarian and industrial direction also has stronger audience and coherence signals; both plans share the same venue, which Qloo describes as a London venue, and B’s skate-shop direction better states the community-led brief but its community tag lacks support._

Blind judge: _Both plans use a credible East London venue and concrete choices, but Nia Archives and Vans align especially well with the young skate audience and the brief’s community-led, understated direction. Skepta and Fred Perry are locally legible, though the pairing feels less specifically rooted in skate-shop community._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: –.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Nujabes | (same) | – |
| Collaboration brand | Beams | Neighborhood | – |
| Pop-up venue | Beams Japan | Supreme Shibuya | – |
| Creative direction | Understated utility, skate culture, and Tokyo jazz warmth | Classic industrial utility | – |

Blind judge: _Both plans draw on Nujabes and credible Tokyo collaborators, but A’s Supreme Shibuya venue is a competitor-led choice that sits awkwardly with a community-led launch. B’s Beams pairing and venue form a coherent local platform, and its creative direction connects the utility brief to Tokyo skate and jazz culture._

Note: held-out anchors not found: WTAPS, Cav Empt

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme, Emicida.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Rashid | (same) | unresolved → unresolved |
| Collaboration brand | Converse | (same) | no support → no support |
| Pop-up venue | Pista de Skate da Praça Roosevelt | (same) | unresolved → unresolved |
| Creative direction | Colour-saturated skate zine energy; rebellious, DIY and community-led | (same) | weak → weak |

Evidence judge: _Both plans have identical evidence: the creative tags Rebellious and Bold Colors have some São Paulo affinity and local distinctiveness, while Community is not characteristic; Converse has no measured audience affinity and is a global default. The act and venue are unverified, so they earn no evidence-based fit credit but are not evidence of poor fit._

Blind judge: _Both plans name São Paulo-relevant choices, including Rashid and Praça Roosevelt, and their colourful DIY direction fits the brand. They are identical; a clearer link between the music act and skate audience could strengthen either plan._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Jordan Rakei | James Blake | weak → supported |
| Collaboration brand | HAY | Herschel Supply Co | weak → supported |
| Pop-up venue | Coal Drops Yard | Alfies Antique Market | no support → supported |
| Creative direction | Calm, crafted minimalism; warm tones and intimate live music | Neutral palette, understated elegance, crafted minimalism | weak → supported |

Evidence judge: _A has stronger audience affinity evidence, notably James Blake (#4) and Alfies Antique Market (#1), while B’s act, collaboration brand, and aesthetics are outside the audience’s top 50. A’s choices are not uniformly London-distinctive, but its act and venue have stronger plan coherence; Qloo describes B’s venue as distinctive, though provides no affinity evidence for it._

Blind judge: _B pairs London-relevant Coal Drops Yard and design-led HAY with a music choice and warm, intimate direction suited to the brief. A is specific and polished, but Herschel feels less aligned with the audience’s design references, and Alfies is a less natural launch setting._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | kyary pamyu pamyu | (same) | weak → weak |
| Collaboration brand | Sanrio | (same) | no support → no support |
| Pop-up venue | Shibuya Parco | NEWoMan Shinjuku | no support → supported |
| Creative direction | Gentle, playful kawaii with clean, luminous skincare visuals | Gentle, refined skincare with bright colors and whimsical kawaii visuals | weak → weak |

Evidence judge: _A has a top-ranked audience venue with a link to Aimyon and is distinctive to Tokyo; B’s venue has no reported audience affinity and is not distinctive. Both plans have the same locally rooted act and collaboration brand, but no audience affinity is reported for Sanrio, and both creative directions include aesthetics not characteristic of this audience._

Blind judge: _Both plans use highly relevant Tokyo pop-culture collaborators and concrete venues. B’s playful kawaii direction more naturally unites Kyary, Sanrio, and the brand attributes, while Shibuya Parco is a strong fit for a pop-culture-facing launch._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Garmin, Nike (left out because a plan uses them as a choice: Adidas).

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Rashid | (same) | unresolved → unresolved |
| Collaboration brand | Adidas | Mizuno | no support → supported |
| Pop-up venue | Casa das Caldeiras | Terra Quintal | weak → supported |
| Creative direction | Technical streetwear, high-energy and welcoming | Technical, dynamic, sleek design | weak → supported |

Evidence judge: _A has audience affinity for Mizuno and Terra Quintal, distinctive local evidence for Mizuno, and strong coherence between the venue, brand, and two creative tags; Qloo does not verify Rashid. B has no Adidas affinity, weaker venue affinity, and no plan-coherence evidence for its brand, venue, or creative tags. Both collaboration brands are described as sportswear brands, but the evidence does not establish that either venue can host the event._

Blind judge: _Both plans use São Paulo-relevant choices, but Adidas and Casa das Caldeiras give B a stronger urban, high-energy setting for an inclusive run-club launch. A is also coherent and concrete, though its sleek direction feels less welcoming._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Carolina Durante | Miss Caffeina | weak → supported |
| Collaboration brand | Mahou | (same) | unresolved → unresolved |
| Pop-up venue | Sala El Sol | Wurlitzer Ballroom | unresolved → supported |
| Creative direction | Warm, unpolished Madrid indie; intimate gig-poster energy | Warm, approachable Madrid indie with intimate gig-poster energy | weak → supported |

Evidence judge: _A has stronger audience evidence: Miss Caffeina ranks #3, and its choices show strong measured coherence, while B’s act is outside the audience’s top 50 and its other choices are unverified. Both acts are described as Spanish indie bands and both plans use Madrid-local creative cues, but A’s venue is verified in Madrid; unverified choices earn no credit, not a penalty._

Blind judge: _Both plans use concrete, Madrid-relevant choices and suit the brief. Carolina Durante and Sala El Sol make B feel especially aligned with the audience’s indie tastes and the warm, unpolished direction._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: C.Tangana, Camper (left out because a plan uses them as a choice: Veja).

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Miss Caffeina | weak → weak |
| Collaboration brand | Veja | (same) | unresolved → unresolved |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Honest Mediterranean minimalism; sun-washed tones, modern textures, and intimate live performance | (same) | supported → supported |

Evidence judge: _Both plans share a locally distinctive venue with strong audience affinity, weakly evidenced aesthetics, and an unverified Veja collaboration, so those provide no comparative advantage. A is better supported because Miss Caffeina is Madrid-origin and ranks #1 for coherence with the rest of its plan, while JUDELINE is outside the local list and outside the plan’s top 50 for coherence; neither act has demonstrated top-50 audience affinity._

Blind judge: _Both plans pair a Madrid-relevant venue and credible sustainable collaborator with a clear Mediterranean direction. Miss Caffeina and JUDELINE are both plausible local music choices; the brief gives no basis to prefer one._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DIVINE | (same) | unresolved → unresolved |
| Collaboration brand | Bhaane | Koovs | weak → weak |
| Pop-up venue | The Bombay Canteen | Gateway Taproom, BKC | no support → supported |
| Creative direction | Bold Mumbai streetwear, hip-hop energy, and homegrown pride | Bold, vibrant Mumbai streetwear with intricate embroidery and homegrown pride | weak → weak |

Evidence judge: _A has stronger audience evidence through Gateway Taproom (#21, linked to Badshah) and stronger creative-aesthetic rankings; B’s venue has no returned affinity and its audience evidence is limited. Both plans use unverified DIVINE and brands outside the audience’s top 50, while Qloo’s descriptions establish fashion roles but not a sneaker collaboration; both venues are described as locally distinctive._

Blind judge: _Both use a strong Mumbai-relevant act and clear local streetwear direction. A’s taproom setting and Koovs collaboration fit the streetwear drop more naturally, while B’s Bombay Canteen feels less aligned with a sneaker-and-hip-hop launch._

## Cost

Mean 50 s per brief, 137 Qloo calls (counted before the cache), 7.6 model calls. Repair rounds used: 3, 3, 1, 4, 2, 3, 4, 1, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
