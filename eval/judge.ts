import { z } from "zod";
import { briefText } from "../src/lib/crashtest/plan";
import { SLOT_LABEL, type CulturalPlan, type LaunchBrief } from "../src/lib/crashtest/types";
import { generateStructured } from "../src/lib/llm/structured";
import type { LlmClient } from "../src/lib/llm/types";
import type { Market } from "../src/lib/markets";

/**
 * Blind pairwise judge. Each pair is judged twice with the order swapped; a preference counts
 * only when both orders agree, otherwise it is a tie. That cancels position bias. The judge is
 * the same model family that wrote the first draft, so self-preference bias can remain and
 * would favour the draft; human review is the real test.
 */

export interface JudgeScores {
  localFit: number;
  specificity: number;
  coherence: number;
  constraints: number;
}

export interface Verdict {
  agent: JudgeScores;
  draft: JudgeScores;
  preferred: "agent" | "draft" | "tie";
  consistent: boolean;
  reason: string;
}

const scores = z.object({
  localFit: z.number(),
  specificity: z.number(),
  coherence: z.number(),
  constraints: z.number(),
});
const schema = z.object({ A: scores, B: scores, preferred: z.enum(["A", "B", "tie"]), reason: z.string() });

const SYSTEM = `You are a senior cultural strategist who lives in the city named in the brief. You'll see a launch brief and two plans for its cultural choices, labelled A and B. Rate each from 1 to 5 on:
- localFit: would this audience, in this city, recognise and care about these choices? Penalise generic global defaults and references that belong to another country's scene.
- specificity: are the choices concrete and usable (real names, a clear direction)?
- coherence: do the choices work together as one launch?
- constraints: does the plan respect the brief's constraints and attributes?
Then say which plan you prefer, or "tie". Judge only what is on the page, in one or two sentences.`;

export function planText(plan: CulturalPlan | null): string {
  if (!plan) return "(no plan)";
  return plan.components
    .map((c) => `- ${SLOT_LABEL[c.slot]}: ${c.label}`)
    .join("\n");
}

const clamp = (s: JudgeScores): JudgeScores =>
  Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Math.min(5, Math.max(1, v))])) as unknown as JudgeScores;
const avg = (a: JudgeScores, b: JudgeScores): JudgeScores =>
  Object.fromEntries(Object.keys(a).map((k) => [k, (a[k as keyof JudgeScores] + b[k as keyof JudgeScores]) / 2])) as unknown as JudgeScores;

async function once(llm: LlmClient, brief: string, a: string, b: string) {
  const { data } = await generateStructured(llm, {
    schema,
    system: SYSTEM,
    prompt: `Brief:\n${brief}\n\nPlan A:\n${a}\n\nPlan B:\n${b}`,
    label: "judge",
  });
  return data;
}

export async function judgePlans(
  llm: LlmClient,
  brief: LaunchBrief,
  market: Market,
  agent: CulturalPlan | null,
  draft: CulturalPlan | null,
): Promise<Verdict> {
  const text = briefText(brief, market);
  const ours = planText(agent);
  const theirs = planText(draft);
  const [first, second] = await Promise.all([once(llm, text, ours, theirs), once(llm, text, theirs, ours)]);
  const p1 = first.preferred === "A" ? "agent" : first.preferred === "B" ? "draft" : "tie";
  const p2 = second.preferred === "A" ? "draft" : second.preferred === "B" ? "agent" : "tie";
  const consistent = p1 === p2;
  return {
    agent: avg(clamp(first.A), clamp(second.B)),
    draft: avg(clamp(first.B), clamp(second.A)),
    preferred: consistent ? p1 : "tie",
    consistent,
    reason: first.reason,
  };
}
