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
| Supported choices, in-run (9 briefs, 36 choices) | 5 | 26 |
| Mean plan score, in-run (app-defined, 0–100) | 62 | 82 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **4** | **19** |
| Mean plan score, held-out anchors | 59 | 75 |
| Briefs where held-out support rose / fell | – | 7 / 0 |
| Draft choices not found in Qloo at all | 7 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **7**, the draft in **1**, tie in **1**. The two orders agreed on 8 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.1 | 3.6 |
| localFit | 2.7 | 3.4 |
| coherence | 2.1 | 3.5 |
| briefFit | 3.1 | 3.7 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **2**, the draft in **4**, tie in **3**. The two orders agreed on 7 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.5 | 4.2 |
| specificity | 4.4 | 4.3 |
| coherence | 4.5 | 4.1 |
| constraints | 4.7 | 4.4 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 1 → 12 of 24; evidence judge agent 5 / draft 0 / tie 1; blind judge agent 0 / draft 4 / tie 2.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Vans → Dxpe Chef; Utilitarian skate-shop textures, understated graphics, community-led energy → Utilitarian skate textures, monochrome graphics, oversized silhouettes | 1 → 3 | 0 → 2 | agent | tie | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | Understated Tokyo skate utility; community-led and music-driven → Industrial utility with classic, community-led details; Beams → Neighborhood | 1 → 3 | 2 → 2 | draft | agent | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | Casa de Cultura do Parque → Alvenaria Bar e Espaço Cultural; Colour-saturated DIY skate zine; rebellious, communal energy → Bold-logo, colorful graphic skate zine | 0 → 2 | 1 → 3 | agent | agent | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Warm minimalism, tactile craft, calm live-session energy → Neutral palettes, understated elegance, crafted minimalism; Jordan Rakei → James Blake; The Hoxton, Shoreditch → The Table Café | 0 → 3 | 0 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Laforet Harajuku → MAGNET by SHIBUYA109 | 2 → 3 | 0 → 1 | agent | tie | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | Energetic, inclusive technical running culture with bold São Paulo street-level color → Dynamic, technical, inclusive run-club performance; Parque Ibirapuera → Terra Quintal | 0 → 2 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Levi Strauss & Co. → Hawkers; Sala El Sol → Sala Siroco; Carolina Durante → Lori Meyers; Warm, lived-in Madrid indie; unpretentious and communal → Warm, culturally rooted, comfortable Madrid indie; approachable and communal | 0 → 4 | 0 → 4 | agent | tie | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Mediterranean minimalism, honest materials, modern warmth → Honest Mediterranean materials, innovative modern design, handcrafted warmth; JUDELINE → Juanito Makandé | 1 → 3 | 1 → 1 | tie | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | Bold Mumbai streetwear, gritty hip-hop energy, homegrown pride → Bold, vibrant sneakers with intricate embroidery and rich textures; Superkicks → Skult; Superkicks Bandra → The Habitat | 0 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Skinnyman | (same) | no support → no support |
| Collaboration brand | Vans | Dxpe Chef | no support → supported |
| Pop-up venue | Rough Trade East | (same) | weak → weak |
| Creative direction | Utilitarian skate-shop textures, understated graphics, community-led energy | Utilitarian skate textures, monochrome graphics, oversized silhouettes | weak → supported |

Evidence judge: _A has strong audience evidence for Dxpe Chef and all three creative-direction tags, plus stronger plan coherence; Dxpe Chef is described as a London-based streetwear brand. Both plans share an unverified act and a venue not distinctive to London, while B’s Vans has no audience affinity and is explicitly a global default, and its creative direction includes tags that are weak or absent for this audience._

Blind judge: _Both plans use a recognisable London act and East London venue, with a fitting utilitarian skate direction. Dxpe Chef and Vans are concrete collaborators, but neither plan explains the collaboration or how the community-led brief will be activated._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Suchmos | (same) | weak → weak |
| Collaboration brand | Beams | Neighborhood | supported → weak |
| Pop-up venue | KATA | (same) | supported → supported |
| Creative direction | Understated Tokyo skate utility; community-led and music-driven | Industrial utility with classic, community-led details | weak → supported |

Evidence judge: _B has stronger audience and plan coherence evidence for Beams (#1 for the audience and #2 with the rest of the plan), while A’s Neighborhood is outside the audience’s top 50. Both plans use a Tokyo-origin act and a locally distinctive venue; A’s creative-direction tags align more strongly with the audience and plan than B’s, but B is better supported overall by its collaboration-brand evidence._

Blind judge: _Both plans use Tokyo-relevant names and a concrete venue, with a coherent fit for understated, utilitarian streetwear. Neighborhood gives A a sharper skate/workwear alignment with the audience’s stated tastes, while Beams in B is a broader retail fit._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Criolo | (same) | supported → supported |
| Collaboration brand | ÖUS | (same) | unresolved → unresolved |
| Pop-up venue | Casa de Cultura do Parque | Alvenaria Bar e Espaço Cultural | weak → supported |
| Creative direction | Colour-saturated DIY skate zine; rebellious, communal energy | Bold-logo, colorful graphic skate zine | weak → supported |

Evidence judge: _A has stronger audience and coherence evidence for its venue and creative direction, while both plans share the locally rooted act and unverified collaboration brand. Both venues are described as distinctive locally, but A’s venue ranks #7 for the audience and links strongly to Criolo; B’s venue is outside the audience’s top 50 and its choices show weaker coherence._

Blind judge: _Both plans pair São Paulo artist Criolo and local skate brand ÖUS with a fitting colourful zine direction. Alvenaria Bar e Espaço Cultural feels more directly suited to a community-led skate-session launch than Casa de Cultura do Parque._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Jordan Rakei | James Blake | weak → supported |
| Collaboration brand | HAY | (same) | weak → weak |
| Pop-up venue | The Hoxton, Shoreditch | The Table Café | weak → supported |
| Creative direction | Warm minimalism, tactile craft, calm live-session energy | Neutral palettes, understated elegance, crafted minimalism | weak → supported |

Evidence judge: _A has strong London audience and plan-coherence signals for James Blake, The Table Café, and its creative-direction tags; James Blake is also described as English and tied to London. HAY is outside the relevant top 50s in both plans, while B’s act, venue, and creative tags lack positive audience, local, or coherence evidence; neither venue is described in enough detail to verify its event-hosting role._

Blind judge: _Both acts and HAY are credible London-facing choices, but Jordan Rakei’s intimate live-session feel and The Hoxton, Shoreditch make B a more joined-up launch for this audience. A is coherent too, though The Table Café is less clearly suited to a polished launch-week event._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | kyary pamyu pamyu | (same) | weak → weak |
| Collaboration brand | Sanrio | (same) | no support → no support |
| Pop-up venue | Laforet Harajuku | MAGNET by SHIBUYA109 | no support → supported |
| Creative direction | Clean, playful kawaii with pastel colors and pop-art energy | (same) | weak → weak |

Evidence judge: _Both plans share the same act, collaboration, and creative-direction evidence: the act and Sanrio have no demonstrated audience affinity, while clean ranks highly but playful is not characteristic and pastel colors rank only #44. A is better supported by its venue, which ranks #15 with this audience, is distinctive to Tokyo, and coheres with the rest of the plan at #5; B’s venue has no reported affinity or coherence and is not distinctive._

Blind judge: _Both plans pair Tokyo-relevant creators and brands with a fitting playful direction and concrete, locally recognizable venues. The venue difference alone doesn’t make either plan clearly stronger for this brief._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Emicida | (same) | weak → weak |
| Collaboration brand | Natura | (same) | no support → no support |
| Pop-up venue | Parque Ibirapuera | Terra Quintal | unresolved → supported |
| Creative direction | Energetic, inclusive technical running culture with bold São Paulo street-level color | Dynamic, technical, inclusive run-club performance | weak → supported |

Evidence judge: _A has stronger audience evidence: Terra Quintal ranks #7 and its creative traits rank #8, #19, and #17, while B’s venue is unverified and two creative traits lack audience affinity. Both plans use locally originated Emicida and Natura, but Natura has no audience or coherence affinity, neither venue’s role is confirmed by Qloo’s description, and neither plan demonstrates that the venue can host the run-club event._

Blind judge: _Both plans use locally relevant names and fit the brand attributes, but Ibirapuera is a much clearer match for a São Paulo run-club launch than Terra Quintal. B’s street-level creative direction also coheres with the park setting._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Carolina Durante | Lori Meyers | weak → supported |
| Collaboration brand | Levi Strauss & Co. | Hawkers | no support → supported |
| Pop-up venue | Sala El Sol | Sala Siroco | unresolved → supported |
| Creative direction | Warm, lived-in Madrid indie; unpretentious and communal | Warm, culturally rooted, comfortable Madrid indie; approachable and communal | weak → supported |

Evidence judge: _A has stronger audience evidence: Lori Meyers ranks #7 and its strongest link is the audience signal Love of Lesbian; its creative direction also ranks highly, while the venue has local distinctiveness evidence. B’s act is outside the audience top 50, its global partner has no affinity evidence, and its creative tags rank lower; Sala El Sol is unverified, not evidence against it. Hawkers is described as sunglasses rather than a beer or event partner, which limits A’s brief fit._

Blind judge: _Both use recognisable Madrid indie acts and venues, with a warm communal direction. B edges ahead: Carolina Durante and Sala El Sol feel especially aligned with the audience, while Levi’s is a plausible but less local partner than Hawkers._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Juanito Makandé | weak → weak |
| Collaboration brand | Thinking MU | (same) | unresolved → unresolved |
| Pop-up venue | La Casa Encendida | (same) | supported → supported |
| Creative direction | Mediterranean minimalism, honest materials, modern warmth | Honest Mediterranean materials, innovative modern design, handcrafted warmth | weak → weak |

Evidence judge: _Both plans share the same unverified collaborator and venue, whose audience affinity is #10 but which is not locally distinctive; neither act ranks in the audience’s top 50, and both creative directions have limited audience evidence. A has a coherence signal for Handcrafted (#20), while B has one for the venue with JUDELINE (#3); these isolated advantages do not establish a stronger overall plan, and Qloo provides no evidence of a fast-fashion constraint violation._

Blind judge: _Both plans use credible Madrid-relevant choices and a fitting non-fast-fashion collaborator. B’s JUDELINE feels more aligned with a modern 20–35 fashion audience, while A’s creative direction is slightly more distinctive; overall, the difference is modest._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DIVINE | (same) | unresolved → unresolved |
| Collaboration brand | Superkicks | Skult | unresolved → weak |
| Pop-up venue | Superkicks Bandra | The Habitat | unresolved → supported |
| Creative direction | Bold Mumbai streetwear, gritty hip-hop energy, homegrown pride | Bold, vibrant sneakers with intricate embroidery and rich textures | weak → weak |

Evidence judge: _A has audience evidence for The Habitat (#7, linked to Badshah), and its venue, collaboration brand, and creative direction have measured links within the plan; its creative tags also include Rich Textures (#4). B’s resolved creative direction has only one audience-ranked tag, Cultural Pride (#3), and no measured local distinction or coherence; its act, brand, and venue are unverified. Qloo’s description makes Skult a menswear brand, but the evidence does not establish that it can serve as a credible sneaker collaboration partner or that either venue meets the event’s needs._

Blind judge: _B ties DIVINE to a concrete Mumbai sneaker retailer and Bandra event venue, with a direction that strongly fits the homegrown streetwear brief. A is also locally relevant, but its creative direction feels less connected to Gully Kicks’ stated street and hip-hop focus._

## Cost

Mean 50 s per brief, 392 Qloo calls (counted before the cache), 7.9 model calls. Repair rounds used: 2, 3, 4, 4, 1, 3, 4, 2, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
