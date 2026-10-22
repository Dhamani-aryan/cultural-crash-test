# Progressive comparison UI plan

## Goal

Keep the Cultural Crash-Test interface calm and uncluttered when a run finishes, while making the complete decision trail easy to discover.

The first result view should answer only:

- What did the LLM originally propose?
- What does the Qloo-grounded agent propose now?
- Which choices changed?

The deeper explanation should appear only after the user deliberately opens comparison mode. Inside comparison mode, clicking an agent choice should reveal why the agent moved away from the original choice and why it moved toward the replacement.

Do not restore the old wall of evidence, logs, scores, and revisions all at once.

## Primary interaction

### 1. Default result state: clean summary

After the run completes, show the existing two compact plan cards:

```text
LLM alone                         Qloo-grounded agent
Music       Travis Scott          Music       slowthai     Changed
Partner     Vans                  Partner     Dxpe Chef    Changed
Venue       BOXPARK               Venue       BOXPARK      Kept
Direction   Pastel Y2K            Direction   Industrial   Changed
```

Keep this view compact. Do not show the evidence ledger, revision history, score formula, rejected candidates, or technical trace yet.

Changed agent choices should have a small visible marker such as `Changed`, an arrow, or a different border. Unchanged choices should say `Kept` rather than looking inactive or missing.

### 2. One prominent comparison action

Immediately below the two cards, add a high-visibility primary button:

**Compare plans & see why**

Optional supporting text:

> See why the agent kept or changed each choice, with the Qloo evidence behind it.

The action must look like the obvious next step:

- use the accent color and a filled treatment;
- include a comparison/arrows icon;
- include the number of changed choices when known, for example `Compare plans & see why · 3 changes`;
- do not use the current low-emphasis outline-pill styling;
- keep it directly below the result cards, not inside a technical details area.

### 3. Comparison mode

Clicking the button expands one structured comparison section in place. It should not navigate away or open a large modal.

Show one row/card per cultural component:

```text
Music act
Travis Scott  →  slowthai                 Agent better supported
                  [Why this change?]
```

For unchanged choices:

```text
Venue
BOXPARK       =  BOXPARK                  Kept
                  [Why it stayed]
```

The user should be able to click either:

- the new agent choice itself; or
- the explicit **Why this change?** action.

Do not depend on users guessing that plain text is clickable. Give the new choice a clear hover/focus treatment and retain the explicit action label.

Only one component explanation needs to be open at a time on mobile. Desktop may allow multiple open rows if implementation remains simple.

## Component explanation

When a changed agent choice is opened, show a concise explanation in this order.

### A. Why move away from the original?

Use the original component assessment and recorded evidence:

- original status: supported, weak, no support, unresolved, or constraint conflict;
- the concrete finding that triggered investigation;
- relevant Qloo audience/local/coherence evidence;
- whether the issue was actual contradiction or merely weak coverage;
- whether the choice came from the user or the LLM;
- whether exploration of user choices was enabled.

Example:

> **Why reconsider Travis Scott?** Qloo returned no audience support for this choice among the selected London audience, while the artist was not local to the target market. The choice was model-drafted and was eligible for repair.

Never phrase missing Qloo coverage as proof that a choice is culturally wrong.

### B. Why move toward the agent choice?

Use the final assessment, accepted `PlanChange`, and its triggering evidence:

- new status and evidence coverage;
- audience affinity/rank when actually returned;
- local relevance;
- coherence with the unchanged plan;
- role or venue suitability;
- hard-constraint compliance;
- before/after status and application score;
- why this candidate beat the original and other tested candidates.

Example:

> **Why slowthai?** Qloo showed stronger affinity with the selected audience and stronger coherence with the remaining launch plan. The artist passed the local-origin and role checks, and the re-tested component moved from No support to Supported.

Do not present the application score as a probability, forecast, or guarantee.

### C. What the agent tested

Keep this collapsed by default under a secondary disclosure:

**Other alternatives tested**

List accepted and rejected/reverted candidates from `state.changes` for this slot. For each rejected candidate, show the recorded observed outcome rather than inventing a new explanation.

### D. Evidence

Keep raw evidence collapsed by default:

**View Qloo evidence**

Show only evidence records cited by this component:

- evidence ID;
- purpose;
- concise returned-result summary;
- sanitized request;
- warnings and coverage status.

Do not expose API keys, headers, raw private inputs, or giant payloads.

### E. Limitations

If the choice remains unresolved, coverage is partial, Qloo does not know the original, or a free-text rule needs human verification, show that caveat directly inside the component explanation.

## Explanation for unchanged choices

Clicking **Why it stayed** should explain one of the real recorded reasons:

- the original choice was already supported;
- it was locked/booked;
- Qloo lacked enough evidence to justify replacing it;
- no tested alternative improved the plan;
- replacement would have violated a constraint;
- the agent preserved it because only another component was weak.

This is important to demonstrate targeted repair rather than random rewriting.

## Overall comparison header

At the top of expanded comparison mode, show the deterministic outcome from `comparePlans(state)`:

- Agent better supported
- LLM-only better supported
- Mixed result
- Insufficient evidence

Include a short summary and the number of supported/contradicted choices. State clearly that the result was decided by code from recorded evaluations.

Do not hardcode an agent victory.

## Technical implementation

### Existing files

Primary integration points:

- `src/components/chat-app.tsx`
- `src/components/plan-comparison.tsx`
- `src/lib/crashtest/compare.ts`
- `src/lib/crashtest/types.ts`
- `src/lib/crashtest/report.ts`

The required data already exists in:

- `state.initialPlan` and `state.plan`;
- `state.evaluations[0]` and the final evaluation;
- `state.changes`, including reverted attempts;
- `state.actions`;
- `state.evidenceLedger`;
- `state.unresolvedQuestions`;
- component origin and lock fields;
- `comparePlans(state)`.

This UI work must not trigger new Qloo or model calls.

### Add a deterministic view model

Create a small selector/helper instead of assembling explanations ad hoc in JSX. Suggested shape:

```ts
type ComponentChangeExplanation = {
  slot: Slot;
  changed: boolean;
  originalChoice: string;
  agentChoice: string;
  originalStatus: ComponentStatus;
  agentStatus: ComponentStatus;
  originalFinding: string;
  agentFinding: string;
  reasonToReconsider: string[];
  reasonForAgentChoice: string[];
  keptReason?: string;
  acceptedChange?: PlanChange;
  rejectedChanges: PlanChange[];
  evidenceIds: string[];
  caveats: string[];
};
```

Implement something such as:

```ts
buildChangeExplanations(state: RunState): ComponentChangeExplanation[]
```

All explanation facts must be derived from recorded state. Do not ask an LLM to rewrite or reinterpret the evidence for the UI.

### Suggested component structure

```text
RunResult
  PlanTable: LLM alone
  PlanTable: Qloo-grounded agent
  CompareCallToAction
  PlanComparisonView
    ComparisonSummary
    ComponentComparisonRow × 4
      ChangeExplanationPanel
        WhyOriginalWasReconsidered
        WhyAgentChoiceWon
        OtherCandidatesDisclosure
        EvidenceDisclosure
        Caveats
    TechnicalRunDisclosure
```

The final `TechnicalRunDisclosure` may contain stop reason, repair rounds, model calls, Qloo calls, rubric version, and report download. Keep it collapsed by default.

## Visual behavior

- Preserve the current dark, minimal chat interface.
- Make the comparison CTA the only high-emphasis action after results.
- Use text, icons, and shapes—not color alone—to communicate outcomes.
- Use a directional arrow for changes and `=` for unchanged choices.
- Animate expansion subtly; respect `prefers-reduced-motion`.
- On mobile, stack original and agent choices vertically while preserving direction.
- Give every interactive choice a visible hover and keyboard-focus state.
- Use `aria-expanded`, `aria-controls`, semantic buttons, and readable status text.
- Do not make the evidence IDs the main visual hierarchy; they are supporting verification.

## Edge cases

Handle these explicitly:

1. **No choices changed:** CTA still says `Compare plans & see why`; comparison explains why everything stayed.
2. **Agent lost or result is mixed:** show the truthful comparison outcome and component-level reasons.
3. **Original unknown to Qloo:** say “Qloo could not verify this choice,” not “unsupported.”
4. **Locked choice:** explain that it was assessed but not eligible for replacement.
5. **Failed repair attempts:** list them only under `Other alternatives tested`.
6. **Partial or cancelled run:** show available evidence and the stop reason; do not imply completion.
7. **Recorded run:** retain the recording date and provide a clear `Run live again` action outside the explanation panels.
8. **Same label but changed metadata/tags:** treat it as unchanged unless the actual component identity changed.

## Tests

Add unit tests for the deterministic explanation builder:

- changed choice produces both “move away” and “move toward” reasons;
- unchanged supported choice explains why it stayed;
- locked weak choice explains that it could not be changed;
- unresolved Qloo-unknown choice uses uncertainty language;
- reverted candidates are separated from the accepted change;
- every displayed evidence ID exists in the ledger;
- comparison outcomes include agent, baseline, mixed, and insufficient evidence;
- no explanation claims that missing evidence means a bad choice.

Add component tests where the current test stack permits:

- comparison details are hidden initially;
- the primary CTA is visible after a completed run;
- clicking the CTA reveals comparison rows;
- clicking an agent choice reveals its explanation;
- raw evidence remains collapsed until requested;
- keyboard activation works;
- mobile markup remains readable.

Run:

```text
npm test
npm run lint
npm run typecheck
npm run build
```

Because this change only presents existing recorded state, it should not change agent decisions, require a new evaluation run, or require a `RUN_VERSION` bump. If implementation changes the run state, evidence, comparison rules, or agent behavior, then bump the version and rerun the evaluation.

## Documentation updates

Update `README.md`, `STATUS.md`, `handoff/HANDOFF.md`, and `docs/SUBMISSION.md` so they describe the actual progressive comparison UI rather than deleted components.

The submission wording should say:

> Results remain compact until the user chooses Compare plans & see why. Each agent choice can then be opened to show why the original was reconsidered, why the replacement was selected, which alternatives were rejected, and the exact recorded Qloo evidence behind the decision.

## Acceptance criteria

- The initial result remains as clean as the current two-card view.
- A prominent **Compare plans & see why** button is immediately discoverable.
- The button shows how many choices changed.
- Comparison mode clearly shows original → agent choices for all four components.
- Clicking a new agent choice or **Why this change?** reveals both sides of the decision.
- Unchanged choices explain why they were preserved.
- Rejected alternatives and raw Qloo evidence remain collapsed until requested.
- All displayed claims come from the recorded run state.
- The UI truthfully supports agent wins, baseline wins, mixed results, and insufficient evidence.
- The experience works on desktop, mobile, mouse, and keyboard.
- No new model or Qloo calls are introduced.
- Existing tests plus lint, typecheck, and production build pass.

## Instructions for Claude

Implement this as progressive disclosure inside the current ChatGPT-style interface. Preserve the minimal default result view. Do not restore the previous always-expanded dashboard. Reuse the existing `RunState`, comparison logic, evidence ledger, changes, and evaluations; do not generate new explanatory claims with an LLM. Make the comparison CTA visually obvious, make each agent choice explicitly clickable in comparison mode, and reveal evidence only within the selected choice’s explanation. Update stale documentation after the UI works and all checks pass.
