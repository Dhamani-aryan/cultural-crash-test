# Judge conviction and decision-graph plan

## Scope

This is a presentation plan only. Do not implement it until the user approves the direction.

**Status (22 Oct 2026):** approved and implemented. Phases 1–4 are built and tested. Phase 5 is browser-checked on the recorded London run at desktop and phone widths, with mouse and keyboard, the no-WebGL fallback (unit-tested) and a baseline-favoured run (unit-tested). Rehearsing the timed demo and capturing the video are left to the owner.

The existing conversational intake and the current User / LLM / Agent comparison table remain the product's foundation. This plan adds the minimum judge-facing proof needed to make the working backend visible and understandable, then defines a purposeful Obsidian-style decision graph.

## Honest judge verdict on the current experience

### What already convinces me

As a judge, I can already see that:

- the product accepts a natural-language launch brief;
- it distinguishes what the user supplied from what the LLM added;
- the final agent plan is different from the LLM draft;
- every choice has a plain-language reason;
- fixed choices and uncertainty are treated honestly.

### What does not yet fully convince me

The UI demonstrates a result, but not yet the complete act of agency. A skeptical judge could still think:

> This might be a polished comparison generated after one prompt. How do I know the agent actually queried Qloo, tested alternatives, obeyed constraints and re-tested the plan?

The table explains the conclusion well. It does not yet make the path from evidence to decision visually undeniable.

My current judge assessment would be:

- **Clarity of result:** strong;
- **Clarity of user vs LLM vs agent:** strong;
- **Proof that real external evidence changed the plan:** moderate;
- **Proof of an iterative agent loop:** weak to moderate;
- **Memorability during a short judging session:** moderate.

The next UI work should improve only the last three points. Adding more statistics, cards or prose would make the product worse.

## What a judge must understand in 60 seconds

The result page should answer these questions without requiring source-code inspection:

1. What did the user want?
2. What did an ordinary LLM suggest without Qloo?
3. Which choices did Qloo evidence challenge or support?
4. What alternatives did the agent actually test?
5. Why was the final alternative accepted?
6. Which constraints remained untouched?
7. Is this a live run or a clearly labelled recording?
8. What are the limits of the evidence?

If a judge can answer those questions, the agentic backend is visible through the product.

## Proposed result-page structure

### 1. A compact proof summary

Place one quiet summary directly above the Table / Graph switch:

```text
WHAT THE AGENT DID

4 choices tested · 2 alternatives accepted · 2 choices retained
18 Qloo queries · 3 constraints preserved · full plan re-tested twice
Recorded run · 22 Oct 2026
```

Only show facts available in `RunState`. Never invent a duration or a query count.

This is not a dashboard. It is a single run receipt that makes the backend work tangible.

Recommended fields:

- choices evaluated;
- candidate alternatives tested;
- accepted replacements;
- Qloo calls or evidence records;
- hard constraints preserved;
- repair/re-test rounds;
- live or recorded provenance and date.

Avoid:

- application scores without context;
- celebratory winner percentages;
- token counts;
- raw model-chain text;
- decorative KPIs that do not establish agency.

### 2. One Table / Graph switch

Directly above the existing comparison, add two visible segmented controls:

```text
[ Table ] [ Decision graph ]
```

- `Table` is the default.
- Switching views does not navigate or restart the run.
- Both views use exactly the same deterministic decision data.
- The selected choice is shared: selecting Music act in either view selects it in the other.
- Do not add additional view modes.

### 3. Table view

Keep the current table structure:

```text
Choice | You | LLM | Agent
Why    | plain-language decision explanation
```

Add only two judge-proof improvements:

- a small `Evidence path` action at the end of each Why row that switches to the graph and focuses that decision;
- compact provenance terms inside the prose where relevant: `Qloo audience result`, `User constraint`, and `Full-plan re-test`.

Do not return to expandable evidence cards or diagnostic panels.

### 4. Decision graph view

The graph should look and behave like an Obsidian knowledge graph, but it must tell a controlled story rather than produce a hairball.

#### Visual character

- dark graphite canvas inside the existing light application shell;
- small luminous nodes with restrained color;
- thin, soft connecting lines;
- depth, parallax and gentle drift;
- labels appear for important nodes and the active path;
- non-active nodes recede rather than disappear;
- rounded surrounding panel, not a full-screen sci-fi interface;
- no gradients, particles, glowing nebulae or generic AI imagery.

#### Technology direction

Preferred implementation:

- Three.js through React Three Fiber;
- `@react-three/drei` for camera controls and labels;
- a deterministic force or layered layout computed from the recorded run;
- touch drag, pinch zoom, mouse orbit and wheel zoom;
- `prefers-reduced-motion` mode with animation disabled;
- an accessible HTML decision summary beside or beneath the canvas.

Evaluate `3d-force-graph` only as a prototype. Use it in production only if its camera, labels, touch behavior and accessibility can be controlled sufficiently. The product must not inherit a library's demo aesthetic.

#### Node types

The graph should use shape as well as color:

| Node | Meaning | Shape |
| --- | --- | --- |
| User brief | Audience, market, user choice or rule | Square |
| LLM choice | A choice supplied without Qloo | Circle |
| Qloo evidence | Affinity, local relevance or entity result | Small pill / capsule |
| Candidate | Alternative tested by the agent | Hollow circle |
| Application test | Constraint or full-plan re-test | Diamond |
| Final choice | Accepted or retained recommendation | Ringed circle |

Use four restrained color families only:

- neutral white/grey: user and LLM context;
- Qloo blue: external evidence;
- amber: rejected candidate or uncertainty;
- green: accepted final choice.

Color must never be the only distinction.

#### Edge meanings

Every visible edge needs a real relationship:

- `supplied by user`;
- `added by LLM`;
- `tested against`;
- `supports`;
- `did not support`;
- `constrained by`;
- `candidate for`;
- `rejected after re-test`;
- `accepted after re-test`;
- `retained`.

Do not use unlabeled decorative connections. Do not imply that affinity is causation.

#### Default graph state

Do not show the complete graph fully expanded at once.

Default state:

- one central `Final plan` node;
- four surrounding decision nodes: Music, Collaboration, Venue and Direction;
- a compact line from the brief to each decision;
- changed decisions slightly emphasized;
- retained decisions visible but quieter.

This is the 10-second overview.

#### Focused decision state

When a judge selects a decision, smoothly focus its subgraph:

```text
User choice / open slot
        ↓
LLM choice
        ↓ tested against
Qloo audience + local + coherence evidence
        ↓
Candidates tested ── rejected candidates
        ↓ full-plan re-test
Final choice
```

The camera movement should take under 500 ms and never disorient the viewer.

Alongside the canvas, show a short textual explanation:

```text
Music act

Travis Scott → slowthai

No London audience support was returned for the original choice.
slowthai ranked #1 for this audience and remained Supported after the full plan was re-tested.
```

The text makes the graph understandable; the graph makes the process memorable.

#### Rejected alternatives

Rejected candidates are valuable proof of agency, but should appear only in a focused decision:

- show them as dim hollow nodes;
- connect them with `tested` then `rejected after re-test`;
- clicking one reveals the recorded observed outcome;
- never make them equally prominent with the accepted choice.

#### Animation

Use animation to show sequence once, not constantly:

1. user brief appears;
2. LLM choices appear;
3. Qloo evidence nodes connect;
4. candidates branch out;
5. rejected candidates recede;
6. accepted choice connects to the final plan.

Provide `Replay decision path`. Do not auto-loop. The initial animation should run only the first time the graph is opened for a run.

## Evidence inspector

Clicking a Qloo evidence node opens a small anchored inspector—not a modal—with:

- human-readable purpose;
- result count;
- top relevant returned entities or tags;
- market and audience context;
- coverage status;
- exact provenance: `Recorded Qloo result` or `Live Qloo result`;
- a short limitation when evidence is absent or partial.

Raw request JSON stays under `Technical details` and remains collapsed.

The inspector is the key trust surface. It shows that a graph node corresponds to a real recorded query, not an illustration invented for the demo.

## Agent-loop strip

Below the Table / Graph controls, add one compact method line:

```text
Draft without Qloo → Test every choice → Search alternatives → Re-test complete plan → Keep only improvements
```

In Table view it remains a quiet caption. In Graph view the active step highlights as the path animation plays.

Do not turn this into five cards.

## Marketing and presentation copy

### Product line

Recommended:

> Your cultural launch plan, stress-tested against real taste data.

Supporting sentence:

> See what you chose, what an LLM would add, and what changes when an agent tests every decision against Qloo.

### Demo narration

Use this 60–90 second sequence:

1. **Problem:** “An LLM can produce a plausible launch plan, but plausible is not the same as locally supported.”
2. **Input:** Enter the London brief naturally and point out the booked venue and no-Supreme rule.
3. **Baseline:** “The LLM completes the missing collaboration choice without Qloo.”
4. **Result table:** Show User / LLM / Agent and state the exact delta: `2/4 → 4/4 supported`.
5. **Graph:** Select Music act and replay its decision path.
6. **Proof:** Click one Qloo evidence node, then show one rejected alternative and the full-plan re-test.
7. **Trust:** Point out that BOXPARK remained fixed and missing evidence is not treated as failure.
8. **Close:** “The product does not just recommend. It shows exactly what changed, why, and which evidence justified it.”

Do not spend demo time on settings, logs, infrastructure or raw JSON unless asked.

## Data contract

The graph must be a deterministic projection of recorded `RunState` and `DecisionExplanation` data.

Suggested view model:

```ts
type JudgeGraphNode = {
  id: string;
  kind: "brief" | "llm_choice" | "qloo_evidence" | "candidate" | "test" | "final_choice";
  slot?: Slot;
  label: string;
  detail?: string;
  evidenceIds: string[];
  state: "neutral" | "supported" | "rejected" | "uncertain" | "accepted";
};

type JudgeGraphEdge = {
  id: string;
  source: string;
  target: string;
  relation:
    | "supplied_by_user"
    | "added_by_llm"
    | "tested_against"
    | "supports"
    | "did_not_support"
    | "constrained_by"
    | "candidate_for"
    | "rejected_after_retest"
    | "accepted_after_retest"
    | "retained";
  evidenceIds: string[];
};
```

Rules:

- every Qloo node references real evidence-ledger IDs;
- every candidate comes from recorded `PlanChange` data;
- every rejected edge requires a recorded reverted outcome;
- constraints come only from the user's confirmed brief;
- missing evidence produces an uncertainty node, not a red failure node;
- no LLM call is made to construct the graph or its labels;
- the graph and table must produce identical conclusions.

The earlier graph implementation may be mined for data-shaping tests, but the user-facing visualization should be redesigned against this plan rather than restored unchanged.

## Implementation phases

### Phase 1 — conviction frame

- Add the compact run receipt.
- Add the Table / Decision graph control with Table as default.
- Add the one-line agent-loop strip.
- Add `Evidence path` links from table rows.
- No 3D work yet.

Review checkpoint: confirm that the page communicates the agent loop without feeling busier.

### Phase 2 — deterministic graph model

- Build graph nodes and edges from `RunState`.
- Test provenance, uncertainty, constraints, accepted and rejected candidates.
- Produce a static developer fixture for the London run.
- No Three.js rendering until the model is correct.

Review checkpoint: inspect the graph data as a tree/table and verify every relationship.

### Phase 3 — guided 3D graph

- Build the overview layout.
- Add focused decision layouts.
- Add controlled camera movement and touch interaction.
- Add labels, legend and the synchronized text explanation.
- Add reduced-motion and keyboard-accessible alternatives.

Review checkpoint: a first-time viewer should understand the active path without narration.

### Phase 4 — evidence inspector and replay

- Connect Qloo evidence nodes to the human-readable inspector.
- Add rejected-candidate outcomes.
- Add one-shot sequence animation and replay.
- Synchronize table selection, graph focus and explanation text.

### Phase 5 — judge rehearsal

- Rehearse the London demo in under 90 seconds.
- Test recorded and live labels.
- Test an honest mixed or unresolved result so the visualization never implies a forced win.
- Test desktop, touch, small screens and reduced motion.
- Capture the submission video only after the interaction is stable.

## Performance and accessibility limits

- Initial result/table must render without loading Three.js.
- Lazy-load the graph bundle only when `Decision graph` is selected.
- Target graph interaction at 60 fps on a normal laptop and acceptable operation on mobile.
- Cap visible nodes in overview; expand only the selected decision.
- Provide zoom reset and `Fit graph`.
- Preserve the table as the complete accessible alternative.
- All important graph information must be available as text.
- Touch targets must be at least 44 px.
- Respect `prefers-reduced-motion`.
- If WebGL is unavailable, show the deterministic 2D/text path rather than an error.

## Things not to add

- no chatbot avatar;
- no fake “agent thoughts” or chain-of-thought stream;
- no continuously moving node cloud;
- no confetti or winner animation;
- no generic AI sparkle iconography;
- no map unless geography becomes a real decision dimension;
- no extra dashboard page;
- no scores presented as predicted success;
- no graph relationships that cannot be traced to recorded state.

## Acceptance criteria

### Judge comprehension

After 20 seconds, a judge can state:

- what the user chose;
- what the LLM added;
- what the agent changed;
- the number of choices tested and changed.

After 60 seconds, a judge can state:

- which Qloo evidence challenged one original choice;
- which alternatives were tested;
- why the final candidate was accepted;
- which user constraint stayed intact;
- that the full plan was re-tested;
- whether the run is live or recorded.

### Product integrity

- Table and graph show identical decisions.
- Every evidence node traces to a real evidence record.
- Rejected candidates are backed by recorded reverted changes.
- Unknown and partial coverage are shown as uncertainty.
- The graph never claims causality or commercial success.
- A mixed result, baseline win or insufficient-evidence result renders honestly.

### Experience

- Table remains the default and stays as readable as it is now.
- Graph loads only on demand.
- Overview is understandable without interacting.
- Selecting a table row can focus the corresponding graph path.
- Touch, mouse and keyboard all work.
- Reduced-motion and WebGL fallback work.
- The judge demo completes comfortably within 90 seconds.

## Recommendation

Proceed with the graph, but only as a **decision-path proof layer** connected to the table—not as a separate visualization feature.

The table answers, “What changed?”

The graph must answer, “Show me that the agent actually researched, tested and re-tested before making that change.”

That distinction is what will make the project convincing rather than merely attractive.
