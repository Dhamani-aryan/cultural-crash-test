# Submission draft: Cultural Crash-Test

_Draft for the hackathon submission form. Fill in the links after deploying._

**Demo:** _(Vercel URL)_ · **Code:** https://github.com/Dhamani-aryan/cultural-crash-test (MIT) · **Video:** _(link)_

## One line

Find the cultural mismatch before launch, then fix it. An agent tests every cultural choice in a brand launch plan against Qloo's taste data for your audience in your city, repairs the weakest, and shows you, choice by choice, how it differs from what an LLM alone would have recommended.

## The problem

A small brand or agency launching in a city it doesn't know makes several cultural bets at once: a music act, a collaboration partner, a venue, a creative direction. An LLM will happily propose all four, and they'll sound plausible. But plausible isn't the same as supported. Some picks will be generic global defaults, some will belong to another city's scene, and some won't fit each other. Nobody finds out until the budget is spent.

## What it does

1. **You describe the launch in plain words:** the brand, who it's for, the city, and anything already decided or ruled out.
2. **The LLM drafts a plan on its own.** That's the honest baseline: the answer you'd get without Qloo.
3. **The agent tests every choice in Qloo.** For each choice it checks:
   - **Audience:** does this audience, in this city, have affinity for it? It uses Insights with the audience's anchor brands and the city as signals, plus explainability to name which anchor drives it.
   - **Local:** is it from here or distinctive here, or just a global default? It compares the city's own list with other world cities and US cities.
   - **Coherence:** does it fit the rest of the plan? It runs Insights with the other choices as the signal.

   Creative direction is tested too, against Qloo's aesthetic and tone tags for that audience in that city.
4. **It repairs only what the evidence contradicts.**
   - Candidates come from Qloo's audience list and from the agent's own suggestions, each scored in Qloo.
   - They're screened for locality and role (a venue that can host the event, a partner brand in a related business), then re-tested.
   - With rounds to spare, it upgrades thinly supported choices to local picks, keeping a swap only if Qloo rates it Supported.
5. **It stops for a stated reason:** accepted, no progress, round limit or call budget, all enforced in code.
6. **It shows LLM alone vs agent side by side,** with Qloo's verdict on every choice on both sides, why each change was made, a full evidence ledger, open questions for a human, and a Markdown/JSON export.

## Why it's agentic, not a prompt

The controller is a deterministic state machine with typed state, an evidence ledger, a versioned rubric and code-enforced budgets. The model does five bounded jobs:
- read the description;
- draft the baseline;
- map the creative direction onto Qloo tags;
- rank screened candidates (code checks every ID);
- write a short verdict from the recorded state.

The model never scores, never counts and never decides when to stop.

## Honesty built in

- **Missing evidence is never scored as zero.**
- **A name Qloo doesn't know is "Unresolved".** Kept and flagged, not replaced.
- **A wrong namesake is caught.** Qloo's only "Divine" is an American performer, not DIVINE the Mumbai rapper, so the agent flags it instead of testing the wrong person.
- **Known Qloo blind spots aren't treated as faults.** Very popular local names often return no affinity under a city signal (Sanrio in Tokyo).
- **Recorded demo runs are labelled with their date,** and can be re-run live.
- **Scores are the app's own.** They're built from Qloo ranks and are not a forecast.

## Evaluation

9 fixed briefs across London, Tokyo, São Paulo, Madrid and Mumbai: 3 used during development, 6 held out. The LLM-only draft and the agent's final plan were compared in two ways:
- **Held-out anchors:** both plans re-scored with audience brands and artists the agent never saw, and never also used as a plan choice. Supported choices: **4 → 17 of 36** in the latest run. Support rose in 8 briefs and fell in none, as in every run so far.
- **Evidence-based judge:** blind to which plan is the agent's, run in both orders, and told to judge from the evidence only. In the latest run it preferred the agent's plan in **8 of 9 briefs** and called one a tie, with **no losses**. On the 6 briefs never used for tuning it was **6 of 6**.

Full method, every run (including the early ones the agent lost, and why), and the limits are in `docs/EVALUATION.md` and `docs/DECISIONS.md`.

## Built with

- **App:** Next.js 16, React 19, TypeScript, Tailwind 4 and Zod, with server-sent events for the live agent console.
- **Data and model:** the Qloo Insights, Search and Entities APIs (including tag insights and explainability), and OpenAI via a ChatGPT sign-in.
- **Infrastructure and tests:** Upstash Redis for the server-side cache and recordings, and 116 Vitest tests on a synthetic Qloo world.
