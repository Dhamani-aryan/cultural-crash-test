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
| Supported choices, in-run (9 briefs, 36 choices) | 7 | 24 |
| Mean plan score, in-run (app-defined, 0–100) | 64 | 78 |
| **Supported choices, held-out anchors** (9 briefs, 36 choices) | **5** | **16** |
| Mean plan score, held-out anchors | 61 | 73 |
| Briefs where held-out support rose / fell | – | 9 / 0 |
| Draft choices not found in Qloo at all | 6 of 36 | – |

### Evidence-based judge (primary)

9 pairs. Prefers the agent's plan in **9**, the draft in **0**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| audienceFit | 2.6 | 3.9 |
| localFit | 2.5 | 3.3 |
| coherence | 2.2 | 3.7 |
| briefFit | 3.1 | 3.4 |

### Blind preference judge (reference, no evidence)

9 pairs. Prefers the agent's plan in **1**, the draft in **8**, tie in **0**. The two orders agreed on 9 of 9.

| Mean rating (1–5, both orders) | Draft | Agent |
|---|---|---|
| localFit | 4.7 | 3.9 |
| specificity | 4.7 | 4.8 |
| coherence | 4.7 | 4.0 |
| constraints | 4.5 | 4.2 |

### Held-out briefs only

6 briefs never used for tuning: supported choices with held-out anchors 2 → 9 of 24; evidence judge agent 6 / draft 0 / tie 0; blind judge agent 0 / draft 6 / tie 0.

## Per brief

| Brief | City | Split | Changes | In-run supported | Held-out supported | Evidence judge | Blind judge | Stopped |
|---|---|---|---|---|---|---|---|---|
| london-streetwear | London | dev | Dr. Martens → Fred Perry; Utilitarian streetwear; understated, community-first energy → Industrial, utilitarian streetwear with authentic community energy | 2 → 4 | 2 → 4 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-sneakers | Tokyo | dev | TOKYO CULTUART by BEAMS → THE A.I.R BUILDING; Snow Peak → Neighborhood; Understated utility, skate energy, and Tokyo-night minimalism → Industrial utility with monochrome skate edge | 0 → 3 | 1 → 2 | agent | agent | No adjustable choice is contradicted by the evidence |
| sao-paulo-skate | São Paulo | dev | Galeria do Rock → Alvenaria Bar e Espaço Cultural; Colourful DIY skate zine; rebellious, community-led energy → Colourful DIY skate zine; rebellious, street-style energy | 0 → 2 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| london-coffee | London | heldout | Yussef Dayes → Wild Beasts; Calm modernism, tactile craft, warm minimalism → Understated elegance, minimalist design, serene craft | 0 → 2 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| tokyo-skincare | Tokyo | heldout | Laforet Harajuku → WITH HARAJUKU HALL | 2 → 3 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| sao-paulo-running | São Paulo | heldout | Energetic, inclusive, technical; São Paulo street-run energy with bold performance visuals → Dynamic, sleek, function-led performance visuals | 0 → 1 | 0 → 1 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-beer | Madrid | heldout | Sala El Sol → Wurlitzer Ballroom; Carolina Durante → Miss Caffeina | 1 → 3 | 0 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| madrid-sustainable | Madrid | heldout | Thinking MU → Arizona Vintage; JUDELINE → Miss Caffeina | 2 → 4 | 1 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |
| mumbai-sneakers | Mumbai | heldout | Bold homegrown streetwear; high-energy hip-hop visuals → Bold homegrown kicks with vibrant colors, intricate embroidery, and rich textures; antiSOCIAL, Mumbai → The Habitat | 0 → 2 | 1 → 2 | agent | draft | No adjustable choice is contradicted by the evidence |

## Plans

### london-streetwear (London)

Audience: 18–30 year-old skate and streetwear fans in East London. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Patta, A-cold-wall, Skepta.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Little Simz | (same) | supported → supported |
| Collaboration brand | Dr. Martens | Fred Perry | weak → supported |
| Pop-up venue | Village Underground | (same) | supported → supported |
| Creative direction | Utilitarian streetwear; understated, community-first energy | Industrial, utilitarian streetwear with authentic community energy | weak → supported |

Evidence judge: _Plan A has stronger audience evidence for its collaboration brand and creative tags, while sharing Plan B’s highly ranked act and venue. Its venue and aesthetics also show better overall coherence; neither plan has strongly distinctive London-local evidence._

Blind judge: _Both feel recognisably East London, with Little Simz and Village Underground providing strong local relevance. B edges ahead because Dr. Martens and its community-first direction align more tightly with the brand’s utilitarian, understated attributes._

### tokyo-sneakers (Tokyo)

Audience: Young streetwear and sneaker collectors in Tokyo. Run anchors: Stüssy, Palace Skateboards, Carhartt. Held-out anchors: Neighborhood, Nujabes.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Awich | (same) | weak → weak |
| Collaboration brand | Snow Peak | Neighborhood | weak → weak |
| Pop-up venue | TOKYO CULTUART by BEAMS | THE A.I.R BUILDING | no support → supported |
| Creative direction | Understated utility, skate energy, and Tokyo-night minimalism | Industrial utility with monochrome skate edge | supported → supported |

Evidence judge: _Plan A has strong audience and coherence evidence from its #3-ranked distinctive Tokyo venue, highly ranked Industrial/Utilitarian/Monochrome direction, and Neighborhood’s #3 coherence rank. Plan B’s venue has no affinity evidence, while its brand, act, and most creative tags rank outside or low in the relevant lists; neither venue has a Qloo description confirming event-hosting capability._

Blind judge: _Neighborhood gives Plan A a sharper connection to Tokyo’s streetwear and skate audience, while the industrial monochrome direction coheres naturally with Northbound Supply’s utilitarian identity. Plan B is locally credible, but Snow Peak pulls the launch toward outdoor lifestyle rather than skate culture._

### sao-paulo-skate (São Paulo)

Audience: Skaters and street-culture fans in São Paulo, 16–28. Run anchors: Thrasher, Vans, Element Skateboards. Held-out anchors: Charlie Brown JR., Supreme.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Boogarins | (same) | weak → weak |
| Collaboration brand | Havaianas | (same) | no support → no support |
| Pop-up venue | Galeria do Rock | Alvenaria Bar e Espaço Cultural | unresolved → supported |
| Creative direction | Colourful DIY skate zine; rebellious, community-led energy | Colourful DIY skate zine; rebellious, street-style energy | weak → weak |

Evidence judge: _Plan A has strong verified support from Alvenaria Bar e Espaço Cultural, ranked #7 for the audience, #2 for coherence, and identified as distinctive to São Paulo; both plans also benefit from highly ranked “Rebellious,” while Boogarins is outside the top 50 and Havaianas has no affinity evidence. Plan B’s venue is unverified, leaving it with less audience, local, coherence, and role-fit support despite its creative direction matching the community-led attribute._

Blind judge: _Galeria do Rock gives B a stronger São Paulo street-culture anchor and reinforces the community-led direction, though both plans use a Goiânia act rather than a truly local one and lack a clearly skateable venue._

### london-coffee (London)

Audience: Design-minded young professionals who care about craft coffee. Run anchors: Aesop, Monocle, Kinfolk. Held-out anchors: Muji, COS, Bon Iver.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Yussef Dayes | Wild Beasts | weak → weak |
| Collaboration brand | Paul Smith | (same) | weak → weak |
| Pop-up venue | Barbican Centre | (same) | weak → weak |
| Creative direction | Calm modernism, tactile craft, warm minimalism | Understated elegance, minimalist design, serene craft | weak → supported |

Evidence judge: _Plan A has stronger audience and coherence evidence: Wild Beasts scores higher than Yussef Dayes, and all three of A’s creative tags rank for the audience while only two of B’s do; A also has two creative tags ranking for plan coherence versus none for B. Both use a distinctive London venue and UK-origin act, but Paul Smith’s Qloo description identifies a musician and executive rather than a suitable collaboration brand, limiting brief fit equally._

Blind judge: _Yussef Dayes gives B a current, distinctly London cultural anchor that complements the Barbican and warm, tactile minimalism. Wild Beasts are inactive, making A less usable and timely._

### tokyo-skincare (Tokyo)

Audience: Women in their twenties in Tokyo who follow beauty and pop culture. Run anchors: Shiseido, Sanrio, Kyary Pamyu Pamyu. Held-out anchors: Uniqlo, Aimyon.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Wednesday Campanella | (same) | weak → weak |
| Collaboration brand | Sanrio | (same) | no support → no support |
| Pop-up venue | Laforet Harajuku | WITH HARAJUKU HALL | no support → supported |
| Creative direction | Clean, gentle skincare meets playful Harajuku pop | (same) | weak → weak |

Evidence judge: _Plan A has stronger evidence through WITH HARAJUKU HALL’s audience rank (#22) and high coherence (#2), while Plan B’s venue has no affinity evidence. Both have Japanese-origin choices but limited city distinctiveness, and neither clearly fulfills the creator-collaboration requirement or verifies venue capability through Qloo descriptions._

Blind judge: _Both plans are highly relevant and concrete, but Laforet Harajuku has stronger fashion, beauty, and youth-pop resonance than WITH HARAJUKU HALL. Neither clearly defines the required creator collaboration beyond naming a music act and Sanrio._

### sao-paulo-running (São Paulo)

Audience: Urban runners in São Paulo, 22–40. Run anchors: Asics, Lululemon, Strava. Held-out anchors: Adidas, Garmin.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | LiNikEr | (same) | weak → weak |
| Collaboration brand | Oakley | (same) | weak → weak |
| Pop-up venue | Parque Ibirapuera | (same) | unresolved → unresolved |
| Creative direction | Energetic, inclusive, technical; São Paulo street-run energy with bold performance visuals | Dynamic, sleek, function-led performance visuals | weak → supported |

Evidence judge: _Plan A has stronger audience and local evidence: Oakley ranks #3, and all three creative tags rank locally while differing from New York. Plan B matches the stated brand attributes more directly, but only “Technical” receives audience, local, and coherence support; the shared act is outside the top 50 and the venue is unverified._

Blind judge: _Both use recognizable São Paulo choices, but B better connects them through a city-specific running concept and explicitly reflects the brand attributes. Neither plan clearly names a running ambassador._

### madrid-beer (Madrid)

Audience: Indie music fans in Madrid, 25–35. Run anchors: Mahou, Vetusta Morla, Primavera Sound. Held-out anchors: Estrella Galicia, Love of Lesbian.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | Carolina Durante | Miss Caffeina | weak → supported |
| Collaboration brand | Cervezas Alhambra | (same) | weak → weak |
| Pop-up venue | Sala El Sol | Wurlitzer Ballroom | unresolved → supported |
| Creative direction | Warm, unpolished Madrid indie: intimate gig energy, local pride, and understated craft | (same) | weak → weak |

Evidence judge: _Plan A has stronger audience and coherence evidence: Miss Caffeina ranks #3 for the audience and #2 with the plan, while Wurlitzer Ballroom also has ranked audience and coherence support. Both plans use a suitable Spanish indie act and brewery partner, but Plan B's act and brand fall outside the relevant top 50s and Sala El Sol is unverified._

Blind judge: _Carolina Durante and the iconic Sala El Sol create a more distinctly Madrid-rooted indie launch, while retaining the brief’s warm, intimate and unpretentious character._

### madrid-sustainable (Madrid)

Audience: Environmentally minded fashion buyers in Madrid, 20–35. Run anchors: Ecoalf, Patagonia, Rosalía. Held-out anchors: Veja, C.Tangana.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | JUDELINE | Miss Caffeina | weak → weak |
| Collaboration brand | Thinking MU | Arizona Vintage | unresolved → supported |
| Pop-up venue | La Casa Encendida | (same) | supported → supported |
| Creative direction | Modern Mediterranean minimalism; honest, sun-washed and sustainable | (same) | weak → weak |

Evidence judge: _Plan A has verified audience affinity for Arizona Vintage (#12) and La Casa Encendida (#10), plus strong cross-plan coherence led by Miss Caffeina (#1). Plan B shares the weaker venue and aesthetic signals, while JUDELINE is outside the relevant audience and coherence top 50 and Thinking MU is unverified._

Blind judge: _JUDELINE better matches the young, Rosalía-adjacent Madrid audience, while Thinking MU brings a credible Spanish sustainable-fashion partner that coheres strongly with the Mediterranean creative direction._

### mumbai-sneakers (Mumbai)

Audience: Sneaker and hip-hop fans in Mumbai, 18–28. Run anchors: Nike, Bewakoof, DIVINE. Held-out anchors: Puma, Badshah.

| Choice | Draft | Agent | Held-out status (draft → agent) |
|---|---|---|---|
| Music act | DIVINE | (same) | unresolved → unresolved |
| Collaboration brand | boAt | (same) | supported → supported |
| Pop-up venue | antiSOCIAL, Mumbai | The Habitat | unresolved → supported |
| Creative direction | Bold homegrown streetwear; high-energy hip-hop visuals | Bold homegrown kicks with vibrant colors, intricate embroidery, and rich textures | weak → weak |

Evidence judge: _Plan A adds a #7 audience-ranked Mumbai venue and supported aesthetics, with its three creative tags ranking #11–16 for coherence and a 1.00 venue–boAt link. Plan B has support only for boAt; its venue and act are unverified, while all creative tags lack audience, local, and coherence rankings._

Blind judge: _antiSOCIAL is a stronger fit for Mumbai’s hip-hop and sneaker crowd, making Plan B more cohesive, while Plan A’s creative direction is more detailed but The Habitat is less scene-specific._

## Cost

Mean 56 s per brief, 413 Qloo calls (counted before the cache), 8.0 model calls. Repair rounds used: 2, 4, 3, 4, 1, 4, 3, 2, 3.

## Limits of this evaluation

- 9 briefs is a small sample. No significance is claimed.
- Every score is the app's rubric built on Qloo affinity, not a measure of campaign performance.
- Both judges are models, not people from these cities. No human review was run.
- The evidence judge reads this app's own explanations of Qloo results. The evidence is gathered with held-out anchors, identically for both plans, but its wording comes from the same rubric the agent works with.
- Held-out anchors are the strongest check here, but they are still Qloo signals, scored by the same rubric.
