import { randomUUID } from "node:crypto";
import type { LlmClient } from "@/lib/llm/types";
import { marketById } from "@/lib/markets";
import type { QlooClient } from "@/lib/qloo";
import { MATERIAL_DELTA, compareEvaluations, evaluatePlan } from "./evaluate";
import { gatherEvidence, type GatherContext } from "./gather";
import { BudgetExceeded, budgeted, createLedger } from "./ledger";
import { buildPlan, draftPlan } from "./plan";
import { applyRepair, repairDirection, repairEntity, type RepairProposal } from "./repair";
import { writeVerdict } from "./report";
import {
  DEPTHS,
  LaunchBriefSchema,
  SLOT_LABEL,
  type CulturalPlan,
  type LaunchBriefInput,
  type PlanEvaluation,
  type RunEvent,
  type RunState,
  type Slot,
  type StopReason,
} from "./types";

/**
 * The controller. A plain state machine: every transition, budget check and stop condition is
 * code. The model is called for four things only: the first draft, mapping a creative
 * direction onto Qloo's words, choosing among screened repair candidates, and the verdict.
 *
 *   VALIDATE → DRAFT → RESOLVE → GATHER → EVALUATE → accepted? → DIAGNOSE → REPAIR → GATHER …
 */

export interface RunDeps {
  qloo: QlooClient;
  llm: LlmClient;
}

export interface RunOptions {
  emit?: (e: RunEvent) => void;
  signal?: AbortSignal;
  runId?: string;
  /** Override the depth's limits (tests, evaluation). */
  limits?: { maxRepairs?: number; maxQlooCalls?: number };
}

/** Stop after this many rounds in a row without a material improvement. */
export const STALL_ROUNDS = 2;

class Cancelled extends Error {}

export async function runCrashTest(
  deps: RunDeps,
  briefInput: LaunchBriefInput,
  opts: RunOptions = {},
): Promise<RunState> {
  const emit = opts.emit ?? (() => {});
  const brief = LaunchBriefSchema.parse(briefInput);
  const market = marketById(brief.marketId);
  if (!market) throw new Error(`Unsupported city: ${brief.marketId}`);
  const depth = { ...DEPTHS[brief.depth], ...opts.limits };

  const state: RunState = {
    runId: opts.runId ?? randomUUID(),
    brief,
    marketLabel: market.label,
    initialPlan: null,
    plan: null,
    assumptions: [],
    currentIteration: 0,
    maxIterations: depth.maxRepairs,
    maxQlooCalls: depth.maxQlooCalls,
    qlooCallsUsed: 0,
    llmCalls: 0,
    evidenceLedger: [],
    evaluations: [],
    actions: [],
    changes: [],
    unresolvedQuestions: [],
    rejected: {},
    startedAt: new Date().toISOString(),
  };

  const llm: LlmClient = {
    provider: deps.llm.provider,
    model: deps.llm.model,
    generateText: (req) => {
      state.llmCalls++;
      return deps.llm.generateText({ ...req, signal: opts.signal });
    },
  };
  const counted = budgeted(deps.qloo, state.maxQlooCalls, (used) => {
    state.qlooCallsUsed = used;
    if (used % 10 === 0) emit({ type: "budget", qlooCallsUsed: used, maxQlooCalls: state.maxQlooCalls });
  });
  const ledger = createLedger(
    () => state.currentIteration,
    (record) => emit({ type: "evidence", record }),
  );
  state.evidenceLedger = ledger.records;
  const ctx: GatherContext = { client: counted.client, ledger, market };
  const stage = (s: string, message: string) => {
    if (opts.signal?.aborted) throw new Cancelled();
    emit({ type: "stage", stage: s, message });
  };
  const stop = (reason: StopReason, detail?: string) => {
    state.stopReason = reason;
    state.stopDetail = detail;
  };

  const evaluate = async (plan: CulturalPlan, previous?: PlanEvaluation) => {
    const evidence = await gatherEvidence(ctx, plan);
    return evaluatePlan({
      plan,
      evidence,
      constraints: brief.constraints,
      city: market.label,
      iteration: state.currentIteration,
      previous,
    });
  };

  try {
    stage("validate", `Brief for ${market.label} checked`);
    if (!brief.audienceAnchors.length)
      state.assumptions.push("No audience anchors were given, so the agent proposed brands or artists that stand for the audience.");
    const hardText = brief.constraints.filter((c) => c.kind === "hard" && !c.lockSlot && !c.excludeNames?.length);
    for (const c of hardText) state.assumptions.push(`Hard constraint "${c.description}" isn't machine-checkable; it is shown to the model but not enforced in code.`);

    stage("draft", "Drafting a first plan from the brief, without Qloo (this is also the LLM-only baseline)");
    const draft = await draftPlan(llm, brief, market);
    state.assumptions.push(...draft.assumptions);

    stage("resolve", "Resolving the audience and every choice to Qloo entities and tags");
    const { plan, notes } = await buildPlan({ llm, ctx, brief, draft, origin: "agent_proposed" });
    state.assumptions.push(...notes);
    state.initialPlan = plan;
    state.plan = plan;
    emit({ type: "plan", plan, label: "initial" });
    if (!plan.anchors.length) {
      stop("insufficient_data", "None of the audience anchors could be found in Qloo, so audience affinity can't be measured.");
      throw new Cancelled();
    }

    stage("evaluate", "Testing every choice against Qloo: audience affinity, locality and fit with the plan");
    let current = await evaluate(plan);
    state.evaluations.push(current);
    emit({ type: "evaluation", evaluation: current });

    const exhausted = new Set<Slot>();
    let stall = 0;
    while (true) {
      if (current.accepted) {
        stop("acceptance_criteria_met");
        for (const c of current.components) {
          const locked = state.plan!.components.find((x) => x.slot === c.slot)?.locked;
          if (locked && c.status !== "supported")
            state.unresolvedQuestions.push(
              `${SLOT_LABEL[c.slot]} "${c.label}" is locked by your constraints but rated ${c.status.replace("_", " ")}: ${c.finding}`,
            );
        }
        break;
      }
      const target = current.weakest.find((s) => !exhausted.has(s));
      if (!target) {
        const locked = current.components.filter((c) => c.status !== "supported" && state.plan!.components.find((x) => x.slot === c.slot)?.locked);
        stop(
          "no_material_improvement",
          locked.length && !current.weakest.length
            ? `The remaining weak choices are locked by your constraints: ${locked.map((c) => c.label).join(", ")}.`
            : "No better-supported alternative was found for the remaining weak choices.",
        );
        break;
      }
      if (state.currentIteration >= state.maxIterations) {
        stop("iteration_limit", `${state.maxIterations} repair rounds used.`);
        break;
      }
      state.currentIteration++;
      const assessment = current.components.find((c) => c.slot === target)!;
      const action = {
        iteration: state.currentIteration,
        kind: target === "creative_direction" ? ("retest_direction" as const) : ("find_alternatives" as const),
        slot: target,
        why: `${SLOT_LABEL[target]} "${assessment.label}" is the weakest adjustable choice (${assessment.status.replace("_", " ")}): ${assessment.finding}`,
      };
      state.actions.push(action);
      emit({ type: "action", action });
      stage("repair", `Researching a better-supported ${SLOT_LABEL[target].toLowerCase()} in Qloo`);

      const before = state.plan!;
      let proposal: RepairProposal | null;
      if (target === "creative_direction") {
        proposal = await repairDirection({ llm, ctx, brief, plan: before, assessment });
      } else {
        proposal = await repairEntity({
          llm,
          ctx,
          brief,
          plan: before,
          slot: target,
          assessment,
          rejected: state.rejected[target] ?? [],
        });
      }
      if (!proposal) {
        exhausted.add(target);
        state.unresolvedQuestions.push(
          `${SLOT_LABEL[target]}: Qloo had no candidate that fits this audience, is local to ${market.label} and passes the constraints. Worth a human look.`,
        );
        continue;
      }

      stage("retest", `Re-testing the plan with ${proposal.after.label} as the ${SLOT_LABEL[target].toLowerCase()}`);
      const revised = applyRepair(before, proposal);
      const next = await evaluate(revised, current);
      const was = assessment.total;
      const now = next.components.find((c) => c.slot === target)!;
      const progress = compareEvaluations(current, next, target);
      const worse = !progress.better;
      const change = {
        iteration: state.currentIteration,
        slot: target,
        before: assessment.label,
        after: proposal.after.label,
        reason: proposal.reason,
        triggeringEvidenceIds: [...new Set([...assessment.dimensions.flatMap((d) => d.evidenceIds), ...proposal.evidenceIds])],
        expectedEffect: proposal.expectedEffect,
        observedEffect:
          `${SLOT_LABEL[target]} ${was?.toFixed(2) ?? "n/a"} → ${now.total?.toFixed(2) ?? "n/a"} (${now.status.replace("_", " ")}); ` +
          `plan ${current.supported}/${current.components.length} supported, score ${current.totalScore?.toFixed(2) ?? "n/a"} → ` +
          `${next.supported}/${next.components.length}, ${next.totalScore?.toFixed(2) ?? "n/a"}.`,
        reverted: worse || undefined,
      };
      state.changes.push(change);
      emit({ type: "change", change });
      if (worse) {
        // Keep the previous plan; don't offer this candidate again.
        (state.rejected[target] ??= []).push(proposal.after.label);
        stall++;
      } else {
        state.plan = revised;
        current = next;
        state.evaluations.push(next);
        emit({ type: "plan", plan: revised, label: "revised" });
        emit({ type: "evaluation", evaluation: next });
        stall = progress.material ? 0 : stall + 1;
      }
      if (stall >= STALL_ROUNDS) {
        stop(
          "no_material_improvement",
          `${STALL_ROUNDS} rounds in a row added no supported choice and moved the plan score by less than ${MATERIAL_DELTA}.`,
        );
        break;
      }
    }
  } catch (err) {
    if (err instanceof BudgetExceeded) stop("api_budget_limit", `${err.used} Qloo calls used.`);
    else if (err instanceof Cancelled || opts.signal?.aborted) {
      if (!state.stopReason) stop("user_cancelled");
    } else {
      stop("error", err instanceof Error ? err.message : String(err));
    }
  }

  state.qlooCallsUsed = counted.used();
  if (state.evaluations.length && state.stopReason !== "user_cancelled") {
    try {
      emit({ type: "stage", stage: "report", message: "Writing the verdict from the recorded evidence" });
      state.verdict = await writeVerdict(llm, state);
    } catch {
      state.verdict = undefined;
    }
  }
  state.finishedAt = new Date().toISOString();
  emit({ type: "done", state });
  return state;
}
