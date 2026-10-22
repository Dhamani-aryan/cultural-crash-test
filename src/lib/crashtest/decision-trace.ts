import { nameKey } from "@/lib/engine/stats";
import {
  SLOT_LABEL,
  STATUS_LABEL,
  type ActionRecord,
  type CandidateTrial,
  type Component,
  type ComponentAssessment,
  type Constraint,
  type PlanChange,
  type RejectionCode,
  type RetestResult,
  type RunState,
  type Slot,
} from "./types";

/**
 * One decision's recorded history, per choice: what the user chose, what the LLM drafted, how
 * it tested, every action, every candidate considered and how each ended, the accepted change
 * and the final test. Built from structured RunState fields only, never from sentences. The
 * comparison table, the decision graph and the Decision trace all read this, so they agree.
 */

/** Same choice? Identity, not label: a re-labelled direction with the same tags is the same. */
export function sameChoice(a: Component | undefined, b: Component | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.entity && b.entity) return a.entity.id === b.entity.id;
  if (a.slot === "creative_direction" && a.tags.length && b.tags.length) {
    const ids = (c: Component) => c.tags.map((t) => t.id).sort().join("|");
    return ids(a) === ids(b);
  }
  return nameKey(a.label) === nameKey(b.label);
}

export interface DecisionTraceEntry {
  slot: Slot;
  changed: boolean;
  userChoice: { label: string; locked: boolean } | null;
  baseline: ComponentAssessment;
  final: ComponentAssessment;
  actions: ActionRecord[];
  /** Every candidate considered, in the order considered. */
  trials: CandidateTrial[];
  /** The full-plan re-tests, in order (one per re-tested candidate). */
  changes: PlanChange[];
  acceptedChange?: PlanChange;
  /** Rules from the brief that bore on this decision. */
  constraints: Constraint[];
}

export function buildDecisionTrace(state: RunState): DecisionTraceEntry[] {
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  if (!first || !last) return [];
  const hard = state.brief.constraints.filter((c) => c.kind === "hard");
  return last.components.map((final) => {
    const slot = final.slot;
    const baseline = first.components.find((c) => c.slot === slot)!;
    const given = state.brief.existingChoices.find((c) => c.slot === slot);
    const lock = hard.find((c) => c.lockSlot === slot);
    const changes = state.changes.filter((c) => c.slot === slot);
    const orig = state.initialPlan?.components.find((c) => c.slot === slot);
    const fin = state.plan?.components.find((c) => c.slot === slot);
    const changed = !sameChoice(orig, fin);
    const acceptedChange = changed ? [...changes].reverse().find((c) => !c.reverted && nameKey(c.after) === nameKey(final.label)) : undefined;
    // Runs recorded before trials existed: their re-tested candidates are the changes.
    const trials =
      state.trials?.filter((t) => t.slot === slot) ??
      changes.map(
        (c): CandidateTrial => ({
          iteration: c.iteration,
          slot,
          name: c.after,
          source: "qloo_list",
          evidenceIds: c.triggeringEvidenceIds,
          briefFit: "unknown",
          retest: c.retest,
        }),
      );
    const searched = changes.length > 0 || trials.length > 0;
    const constraints = hard.filter((c) => c.lockSlot === slot || (!c.lockSlot && searched));
    return {
      slot,
      changed,
      userChoice: given ? { label: given.name, locked: !!lock } : null,
      baseline,
      final,
      actions: state.actions.filter((a) => a.slot === slot),
      trials,
      changes,
      acceptedChange,
      constraints,
    };
  });
}

export const REJECTION_LABEL: Record<RejectionCode, string> = {
  no_improvement: "The full plan did not improve",
  target_not_supported: "It did not reach Supported",
  plan_regression: "Another choice lost its Supported status",
  constraint_conflict: "It broke a hard rule in the brief",
  better_candidate_selected: "Another candidate tested better",
};

const count = (r: RetestResult, before: boolean) => `${before ? r.supportedBefore : r.supportedAfter}/${r.components}`;

/** The re-test as one line of recorded numbers. */
export function retestLine(r: RetestResult): string {
  return `${STATUS_LABEL[r.slotStatusBefore]} → ${STATUS_LABEL[r.slotStatusAfter]}; plan ${count(r, true)} → ${count(r, false)} supported`;
}

/** A re-tested change's outcome, from its structured re-test (runs recorded before it existed say only kept or not). */
export function changeOutcome(c: PlanChange): string {
  const verdict = c.reverted ? "Rejected after the full-plan re-test" : "Accepted after the full-plan re-test";
  if (!c.retest) return verdict;
  const why = c.reverted && c.retest.rejectionCode ? ` (${REJECTION_LABEL[c.retest.rejectionCode].toLowerCase()})` : "";
  return `${verdict}${why}: ${retestLine(c.retest)}`;
}

/** What a candidate's re-test showed, as a sentence of recorded facts. */
export function trialOutcome(t: CandidateTrial): string {
  if (t.screenedOutReason) return t.screenedOutReason;
  if (!t.retest) return "Re-tested in the full plan";
  return `${t.retest.accepted ? "Accepted" : "Rejected"} after the full-plan re-test: ${retestLine(t.retest)}`;
}

/** The acceptance checks a kept candidate passed, from its structured re-test. */
export function acceptanceChecks(r: RetestResult, slot: Slot, trial?: CandidateTrial): string[] {
  const out = [`${SLOT_LABEL[slot]}: ${STATUS_LABEL[r.slotStatusBefore]} → ${STATUS_LABEL[r.slotStatusAfter]}`];
  if (r.supportedAfter > r.supportedBefore) out.push(`Supported choices: ${count(r, true)} → ${count(r, false)}`);
  if (r.contradictedAfter < r.contradictedBefore) out.push(`Contradicted choices: ${r.contradictedBefore} → ${r.contradictedAfter}`);
  out.push("No hard rule broken");
  out.push(r.lostSupported.length ? `Trade-off recorded: ${r.lostSupported.map((s) => SLOT_LABEL[s]).join(", ")} lost Supported` : "No Supported choice lost");
  if (trial?.briefFit === "pass") out.push("Passed the brief and role screen");
  return out;
}
