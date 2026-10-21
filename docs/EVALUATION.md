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
| Supported choices, in-run (9 briefs, 36 choices) | 7 | 28 |
| Mean plan score, in-run (app-defined, 0–100) | 64 | 83 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **4** | **20** |
| Mean plan score, held-out anchors | 59 | 76 |
| Briefs where held-out support rose / fell | – | 9 / 0 |
| Draft choices not found in Qloo at all | 8 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **8**, the draft in **1**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.0 | 3.6 |
| localFit | 2.4 | 3.4 |
| coherence | 2.2 | 3.7 |
| briefFit | 3.0 | 3.4 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **0**, the draft in **6**, tie in **3**. The two orders agreed on 6 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.7 | 3.9 |
| specificity | 4.4 | 4.2 |
| coherence | 4.6 | 3.8 |
| constraints | 4.7 | 3.9 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 1 → 12 of 24; evidence judge agent 5 / draft 1 / tie 0; blind judge agent 0 / draft 5 / tie 1.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Vans → Fred Perry; Utilitarian skate graphics, understated tones, community-first energy → Utilitarian, understated industrial graphics with authentic community-first energy | 2 → 4 | 2 → 4 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | TRUNK(HOTEL) CAT STREET → Red Shoes; Asics → Neighborhood; Understated utility meets Tokyo skate culture; raw textures, clean lines, community energy → Utilitarian Tokyo skate culture with deconstructed details and oversized silhouettes | 0 → 3 | 1 → 2 | agent | tie | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | Converse → Chilli Beans; Centro de Esportes Radicais → Pista De Skate Sumaré; Colour-saturated DIY skate graphics; rebellious, communal energy → Colorful skate graphics; rebellious, authentic energy | 0 → 2 | 0 → 2 | agent | tie | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Warm minimalism, tactile materials, and soulful listening → Quiet elegance, neutral tones, and clean lines; HAY → Allsaints; Cleo Sol → Kindness; Spiritland → Rough Trade East | 0 → 4 | 0 → 3 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Laforet Harajuku → WITH HARAJUKU HALL | 2 → 3 | 0 → 1 | agent | tie | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | High-energy, inclusive technical running culture with bold São Paulo street style → Dynamic, sleek, functional technical running | 0 → 1 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Vans → Hawkers; Warm, unpolished Madrid indie-night energy → Comfortable, local Madrid music culture; Sala El Sol → Wurlitzer Ballroom; Carolina Durante → Miss Caffeina | 0 → 4 | 0 → 4 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Thinking MU → Arizona Vintage | 3 → 4 | 1 → 2 | draft | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | Bold Mumbai streetwear; gritty hip-hop energy with homegrown pride → Bold homegrown kicks in vibrant colors, intricate embroidery, and rich textures; Sneaker Pimps Mumbai → The Habitat; Bhaane → Koovs | 0 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Little Simz | (same) | supported → supported |
| Collaboration brand | Vans | Fred Perry | no support → supported |
| Pop-up venue | Village Underground | (same) | supported → supported |
| Creative direction | Utilitarian skate graphics, understated tones, community-first energy | Utilitarian, understated industrial graphics with authentic community-first energy | weak → supported |

Evidence judge: _A has audience affinity evidence for all four choices, including its collaboration brand and creative direction; B’s Vans has no returned affinity, and its Community direction is not characteristic of this audience in London. Both plans have a London-origin act and a London venue, but neither venue is distinctive locally; A’s choices also show stronger coherence evidence, including the venue’s link to Little Simz._

Blind judge: _Both plans use London-relevant Little Simz and Village Underground, but Vans is a more natural skate-culture fit than Fred Perry for this audience and brief. B’s skate-led creative direction also reinforces that choice and the brand’s understated, community-led attributes._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Awich | (same) | weak → weak |
| Collaboration brand | Asics | Neighborhood | weak → weak |
| Pop-up venue | TRUNK(HOTEL) CAT STREET | Red Shoes | unresolved → supported |
| Creative direction | Understated utility meets Tokyo skate culture; raw textures, clean lines, community energy | Utilitarian Tokyo skate culture with deconstructed details and oversized silhouettes | supported → supported |

Evidence judge: _A has stronger demonstrated audience and plan coherence: its venue ranks #9 for both, while B’s venue is unverified, and A’s creative tags rank highly for the audience. Both acts and collaboration brands are outside the audience’s top 50; A’s Neighborhood is described as Japanese streetwear, while B’s Asics is described as a global sports-footwear brand, and neither venue has evidence of distinctiveness to Tokyo._

Blind judge: _Both use a locally relevant act and a clear Tokyo streetwear direction that fits the brief. Neighborhood and Red Shoes give A a stronger subcultural feel, while Asics and TRUNK(HOTEL) CAT STREET make B concrete and its creative direction closely matches the brand; neither plan clearly wins overall._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Terno Rei | (same) | weak → weak |
| Collaboration brand | Converse | Chilli Beans | no support → weak |
| Pop-up venue | Centro de Esportes Radicais | Pista De Skate Sumaré | unresolved → supported |
| Creative direction | Colour-saturated DIY skate graphics; rebellious, communal energy | Colorful skate graphics; rebellious, authentic energy | weak → supported |

Evidence judge: _Both plans use a locally originated act that is outside the audience’s top 50, but A adds a locally distinctive skate venue with audience and plan affinity, plus a locally originated brand linked to the act. A’s rebellious direction is supported in São Paulo; B has no Qloo affinity for Converse, its venue is unverified, and two creative-direction tags lack local support._

Blind judge: _Both pair São Paulo act Terno Rei with a skate venue and colourful, rebellious direction that fits the brief. Chilli Beans and Sumaré in A, and Converse and Centro de Esportes Radicais in B, are concrete choices, with neither plan clearly stronger on the page._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Cleo Sol | Kindness | weak → weak |
| Collaboration brand | HAY | Allsaints | weak → supported |
| Pop-up venue | Spiritland | Rough Trade East | weak → supported |
| Creative direction | Warm minimalism, tactile materials, and soulful listening | Quiet elegance, neutral tones, and clean lines | weak → supported |

Evidence judge: _A has stronger audience and plan-coherence evidence: its venue ranks #12 for the audience, its collaboration brand #36, and its act and venue link to the plan; B’s choices are outside the audience or plan top 50. A also has two choices with London-country origins, while neither plan’s venue is distinctive locally; both plans’ descriptions are compatible with a launch-week café event and the brief’s craft/minimal direction._

Blind judge: _B pairs London-relevant music and design references with Spiritland’s listening-led setting, all reinforcing a crafted, calm café launch. A is concrete, but AllSaints and Rough Trade East feel less aligned with the audience and quiet minimalism._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Sanrio | (same) | no support → no support |
| Pop-up venue | Laforet Harajuku | WITH HARAJUKU HALL | no support → supported |
| Creative direction | Clean, playful Tokyo pop with gentle pastel visuals | (same) | weak → weak |

Evidence judge: _Both plans share the same evidence for the act, collaboration brand, and creative direction; Sanrio has no returned audience affinity, and the act is outside the audience’s top 50. A has stronger venue evidence: WITH HARAJUKU HALL ranks #22 for the audience and #2 for plan coherence, while Laforet Harajuku has no returned affinity for either; neither venue is identified as distinctive to Tokyo._

Blind judge: _Both plans make the same locally relevant, coherent choices; the venues are both specific Harajuku options suited to a playful beauty launch. The brief offers no basis to prefer one venue over the other._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | LiNikEr | (same) | weak → weak |
| Collaboration brand | Oakberry | (same) | unresolved → unresolved |
| Pop-up venue | Mercado de Pinheiros | (same) | unresolved → unresolved |
| Creative direction | High-energy, inclusive technical running culture with bold São Paulo street style | Dynamic, sleek, functional technical running | weak → supported |

Evidence judge: _Both plans share an act that is outside the audience’s top 50, and the collaboration and venue are unverified. A’s creative direction ranks highly with this São Paulo audience and is distinctive there, while B’s creative tags are not characteristic locally; both directions broadly suit technical running, and neither plan has evidence establishing event-host or collaboration role fit._

Blind judge: _Both plans make locally grounded choices with Liniker, Oakberry, and Mercado de Pinheiros, but B’s São Paulo street-style direction better fits the audience and inclusive, energetic attributes. Neither names an ambassador, leaving a key launch goal underspecified._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Carolina Durante | Miss Caffeina | weak → supported |
| Collaboration brand | Vans | Hawkers | no support → supported |
| Pop-up venue | Sala El Sol | Wurlitzer Ballroom | unresolved → supported |
| Creative direction | Warm, unpolished Madrid indie-night energy | Comfortable, local Madrid music culture | weak → supported |

Evidence judge: _A has strong audience affinity for Miss Caffeina and its creative direction, with the act also linking to Wurlitzer; its venue is in Madrid, though not distinctive, and Hawkers has no demonstrated plan coherence. B has weaker audience and coherence evidence, while its venue is unverified; its act is described as an indie band, but Vans has no audience evidence and is identified as a global default._

Blind judge: _Carolina Durante and Sala El Sol make a concrete, recognisably Madrid indie-night pairing that fits the audience and the warm, unpretentious brief. Miss Caffeina and Wurlitzer also fit, but Hawkers feels less naturally connected to Barrio Brew’s local music positioning than Vans does to B’s scene-led direction._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Guitarricadelafuente | (same) | weak → weak |
| Collaboration brand | Thinking MU | Arizona Vintage | unresolved → supported |
| Pop-up venue | Matadero Madrid | (same) | supported → supported |
| Creative direction | Modern Mediterranean minimalism; honest, warm, and sustainable | (same) | weak → weak |

Evidence judge: _Both plans share the same audience evidence for the act, venue, and creative direction; A’s collaboration brand has audience affinity, but Qloo describes it as selling mainstream brands including fast-fashion labels, conflicting with the hard constraint. B’s collaborator is unverified, so earns no fit credit, but is not evidence of a constraint violation; its venue and creative direction show slightly stronger coherence than A’s._

Blind judge: _The act, venue, and direction feel well matched to Madrid and the audience in both plans. Thinking MU is a credible sustainable-fashion collaborator, while Arizona Vintage is less clearly aligned with Marea’s sustainability focus and the no-fast-fashion constraint._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DIVINE | (same) | unresolved → unresolved |
| Collaboration brand | Bhaane | Koovs | weak → weak |
| Pop-up venue | Sneaker Pimps Mumbai | The Habitat | unresolved → supported |
| Creative direction | Bold Mumbai streetwear; gritty hip-hop energy with homegrown pride | Bold homegrown kicks in vibrant colors, intricate embroidery, and rich textures | weak → weak |

Evidence judge: _A has a venue ranked #7 for the audience and strong coherence evidence (#1 for the rest of the plan); its creative direction also includes audience-ranked tones. B’s venue and act are unverified, its brand is outside the audience’s top 50, and two creative tags are not characteristic locally. Both brands are described as fashion brands, and neither plan’s evidence verifies the act._

Blind judge: _Both use DIVINE, a strong Mumbai fit, but B pairs local streetwear label Bhaane and sneaker-focused Sneaker Pimps Mumbai with a coherent homegrown hip-hop direction. A is concrete and colorful, though Koovs and its broader craft-led direction feel less aligned with the brief’s streetwear launch._

## Cost

Mean 56 s per brief, 412 Qloo calls (counted before the cache), 8.4 model calls. Repair rounds used: 2, 4, 5, 4, 1, 4, 4, 1, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
