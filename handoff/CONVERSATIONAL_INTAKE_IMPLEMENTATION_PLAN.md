# Cultural Crash-Test: conversational intake and comparison plan

## Purpose

Extend the existing Cultural Crash-Test application. Do not rebuild the working Qloo agent loop. Replace the current one-shot homepage intake with a bounded conversational intake that can understand a natural-language launch description, ask only the missing questions, let the user confirm the structured brief, and then run the existing baseline-versus-agent crash test.

The finished flow should feel like a focused strategy conversation, not a generic chatbot:

1. The user describes the company, product, proposed market, intended audience, launch idea, constraints, and any existing artist/brand/venue/creative choices in ordinary language.
2. The model extracts only facts actually supplied by the user and displays them in an editable brief.
3. Deterministic code identifies missing critical fields.
4. The assistant asks a small number of focused follow-up questions. It must not start the expensive Qloo run until the user confirms the brief.
5. If the user does not know the audience, the app helps formulate two or three non-sensitive cultural audience hypotheses and asks the user to choose or edit one. It must not infer protected or sensitive traits.
6. The user presses **Start cultural crash-test**.
7. The existing system creates an LLM-only baseline, runs the Qloo-grounded agent, repairs weak choices, and re-evaluates the final plan.
8. Results show both plans side by side. A **Compare plans** action explains which plan is better supported for each component and overall, using recorded evidence only.

The agent must not be hardcoded to win. The comparison outcome must support `agent`, `baseline`, `mixed`, and `insufficient_evidence`. The fixed demonstration scenario should be selected and pre-tested so that the agent wins honestly and reproducibly.

## Confirmed product decisions

### London demonstration

Pre-test both London examples live:

1. the existing scenario with Travis Scott and the booked BOXPARK venue, which has already produced honest agent wins in recent evaluations; and
2. the Northline scenario with a fixed Village Underground venue.

Feature whichever scenario wins most clearly and reliably on recorded evidence. Keep the other as a secondary example. Do not tune, rewrite, or selectively score Northline merely to force an agent victory. Until the new comparison is complete, treat the existing Travis Scott/BOXPARK scenario as the safe main-demo candidate.

### Replacing user-provided choices

Add an explicit global control labelled along the lines of **Explore better-supported alternatives to my choices**. It is off by default.

- With the control off, a user-provided choice may be replaced only when usable evidence actually contradicts it and the choice is not locked.
- With the control on, the agent may also test an upgrade to a user-provided choice that is merely weak or thinly supported, but it may keep the replacement only when the candidate clearly improves the deterministic evaluation and satisfies the brief.
- A choice Qloo cannot resolve or does not cover is not contradicted. Keep it and flag it for human validation.
- Model-drafted choices may continue to be upgraded when there is a clearly better-supported local option.
- Every individual choice must also support a **Booked/fixed—do not change** lock. This per-choice lock is absolute and overrides the global exploration control.
- Record the exploration setting and every lock in the confirmed brief and exported report.

## Existing implementation to preserve

Read these before changing code:

- `handoff/HANDOFF.md`
- `STATUS.md`
- `src/lib/crashtest/run.ts`
- `src/lib/crashtest/query.ts`
- `src/lib/crashtest/types.ts`
- `src/lib/crashtest/evaluate.ts`
- `src/lib/crashtest/report.ts`
- `src/lib/server/handlers.ts`
- `src/components/query-box.tsx`
- `src/components/crash-test.tsx`
- `src/components/results.tsx`
- `src/lib/llm/`

Keep the existing Qloo client, evidence ledger, evaluator, repair loop, SSE trace, recorded-run behavior, detailed form, exports, rate limiting, and test suite. The current natural-language parser is a useful first step, but it currently fills required gaps with generic defaults and immediately runs the agent. The new intake must expose and resolve important gaps before the run.

## Product rules

### Required before a run

The run can begin only after deterministic validation confirms:

- product or category is known;
- launch goal is known;
- a supported target city is selected;
- an audience hypothesis is present and confirmed by the user;
- the brand has enough context to draft a plan: at least one brand attribute, value, positioning statement, or product differentiator;
- any stated fixed choices, exclusions, and hard constraints have been captured;
- the user has reviewed the structured brief and explicitly confirmed it.

Existing choices are optional. Budget is optional. Website information is optional.

### Audience assistance

Do not claim Qloo can discover the objectively correct demographic for a brand. If the audience is missing, ask whether the user wants to:

1. describe the intended audience; or
2. explore audience hypotheses.

For exploration, generate two or three broad, non-sensitive cultural segments based on supplied brand/product context and the selected city. Examples are “London skate and independent streetwear fans” or “design-conscious specialty-coffee customers,” not inferred race, religion, health status, sexuality, political beliefs, or other sensitive traits. Show the assumptions and require the user to select or edit a segment before research begins.

If audience anchors are missing, suggest optional brands, artists, or cultural references as hypotheses and clearly label them as model suggestions until Qloo resolves them.

### Website input

For the first implementation, accept an optional website URL as metadata and ask the user to paste relevant About/product/campaign copy. Do not pretend the URL was researched if no web-fetch tool exists. Do not add an unrestricted server-side URL fetcher. URL ingestion can be added later with explicit SSRF protection, redirects and size limits, content-type validation, timeouts, and clear source attribution.

### Question behavior

- Ask at most three related missing items in one assistant turn.
- Prefer multiple-choice suggestions plus a free-text option when useful.
- Do not ask for data already supplied.
- Preserve facts and user wording across turns.
- Distinguish `user_supplied`, `model_suggested`, and `user_confirmed` values.
- Allow the user to edit any extracted field before confirming.
- Limit clarification to four assistant turns. If important information is still absent, explain what remains and keep the run disabled.
- A command such as “start the test” should run only when validation and confirmation have passed.

## Proposed domain model

Add an intake module rather than mixing conversational state into `RunState`.

```ts
type IntakeMode = "validate_plan" | "explore_audience";

type FieldOrigin = "user_supplied" | "model_suggested" | "user_confirmed";

type IntakeField<T> = {
  value: T;
  origin: FieldOrigin;
  sourceMessageId?: string;
};

type IntakeMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

type IntakeState = {
  intakeId: string;
  mode: IntakeMode;
  messages: IntakeMessage[];
  draftBrief: LaunchBriefInput;
  fieldOrigins: Record<string, FieldOrigin>;
  missingCriticalFields: string[];
  assumptions: string[];
  audienceHypotheses: Array<{
    id: string;
    label: string;
    description: string;
    suggestedAnchors: string[];
    assumptions: string[];
  }>;
  clarificationTurns: number;
  exploreUserChoices: boolean;
  confirmed: boolean;
  readyToRun: boolean;
};
```

Use a Zod schema for every request, model response, stored state, and transition. Refine the exact shapes if a simpler typed design fits the repository better.

## Deterministic intake state machine

```text
START
  -> EXTRACT_FACTS
  -> VALIDATE_REQUIRED_CONTEXT
       -> COMPLETE: SHOW_REVIEW
       -> AUDIENCE_MISSING: ASK_DESCRIBE_OR_EXPLORE
       -> OTHER_FIELDS_MISSING: ASK_FOCUSED_QUESTIONS
  -> MERGE_USER_ANSWER
  -> VALIDATE_REQUIRED_CONTEXT
  -> SHOW_REVIEW
  -> USER_CONFIRMS
  -> READY_TO_RUN
  -> EXISTING CRASH-TEST CONTROLLER
```

The LLM may extract facts, phrase questions, and propose audience hypotheses. Code must control completeness, limits, confirmation, allowed transitions, and readiness.

Do not send the complete transcript forever. Send a compact structured state plus the latest user message to the model. This controls cost and avoids facts drifting between turns.

## Server/API design

Add a focused intake boundary. A reasonable design is:

- `POST /api/intake`
  - accepts `{ intakeId?, message, marketId?, action? }`;
  - actions: `message`, `select_audience`, `update_brief`, `confirm`, `reset`;
  - returns the complete safe `IntakeState` plus the next assistant message;
  - never calls Qloo for ordinary clarification;
  - applies per-IP rate limiting and message/character limits.
- Keep `POST /api/crashtest` as the expensive run endpoint.
  - accept only a validated, confirmed brief from the intake or the existing detailed form;
  - do not trust a client-side `readyToRun` flag—revalidate on the server.

Use the existing cache abstraction for short-lived intake state if server persistence is needed. An in-browser state implementation is acceptable for the first version if the server receives and validates a compact state on every turn. Do not store sensitive personal data.

## Homepage experience

### Initial state

Retain the strong headline, then show a chat-like composer with a larger example prompt such as:

> We are Northline, a small sustainable streetwear label. We want to launch a limited capsule in East London for 18–30-year-old skate and independent-fashion fans. We are considering Village Underground, a UK electronic act and an industrial DIY look. The venue is fixed, the budget is modest, and we do not want a luxury collaboration. Help us test the plan.

Supporting text should say the user can paste a rough brief, brand description, campaign plan, or website copy. Keep the city selector but let text extraction suggest a city; ask the user to confirm if text and selector disagree.

### Conversation state

Show:

- user and assistant messages;
- a compact “What I understand” brief card that updates after every turn;
- missing information as visible checklist items;
- editable fields without requiring the user to restart;
- an **Explore better-supported alternatives to my choices** switch, off by default;
- a **Booked/fixed—do not change** lock on each user-provided artist, collaboration, venue, or creative-direction choice;
- suggested answer chips where useful;
- **Review brief** and then **Start cultural crash-test** only when ready;
- a separate **Use detailed form** route, preserving the current form.

Avoid making the UI resemble an endless general-purpose chat. The conversation has one job: produce a confirmed launch brief.

### Run state

After confirmation, keep the existing streamed agent console. Add a clear phase transition:

1. Brief confirmed
2. LLM-only plan drafted without Qloo
3. Qloo-grounded crash test
4. Targeted repair
5. Re-test and comparison

## Baseline versus agent comparison

The comparison should be a first-class structured result, not only prose.

```ts
type ComparisonOutcome = "agent" | "baseline" | "mixed" | "insufficient_evidence";

type PlanComparison = {
  rubricVersion: string;
  outcome: ComparisonOutcome;
  headline: string;
  componentComparisons: Array<{
    slot: Slot;
    baselineChoice: string;
    agentChoice: string;
    outcome: ComparisonOutcome;
    reasons: string[];
    evidenceIds: string[];
  }>;
  scoreDelta?: number;
  supportedDelta: number;
  coverageCaveat: string;
};
```

Generate the outcome deterministically from the existing evaluations:

1. fewer contradicted components;
2. more supported components;
3. better evidence coverage;
4. score delta only after the above, because the score is application-defined;
5. hard-constraint compliance always takes priority.

The model may turn this object into concise prose but cannot choose the winner or add evidence.

Add a **Compare plans** button to the results header. It should open or expand:

- overall result;
- baseline vs agent for every slot;
- what changed and why;
- evidence supporting each outcome;
- limitations and unresolved choices;
- a direct link/scroll action to the relevant evidence record.

Use plain labels such as “better supported by Qloo evidence,” not “guaranteed better” or “more likely to succeed.”

For the fixed London demo, preserve a recorded run in which the agent has an honest, measurable advantage. Recorded data must keep its date label and “Run live” option.

## LLM provider and API deployment preparation

Keep the current ChatGPT-subscription provider for local/internal work. Add a production OpenAI API provider behind the existing `LlmClient` interface so deployment can switch providers with environment variables without code edits.

Suggested configuration:

```text
LLM_PROVIDER=chatgpt|openai
LLM_MODEL=gpt-6.1-sol|gpt-6-luna
OPENAI_API_KEY=
OPENAI_REASONING_EFFORT=low
```

Requirements:

- use the official OpenAI SDK and Responses API for the API provider;
- keep the API key server-side;
- keep `store: false` unless the project explicitly needs stored responses;
- preserve timeouts, cancellation, structured-output validation, and one bounded repair retry;
- do not add the API key until the owner is ready to deploy;
- add mocked provider tests that require no live API key;
- document the exact production environment-variable switch.

### Model routing

Make task-level routing configurable. Recommended default:

- GPT-6 Luna: intake extraction, clarification wording, final verdict phrasing, comparison phrasing;
- GPT-6.1 Sol: initial plan, audience-hypothesis generation, and repair candidate ranking/strategy;
- deterministic code: validation, scoring, comparison winner, constraints, budgets, state transitions.

Allow `LLM_MODEL` to force one model everywhere for simpler testing. Do not make model routing a visible end-user control.

## Token and cost metering

`LlmResponse` already exposes input and output token usage, but `RunState` records only the number of model calls. Extend metering so each live run records:

- provider and model for each model call;
- input tokens;
- cached input tokens if returned;
- output/reasoning tokens as supported by the provider response;
- elapsed time;
- total estimated USD using a versioned server-side price table;
- `null`/unknown when the provider does not return a usage field—never invent token counts.

Do not expose secret request content in logs. Include aggregate usage in an admin/debug section and CLI evaluation output, not as the main consumer-facing metric.

Add a configurable deployment spending guard:

- maximum model calls per run;
- maximum input/output tokens per run where enforceable;
- per-IP live-run rate limit;
- recorded examples cost no live model or Qloo calls;
- optional daily live-run ceiling;
- fail with a truthful partial-result state when a limit is reached.

## Agent quality requirements

The conversational UI must not hide current recommendation-quality weaknesses. Before calling the work complete:

- add a stronger event-format suitability gate for venue replacements;
- never replace an unresolved but user-provided culturally plausible choice merely because Qloo lacks it, unless the brief permits exploration and the new candidate wins on multiple dimensions;
- preserve locked choices and exclusions;
- distinguish “Qloo has no evidence” from “Qloo evidence contradicts this choice”;
- run the existing nine-case evaluation after changes;
- compare GPT-6 Luna-only, GPT-6.1 Sol-only, and hybrid routing on the fixed cases before choosing production defaults;
- require the fixed London demo to remain an honest agent win;
- report regressions and agent losses rather than filtering them out.

## Deferred visualization

Do not build the knowledge graph until the conversational intake, comparison, deployment provider, metering, and demo reliability are complete.

When implemented later, derive it entirely from the existing evidence ledger—no new Qloo calls. Nodes can represent audience anchors, city, baseline choices, final choices, tags, and evidence queries; edges can represent input signal, affinity result, coherence, locality, replacement, and unresolved resolution. Start with an accessible 2D force-directed graph. Add optional 3D only if it remains readable, keyboard-accessible, mobile-safe, and does not delay the primary result.

## Suggested file layout

The exact names may change, but keep responsibilities separated:

```text
src/lib/intake/types.ts
src/lib/intake/extract.ts
src/lib/intake/validate.ts
src/lib/intake/respond.ts
src/lib/intake/state.ts
src/app/api/intake/route.ts
src/components/intake-chat.tsx
src/components/brief-review.tsx
src/components/plan-comparison.tsx
src/lib/crashtest/compare.ts
src/lib/llm/openai.ts
src/lib/llm/metered.ts
tests/intake/*.test.ts
tests/crashtest/compare.test.ts
tests/llm/openai.test.ts
```

Modify existing files only where integration requires it. Do not duplicate the evaluator or create a second crash-test engine.

## Required tests

Add tests for:

- a complete natural-language brief becomes ready after review and confirmation;
- an incomplete brief asks only for genuinely missing fields;
- a later answer updates the correct fields without erasing earlier facts;
- city text/selector conflict requires confirmation;
- audience-exploration mode proposes non-sensitive hypotheses and requires user selection;
- sensitive-trait inference is rejected;
- the clarification-turn limit is enforced;
- a user cannot start before confirmation;
- client-side readiness cannot bypass server validation;
- locked choices and exclusions survive intake conversion;
- the global exploration switch defaults off and is preserved in the confirmed brief;
- an unlocked user choice is changed only under the correct contradicted/exploration rules;
- a per-choice booked/fixed lock cannot be overridden even when exploration is enabled;
- missing Qloo coverage alone never authorizes replacing a user choice;
- comparison can return agent, baseline, mixed, and insufficient evidence;
- comparison evidence IDs all exist in the ledger;
- the model cannot override the deterministic comparison winner;
- token usage is aggregated correctly;
- missing usage data remains unknown rather than zero;
- ChatGPT and OpenAI providers both satisfy the same interface;
- recorded examples trigger no live LLM/Qloo calls;
- the production build, lint, typecheck, and all existing tests stay green.

## Acceptance criteria

- A user can paste a messy brand/launch description and see a faithful structured interpretation.
- Missing critical context triggers focused questions rather than silent generic defaults.
- A user without a defined audience can choose or edit a clearly labeled, non-sensitive audience hypothesis.
- The brief is editable and explicitly confirmed before expensive research starts.
- The existing detailed form remains available.
- Results still show the LLM-only plan and Qloo-grounded final plan side by side.
- **Compare plans** produces a structured, evidence-linked and non-rigged comparison.
- The fixed London demonstration shows an honest agent win.
- Both London scenarios are pre-tested live; the stronger honest result becomes the main example and the other remains secondary.
- User-provided choices follow the confirmed exploration setting, while booked/fixed locks are absolute.
- Production can switch from the local ChatGPT provider to the OpenAI API provider through environment variables.
- Token/cost usage is measurable before public deployment.
- No knowledge-graph work is included in this implementation pass.
- All tests, lint, typecheck, and production build pass.

## Implementation order

1. Add intake schemas, deterministic completeness validation, and tests.
2. Add bounded extraction/clarification prompts and the `/api/intake` route.
3. Build the chat composer and editable brief-review UI.
4. Require confirmation, then hand the confirmed brief to the existing crash-test endpoint.
5. Add deterministic `PlanComparison` and the **Compare plans** UI.
6. Add the official OpenAI API provider, model routing, and mocked tests without requiring a key.
7. Add usage/cost metering and deployment spending guards.
8. Add the venue-suitability quality gate and rerun the nine-case evaluation.
9. Update README, status, environment example, screenshots, and recorded demo only after behavior is stable.
10. Leave the evidence-ledger graph as a separately scoped final enhancement.

## Instructions to the implementing coding agent

Implement this plan in the existing repository. Inspect and reuse current modules before writing new abstractions. Make reasonable choices without asking non-essential questions. Do not fabricate live Qloo or API results. Keep all external calls server-side, bounded, cancellable, and testable with fixtures. After implementation, run formatting as needed, lint, typecheck, the complete test suite, production build, and the fixed evaluation; fix failures instead of merely reporting them. Update `RUN_VERSION` if run behavior or recorded output changes.
