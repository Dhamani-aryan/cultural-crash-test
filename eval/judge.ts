import { z } from "zod";
import { briefText } from "../src/lib/crashtest/plan";
import { SLOT_LABEL, type CulturalPlan, type LaunchBrief, type PlanEvaluation } from "../src/lib/crashtest/types";
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

// ---------- evidence-based judge ----------

/**
 * The primary judge. It audits rather than chooses: each plan comes with the same Qloo evidence
 * for every choice (gathered with held-out audience anchors the agent never optimised against,
 * identically for both plans) and Qloo's own description of what each choice is. It must
 * judge from that evidence and the brief only, not from its own sense of who is famous.
 * Still blind to which plan is the agent's, and run in both orders.
 */

export interface EvidenceScores {
  audienceFit: number;
  localFit: number;
  coherence: number;
  briefFit: number;
}

export interface EvidenceVerdict {
  agent: EvidenceScores;
  draft: EvidenceScores;
  preferred: "agent" | "draft" | "tie";
  consistent: boolean;
  reason: string;
}

const evScores = z.object({
  audienceFit: z.number(),
  localFit: z.number(),
  coherence: z.number(),
  briefFit: z.number(),
});
const evSchema = z.object({ A: evScores, B: evScores, preferred: z.enum(["A", "B", "tie"]), reason: z.string() });

const EVIDENCE_SYSTEM = `You are an independent auditor of launch plans. You judge from evidence, not taste. For each choice in Plan A and Plan B you get Qloo taste-data evidence, gathered the same way for both plans, and Qloo's own description of what the choice is.

Rules:
- Use only the evidence shown and the brief. Do not use your own knowledge of how famous, cool or fitting a name is.
- A choice marked "not in Qloo" is unverified: it earns no credit for fit, but it is not evidence of a bad fit either.
- Judge role fit (does the choice do the job the brief needs: a venue that can host the event, a credible partner brand for this product, an act for this audience) only from Qloo's description of the choice and the brief.

Rate each plan 1-5 on:
- audienceFit: how strongly the evidence shows this audience in this city has affinity for the plan's choices;
- localFit: how strongly the evidence shows the choices are local or distinctive to this city rather than generic global defaults;
- coherence: how strongly the evidence shows the choices fit together;
- briefFit: whether each choice can do its job for this brief, per Qloo's descriptions, and respects the constraints.
Then prefer the plan the evidence supports better, or "tie" if it supports them equally. Cite the evidence in one or two sentences.`;

export function evidenceText(plan: CulturalPlan, evaluation: PlanEvaluation): string {
  return plan.components
    .map((c) => {
      const a = evaluation.components.find((x) => x.slot === c.slot);
      const what = c.entity?.shortDescription ? ` — Qloo: "${c.entity.shortDescription}"` : c.tags.length ? ` — Qloo tags: ${c.tags.map((t) => t.name).join(", ")}` : "";
      const lines =
        !a || a.status === "unresolved"
          ? ["  not in Qloo: no evidence either way"]
          : a.dimensions.filter((d) => !d.heuristic).map((d) => `  ${d.key}: ${d.explanation}`);
      return `- ${SLOT_LABEL[c.slot]}: ${c.label}${what}\n${lines.join("\n")}`;
    })
    .join("\n");
}

const clampE = (s: EvidenceScores): EvidenceScores =>
  Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Math.min(5, Math.max(1, v))])) as unknown as EvidenceScores;
const avgE = (a: EvidenceScores, b: EvidenceScores): EvidenceScores =>
  Object.fromEntries(Object.keys(a).map((k) => [k, (a[k as keyof EvidenceScores] + b[k as keyof EvidenceScores]) / 2])) as unknown as EvidenceScores;

async function onceE(llm: LlmClient, brief: string, anchors: string, a: string, b: string) {
  const { data } = await generateStructured(llm, {
    schema: evSchema,
    system: EVIDENCE_SYSTEM,
    prompt: `Brief:\n${brief}\n\nAudience signal used for the evidence (fans of): ${anchors}\n\nPlan A:\n${a}\n\nPlan B:\n${b}`,
    label: "judge:evidence",
  });
  return data;
}

export async function judgeWithEvidence(
  llm: LlmClient,
  brief: LaunchBrief,
  market: Market,
  anchors: string[],
  agent: { plan: CulturalPlan; evaluation: PlanEvaluation },
  draft: { plan: CulturalPlan; evaluation: PlanEvaluation },
): Promise<EvidenceVerdict> {
  const text = briefText(brief, market).replace(/^Audience is fans of: .*$/m, "");
  const ours = evidenceText(agent.plan, agent.evaluation);
  const theirs = evidenceText(draft.plan, draft.evaluation);
  const who = anchors.join(", ");
  const [first, second] = await Promise.all([onceE(llm, text, who, ours, theirs), onceE(llm, text, who, theirs, ours)]);
  const p1 = first.preferred === "A" ? "agent" : first.preferred === "B" ? "draft" : "tie";
  const p2 = second.preferred === "A" ? "draft" : second.preferred === "B" ? "agent" : "tie";
  const consistent = p1 === p2;
  return {
    agent: avgE(clampE(first.A), clampE(second.B)),
    draft: avgE(clampE(first.B), clampE(second.A)),
    preferred: consistent ? p1 : "tie",
    consistent,
    reason: first.reason,
  };
}
