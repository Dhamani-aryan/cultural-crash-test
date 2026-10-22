# UI, decision-graph and backend refinement plan

**Status:** implementation plan only. Do not implement until the owner asks.

## Objective

Make the result experience quieter, clearer and more convincing without adding explanatory copy the owner did not request. Fix the table language, graph overlaps, misleading interaction styling and replay animation. Improve the backend data contract so the UI can show a complete, truthful decision trace instead of reconstructing one from display strings.

The result must answer three questions:

1. What did the user choose?
2. What did the LLM propose?
3. What did the agent change or retain, and what recorded evidence justified that decision?

## Non-negotiable product rules

1. **Do not add editorial descriptions, helper sentences, marketing copy or explanatory footnotes unless the owner explicitly asks for them.**
2. User-facing prose on the result screen may come only from:
   - the user's confirmed brief;
   - the user, LLM and agent choices;
   - recorded Qloo evidence;
   - recorded candidate tests and re-test outcomes;
   - recorded constraints, unresolved questions and run provenance.
3. Do not expose or invent hidden model chain-of-thought. The requested “agent thinking” must be presented as a **Decision trace**: recorded actions, evidence, candidates, acceptance tests and outcomes.
4. Do not create new cards, dashboards, scores, badges or decorative descriptions.
5. Keep the comparison table as the default view.
6. Keep uncertain or missing evidence honest. Never turn “Qloo returned no result” into proof that a choice is bad.
7. The table, graph and Decision trace must be deterministic projections of the same `RunState`.

## Current audit findings

### Table

- `src/components/plan-comparison.tsx` inserts inline provenance chips such as `QLOO AUDIENCE RESULT`, `QLOO LOCAL RESULT` and `FULL-PLAN RE-TEST`. They interrupt the sentence and look like controls even though they are only labels.
- The repeated limitation note under individual rows adds visual noise.
- The comparison introduction and bottom explanatory sentence are extra helper copy rather than result data.

### Evidence path

- Inspectable entries are rendered as underlined buttons. Underlining communicates navigation, but these controls do not navigate anywhere.
- Clicking an entry does technically update `inspect`, but the inspector is anchored inside the canvas above the Evidence path. When the Evidence path is below the canvas, the user sees no visible response and reasonably assumes the click failed.
- Non-inspectable and inspectable entries are mixed without a strong interaction distinction.

### Decision graph

- Labels are plain HTML overlays positioned at projected node coordinates. There is no collision resolution, no safe area for the legend and no boundary-aware label placement. This causes labels such as `POP-UP VENUE / BOXPARK Shoreditch` to overlap nodes or the legend.
- The overview uses straight edges between `Your brief`, four decision nodes and `Final plan`. In the current radial placement, those chords cross unrelated nodes, other edges and labels. More spacing alone will not solve this topology problem.
- Edges terminate at node centres instead of at the visible boundary of each node, so lines visually run underneath the destination shape and its label.
- The legend and graph controls sit inside the canvas as absolute overlays and consume the same space as graph labels.
- Camera fitting considers node positions but not label dimensions or overlay safe zones.

### Replay animation

- Overview mode contains only `brief` at reveal step 1 and the four final choices plus `plan` at step 6. Reveal steps 2–5 have nothing visible in the overview. The result is a long pause followed by nearly the entire graph appearing together.
- `EdgeLine` animates opacity only. A complete line fades in; the connection does not visibly travel from one point to the next.
- Replay uses a single global `reveal` number rather than an ordered sequence of node and edge events.

### Backend and data integrity

- `PlanChange.observedEffect` is a formatted string. `retestOutcome()` parses that string with a regular expression to recover before/after results. Display-copy changes can therefore break graph data.
- Candidate screening records exist in the evidence ledger, but the final `RunState` does not preserve a structured list of all candidates considered, why each failed screening, why each was re-tested, or why it was accepted/rejected.
- `qlooCallsUsed` counts logical client operations before the server cache. It includes cache hits, so displaying it as “Qloo queries” can be mistaken for actual outbound API requests.
- Recorded/live provenance is carried in a transient replay message. A saved recorded result restored from browser storage loses that flag and is displayed as a live run.
- The current evaluation shows a major presentation risk: the evidence-based judge favours the agent, but the blind preference judge usually favours the LLM draft. This suggests the agent is improving its evidence rubric while sometimes losing human-perceived role fit or coherence.

## Phase 1 — remove unrequested copy and clean the comparison table

### Required changes

In `src/components/plan-comparison.tsx`:

1. Remove the inline `Tag` component and all visual provenance chips from Why paragraphs.
2. Remove these helper descriptions:
   - `Each choice is shown side by side...`
   - the repeated per-row `Note: No support was returned...` line;
   - `“Supported” means supported by...` below the table.
3. Keep the actual reason, but write it as uninterrupted normal text.
4. Do not replace removed copy with tooltips, info icons or new explanatory labels.
5. Retain the strong table grid and distinct You / LLM / Agent columns.

### Why-row format

For a changed choice, the paragraph should contain only recorded facts in this order:

```text
[Original choice and who supplied it]. [What the test returned]. [Alternative selected].
[Evidence for the alternative]. [Observed full-plan re-test result].
```

For a retained choice:

```text
[Choice and who supplied it]. [Recorded evidence or constraint that caused it to be retained].
```

Do not insert headings inside the paragraph such as `Qloo audience result` or `Full-plan re-test`.

### Result-page copy cleanup

Audit `run-result.tsx`, `judge-graph-view.tsx` and `chat-app.tsx`. Remove non-essential helper copy while preserving actual run data. Specifically remove:

- the graph instruction footer beginning `Drag to orbit...`;
- the overview instruction ending `Select a decision to see...`;
- the comparison-table helper paragraph;
- the repeated evidence disclaimer below the table.

Keep controls labelled by their action: `Table`, `Decision graph`, `Fit graph`, `Replay decision path`, and decision names.

## Phase 2 — replace the misleading Evidence path interaction

### Interaction model

1. Rename the section **Decision trace**.
2. Render every trace step as a row in chronological order.
3. A non-interactive row is plain text with no underline and no hover treatment.
4. An interactive evidence or candidate row is a full-width button with:
   - a subtle hover background;
   - pointer cursor;
   - visible focus ring;
   - selected state;
   - a trailing chevron or `View details` action.
5. Underlines are reserved for real navigation links. Do not underline these buttons.

### Click behaviour

Clicking an interactive Decision trace row must perform all of the following:

1. select the corresponding graph node;
2. smoothly focus the graph camera on that node;
3. highlight the node and its incoming/outgoing edges;
4. open the details content in the dedicated Decision details section described below;
5. scroll the Decision details heading into view when it is outside the viewport;
6. move keyboard focus to that heading or panel so screen-reader and keyboard users receive an obvious result.

The same behaviour must occur when the user clicks the corresponding node in the canvas.

### Dedicated Decision details section

Place a stable section directly below the canvas and above the Decision trace. Do not use a floating inspector as the primary details surface.

For a focused decision, show only fields that have recorded values:

- `Original` — user or LLM choice;
- `What the test returned` — direct evidence summary;
- `Alternatives tested` — each candidate and its observed outcome;
- `Why rejected` — deterministic rejection reason;
- `Why accepted` — deterministic acceptance checks passed;
- `Full-plan result` — structured before/after supported counts and status;
- `Constraints preserved` — only the constraints that actually applied;
- `Evidence` — result count, top returned entities/tags, context, coverage and source.

Do not show empty labels. Do not add a paragraph explaining how to read the section.

The existing compact inspector may remain as a desktop convenience only if it mirrors this section and never becomes the only visible response to a click. On mobile, use only the stable section.

## Phase 3 — fix graph layout and label overlap

The screenshot defect is not only a label-collision problem. Treat **nodes, labels and edges as three collision layers**. A layout is invalid if an edge crosses an unrelated node or any visible label.

### Replace the overview topology

Do not keep the current four-corner radial layout with straight chords.

Use a left-to-right layered overview:

```text
                         Music
                       ↗       ↘
Your brief  ─────────→  Brand  ─────────→  Final plan
                       → Venue →
                       ↘ Direction ↗
```

Actual placement:

- `Your brief`: one left column;
- the four decision nodes: one evenly spaced middle column;
- `Final plan`: one right column;
- use shallow Z offsets only for depth/parallax, never to hide a crossing in the default camera view.

This layout presents the graph as a readable flow and prevents the current diagonal lines from cutting through the central plan node.

### Route edges instead of drawing centre-to-centre chords

1. Render overview connections as quadratic or cubic curves with deterministic lane offsets.
2. Fan edges out from `Your brief` and fan them back into `Final plan`.
3. Clip every edge to the visible boundary of its source and target shapes. Do not draw into either node's centre.
4. Before accepting a route, project it into screen space and test it against:
   - every unrelated node's padded bounding circle/rectangle;
   - every visible label rectangle;
   - the canvas toolbar and boundary safe zones.
5. If a route intersects an obstacle, move its control point into the next deterministic lane and test again.
6. Edges that share an endpoint may meet only at that endpoint. They must separate immediately after leaving it.
7. Do not solve crossings by pushing lines far into Z depth: the default overview must be clean without the user orbiting the camera.
8. Do not display edge-relation text in overview mode. Relation labels belong only to the selected focused path.

Suggested view-model addition:

```ts
interface RoutedEdge {
  edgeId: string;
  points: Vec3[];
  sourceRadius: number;
  targetRadius: number;
  lane: number;
}
```

Compute routed edges in the deterministic layout module, not ad hoc inside the render loop.

### Canvas chrome

1. Move the legend outside the Three.js canvas. It should sit below the canvas in normal document flow.
2. Move `Fit graph` and `Replay decision path` into a toolbar above the canvas or reserve a fixed top safe area for them.
3. The canvas should contain only graph nodes, edges, node labels and an optional non-blocking selection highlight.

### Label placement

Implement screen-space label placement in `judge-graph-scene.tsx`:

1. Measure each visible label after render.
2. Clamp labels to the canvas bounds with at least 12 px padding.
3. Give every node a label exclusion radius based on its projected node size. The label baseline must begin outside that radius; the current fixed `translate-y-[18px]` is not sufficient.
4. In overview, use fixed label anchors so the result is stable: decision labels above or below their node according to their row, `Your brief` to the left, and `Final plan` to the right.
5. In focused mode, if a node is in the lower part of the canvas, place its label above the node; otherwise place it below.
6. Detect intersections among visible label rectangles. Resolve overlaps by shifting labels vertically; if resolution is impossible, keep the active/final label and hide the lower-priority label.
7. After label placement, re-route or suppress any edge segment that intersects a label rectangle. A line must never be visible behind text.
8. Priority order: selected node, final plan, changed final choices, retained final choices, brief, inactive nodes.
9. Re-run placement and route validation after camera movement, resize and focus changes.

Do not rely on an opaque text background as the primary fix. The geometry must be non-overlapping before any background treatment is added.

### Camera fitting

- Fit the active graph into a safe rectangle that excludes toolbar and label padding.
- Add enough vertical room for labels, not just node geometry.
- Lock the default overview camera to the clean front-facing composition. Orbit remains available after user interaction, but the first view and every `Fit graph` reset must return to the non-overlapping composition.
- Verify overview and every focused decision at desktop and 375 px width.

## Phase 4 — implement a real point-to-point replay

Replace the global six-step reveal counter with an ordered event timeline.

### Replay event model

Add a deterministic presentation model such as:

```ts
type ReplayEvent =
  | { type: "show_node"; nodeId: string; methodStep: number }
  | { type: "draw_edge"; edgeId: string; methodStep: number }
  | { type: "recede_node"; nodeId: string; methodStep: number }
  | { type: "focus_node"; nodeId: string; methodStep: number };
```

This is presentation state derived from `JudgeGraph`; it must not make a model call.

### Overview replay

The overview replay must visibly progress through the small overview graph:

1. show `Your brief`;
2. reveal one decision node;
3. draw the connection from brief to that decision from source to target;
4. repeat for the other decisions;
5. show `Final plan`;
6. draw each decision-to-plan connection one at a time;
7. finish with all overview nodes visible.

Changed decisions may be ordered before retained decisions, but the order must remain deterministic for the same run.

### Focused-decision replay

Replay the actual recorded path:

1. user choice/open slot;
2. LLM choice;
3. evidence nodes one at a time;
4. candidates one at a time;
5. rejected candidates recede after their recorded re-test;
6. full-plan re-test;
7. final choice;
8. final choice connects to the final plan.

### Edge drawing

Do not fade in a completed edge. Animate its endpoint from the source position to the target position using an edge progress value from 0 to 1. The node at the destination appears as the line reaches it.

### Replay controls

- `Replay decision path` always resets nodes, edges, selection and method-step highlight before starting.
- Disable the replay button while replay is running, or change it to `Stop replay`.
- Do not auto-loop.
- Reduced-motion mode immediately shows the final state with no timed animation.
- Do not move the camera on every event in overview mode. In focused mode, camera motion may follow only the major stages to avoid nausea.

## Phase 5 — add a structured backend decision trace

The detailed UI cannot be reliable while it parses prose. Change the data contract first.

### Structured re-test result

Replace `PlanChange.observedEffect?: string` as the source of truth with a structured object:

```ts
interface RetestResult {
  slotStatusBefore: ComponentStatus;
  slotStatusAfter: ComponentStatus;
  slotScoreBefore?: number;
  slotScoreAfter?: number;
  supportedBefore: number;
  supportedAfter: number;
  planScoreBefore?: number;
  planScoreAfter?: number;
  contradictedBefore: number;
  contradictedAfter: number;
  accepted: boolean;
  rejectionCode?:
    | "no_improvement"
    | "target_not_supported"
    | "plan_regression"
    | "constraint_conflict"
    | "better_candidate_selected";
}
```

Keep a generated sentence only as a presentation helper. Remove the regex parser from `judge-graph.ts`.

### Candidate trials

Persist every screened and re-tested candidate in a structured trace:

```ts
interface CandidateTrial {
  slot: Slot;
  name: string;
  entityId?: string;
  source: "qloo_list" | "llm_proposal";
  evidenceIds: string[];
  audienceRank?: number;
  localityResult?: string;
  roleFit?: number;
  briefFit: "pass" | "fail" | "unknown";
  screenedOutReason?: string;
  retest?: RetestResult;
}
```

Store these per action/iteration in `RunState`. The UI must not infer rejected candidates from prose or ledger ordering.

### Decision trace

Create a deterministic builder that combines:

- user choice/open slot;
- LLM draft choice;
- baseline evaluation;
- action record;
- candidate trials;
- accepted change;
- final evaluation;
- applicable constraints;
- exact evidence IDs.

Use this builder for the comparison reason, Decision trace and graph. Add a test asserting that all three surfaces reach identical conclusions.

### Run provenance and counters

Persist provenance in saved results:

```ts
interface RunProvenance {
  mode: "live" | "recorded";
  recordedAt?: string;
  runVersion: string;
}
```

Do not infer recorded/live status from a transient replay message.

Separate these measurements:

- logical Qloo operations requested by the run;
- evidence records created;
- cache hits;
- actual outbound Qloo HTTP requests.

Only display a measurement if it is accurately collected. Until actual outbound calls are instrumented, replace `Qloo queries` with `Qloo checks` or remove the count from the prominent receipt.

## Phase 6 — improve result quality without forcing the agent to win

The goal is to prevent evidence optimisation from producing a culturally less credible plan.

### Candidate quality gates

1. Apply brief-fit checks to every replacement candidate, not only unknown collaboration brands.
2. Introduce slot-specific role gates:
   - artist: compatible music/event role and audience signal;
   - collaboration brand: compatible product/business category and brand attributes;
   - venue: verified city, event-capable type and compatible event format;
   - creative direction: preserve explicit brand attributes while replacing only unsupported terms.
3. Treat role fit and hard constraints as gates, not small score bonuses.
4. Keep an original choice when no candidate clears both cultural evidence and role/brief fit.

### Acceptance guard

A replacement may be accepted only when:

- the target decision improves under the deterministic rubric;
- no hard constraint is violated;
- the target passes slot-specific brief/role gates;
- the complete plan does not lose a previously supported choice without an explicit, recorded trade-off;
- an upgrade of a non-contradicted choice reaches `Supported` and is materially better;
- unknown user brands under unverifiable free-text rules remain untouched and flagged, as currently required.

### Reduce unnecessary Qloo work

The current full-plan re-test recomputes every dimension for every candidate. Add a run-local evidence cache keyed by the normalized request and reuse invariant dimensions:

- audience affinity and locality for unchanged components are invariant;
- only coherence dimensions depending on the changed plan need re-querying;
- the candidate's own audience, locality and coherence checks must still run;
- the final accepted plan still receives one complete verification pass.

Do not weaken the full-plan acceptance test. Optimise duplicate work, not evidence coverage.

### Evaluation gate

Before merging backend ranking changes:

1. run the existing nine-brief evaluation unchanged;
2. report held-out supported choices, evidence-judge result and blind preference result;
3. require no held-out regression and no new evidence-judge loss;
4. add at least six human-reviewed plausibility cases covering artists, brands and venues across several cities;
5. include cases where keeping the original is the correct outcome;
6. report losses honestly rather than tuning individual examples until they win.

The blind preference judge is a diagnostic for plausibility, not the production objective and not an acceptance oracle.

## Required tests

### Unit tests

- table reasons contain no provenance-chip text;
- `DecisionTrace` contains only IDs present in the evidence ledger;
- every candidate trial has a deterministic outcome or screening reason;
- graph, table and Decision trace agree on original, final and changed/retained status;
- restored recorded runs remain labelled recorded;
- logical checks and actual outbound requests are not conflated;
- overview replay has multiple visible events before the final step;
- every drawn edge starts only after its source node and finishes before its target is presented as complete;
- reduced-motion mode skips animation and shows the final state;
- clicking a trace row selects the matching node and opens Decision details;
- non-interactive rows are not buttons and have no underline.

### Browser checks

- desktop and 375 px width;
- overview plus all four focused decisions;
- no node label intersects another label, node, toolbar, canvas boundary or legend;
- no edge crosses an unrelated node or any visible label in the default overview and focused views;
- edges stop at node boundaries instead of continuing under node centres;
- `Fit graph` always restores the clean front-facing layout after orbiting;
- replay visibly draws connections point-to-point;
- evidence/candidate row click produces an obvious on-screen response without scrolling upward manually;
- mouse, touch and keyboard;
- replay can be restarted repeatedly;
- no WebGL and reduced-motion fallbacks;
- recorded and live runs;
- a changed run, unchanged run, mixed result and insufficient-evidence result.

### Repository checks

Run:

```text
npm test
npm run lint
npm run typecheck
npm run build
```

## Implementation order

1. Add structured `RetestResult`, `CandidateTrial`, `DecisionTrace` and `RunProvenance` types.
2. Populate them in the run controller and repair pipeline.
3. Add backend tests and migrate old presentation builders away from string parsing.
4. Remove table provenance chips and unrequested helper copy.
5. Build the stable Decision details and Decision trace sections.
6. Fix evidence-row click behaviour.
7. Move canvas controls/legend and add collision-aware labels.
8. Replace the reveal counter with the replay event timeline and progressive edges.
9. Add the candidate acceptance guard and run-local evidence reuse.
10. Run unit, browser and evaluation checks; update `STATUS.md` with measured results only.

## Definition of done

- The table contains no provenance chips such as `QLOO AUDIENCE RESULT` or `FULL-PLAN RE-TEST`.
- No unrequested helper descriptions remain on the result screen.
- Graph labels never overlap the legend or each other in the tested layouts.
- Replay visibly travels from node to node and draws each connection.
- Every interactive Decision trace row has a clear, visible result when clicked.
- Decision details show the recorded decision process without exposing or inventing chain-of-thought.
- The UI never parses a formatted sentence to recover backend facts.
- Recorded/live provenance survives saved-chat restoration.
- Qloo counters use accurate terminology.
- Backend candidate changes pass the unchanged held-out evaluation with no regression.
- Tests, lint, typecheck and production build pass.
