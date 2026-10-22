# Cultural Crash Test — Backend Recommendation Improvement Plan

**Prepared:** 22 October 2026 (India)  
**Purpose:** A standalone implementation brief for the remaining pre-submission work.  
**Scope:** Recommendation quality, reliability, evaluation, and cost control. This is not a request to redesign the UI.

## Executive decision

Do **not** rewrite the agent. The current backend already has the important foundations: it preserves unverifiable user rules, applies role and venue gates, scores candidates with Qloo, re-tests the complete plan, rejects regressions, caches requests, and records an audit trail.

The next work should answer one question: **does a proposed change make recommendations more credible and more stable on the same evidence?**

The recommended sequence is:

1. freeze the evaluation inputs so versions can be compared fairly;
2. human-review the plausibility cases;
3. add multi-view candidate retrieval with rank fusion behind a feature flag;
4. add a stability check for finalists;
5. merge an experiment only when it beats the current agent without adding constraint violations or evidence-judge losses.

The current agent remains the fallback. Do not trade a working submission for an unmeasured late rewrite.

## Deadline and judging reality

The official deadline is **30 October 2026 at 11:45 PM EDT**, which is **31 October 2026 at 9:15 AM IST**. Deployment and secret configuration need a buffer before that point.

The official criteria reward:

- technically skilled and non-trivial use of Qloo;
- a complete, coherent product;
- credible impact for a real audience;
- a creative, non-obvious use of Qloo.

This means the strongest backend story is not “we called more endpoints.” It is: **the agent turns a subjective launch plan into auditable choices, uses Qloo as the cultural evidence layer, tests alternatives, and abstains when evidence is insufficient.**

## What is already good and should stay

- A Qloo-unknown user choice is not silently replaced when a free-text hard rule cannot be verified.
- Candidate names proposed by the LLM must be found and scored in Qloo before acceptance.
- Brands and venues pass deterministic role/format checks.
- Locality and plan coherence are considered, not affinity alone.
- Every tried candidate is recorded, including why it was screened out.
- A candidate is accepted only after a full-plan re-test.
- Regressions can reject or revert a change.
- The run-local and shared caches limit repeat calls.
- The UI can already expose uncertainty and the evidence path; backend work should strengthen the data behind it, not create more prose.

## The real weaknesses to fix

### 1. The current evaluation is not fully reproducible

Each evaluation run generates a fresh LLM draft. A better or worse result can therefore come from a different starting draft rather than a better agent. This makes version-to-version claims weaker than they appear.

### 2. Cultural plausibility is not yet an acceptance gate

`eval/plausibility.ts` contains six useful cases, but every case is marked `reviewed: false`. They currently cannot protect against a recommendation that scores well under the app rubric but feels implausible to a knowledgeable judge.

### 3. Candidate retrieval mixes several intentions into one ranking

The current candidate query combines audience anchors, the other plan choices, and location. That is useful, but it hides *why* a candidate is strong. A candidate that is excellent for the audience can be displaced by one that mostly echoes the rest of the plan, or vice versa.

### 4. The system tests fit, but not enough stability

A recommendation can look strong because one audience anchor dominates the query. The final choice should survive small, reasonable changes to the anchor set.

### 5. The blind LLM judge is a warning signal, not a production oracle

The latest evidence judge supports the agent, while the blind preference judge prefers the LLM drafts. That may reveal a real coherence problem, but LLM judges can also exhibit position, verbosity, and self-preference biases. It needs a small human plausibility review and position-swapped judging—not prompt tuning until the agent always wins.

## Phase 0 — Freeze a trustworthy baseline

Implement this before changing recommendation logic.

### 0.1 Save frozen starting plans

For every evaluation brief, persist:

- normalized brief;
- resolved audience anchors;
- initial LLM plan;
- held-out anchors;
- model and prompt version;
- timestamp and snapshot identifier.

Add an evaluation mode that loads these saved starting plans and runs only the agent from that fixed point. Keep the existing live end-to-end mode as a separate test.

Suggested commands:

```text
npm run eval:live       # fresh draft; end-to-end product behaviour
npm run eval:frozen     # identical starting plans; agent-version comparison
```

Never overwrite a baseline snapshot implicitly. Creating a new baseline must be deliberate and versioned.

### 0.2 Finish the plausibility set

Human-review all six drafted cases, correct any questionable expectation, and set `reviewed: true` only after review. Add at least these checks:

- a credible original is retained when evidence does not contradict it;
- an artist fits the event format and stated genre context;
- a venue is in-market and can host the stated event;
- a collaboration brand is a compatible kind of business;
- explicit brand attributes survive creative-direction repair;
- a free-text hard rule that cannot be verified causes preservation plus a flag, not an upgrade.

Use a small human rubric:

```text
credible / questionable / implausible
one-sentence reason
reviewer initials
```

Do not turn this rubric into another LLM call.

### 0.3 Report uncertainty honestly

With only nine main briefs, report exact counts rather than “statistically proven.” A bootstrap interval may be included as descriptive context, but the sample size must remain visible.

## Phase 1 — Multi-view Qloo retrieval with rank fusion

Build this behind `RECOMMENDATION_RANKING=v2` or an equivalent flag.

### Why

Qloo’s Insights API is parameter-driven: audience entities, location, tags, and other signals change the result. Instead of placing all objectives into one query, retrieve several interpretable ranked views and combine their **ranks**, not their raw affinity values.

### Candidate views

For a weak entity choice, retrieve up to four lists:

1. **Audience fit** — audience anchors only.
2. **Local relevance** — the target market and the appropriate entity type/category.
3. **Plan coherence** — the other resolved plan choices, without audience anchors.
4. **Agent proposals** — real names suggested for the job, resolved and scored by Qloo.

Not every slot needs every view. A venue must always be filtered to the target city. An unknown or unsupported query is omitted and recorded; it is never simulated.

### Fusion

Use Reciprocal Rank Fusion (RRF):

```text
rrf(candidate) = sum(1 / (60 + rank_in_each_list))
```

RRF is suitable here because it combines ranked lists without pretending that scores from different queries are directly calibrated. Store:

- source lists in which the candidate appeared;
- rank in each list;
- fused rank;
- role/constraint/locality gate outcomes;
- Qloo evidence identifiers.

Use RRF only to form the shortlist. The existing full-plan re-test remains the acceptance decision.

### Cost cap

- retrieve at most 20–30 results per view;
- union and deduplicate by entity ID;
- apply deterministic gates before further calls;
- full-plan re-test only the best three survivors;
- use the existing request cache;
- report logical Qloo checks, cache hits, and outbound requests separately.

### Do not add MMR yet

Maximum Marginal Relevance is valuable when returning a diverse set of recommendations. This product currently chooses one final answer for each slot. Source diversity in the shortlist is sufficient for now; MMR adds complexity without addressing the primary failure mode.

## Phase 2 — Non-compensatory feasibility gates

Affinity must never compensate for doing the wrong job.

Keep the existing gates and make the slot rules explicit:

### Artist or music act

- must resolve as an artist or appropriate music entity;
- must be credible for the event format and any genre explicitly stated by the user;
- local or locally distinctive evidence is preferred, but a hard “local only” gate applies only when the brief requests it;
- do not infer affordability, availability, or booking feasibility without data.

### Collaboration brand

- must be the same or a compatible business role;
- must preserve product/category and explicit attribute requirements;
- an unverifiable free-text prohibition never authorizes replacing a Qloo-unknown user brand;
- absence from Qloo is “unknown,” not “bad.”

### Venue

- must be in the target city;
- must have an event-capable category appropriate to the launch;
- food and drink venues are allowed only for a compatible launch or when explicitly requested;
- capacity, price, and availability stay unknown unless the product has a verified source for them.

### Creative direction

- preserve explicit user and brand attributes;
- replace only unsupported terms;
- use Qloo-supported descriptive tags;
- never rewrite the direction merely to produce a visible change.

Every gate should emit a structured reason code. Human-readable explanations must be generated from these facts, not invented separately.

## Phase 3 — Anchor robustness check for finalists

Run this only for the top two or three candidates after ranking, not for the entire pool.

When there are at least three audience anchors:

1. score the finalist with the complete anchor set;
2. score it with each one-anchor-removed subset;
3. record rank/support across those subsets;
4. classify stability as `stable`, `mixed`, or `fragile`.

Suggested initial rule:

- **stable:** supported in the complete set and at least two-thirds of valid subsets;
- **mixed:** supported in the complete set but less than two-thirds of subsets;
- **fragile:** unsupported in the complete set or dependent on only one anchor.

Do not reject every mixed result automatically. Use stability as a tie-breaker and as evidence for abstention. Validate the threshold against the frozen evaluation; do not tune it on one London demo.

## Phase 4 — Structured confidence and abstention

Do not display fake probability percentages. Derive an internal confidence class from observable checks:

- constraint and role fit;
- evidence coverage;
- fused rank/source agreement;
- anchor stability;
- local relevance;
- full-plan re-test outcome;
- whether any previously supported choice regressed.

Recommended outputs:

- **strong:** passes all gates, adequate evidence, stable, full-plan improvement with no regression;
- **mixed:** passes gates and re-test but evidence coverage or stability is incomplete;
- **insufficient:** missing evidence, unverifiable rule, wrong role, fragile result, or no non-regressing candidate.

For `insufficient`, retain the user choice or leave the slot open and ask/flag what is needed. Abstention is a feature of a trustworthy agent, not a failed run.

## Optional Qloo experiment — do not commit without live validation

Evaluate Qloo’s Analysis Compare capability as an additional explanation or comparison signal for original-versus-final choice groups. This is optional because the exact live contract and useful output must be verified with the real key.

Do not add Trending, demographics, or other endpoints simply to increase endpoint count:

- trendiness is not the same as cultural fit;
- demographics should be used only when the user explicitly supplies relevant attributes and the API behaviour is verified;
- inferred sensitive traits must not be introduced;
- unused endpoint “theatre” weakens rather than strengthens the technical story.

## Evaluation design

### Experiments

Run these as ablations on the same frozen baseline:

```text
A — current crash:v14
B — v14 + multi-view retrieval/RRF
C — B + anchor robustness
```

Do not change prompts, gates, thresholds, and retrieval simultaneously. A failed experiment must be diagnosable.

### Required measurements

For each version, report:

- held-out supported choices: draft → final;
- number of briefs improved / unchanged / worsened;
- evidence-judge wins / ties / losses, with order swapped;
- human plausibility result for reviewed cases;
- hard-constraint violations;
- user choices changed despite unknown evidence;
- accepted / rejected / abstained candidates;
- Qloo logical checks, outbound requests, and cache hits;
- LLM calls and token usage;
- median and slowest run time.

The blind no-evidence preference judge stays in the report as a diagnostic, clearly labelled as such. It is not the acceptance oracle.

### Merge gates

Merge an experiment only if all are true:

- zero hard-constraint violations;
- zero improper upgrades of Qloo-unknown user choices under unverifiable rules;
- no evidence-judge losses, or any loss is manually reviewed and justified;
- no reduction in total held-out support;
- no reviewed plausibility case becomes implausible;
- no material regression in call budget or latency without a clear quality gain;
- explanations remain traceable to recorded evidence.

If the experiment is merely different, keep `crash:v14`.

## Suggested implementation order

### P0 — first

1. Freeze and version initial evaluation plans.
2. Review and activate the plausibility cases.
3. Add a compact eval summary with exact counts, order-swapped judging, costs, and latency.

### P1 — highest-value algorithm experiment

4. Implement multi-view candidate retrieval.
5. Implement RRF with stored per-view provenance.
6. Run A/B frozen evaluation.
7. Merge only if the gates pass.

### P2 — robustness

8. Add leave-one-anchor-out stability for finalists.
9. Add `strong / mixed / insufficient` confidence.
10. Run the C ablation and decide whether the extra Qloo calls are justified.

### P3 — optional only after the submission build is safe

11. Test Analysis Compare with the live API.
12. Add it only if it improves the decision or explanation in a measurable way.

## Stop conditions

Stop backend experimentation and prepare the submission when any of these is true:

- the frozen evaluation shows no clear gain over the current agent;
- a change improves Qloo support but makes human plausibility worse;
- API cost or latency grows materially for a marginal benefit;
- the deployment buffer is at risk;
- a feature cannot be demonstrated honestly without unsupported claims.

Keep experimental code behind a flag or on a separate branch until accepted. The deployed default should always remain the best measured stable version.

## Definition of done

The backend is ready when a judge can see—and the evaluation can verify—that:

1. the user’s requirements are preserved;
2. the LLM draft is only a starting hypothesis;
3. Qloo supplies the cultural evidence and candidate rankings;
4. deterministic gates prevent wrong-role recommendations;
5. alternatives are tested against the full plan;
6. the agent keeps, changes, or abstains for a recorded reason;
7. the result survives held-out and plausibility checks;
8. every visible claim is traceable and does not imply causation, attendance, revenue, availability, or certainty that the data cannot support.

## Sources

- [Qloo LLM Hackathon — official Devpost page](https://qloo.devpost.com/) — deadline, challenge framing, submission requirements, and judging criteria.
- [Qloo API Overview — official documentation](https://github.com/qloo/docs-public/blob/main/reference/api-overview.md) — parameter-driven Insights API and available supporting APIs.
- [Qloo LLM Hackathon Kit — official documentation](https://github.com/qloo/docs-public) — semantic search should produce candidates rather than be treated as proof; uncertain tags and entities require validation.
- [Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods](https://cormack.uwaterloo.ca/cormacksigir09-rrf.pdf) — rank fusion method and the standard `k = 60` formulation.
- [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685) — known position, verbosity, and self-enhancement biases in LLM judging.
- [NIST: Computing Confidence Intervals for Common IR Measures](https://www.nist.gov/publications/computing-confidence-intervals-common-ir-measures) — bootstrap confidence-interval guidance for evaluation measures.
- [Beyond Accuracy: A Critical Review of Recommender Systems](https://doi.org/10.1145/3800587) — recommendation evaluation should not rely on a single aggregate metric.

