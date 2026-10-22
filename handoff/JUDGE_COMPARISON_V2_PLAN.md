# Judge comparison V2 implementation plan

## Purpose

Make the completed run understandable to a hackathon judge in under 30 seconds, while preserving enough evidence to inspect every decision.

This phase covers only the results comparison and reasoning experience. The knowledge-graph visualization is Phase 2 and must not begin until this comparison passes the acceptance criteria below.

This plan supersedes `PROGRESSIVE_COMPARISON_UI_PLAN.md`. That plan established progressive disclosure; V2 improves the information design, writing, and one-to-one comparison.

## What is still missing

The current results are visually cleaner, but they still make the viewer do too much interpretation:

1. The plans are presented as two separate tables, so the eye must move between columns and remember which row corresponds to which choice.
2. `Supported`, `changed`, and `stronger evidence` are conclusions, but the most important reason is not visible in the comparison row.
3. Open explanations are long bullet lists. They read like generated diagnostic output instead of a deliberate product explanation.
4. The same evidence is repeated in several forms: status, outcome, headline, bullets, and technical evidence. This makes the result feel verbose without necessarily becoming clearer.
5. A judge cannot immediately see the agent's method: test the original, isolate the weakest choice, search, re-test, then accept or reject.
6. Changed choices are explained, but unchanged choices need equally intentional reasoning to demonstrate that the agent is selective rather than rewriting everything.
7. Technical details such as evidence IDs, sanitized requests, rubric versions, and call counts are useful for auditability but should not compete with the product story.

## Product principle

Every row must answer five questions in this exact order:

1. What was proposed?
2. What did the evidence say about it?
3. What did the agent decide?
4. Why is the new decision more defensible?
5. What evidence and limitations support that statement?

No primary comparison sentence should be generated at render time by an LLM. All wording must come from structured recorded state and deterministic templates.

## Target judge experience

### First 10 seconds: outcome

Show a compact result header:

```text
LONDON · RECORDED RUN

2 choices strengthened. 2 retained.
The revised plan removed both unsupported choices without breaking the booked venue or brand rules.

Original plan    2 / 4 supported
Revised plan     4 / 4 supported
```

Rules:

- Use the real counts and outcome; never force a win.
- If the result is mixed, baseline-favored, or insufficient, say so directly.
- Do not call the application score a prediction, probability, or market-success score.
- Keep the recorded/live state visible but secondary.

### Next 20 seconds: one-to-one decision matrix

Replace the two independent plan tables with one aligned comparison matrix:

```text
CHOICE          ORIGINAL                 DECISION REASON                         REVISED

Music act       Travis Scott             No London audience support found        slowthai
                No support               Strong local affinity and plan fit       Supported
                                           [Review decision →]

Venue           BOXPARK Shoreditch       Booked and supported; no reason to move  BOXPARK Shoreditch
                Supported                                                        Retained
                                           [Review decision →]
```

Desktop columns:

- component;
- original choice and original status;
- a central decision cell containing the arrow/equal sign and one concise reason;
- revised choice and final status;
- explicit `Review decision` action.

Mobile layout:

- one vertical decision block per component;
- `Original` and `Revised` labels must remain visible;
- show the reason between them, not after both;
- avoid horizontal scrolling.

Default ordering:

1. changed choices;
2. unresolved or constrained choices;
3. retained choices.

Add a quiet `Show plan order` option if preserving slot order is useful. Do not add a complex filter toolbar.

### Review a decision

Clicking anywhere on the decision row or `Review decision` opens one inline panel directly below it. Only one panel should be open at once on all screen sizes so the judge never loses the before/after context.

For a changed choice, use this fixed structure:

```text
DECISION 01 · MUSIC ACT

Travis Scott  →  slowthai

Why move away
No audience support was returned for Travis Scott in this London test. Because this was an
editable choice—not a locked requirement—the agent opened it for alternatives.

Why this replacement
slowthai ranked #1 among the tested London music candidates for this audience and improved
the music component from No support to Supported after the full plan was re-tested.

What stayed fixed
BOXPARK remained booked. The no-Supreme rule remained in force. The target audience did not change.

Proof
[Audience affinity] [Local relevance] [Full-plan re-test]

Limits
Qloo support is cultural evidence, not a forecast of commercial success.
```

For a retained choice:

```text
BOXPARK Shoreditch  =  BOXPARK Shoreditch

Why it stayed
The venue is booked and the recorded evidence supports it. No contradictory evidence justified
overriding the user's fixed choice.
```

### Evidence drawer

Inside the decision panel, show three small evidence summaries before raw details:

- `Audience signal` — rank, affinity, or returned/no-returned fact;
- `Local signal` — origin, city relevance, venue category, or unavailable;
- `Plan signal` — before/after status and whether the re-tested plan improved.

Each summary must include a plain-language value and a provenance label such as `Qloo result`, `User constraint`, or `Application evaluation`.

Keep these secondary disclosures closed by default:

- `Other candidates tested`;
- `Inspect recorded evidence`;
- `Run methodology`.

Raw evidence IDs, sanitized request JSON, warnings, model/Qloo call counts, and rubric versions belong only in those disclosures.

## Writing system

### Required tone

- concise, factual, and specific;
- prefer concrete subjects and verbs;
- lead with the decision, not the system performing it;
- state the actual market and audience when relevant;
- use uncertainty language whenever coverage is incomplete.

### Replace vague phrases

| Avoid | Use instead |
| --- | --- |
| Agent better supported | Revised plan has 2 fewer unsupported choices |
| Stronger evidence | Ranked #1 for this London audience |
| Qloo supports it | Returned with 0.96 affinity in this audience test |
| No support found, therefore wrong | No support was returned in this test; coverage may be incomplete |
| The agent changed X | X was replaced because… |
| Plan coherence improved | Full-plan re-test moved 2/4 → 3/4 supported |
| Better local fit | Qloo places the artist in the target country |

### Copy constraints

- Row reason: maximum 90 characters where practical.
- `Why move away`: maximum two sentences before evidence chips.
- `Why this replacement`: maximum two sentences before evidence chips.
- Never repeat the same metric in the header, row, and open panel unless it serves a different decision.
- Do not expose internal terms such as `slot`, `ledger`, `sanitizedRequest`, `iteration`, or `rubricVersion` in the primary UI.
- Do not use celebratory language, confetti, winner badges, or a guaranteed-success claim.

## Deterministic decision model

Extend the current explanation selector rather than assembling copy in JSX.

Suggested model:

```ts
type DecisionReasonCode =
  | "audience_contradiction"
  | "weak_coverage"
  | "qloo_unknown"
  | "constraint_locked"
  | "user_rule_unverified"
  | "local_relevance"
  | "audience_affinity"
  | "plan_coherence"
  | "venue_fit"
  | "constraint_safe"
  | "no_better_alternative"
  | "already_supported";

type DecisionEvidence = {
  kind: "audience" | "local" | "plan" | "constraint";
  label: string;
  value: string;
  source: "qloo" | "user" | "application";
  evidenceIds: string[];
};

type DecisionExplanation = {
  slot: Slot;
  sequence: number;
  changed: boolean;
  original: { label: string; status: ComponentStatus };
  revised: { label: string; status: ComponentStatus };
  summaryReason: string;
  reasonCodes: DecisionReasonCode[];
  whyAway: string[];
  whyToward: string[];
  preservedConstraints: string[];
  evidence: DecisionEvidence[];
  alternatives: PlanChange[];
  limitations: string[];
};
```

Implementation rules:

- Derive this from the initial/final evaluations, accepted/reverted changes, component origins, constraints, evidence ledger, and unresolved questions.
- Preserve the stricter unknown-brand policy: a Qloo-unknown brand with a free-text rule that code cannot verify must be retained and flagged, never upgraded.
- If Qloo returned no evidence, say `No support was returned`; never translate this to `bad`, `wrong`, or `will fail`.
- A changed user choice must state why it was eligible to change. A locked choice must never appear as freely replaceable.
- `preservedConstraints` should show the judge that repair was targeted and did not silently rewrite the brief.
- Every numeric claim must be traceable to an evidence record or evaluation field.

## Component architecture

Refactor the result UI into these responsibilities:

- `RunResultHeader` — outcome, concise factual summary, original/revised counts.
- `DecisionMatrix` — aligned one-to-one rows and changed-first ordering.
- `DecisionRow` — original, reason, revised, status, disclosure control.
- `DecisionDetail` — why away, why toward/why retained, preserved constraints, limitations.
- `EvidenceSummary` — three human-readable evidence blocks.
- `AuditDetails` — alternatives, evidence records, methodology, report download.

Likely files:

- refactor `src/components/run-result.tsx`;
- replace most of `src/components/plan-comparison.tsx`;
- extend `src/lib/crashtest/explain.ts`;
- reuse `src/lib/crashtest/compare.ts` without changing outcome rules;
- add focused component files only if the primary files become difficult to read;
- update `tests/components/results.test.tsx` and `tests/crashtest/explain.test.ts`.

Do not add a UI component library solely for this comparison. The current native table, details, buttons, and CSS are sufficient and preserve the product's visual identity.

## Implementation sequence

### Step 1 — strengthen the view model

1. Add reason codes, evidence summaries, preserved constraints, and limitations to the deterministic explanation builder.
2. Cover changed, retained, locked, unresolved, Qloo-unknown, rule-unverified, and reverted-alternative cases.
3. Unit-test the selector before changing JSX.

### Step 2 — build the one-to-one matrix

1. Replace independent plan columns with aligned decision rows.
2. Put the single most important reason in the center of every row.
3. Sort changed/unresolved rows first while retaining an accessible plan-order option only if needed.
4. Implement a clean vertical mobile version.

### Step 3 — rewrite decision detail

1. Replace long diagnostic bullets with the fixed decision structure.
2. Show `Why move away` and `Why this replacement` for every changed choice.
3. Show `Why it stayed` for retained choices.
4. Add `What stayed fixed` so targeted repair is obvious.
5. Keep limitations visible; keep raw evidence secondary.

### Step 4 — tighten the result header

1. Lead with the actual delta, not a generic winner label.
2. Show supported and contradicted counts compactly.
3. Keep recorded/live provenance and re-run action visible but quiet.
4. Preserve truthful mixed, baseline, and insufficient-evidence states.

### Step 5 — browser QA and judge rehearsal

Run the recorded London example and verify that a first-time viewer can answer:

- What changed?
- Why was the original questioned?
- Why was this replacement selected?
- Which user constraints were preserved?
- What is evidence versus an application judgment?
- What are the limitations?

Test desktop, narrow mobile, mouse, and keyboard. The comparison should remain readable at 200% zoom.

## Tests

### Decision builder

- changed choice produces a concise reason plus why-away and why-toward;
- retained supported choice produces an explicit kept reason;
- booked/locked choice shows the constraint and is not described as replaceable;
- Qloo-unknown plus unverifiable free-text rule is retained and flagged;
- absent evidence uses uncertainty language;
- accepted and rejected alternatives are distinguished;
- evidence summaries reference real ledger IDs;
- preserved constraints come from the recorded brief;
- no copy claims commercial success or probability.

### Component behavior

- every component appears in one aligned comparison row;
- changed and unresolved rows appear before retained rows;
- every row has an explicit review control;
- opening a row closes the previously open row;
- raw evidence and alternatives are closed by default;
- decision details are keyboard accessible and correctly labelled;
- mobile markup preserves Original → Reason → Revised order;
- agent, baseline, mixed, same, and insufficient results render truthfully.

### Regression commands

```text
npm test
npm run lint
npm run typecheck
npm run build
```

No run-version bump is required if this remains a presentation-only change. Bump the run version and rerun evaluation only if decision rules, evidence collection, or agent behavior changes.

## Acceptance criteria for Phase 1

- A judge can identify every changed and retained choice without comparing separate tables manually.
- Each row contains a concrete reason, not only a status label.
- Every changed choice provides both `Why move away` and `Why this replacement`.
- Every retained choice explains why it stayed.
- The UI distinguishes Qloo evidence, user constraints, and application evaluations.
- Constraints preserved during repair are visible.
- Raw technical evidence remains available without dominating the screen.
- The copy is deterministic, concise, and does not read like generated prose.
- The result remains honest for losses, ties, partial coverage, and unknown entities.
- The recorded London demo can be understood in under 30 seconds.
- All tests, lint, typecheck, build, and browser QA pass.

## Phase 2 — knowledge graph, after approval

Do not implement this in Phase 1. After the decision matrix is accepted, use the same `DecisionExplanation` model to create a graph rather than inventing another data path.

Initial graph concept:

```text
Audience anchors ─┬─ Qloo affinity ── Original choice ── contradiction
                  │                                      │
Market/location ──┼─ local relevance ─ Candidate set ────┼─ accepted replacement
                  │                                      │
User constraints ─┴─ locked / allowed ─ Full-plan test ──┘
```

The graph should:

- show the path from brief inputs to evidence to decision;
- distinguish user input, Qloo entities, application evaluations, and final choices by shape—not color alone;
- animate only the active decision path;
- default to a stable 2D/2.5D layout, with 3D used only if it improves comprehension;
- synchronize with the comparison row a judge selects;
- never imply causal certainty where the data only shows affinity.

Phase 2 begins only after Phase 1 passes its acceptance criteria and the user approves the comparison experience.
