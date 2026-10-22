import { nameKey } from "@/lib/engine/stats";
import {
  STATUS_LABEL,
  type Component,
  type ComponentAssessment,
  type ComponentStatus,
  type PlanChange,
  type RunState,
  type Slot,
} from "./types";

/**
 * Why each choice changed or stayed, built only from the recorded run: the two evaluations, the
 * changes (accepted and tried), the brief and the ledger. No model is asked anything here, and
 * nothing is said that the run didn't record. Missing Qloo evidence is described as missing,
 * never as proof that a choice is wrong.
 */

export interface ComponentChangeExplanation {
  slot: Slot;
  changed: boolean;
  originalChoice: string;
  agentChoice: string;
  originalStatus: ComponentStatus;
  agentStatus: ComponentStatus;
  originalFinding: string;
  agentFinding: string;
  /** Why the original was looked at again (changed choices only). */
  reasonToReconsider: string[];
  /** Why the agent's choice won (changed choices only). */
  reasonForAgentChoice: string[];
  /** Why it stayed (unchanged choices only). */
  keptReason?: string;
  acceptedChange?: PlanChange;
  /** Candidates tested for this choice and not kept, with their recorded outcomes. */
  rejectedChanges: PlanChange[];
  evidenceIds: string[];
  caveats: string[];
}

const kind = (slot: Slot) =>
  slot === "artist_music" ? "act" : slot === "brand_collaboration" ? "brand" : slot === "event_place" ? "venue" : "direction";

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

/** What the status means, in words that never treat missing evidence as a verdict. */
function statusMeaning(a: ComponentAssessment, c: Component | undefined): string {
  switch (a.status) {
    case "supported":
      return "Qloo's evidence supports it.";
    case "weak":
      return "Qloo's evidence for it is thin.";
    case "no_support":
      return a.contradicted
        ? "Qloo returned no affinity for it among this audience here."
        : "Qloo returned no affinity for it here, but it's from here, and Qloo often leaves out very popular local names under a city signal.";
    case "unresolved":
      return c?.resolution === "ambiguous"
        ? "Qloo could not verify this choice: the only match in Qloo is a different entity with the same name."
        : "Qloo could not verify this choice: it isn't in Qloo. That is missing evidence, not evidence against it.";
    case "constraint_conflict":
      return "It breaks a hard rule in the brief.";
  }
}

const evidenceLines = (a: ComponentAssessment) =>
  a.dimensions.filter((d) => !d.heuristic && d.score !== undefined).map((d) => d.explanation);

export function buildChangeExplanations(state: RunState): ComponentChangeExplanation[] {
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  if (!first || !last) return [];
  const ledger = new Set(state.evidenceLedger.map((r) => r.evidenceId));
  const explore = state.brief.exploreUserChoices;

  return last.components.map((a) => {
    const slot = a.slot;
    const b = first.components.find((x) => x.slot === slot)!;
    const orig = state.initialPlan?.components.find((x) => x.slot === slot);
    const fin = state.plan?.components.find((x) => x.slot === slot);
    const changed = !sameChoice(orig, fin);
    const tried = state.changes.filter((c) => c.slot === slot);
    const acceptedChange = changed ? [...tried].reverse().find((c) => !c.reverted && nameKey(c.after) === nameKey(a.label)) : undefined;
    const rejectedChanges = tried.filter((c) => c.reverted);
    const fromUser = orig?.origin === "user_provided";
    const who = fromUser ? "You chose it" : "The LLM drafted it without Qloo data";

    const reasonToReconsider: string[] = [];
    const reasonForAgentChoice: string[] = [];
    let keptReason: string | undefined;

    if (changed) {
      // The finding already says "no affinity … in <city>"; the generic line would repeat it.
      if (!(b.status === "no_support" && b.contradicted)) reasonToReconsider.push(statusMeaning(b, orig));
      reasonToReconsider.push(b.finding);
      for (const line of evidenceLines(b)) if (line !== b.finding) reasonToReconsider.push(line);
      if (b.contradicted) {
        reasonToReconsider.push(`${who}; the evidence contradicts it, so it was eligible for repair.`);
      } else if (b.status === "unresolved") {
        reasonToReconsider.push(
          `${who}. Because Qloo couldn't test it, the agent looked for a ${kind(slot)} it could verify, and kept one only because it tested Supported.`,
        );
      } else {
        reasonToReconsider.push(
          `${who}. Nothing contradicted it; the agent tried an upgrade because the evidence was thin${fromUser ? `, which it does for your own choices only with exploring alternatives switched on (${explore ? "on" : "off"})` : ""}, and kept the swap only because the replacement tested Supported.`,
        );
      }
      reasonForAgentChoice.push(`${STATUS_LABEL[a.status]}: ${statusMeaning(a, fin)}`, a.finding);
      for (const line of evidenceLines(a)) if (line !== a.finding) reasonForAgentChoice.push(line);
      if (acceptedChange) {
        if (acceptedChange.observedEffect) reasonForAgentChoice.push(`Re-test: ${acceptedChange.observedEffect}`);
        reasonForAgentChoice.push(`The agent's recorded reason: ${acceptedChange.reason}`);
      }
      if (rejectedChanges.length)
        reasonForAgentChoice.push(
          `It beat ${rejectedChanges.length} other tested candidate${rejectedChanges.length === 1 ? "" : "s"} (listed under "Other alternatives tested").`,
        );
    } else if (fin?.locked) {
      keptReason = `It's fixed in your brief, so it was assessed (${STATUS_LABEL[a.status]}) but never eligible for replacement.`;
    } else if (a.status === "supported") {
      keptReason = "It was already supported by Qloo evidence, so there was nothing to fix.";
    } else if (a.status === "unresolved") {
      keptReason = "Qloo could not verify it, and nothing justified replacing it, so it stays for you to check by hand.";
    } else if (rejectedChanges.length) {
      keptReason = `The agent tested ${rejectedChanges.length} alternative${rejectedChanges.length === 1 ? "" : "s"}, and none improved the plan.`;
    } else if (fromUser && !explore && !a.contradicted) {
      keptReason = "It's your choice and nothing contradicted it. Exploring alternatives to your choices was off.";
    } else if (!a.contradicted) {
      keptReason = "The evidence didn't contradict it, so the agent left it and repaired the choices that needed it.";
    } else {
      keptReason = "No better-supported alternative was found.";
    }

    const caveats: string[] = [];
    if (a.status === "unresolved") caveats.push("Qloo could not verify this choice; treat it as a hypothesis.");
    else if (a.coverage !== "adequate") caveats.push(`Evidence coverage for ${a.label} is ${a.coverage}.`);
    if (changed && b.status === "unresolved")
      caveats.push(`Qloo didn't know ${b.label}, so the comparison can't say it was a bad ${kind(slot)}, only that it couldn't be tested.`);
    for (const q of state.unresolvedQuestions) if (q.includes(`"${a.label}"`) || (changed && q.includes(`"${b.label}"`))) caveats.push(q);

    const evidenceIds = [
      ...new Set([
        ...b.dimensions.flatMap((d) => d.evidenceIds),
        ...a.dimensions.flatMap((d) => d.evidenceIds),
        ...(acceptedChange?.triggeringEvidenceIds ?? []),
      ]),
    ].filter((id) => ledger.has(id));

    return {
      slot,
      changed,
      originalChoice: b.label,
      agentChoice: a.label,
      originalStatus: b.status,
      agentStatus: a.status,
      originalFinding: b.finding,
      agentFinding: a.finding,
      reasonToReconsider: [...new Set(reasonToReconsider.filter(Boolean))],
      reasonForAgentChoice: [...new Set(reasonForAgentChoice.filter(Boolean))],
      keptReason,
      acceptedChange,
      rejectedChanges,
      evidenceIds,
      caveats: [...new Set(caveats)],
    };
  });
}

export const changeCount = (state: RunState) => buildChangeExplanations(state).filter((e) => e.changed).length;

