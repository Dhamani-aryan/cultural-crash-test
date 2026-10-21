import { z } from "zod";
import { generateStructured } from "../src/lib/llm/structured";
import type { LlmClient } from "../src/lib/llm/types";
import type { Market } from "../src/lib/markets";

/**
 * Blind pairwise judge. Each pair is judged twice with the order swapped; a preference counts
 * only when both orders agree, otherwise it is a tie. That cancels position bias (a judge
 * that always prefers "A" produces ties, not wins). The judge is the same model family as the
 * model-only condition, so self-preference bias can remain; native review is the real test.
 */

export interface JudgeScores {
  recognisable: number;
  fit: number;
  natural: number;
}

export interface Verdict {
  transcreate: JudgeScores;
  baseline: JudgeScores;
  preferred: "transcreate" | "baseline" | "tie";
  /** Whether the two orders agreed. */
  consistent: boolean;
  reason: string;
}

const scores = z.object({ recognisable: z.number(), fit: z.number(), natural: z.number() });
const schema = z.object({
  A: scores,
  B: scores,
  preferred: z.enum(["A", "B", "tie"]),
  reason: z.string(),
});

const SYSTEM = `You are a lifelong resident of the city named below, and a careful copy editor. You'll see an American original and two adaptations of it for readers in your city, labelled A and B. Rate each from 1 to 5 on:
- recognisable: would ordinary people in your city know the references it uses?
- fit: does each new reference do the same job as the original one (same kind of thing, same connotation: cheap, premium, cosy, iconic...)? Functional references (a phone or app the product works with) and invented brand names should stay as they are; changing them is a mistake.
- natural: does it read like copy written for your city?
Then say which you prefer, or "tie" when they are equally good. Judge only what is on the page. Reason in English, in one or two sentences.`;

const clamp = (s: JudgeScores): JudgeScores => ({
  recognisable: Math.min(5, Math.max(1, s.recognisable)),
  fit: Math.min(5, Math.max(1, s.fit)),
  natural: Math.min(5, Math.max(1, s.natural)),
});
const avg = (a: JudgeScores, b: JudgeScores): JudgeScores => ({
  recognisable: (a.recognisable + b.recognisable) / 2,
  fit: (a.fit + b.fit) / 2,
  natural: (a.natural + b.natural) / 2,
});

async function once(llm: LlmClient, market: Market, original: string, a: string, b: string) {
  const { data } = await generateStructured(llm, {
    schema,
    system: SYSTEM,
    prompt: `City: ${market.label}\n\nOriginal:\n"""${original}"""\n\nA:\n"""${a}"""\n\nB:\n"""${b}"""`,
    label: "judge",
  });
  return data;
}

export async function judgePair(
  llm: LlmClient,
  market: Market,
  original: string,
  ours: string,
  theirs: string,
): Promise<Verdict> {
  const [first, second] = await Promise.all([
    once(llm, market, original, ours, theirs),
    once(llm, market, original, theirs, ours),
  ]);
  const p1 = first.preferred === "A" ? "transcreate" : first.preferred === "B" ? "baseline" : "tie";
  const p2 = second.preferred === "A" ? "baseline" : second.preferred === "B" ? "transcreate" : "tie";
  const consistent = p1 === p2;
  return {
    transcreate: avg(clamp(first.A), clamp(second.B)),
    baseline: avg(clamp(first.B), clamp(second.A)),
    preferred: consistent ? p1 : "tie",
    consistent,
    reason: first.reason,
  };
}
