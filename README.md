# Cultural Crash-Test

> Find the cultural mismatch before launch. Then fix it.

A launch plan is a stack of cultural bets: the music act, the collaboration brand, the pop-up venue, the creative direction. A language model can make every one of them sound plausible. Cultural Crash-Test is an agent that **treats each choice as a hypothesis and tests it against [Qloo](https://www.qloo.com/)'s taste data** for the audience and city you're launching to. It finds the weakest-supported choice, researches a better-supported alternative in Qloo, swaps only that choice, and tests the whole plan again. Every decision traces to a recorded Qloo query.

Built for the **Qloo Agentic Hackathon 2026**.

**Example (live run, London):** a streetwear label plans an East London pop-up for fans of Stüssy, Palace and Carhartt. The founder's picks were Travis Scott, BOXPARK Shoreditch (locked) and "playful pastel Y2K". The model drafted Vans as the collaborator.
- **Travis Scott:** Qloo returns no affinity for him with this audience in London, so the agent marks him *No support found*. It researches London acts and swaps in **slowthai** (#1 for this audience; strongest link: Palace). It re-tests.
- **Vans → END. Clothing.**
- **"Playful pastel" → "industrial utility in monochrome":** Industrial, Utilitarian and Monochrome rank #2, #6 and #7 for this audience in London. "Playful" is Tokyo's top aesthetic, not London's.
- **Result:** 1 of 4 choices supported → 4 of 4. The locked venue was never touched.

## How it works

```
brief ─► draft (model alone) ─► resolve in Qloo ─► test every choice ─► accepted? ──► report
                                                        ▲                   │ no
                                                        └─ re-test ◄─ repair the weakest one
```

- **Draft.** The model turns the brief into a first plan from general knowledge. This is also the LLM-only baseline.
- **Resolve.** Every name is looked up in Qloo. A name Qloo doesn't know is marked *Unresolved*, never tested as if it were real. The creative direction is mapped onto Qloo's own aesthetic and tone tags.
- **Test.** Every choice is scored with the deterministic, versioned rubric `crash-v1` ([`evaluate.ts`](src/lib/crashtest/evaluate.ts)):

  | Dimension | Weight | Qloo evidence |
  |---|---:|---|
  | Audience affinity | 35% | Rank among what the audience (its anchor brands/artists as signal) has affinity for in the city, with explainability naming the strongest anchor |
  | Local relevance | 30% | From here, or distinctive in the city's own list, vs. just as big in 4 other world cities or 4 US cities |
  | Package coherence | 25% | Rank when the plan's *other* choices are the signal: do the choices support each other? |
  | Distinctness | 10% | Not a repeat of another choice (labelled app heuristic) |

  - A dimension without evidence is left out rather than scored zero, and coverage is shown separately.
  - Statuses are written out: *Supported*, *Weak evidence*, *No support found*, *Unresolved*, *Constraint conflict*.
- **Repair.**
  - The weakest unlocked choice gets one targeted action. The agent queries Qloo for candidates that fit the audience *and* the rest of the plan in the city, then screens them for locality and role.
  - The model picks one **from that list only**, and code checks that it did.
  - Only that slot changes. A repair that tests worse is reverted.
- **Stop.** Code checks four conditions:
  - acceptance;
  - no material improvement for 2 rounds;
  - the repair-round limit (2 quick, 3 thorough);
  - the Qloo call budget (400 / 700), enforced before each call.

  The report says which one stopped the run.
- **Report.**
  - The draft and the final plan side by side, with per-choice evidence cards citing ledger IDs, a revision log (why, expected, observed), assumptions and open questions.
  - Markdown and JSON export.
  - The model writes only a 2–3 sentence verdict, from the recorded state.

The model is used for four things only: the draft, mapping a direction onto Qloo tags, choosing among screened candidates, and the verdict. Validation, scoring, constraints, budgets and stopping are all code.

## Evaluation

[`docs/EVALUATION.md`](docs/EVALUATION.md) compares the LLM-only draft with the agent's final plan on 9 fixed briefs across 5 cities, in three ways:
- the in-run rubric;
- **re-scoring with held-out audience anchors the agent never saw**;
- a blind two-order judge.

The sample is small and the report states its limits.

## Run locally

Requires Node.js 22+, a Qloo hackathon key, and a ChatGPT sign-in for the model (no OpenAI API key; see `.env.example`).

```bash
npm ci
cp .env.example .env.local   # set QLOO_API_KEY
npm run llm:login            # one-time ChatGPT sign-in, saved to git-ignored .secrets/
npm run dev                  # http://localhost:3000
```

- One run from the terminal, with a trace: `npm run live scripts/crashtest.ts -- london` (also `tokyo`, `sao-paulo`).
- Checks: `npm test`, `npm run typecheck`, `npm run lint`. Tests use a synthetic Qloo world and need no keys.
- Evaluation: `npm run live eval/run.ts`, then `npm run live eval/report.ts`.

## Supported cities

London, Tokyo, São Paulo, Madrid and Mumbai. These are the cities where we measured Qloo's data as deep and city-specific enough to trust ([`data/coverage.json`](data/coverage.json), [`docs/DECISIONS.md`](docs/DECISIONS.md)).

## Honest limits

- **Scores are this app's own.** They are built from Qloo affinity ranks. They aren't probabilities, sales forecasts or guarantees of campaign performance.
- **Qloo's evidence is aggregate cultural affinity.** The app doesn't identify, profile or predict any individual.
- **Missing data stays missing.**
  - A name Qloo doesn't know is reported as such.
  - A Qloo error becomes an error entry in the ledger.
  - When no local candidate exists, the agent says so and explains why (for example, "of the top 40 for this audience, 38 from another country").
- **Recorded runs are labelled.** The demo replays recorded runs of the example briefs so it's fast and free, and labels them as recorded with their date. "Run it live again" fetches fresh data.
- **Raw Qloo responses are never committed** (Qloo's terms). The test fixtures are synthetic.

## Repository

- `src/lib/crashtest/`:
  - types and schemas;
  - evidence ledger and budget guard;
  - evidence gathering, evaluator, planner and repair;
  - the controller (`run.ts`) and report.
- `src/lib/qloo/`: typed Qloo client (search, entities, tags, insights including tag results and explainability), with retries, concurrency limits and a server-side cache.
- `src/lib/engine/`, `src/lib/agent/check.ts`: the locality gates and role tags, reused from the earlier Transcreate prototype (tag `transcreate-final`).
- `src/app/api/crashtest/`: server-sent-events endpoint. It is rate-limited, and the Qloo key stays on the server.
- `src/components/`: brief form, agent console and results.
- `eval/`, `research/`, `docs/`: evaluation, API probes (scripts only) and decisions.

## License

[MIT](LICENSE)
