# Agent model comparison: gpt-6-luna vs gpt-5.6-sol

**Date:** 2026-10-21.
**Briefs:** the same 9 fixed briefs (`eval/cases.ts`).
**Judges:** both judges were pinned to `gpt-5.6-sol` in both runs, so only the agent's model changed.

- **Sol run:** run 9 (`docs/EVALUATION.md`).
- **Luna run:** `docs/EVALUATION-gpt-6-luna.md`.
- **Reproduce:** `LLM_MODEL=gpt-6-luna JUDGE_MODEL=gpt-5.6-sol EVAL_TAG=gpt-6-luna npm run live eval/run.ts`, then `EVAL_TAG=gpt-6-luna npm run live eval/report.ts`.

"GPT-6.1 Luna" (`gpt-6.1-luna`) isn't available on the ChatGPT account. The API answers *"model is not supported when using Codex with a ChatGPT account"*. `gpt-6-luna` is the Luna model tested here.

## Results

| Measure | gpt-5.6-sol (run 9) | gpt-6-luna |
|---|---|---|
| Evidence judge (agent / LLM-only / tie) | 9 / 0 / 0 | **9 / 0 / 0** |
| No-evidence reference judge | 1 / 8 / 0 | 1 / 8 / 0 |
| Held-out supported choices, LLM-only draft → agent (of 36) | 7 → 18 (+11) | 5 → 16 (+11) |
| Briefs where held-out support rose / fell | 8 / 0 | **9 / 0** |
| In-run supported, draft → agent (of 36) | 9 → 27 | 7 → 24 |
| Mean time per brief | 88 s | **56 s** |
| Mean model calls per brief | 7.8 | 8.0 |
| Mean Qloo calls per brief | 377 | 413 |
| Agent tokens (9 briefs, as reported by ChatGPT) | not recorded | 40,151 in / 9,520 out over 72 calls (≈ 4,460 in / 1,060 out per brief; 0 calls without usage) |

## Reading it

- **Agent quality is equivalent on every independent measure.** The evidence judge prefers the agent's plan in all 9 briefs with both models. The held-out gain is the same size (+11 supported choices), and Luna improved held-out support in every brief.
- **Luna's own drafts are a little weaker.** Its LLM-only plans start with fewer supported choices (5 vs 7 held-out, 7 vs 9 in-run). The agent then ends a little lower too (16 vs 18), with the same gain. Most of the gap is in the starting point, which the agent is there to fix.
- **Luna is faster:** about 36% less time per brief. Model calls are the same.
- **Cost:** a whole run uses about 4.5k input and 1k output tokens per brief. At any current per-token price that's small. Comparing Luna's and Sol's cost per run needs their prices, which aren't in the repo yet, plus Sol's token counts (run 9 didn't record them).

## Notable Luna plans

| Brief | LLM-only draft → agent changes |
|---|---|
| London streetwear | Little Simz, Dr. Martens, Village Underground, utilitarian → Dr. Martens became Fred Perry; direction refined to industrial-utilitarian |
| Tokyo sneakers | Awich, Snow Peak, a BEAMS venue → Neighborhood, THE A.I.R BUILDING, industrial utility |
| Madrid beer | Carolina Durante, Sala El Sol → Miss Caffeina, Wurlitzer Ballroom |
| Mumbai sneakers | DIVINE kept (not swapped) |

## Caveats

- This is one run per model on 9 briefs. Drafts vary between runs, so differences of one or two choices are noise.
- Only the agent's model changed. A hybrid (Luna for some steps, Sol for others) wasn't tested.
