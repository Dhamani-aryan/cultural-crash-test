import { randomUUID } from "node:crypto";
import type { LlmClient } from "@/lib/llm/types";
import { marketById } from "@/lib/markets";
import type { QlooClient } from "@/lib/qloo";
import { MATERIAL_DELTA, compareEvaluations, evaluatePlan, type Progress } from "./evaluate";
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
  type PlanChange,
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
    const upgradeTried = new Set<Slot>();
    let stall = 0;
    while (true) {
      // Once nothing is contradicted, spare rounds go to upgrading thinly supported choices,
      // weakest first.
      const thin = current.accepted
        ? current.components
            .filter(
              (c) =>
                !c.contradicted &&
                c.status !== "supported" &&
                // No support for a name from here is Qloo's blind spot for very popular local
                // names (Sanrio in Tokyo), not a weak choice: it stays.
                c.status !== "no_support" &&
                !upgradeTried.has(c.slot) &&
                !state.plan!.components.find((x) => x.slot === c.slot)?.locked,
            )
            .sort((a, b) => (a.total ?? 0) - (b.total ?? 0))
        : [];
      if (current.accepted && (!thin.length || state.currentIteration >= state.maxIterations)) {
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
      const upgrade = current.accepted;
      const target = upgrade ? thin[0].slot : current.weakest.find((s) => !exhausted.has(s));
      if (upgrade) upgradeTried.add(target!);
      if (!target) {
        const locked = current.components.filter((c) => c.status !== "supported" && state.plan!.components.find((x) => x.slot === c.slot)?.locked);
        stop(
          "no_material_improvement",
          locked.length && !current.weakest.length
            ? `The remaining weak choices are locked by your constraints: ${locked.map((c) => c.label).join(", ")}.`
            : "No better-supported alternative was found for the remaining contradicted choices.",
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
        why: upgrade
          ? `Nothing in the plan is contradicted. ${SLOT_LABEL[target]} "${assessment.label}" has the thinnest support (${assessment.status.replace("_", " ")}): ${assessment.finding} Trying the agent's own suggestions; one is kept only if Qloo rates it Supported.`
          : `${SLOT_LABEL[target]} "${assessment.label}" is the weakest adjustable choice (${assessment.status.replace("_", " ")}): ${assessment.finding}`,
      };
      state.actions.push(action);
      emit({ type: "action", action });
      stage("repair", `Researching a better-supported ${SLOT_LABEL[target].toLowerCase()} in Qloo`);

      const before = state.plan!;
      const proposals: RepairProposal[] =
        target === "creative_direction"
          ? [await repairDirection({ llm, ctx, brief, plan: before, assessment, upgrade })].filter(
              (p): p is RepairProposal => p !== null,
            )
          : await repairEntity({
              llm,
              ctx,
              brief,
              plan: before,
              slot: target,
              assessment,
              rejected: state.rejected[target] ?? [],
              upgrade,
            });
      if (!proposals.length && upgrade) continue;
      if (!proposals.length) {
        exhausted.add(target);
        const screen = ledger.records.at(-1)?.warnings[0];
        state.unresolvedQuestions.push(
          `${SLOT_LABEL[target]}: Qloo had no candidate that fits this audience, is local to ${market.label} and passes the constraints` +
            (screen ? ` (${screen.replace(/^No candidate passed the screen: /, "").replace(/\.$/, "")})` : "") +
            ". Worth a human look: keep an international choice, or test a local one by name.",
        );
        continue;
      }

      // Re-test candidates in the model's order. The first that makes this choice Supported
      // without costing the plan anything wins; otherwise the best improvement wins.
      let best: { proposal: RepairProposal; next: PlanEvaluation; progress: Progress; change: PlanChange } | null = null;
      const tried: PlanChange[] = [];
      for (const proposal of proposals) {
        stage("retest", `Re-testing the plan with ${proposal.after.label} as the ${SLOT_LABEL[target].toLowerCase()}`);
        const next = await evaluate(applyRepair(before, proposal), current);
        const now = next.components.find((c) => c.slot === target)!;
        const progress = compareEvaluations(current, next, target);
        const change: PlanChange = {
          iteration: state.currentIteration,
          slot: target,
          before: assessment.label,
          after: proposal.after.label,
          reason: proposal.reason,
          triggeringEvidenceIds: [...new Set([...assessment.dimensions.flatMap((d) => d.evidenceIds), ...proposal.evidenceIds])],
          expectedEffect: proposal.expectedEffect,
          observedEffect:
            `${SLOT_LABEL[target]} ${assessment.total?.toFixed(2) ?? "n/a"} → ${now.total?.toFixed(2) ?? "n/a"} (${now.status.replace("_", " ")}); ` +
            `plan ${current.supported}/${current.components.length} supported, score ${current.totalScore?.toFixed(2) ?? "n/a"} → ` +
            `${next.supported}/${next.components.length}, ${next.totalScore?.toFixed(2) ?? "n/a"}.`,
        };
        tried.push(change);
        // An upgrade must land on Supported; a sideways move between thin choices isn't one.
        const counts = progress.better && (!upgrade || now.status === "supported");
        if (counts && (!best || compareEvaluations(best.next, next, target).better))
          best = { proposal, next, progress, change };
        if (progress.better && now.status === "supported") break;
      }
      for (const change of tried) {
        if (change !== best?.change) {
          change.reverted = true;
          (state.rejected[target] ??= []).push(change.after);
        }
        state.changes.push(change);
        emit({ type: "change", change });
      }
      if (!best) {
        // A failed upgrade leaves an accepted plan accepted; only failed repairs count as a stall.
        if (!upgrade) stall++;
      } else {
        state.plan = applyRepair(before, best.proposal);
        current = best.next;
        state.evaluations.push(current);
        emit({ type: "plan", plan: state.plan, label: "revised" });
        emit({ type: "evaluation", evaluation: current });
        stall = best.progress.material ? 0 : stall + 1;
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

  // Choices kept without strong evidence are the human's to check, not silently passed.
  const last = state.evaluations.at(-1);
  for (const c of last?.components ?? []) {
    const comp = state.plan?.components.find((x) => x.slot === c.slot);
    if (!comp || comp.locked || c.contradicted || c.status === "supported") continue;
    state.unresolvedQuestions.push(
      c.status === "unresolved"
        ? `${SLOT_LABEL[c.slot]} "${c.label}" was kept but couldn't be tested: Qloo doesn't know it. Check it by hand.`
        : `${SLOT_LABEL[c.slot]} "${c.label}" was kept: the evidence is thin but doesn't contradict it (${c.finding.replace(/\.$/, "")}).`,
    );
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
