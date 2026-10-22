# Cultural Crash-Test: project status

**Updated:** 2026-10-21. **Deadline:** Oct 30, 11:45 PM ET.
**Repo:** [github.com/Dhamani-aryan/cultural-crash-test](https://github.com/Dhamani-aryan/cultural-crash-test). Every change is committed and pushed to `main`.

## What it is

You describe a brand launch in plain words: who it's for, the city, and any choices already made. Then:
1. **The LLM drafts a plan on its own**, with no Qloo data: a music act, a collaboration brand, a pop-up venue and a creative direction. This is the "LLM alone" answer.
2. **The agent tests every choice against Qloo's taste data** for that audience in that city.
3. **It fixes what the evidence contradicts:**
   - no support for this audience here;
   - a global default instead of a local pick;
   - a broken constraint;
   - a direction this audience here doesn't lean to.
4. **With rounds to spare, it upgrades thinly supported choices to a local pick.** A swap is kept only if Qloo then rates the new choice Supported.
5. **The results put both plans side by side.** Every choice shows Qloo's verdict on each side and *why* the agent changed it. Every claim traces to a recorded Qloo query.

More detail: [`README.md`](README.md), [`docs/PLAN.md`](docs/PLAN.md), [`docs/DECISIONS.md`](docs/DECISIONS.md), [`docs/EVALUATION.md`](docs/EVALUATION.md).

## Scope against the spec (`CULTURAL_CRASH_TEST_PROJECT_SPEC.md` §13)

### Core functionality

| Requirement | Status | Where |
|---|---|---|
| Submit a brief with a target market and constraints | ✅ Conversational intake (ask only what's missing, editable brief, confirm before any Qloo call) or the detailed form | `src/lib/intake/`, `src/components/intake-chat.tsx`, `brief-review.tsx`, `brief-form.tsx` |
| Show results a judge can read in 30 seconds | ✅ Plain introduction, your direction, the run receipt, then the You / LLM / Agent table with a plain-sentence Why row per choice (no provenance chips or helper copy). | `src/components/run-result.tsx`, `plan-comparison.tsx`, `src/lib/crashtest/explain.ts` (`agentReceipt`) |
| Make the agent loop visible (judge conviction + refinement plans) | ✅ Results open on a plain introduction, your direction, and a run receipt counted from the recorded run (choices tested, candidates considered, re-tested, accepted and retained; Qloo checks, plus requests actually sent to Qloo when measured; constraints preserved; full-plan re-tests; live or recorded, and the date, from the run's own provenance). A **Table / Decision graph** switch sits above the agent's method in one line. The **table** is the default: You / LLM / Agent per choice, a Why row of plain recorded sentences (the original and who supplied it, what the test returned, the alternative, its evidence, the full-plan re-test), and a **Decision trace →** link into the graph. The **decision graph** (lazy-loaded Three.js through React Three Fiber) has a toolbar above the canvas (Fit graph, Replay decision path / Stop replay) and the legend below it. Labels are placed every frame by priority, inside the canvas, never overlapping. Below the canvas, **Decision details** shows the recorded process for the focused choice: original, what the test returned, every alternative tested with its outcome, why each was rejected, the acceptance checks the kept one passed, the full-plan result, the constraints that applied, and the selected node's Qloo evidence (query, results, context, coverage, recorded or live source). The **Decision trace** lists every step in order; evidence and candidate rows are buttons that select the node, focus the camera and move to Decision details. Replay is an ordered timeline: each line grows from source to target, the node appears as it arrives, and rejected candidates recede after their re-test. Reduced motion shows the final state. | `src/components/judge-graph-view.tsx`, `judge-graph-scene.tsx`, `src/lib/crashtest/judge-graph.ts`, `judge-layout.ts`, `judge-replay.ts`, `decision-trace.ts` |
| Compare the LLM-only plan with the agent's | ✅ Deterministic comparison: agent / baseline / mixed / insufficient evidence, per choice and overall, evidence-linked | `src/lib/crashtest/compare.ts`, `src/components/plan-comparison.tsx` |
| Validate the brief; state assumptions when details are missing | ✅ Recorded as assumptions | `run.ts`, `plan.ts` |
| Real Qloo API for core research | ✅ Search, entities, insights (entities and tags), explainability | `src/lib/qloo/` |
| Resolve and validate entities before use; handle ambiguity | ✅ Market-aware lookup; wrong namesakes flagged as *ambiguous* | `plan.ts` (`findInMarket`, `namesake`) |
| Qloo results drive selection and evaluation | ✅ | `gather.ts`, `evaluate.ts`, `repair.ts` |
| State and an evidence ledger across steps | ✅ One typed `RunState` | `types.ts`, `ledger.ts` |
| The evaluator finds a concrete weakness | ✅ Statuses plus a "contradicted" rule | `evaluate.ts` |
| A targeted follow-up action and revision | ✅ One slot per round; up to 3 candidates re-tested | `run.ts`, `repair.ts` |
| Re-evaluation with new evidence | ✅ | `run.ts` |
| Hard constraints can't be silently overridden | ✅ Locks and exclusions enforced in code; text-only rules labelled as not machine-checked | `run.ts`, `evaluate.ts` |
| Iteration and Qloo-call budgets enforced outside the model | ✅ Quick: 3 rounds / 700 calls; thorough: 6 / 1,400 | `ledger.ts` (`budgeted`) |
| Truthful stop reasons | ✅ 7 stop reasons | `types.ts` (`STOP_LABEL`) |
| Revision history traceable to evidence | ✅ Every change cites ledger IDs | Results → Revision log |
| Qloo evidence kept apart from the app's heuristics and the LLM's text | ✅ Labelled in the UI and the report | `results.tsx`, `report.ts` |

### Interface and deployability

| Requirement | Status |
|---|---|
| Coherent, responsive flow from brief to report | ✅ Checked at desktop and 375 px |
| Loading, no-result, API-error and partial states | ✅ Live console, error banner, partial results shown with their stop reason |
| Public demo link judges can open | ⏳ **Not deployed yet** |
| Clean setup from the repo | ✅ README, `.env.example` |
| Open-source license | ✅ MIT |
| No secrets committed | ✅ Keys in `.env.local` / `.secrets/` (git-ignored); raw Qloo responses never committed |
| Deterministic demo path; recordings labelled as recorded | ✅ Code done (recorded runs replay with their date). ⏳ Needs warming on the deployed app |

### Evaluation

| Requirement | Status |
|---|---|
| Fixed test set of several briefs | ✅ 9 briefs, 5 cities (3 dev, 6 held out) |
| LLM-only baseline vs agent | ✅ |
| Rubric and sample size documented | ✅ `docs/EVALUATION.md` |
| Only real, measured results reported | ✅ Including the runs the agent lost |
| A demo case where Qloo evidence changes the decision | ✅ London: Travis Scott → slowthai, Vans → a London brand, pastel Y2K → industrial utility |

## Evaluation history

All runs use the same 9 briefs. Two independent checks:
- **Held-out anchors:** both plans are re-scored with audience brands and artists the agent never saw.
- **Evidence judge:** blind to which plan is the agent's, run in both orders, and told to judge from Qloo evidence only. The no-evidence "taste" judge is shown as a reference.

| Run | Main change | Held-out supported (LLM → agent) | Evidence judge (agent / LLM / tie) | No-evidence judge |
|---|---|---|---|---|
| 1 | First loop | 5 → 16 of 32 | – | 0 / 9 / 0 |
| 3 | Agent proposes candidates, tries 3 per round | 6 → 23 of 32 | – | 0 / 9 / 0 |
| 4 | Replace only what the evidence contradicts | 6 → 10 of 32 | – | 1 / 5 / 3 |
| 6 | Measurement fixes + evidence judge | 3 → 10 of 36 | 7 / 0 / 2 | 1 / 3 / 5 |
| 8 | Local-only upgrades, fixed checks | 4 → 22 of 36 (every brief up) | 9 / 0 / 0 | 0 / 9 / 0 |
| 9 | Namesakes flagged, origin from descriptions, one-box brief, venue category fix | 7 → 18 of 36 (8 up, 0 down) | 9 / 0 / 0 | 1 / 8 / 0 |
| 10 | gpt-6-luna everywhere; intake; exploration rules; event-format venue gate | 5 → 22 of 36 (9 up, 0 down) | 8 / 1 / 0 (loss: Madrid sustainable) | 0 / 6 / 3 |
| 11 | Brief-fit gate for unknown originals; 'No …' rules checked on evidence | 4 → 20 of 36 (9 up, 0 down) | 8 / 1 / 0 (Madrid: a judgement call) | 0 / 6 / 3 |
| 12 | Unknown brands kept under unverifiable hard rules, with a human question | 4 → 19 of 36 (7 up, 0 down) | 7 / 1 / 1 (Madrid loss → tie; Tokyo loss from an anchor overlap) | 2 / 4 / 3 |
| 13 | Eval: held-out anchors never double as plan choices (spares) | 4 → 17 of 36 (8 up, 0 down) | 8 / 0 / 1 (held-out briefs 6 / 0 / 0) | 0 / 8 / 1 |
| 14 | `crash:v13`: structured trace, acceptance guard, run-local reuse, direction gates | 4 → 13 of 36 (7 up, 0 down) | 7 / 0 / 2 (held-out briefs 5 / 0 / 1) | 1 / 6 / 2 |
| 15 | Same agent, re-run with rejection reasons recorded | 3 → 16 of 32 (6 up, 0 down); Tokyo not scored: two held-out anchors not found in Qloo | 7 / 0 / 1 (held-out briefs 6 / 0 / 0); Tokyo not judged | 0 / 6 / 3 |
| 16 | `crash:v14`: spare rounds upgrade thin choices when a contradicted one can't be replaced | **4 → 18 of 36 (9 up, 0 down)** | **9 / 0 / 0** (held-out briefs 6 / 0 / 0) | 0 / 9 / 0 |

The no-evidence judge is the same model that wrote the LLM plan and sees no data, so it is *choosing*, not judging. It's reported for transparency only.

**Runs 14–15, read honestly:**
- **Losses:** no evidence-judge loss and no brief where held-out support fell, in either run.
- **Held-out total:** dropped from 17 to 13 in run 14, then measured 16 of 32 in run 15.
- **Cause of the drop:** the LLM's drafts differ every run. In run 14 the Madrid beer draft named Fender, a guitar brand. No replacement passed the screen. The agent doesn't upgrade other choices while a contradicted one remains, so it stopped with no changes (held-out 0). That stop rule existed before this version.
- **The new guard didn't cause it:** run 15 records each rejection. Of 24 re-tested candidates, 22 were accepted, 1 lost to a better candidate and 1 didn't reach Supported. None was rejected for costing another Supported choice or for breaking a rule.
- **Run 16 (`crash:v14`)** is the best evidence result since run 11 and the highest held-out total since then. But every brief ended with nothing contradicted, so the new upgrade-past-an-unfixable-choice path never ran. The gain is draft variance; the path itself is covered only by a unit test so far.
- **The blind judge still prefers the LLM draft** in most briefs (all 9 in run 16). It's a plausibility diagnostic, not the acceptance test. Six plausibility cases are drafted in `eval/plausibility.ts` and await human review.

## What's left

| Item | Who | Notes |
|---|---|---|
| Deploy to Vercel with Upstash Redis | Claude, with your accounts | Needs a Vercel project, an Upstash database, the Qloo key as an env var, and the ChatGPT credential pushed to Redis (`scripts/push-chatgpt-credential.ts`) |
| Warm recorded runs of the 3 examples on the deployed app | Claude | So judges get instant, labelled replays |
| Demo video (≤ 3 min) | You | Script suggestion: London example; LLM vs agent; why each change; evidence; stop reason |
| Submission text | Claude drafts, you post | `docs/SUBMISSION.md` |
| README screenshots | Claude | After deploy |
| Human review of a few plans | Optional, you | The spec values it; currently LLM judges only |

## Known limits

- **Qloo has gaps.** Some authentic local picks aren't in Qloo (ÖUS, Praça Roosevelt), and very popular local names often return no affinity under a city signal (Sanrio in Tokyo). The agent keeps these and flags them for a human, rather than replacing them.
- **The sample is small.** 9 briefs, with no significance claimed. Both judges are models.
- **Scores are the app's own.** They are built from Qloo affinity ranks and are not a forecast of campaign performance.
