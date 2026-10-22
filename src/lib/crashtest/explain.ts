import { nameKey } from "@/lib/engine/stats";
import { comparePlans, type ComparisonOutcome } from "./compare";
import { unverifiableRules } from "./constraints";
import {
  SLOT_LABEL,
  SLOTS,
  STATUS_LABEL,
  type Component,
  type ComponentAssessment,
  type ComponentStatus,
  type DimensionScore,
  type PlanChange,
  type RunState,
  type Slot,
} from "./types";

/**
 * The judge-facing decision model, built only from the recorded run: the brief, the two
 * evaluations, the changes (accepted and tried) and the ledger. No model is asked anything, and
 * every sentence comes from a fixed template filled with recorded values. Three stages stay
 * apart: what the user chose (brief.existingChoices only), what the LLM completed without Qloo
 * (the first evaluation, which `comparePlans` uses as the baseline), and what the agent kept or
 * changed after testing. Missing Qloo evidence is described as missing, never as a verdict.
 */

export type DecisionReasonCode =
  | "audience_contradiction"
  | "constraint_conflict"
  | "weak_coverage"
  | "qloo_unknown"
  | "constraint_locked"
  | "user_rule_unverified"
  | "user_choice_kept"
  | "local_relevance"
  | "audience_affinity"
  | "plan_coherence"
  | "venue_fit"
  | "constraint_safe"
  | "no_better_alternative"
  | "already_supported";

export interface DecisionEvidence {
  kind: "audience" | "local" | "plan" | "constraint";
  label: string;
  value: string;
  source: "qloo" | "user" | "application";
  evidenceIds: string[];
}

export interface DecisionExplanation {
  slot: Slot;
  /** Position in the default (changed-first) order, from 1. */
  sequence: number;
  changed: boolean;
  /** Only what the user named in the brief; null means they left it open. */
  userChoice: { label: string; locked: boolean } | null;
  /** The LLM completion: the user's choice carried forward, or the LLM's addition. */
  baseline: { label: string; status: ComponentStatus; origin: "user_provided" | "agent_proposed" };
  revised: { label: string; status: ComponentStatus; origin: Component["origin"] };
  /** The LLM completion's audience test in a few words, for the graph. */
  baselineSignal: string;
  /** One line for the matrix row. */
  summaryReason: string;
  reasonCodes: DecisionReasonCode[];
  /** Changed only: why the completed choice was opened up. At most two sentences. */
  whyAway: string[];
  /** Changed only: why the replacement was kept. At most two sentences. */
  whyToward: string[];
  /** Retained only: why it stayed. */
  whyStayed: string[];
  /** What the repair left alone, from the recorded brief. */
  preservedConstraints: string[];
  evidence: DecisionEvidence[];
  acceptedChange?: PlanChange;
  /** Candidates tested for this choice and not kept. */
  alternatives: PlanChange[];
  limitations: string[];
  /** Every ledger record behind this decision, for the audit view. */
  evidenceIds: string[];
}

export interface RunSummary {
  outcome: ComparisonOutcome;
  changed: number;
  retained: number;
  total: number;
  /** Slots the user filled themselves. */
  userSpecified: number;
  /** Slots the LLM filled. */
  llmAdded: number;
  baselineSupported: number;
  revisedSupported: number;
  baselineContradicted: number;
  revisedContradicted: number;
  /** "2 choices changed. 2 retained." */
  headline: string;
  /** One factual sentence on the outcome; never forces a win. */
  detail: string;
}

export interface BriefConstant {
  label: string;
  value: string;
}

const kind = (slot: Slot) =>
  slot === "artist_music" ? "act" : slot === "brand_collaboration" ? "brand" : slot === "event_place" ? "venue" : "direction";
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const quote = (s: string) => `“${s}”`;

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

const dim = (a: ComponentAssessment, key: DimensionScore["key"]) => a.dimensions.find((d) => d.key === key);

/** The audience result, read from the evaluation's own explanation (which cites the ledger). */
function audienceHit(d: DimensionScore | undefined) {
  if (!d || d.score === undefined) return null;
  const aff = d.explanation.match(/affinity ([\d.]+)/);
  const top = d.explanation.match(/^#(\d+) of (\d+)/);
  const outside = d.explanation.match(/^Outside .*top (\d+)/);
  const tags = d.explanation.match(/^Among .*?: (.*)\.$/);
  return {
    rank: top ? Number(top[1]) : undefined,
    of: top ? Number(top[2]) : outside ? Number(outside[1]) : undefined,
    affinity: aff ? Number(aff[1]).toFixed(2) : undefined,
    tags: tags?.[1],
    raw: d.explanation.replace(/\.$/, ""),
  };
}

/** Short form, for evidence summaries and rows. */
function audienceFact(d: DimensionScore | undefined, city: string): string {
  const h = audienceHit(d);
  if (!h) return d?.evidenceIds.length ? "No support returned in this test" : "Not measured";
  const affinity = h.affinity ? ` · affinity ${h.affinity}` : "";
  if (h.rank) return `#${h.rank} of ${h.of} for this ${city} audience${affinity}`;
  if (h.of) return `Outside this ${city} audience's top ${h.of}${affinity}`;
  if (h.tags) return `Among this ${city} audience's top tones: ${h.tags}`;
  return h.raw;
}

/** Sentence form, naming the choice. */
function audienceSentence(label: string, d: DimensionScore | undefined, city: string): string | null {
  const h = audienceHit(d);
  if (!h) return null;
  const affinity = h.affinity ? ` (affinity ${h.affinity})` : "";
  if (h.rank) return `${label} ranked #${h.rank} of ${h.of} for this ${city} audience${affinity}.`;
  if (h.of) return `${label} sat outside this ${city} audience's top ${h.of}${affinity}.`;
  if (h.tags) return `${label} sits among this ${city} audience's top tones: ${h.tags}.`;
  return `${label}: ${h.raw}.`;
}

/** A few words, for a graph node. */
function compactSignal(a: ComponentAssessment): string {
  if (a.status === "unresolved") return "Not in Qloo";
  if (a.status === "constraint_conflict") return "Breaks a rule";
  const d = dim(a, "audience");
  const h = audienceHit(d);
  if (!h) return d?.evidenceIds.length ? "No audience support" : "Audience not measured";
  if (h.rank) return `#${h.rank} of ${h.of}${h.affinity ? ` · ${h.affinity}` : ""}`;
  if (h.of) return `Outside top ${h.of}`;
  if (h.tags) {
    const parts = h.tags.split(", ");
    return `${parts.filter((p) => /#\d+$/.test(p)).length}/${parts.length} tones in top`;
  }
  return STATUS_LABEL[a.status];
}

const localFact =(d: DimensionScore | undefined) =>
  !d || d.score === undefined ? "Not measured" : d.explanation.replace(/\.$/, "");

/** Why the completed choice was opened up: a short code and row line. */
function awayReason(b: ComponentAssessment, city: string): { code: DecisionReasonCode; line: string } {
  if (b.status === "constraint_conflict") return { code: "constraint_conflict", line: "Breaks a hard rule in your brief" };
  if (b.status === "unresolved") return { code: "qloo_unknown", line: "Qloo could not verify it; a testable option scored Supported" };
  if (b.contradicted && dim(b, "audience")?.score === undefined)
    return { code: "audience_contradiction", line: `No ${city} audience support returned` };
  const local = dim(b, "local");
  if (b.contradicted && local?.score !== undefined && local.score <= 0.3)
    return { code: "local_relevance", line: /global default/i.test(local.explanation) ? `Global default, not distinctive to ${city}` : `Big in US lists, absent from ${city}'s` };
  if (b.contradicted) return { code: "audience_affinity", line: `Weak fit with this ${city} audience` };
  return { code: "weak_coverage", line: "Thin evidence; the replacement tested Supported" };
}

export function buildDecisions(state: RunState): DecisionExplanation[] {
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  if (!first || !last) return [];
  const brief = state.brief;
  const city = state.marketLabel;
  const ledger = new Set(state.evidenceLedger.map((r) => r.evidenceId));
  const unverifiable = unverifiableRules(brief.constraints);
  const hard = brief.constraints.filter((c) => c.kind === "hard");
  const rulesHeld = last.hardConstraintViolations.length === 0;
  const finalLabel = (slot: Slot) => last.components.find((c) => c.slot === slot)?.label;

  const rows = last.components.map((a) => {
    const slot = a.slot;
    const b = first.components.find((x) => x.slot === slot)!;
    const orig = state.initialPlan?.components.find((x) => x.slot === slot);
    const fin = state.plan?.components.find((x) => x.slot === slot);
    const changed = !sameChoice(orig, fin);
    const tried = state.changes.filter((c) => c.slot === slot);
    const acceptedChange = changed ? [...tried].reverse().find((c) => !c.reverted && nameKey(c.after) === nameKey(a.label)) : undefined;
    const alternatives = tried.filter((c) => c.reverted);
    const given = brief.existingChoices.find((c) => c.slot === slot);
    const lock = hard.find((c) => c.lockSlot === slot);
    const userChoice = given ? { label: given.name, locked: !!lock } : null;
    const fromUser = !!given;
    const what = SLOT_LABEL[slot].toLowerCase();

    const reasonCodes: DecisionReasonCode[] = [];
    const whyAway: string[] = [];
    const whyToward: string[] = [];
    const whyStayed: string[] = [];
    let summaryReason: string;

    if (changed) {
      const away = awayReason(b, city);
      reasonCodes.push(away.code);
      summaryReason = away.line;
      // Sentence 1: what the evidence said about the completed choice.
      if (b.status === "constraint_conflict")
        whyAway.push(`${b.label} breaks your rule ${quote(b.finding.replace(/^Breaks a hard constraint: /, "").replace(/\.$/, ""))}.`);
      else if (b.status === "unresolved")
        whyAway.push(`Qloo could not verify ${b.label}. That is missing evidence, not evidence against it.`);
      else if (away.code === "audience_contradiction") whyAway.push(`No audience support was returned for ${b.label} in this ${city} test.`);
      else if (away.code === "local_relevance") whyAway.push(`${b.label}: ${localFact(dim(b, "local"))}.`);
      else whyAway.push(`${b.label}: ${b.finding.replace(/\.$/, "")}.`);
      // Sentence 2: why it was eligible to change at all.
      if (fromUser)
        whyAway.push(
          b.contradicted
            ? "You chose it but didn't lock it, so contradicting evidence opened it to alternatives."
            : "You chose it but didn't lock it, and exploring alternatives to your choices was on.",
        );
      else
        whyAway.push(
          b.contradicted
            ? "The LLM added it without Qloo data, and the evidence contradicts it, so it was open to repair."
            : "The LLM added it without Qloo data, so the agent looked for a choice with firmer evidence.",
        );

      const aud = dim(a, "audience");
      const loc = dim(a, "local");
      const coh = dim(a, "coherence");
      if (aud?.score !== undefined && aud.score >= 0.6) reasonCodes.push("audience_affinity");
      if (loc?.score !== undefined && loc.score >= 0.6) reasonCodes.push(slot === "event_place" ? "venue_fit" : "local_relevance");
      if (coh?.score !== undefined && coh.score >= 0.6) reasonCodes.push("plan_coherence");
      if (hard.length && rulesHeld) reasonCodes.push("constraint_safe");
      whyToward.push(audienceSentence(a.label, aud, city) ?? `${a.label} tested ${STATUS_LABEL[a.status]}.`);
      whyToward.push(
        `After the full plan was re-tested, the ${what} moved from ${STATUS_LABEL[b.status]} to ${STATUS_LABEL[a.status]}` +
          (alternatives.length ? `, ahead of ${plural(alternatives.length, "other tested candidate")}.` : "."),
      );
    } else {
      const brandRule = slot === "brand_collaboration" && a.status === "unresolved" && unverifiable.length > 0;
      if (lock) {
        reasonCodes.push("constraint_locked");
        summaryReason = a.status === "supported" ? "Fixed in your brief and supported; no reason to move" : `Fixed in your brief; ${STATUS_LABEL[a.status].toLowerCase()}, flagged for review`;
        whyStayed.push(`Your brief fixes it (${quote(lock.description)}), so it was tested but never open to replacement.`);
        whyStayed.push(
          a.status === "supported"
            ? "The recorded evidence supports it, so nothing argued for overriding your choice."
            : `Its evidence came back ${STATUS_LABEL[a.status]}; it stays because you fixed it, and is flagged for you to review.`,
        );
      } else if (brandRule) {
        reasonCodes.push("user_rule_unverified", "qloo_unknown");
        summaryReason = "Not in Qloo, and your rule can't be machine-checked; kept for review";
        whyStayed.push(`Qloo could not verify ${a.label}, and your rule ${quote(unverifiable[0])} can't be fully checked by code.`);
        whyStayed.push("Replacing it could break that rule unseen, so it stays unchanged for you to confirm by hand.");
      } else if (a.status === "supported") {
        reasonCodes.push("already_supported");
        const hit = audienceHit(dim(a, "audience"));
        summaryReason = hit?.rank
          ? `Already supported: #${hit.rank} of ${hit.of} for this ${city} audience`
          : hit?.tags
            ? `Already supported: its tones rank in this ${city} audience's top list`
            : "Already supported; nothing to fix";
        whyStayed.push(audienceSentence(a.label, dim(a, "audience"), city) ?? `${a.label} already tested Supported.`);
        whyStayed.push("No evidence contradicted it, so there was nothing to fix.");
      } else if (a.status === "unresolved") {
        reasonCodes.push("qloo_unknown");
        summaryReason = "Qloo could not verify it; kept as a hypothesis to check";
        whyStayed.push(`Qloo could not verify ${a.label}. That is missing evidence, not evidence against it.`);
        whyStayed.push(alternatives.length ? `${plural(alternatives.length, "alternative")} tested; none scored better, so it stays for you to check.` : "Nothing justified replacing it, so it stays for you to check.");
      } else if (alternatives.length) {
        reasonCodes.push("no_better_alternative");
        summaryReason = `${plural(alternatives.length, "alternative")} tested; none improved the plan`;
        whyStayed.push(`${a.label}: ${a.finding.replace(/\.$/, "")}.`);
        whyStayed.push(`The agent tested ${plural(alternatives.length, "alternative")} in the full plan, and none improved it.`);
      } else if (fromUser && !a.contradicted) {
        reasonCodes.push("user_choice_kept");
        summaryReason = a.status === "weak" ? "Your choice; evidence is thin but doesn't contradict it" : "Your choice; nothing contradicted it";
        whyStayed.push(`${a.label}: ${a.finding.replace(/\.$/, "")}.`);
        whyStayed.push(
          brief.exploreUserChoices
            ? "Nothing contradicted it, and no alternative scored materially better."
            : "It's your choice and nothing contradicted it; exploring alternatives to your choices was off.",
        );
      } else if (!a.contradicted) {
        reasonCodes.push("weak_coverage");
        summaryReason = "Thin evidence, but nothing contradicted it";
        whyStayed.push(`${a.label}: ${a.finding.replace(/\.$/, "")}.`);
        whyStayed.push("The evidence didn't contradict it, so the agent kept it and repaired the choices that needed it.");
      } else {
        reasonCodes.push("no_better_alternative");
        summaryReason = "Contradicted, but no better-supported option was found";
        whyStayed.push(`${a.label}: ${a.finding.replace(/\.$/, "")}.`);
        whyStayed.push("No better-supported alternative was found within the run's limits.");
      }
    }

    // What the repair left alone, read from the brief.
    const preservedConstraints: string[] = [];
    for (const c of hard) {
      if (c.lockSlot) {
        if (c.lockSlot !== slot) preservedConstraints.push(`${finalLabel(c.lockSlot) ?? SLOT_LABEL[c.lockSlot]} stayed in place, as your brief requires.`);
      } else if (unverifiable.includes(c.description)) {
        preservedConstraints.push(`${quote(c.description)} stays in force; code can't fully check it, so confirm by hand.`);
      } else if (rulesHeld) {
        preservedConstraints.push(`${quote(c.description)} held: no excluded name entered the plan.`);
      }
    }
    preservedConstraints.push(`The audience, ${city} market and launch goal did not change.`);

    const evidence: DecisionEvidence[] = [];
    const ids = (...ds: (DimensionScore | undefined)[]) => [...new Set(ds.flatMap((d) => d?.evidenceIds ?? []))].filter((id) => ledger.has(id));
    const bAud = dim(b, "audience");
    const aAud = dim(a, "audience");
    evidence.push({
      kind: "audience",
      label: "Audience signal",
      value: changed ? `${b.label}: ${audienceFact(bAud, city)}. ${a.label}: ${audienceFact(aAud, city)}.` : `${audienceFact(aAud, city)}.`,
      source: aAud?.score !== undefined || bAud?.evidenceIds.length ? "qloo" : "application",
      evidenceIds: ids(changed ? bAud : undefined, aAud),
    });
    const bLoc = dim(b, "local");
    const aLoc = dim(a, "local");
    const venue = slot === "event_place" && fin?.placeCategory ? ` Tested as ${fin.placeCategory.replace(/_/g, " ")}.` : "";
    evidence.push({
      kind: "local",
      label: "Local signal",
      value: changed ? `${b.label}: ${localFact(bLoc)}. ${a.label}: ${localFact(aLoc)}.` : `${localFact(aLoc)}.${venue}`,
      source: aLoc?.score !== undefined ? "qloo" : "application",
      evidenceIds: ids(changed ? bLoc : undefined, aLoc),
    });
    evidence.push({
      kind: "plan",
      label: "Plan signal",
      value: changed
        ? `${STATUS_LABEL[b.status]} → ${STATUS_LABEL[a.status]} after the full-plan re-test.`
        : `${STATUS_LABEL[a.status]} in the final plan test.`,
      source: "application",
      evidenceIds: ids(dim(a, "coherence")),
    });
    if (lock) evidence.push({ kind: "constraint", label: "Your constraint", value: lock.description, source: "user", evidenceIds: [] });

    const limitations: string[] = [];
    if (a.status === "unresolved") limitations.push("Qloo could not verify this choice; treat it as a hypothesis.");
    else if (a.coverage !== "adequate") limitations.push(`Evidence coverage for ${a.label} is ${a.coverage}; it may be incomplete.`);
    if (changed && b.status === "unresolved")
      limitations.push(`Qloo didn't know ${b.label}, so this can't say it was a poor ${kind(slot)}, only that it couldn't be tested.`);
    if (changed && b.status === "no_support") limitations.push("No support was returned in this test; that is not proof the original would fail.");
    for (const q of state.unresolvedQuestions) if (q.includes(`"${a.label}"`) || (changed && q.includes(`"${b.label}"`))) limitations.push(q);
    limitations.push("Qloo support is cultural evidence, not a forecast of commercial success.");

    const evidenceIds = [
      ...new Set([...b.dimensions.flatMap((d) => d.evidenceIds), ...a.dimensions.flatMap((d) => d.evidenceIds), ...(acceptedChange?.triggeringEvidenceIds ?? [])]),
    ].filter((id) => ledger.has(id));

    return {
      slot,
      sequence: 0,
      changed,
      userChoice,
      baseline: { label: b.label, status: b.status, origin: orig?.origin === "user_provided" || fromUser ? ("user_provided" as const) : ("agent_proposed" as const) },
      revised: { label: a.label, status: a.status, origin: fin?.origin ?? "agent_proposed" },
      baselineSignal: compactSignal(b),
      summaryReason,
      reasonCodes: [...new Set(reasonCodes)],
      whyAway,
      whyToward,
      whyStayed,
      preservedConstraints,
      evidence,
      acceptedChange,
      alternatives,
      limitations: [...new Set(limitations)],
      evidenceIds,
    };
  });

  // Changed first, then choices that are unresolved or held by a constraint, then the rest.
  const rank = (d: DecisionExplanation) => (d.changed ? 0 : d.revised.status !== "supported" || d.userChoice?.locked ? 1 : 2);
  return rows
    .sort((x, y) => rank(x) - rank(y) || SLOTS.indexOf(x.slot) - SLOTS.indexOf(y.slot))
    .map((d, i) => ({ ...d, sequence: i + 1 }));
}

export function summarizeRun(state: RunState): RunSummary | null {
  const cmp = comparePlans(state);
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  if (!cmp || !first || !last) return null;
  const decisions = buildDecisions(state);
  const changed = decisions.filter((d) => d.changed).length;
  const total = decisions.length;
  const userSpecified = new Set(state.brief.existingChoices.map((c) => c.slot)).size;
  const bC = first.contradicted;
  const lC = last.contradicted;
  const hard = state.brief.constraints.some((c) => c.kind === "hard");
  const safe = hard && last.hardConstraintViolations.length === 0 ? ", without breaking the rules you fixed" : "";
  const n = Math.abs(cmp.supportedDelta);
  const k = Math.abs(cmp.contradictedDelta);
  const detail: Record<ComparisonOutcome, string> = {
    agent:
      cmp.decidedBy === "hard_constraints"
        ? "The revised plan breaks fewer of your hard rules."
        : cmp.decidedBy === "contradicted"
          ? `The revised plan has ${plural(k, "fewer choice")} the evidence contradicts${safe}.`
          : cmp.decidedBy === "supported"
            ? `The revised plan has ${plural(n, "more supported choice")}${safe}.`
            : cmp.decidedBy === "coverage"
              ? "More of the revised plan's choices have adequate evidence."
              : "The revised plan's app-defined score is materially higher; this is not a forecast.",
    baseline: "The LLM completion is better supported than the revision on the recorded evidence.",
    mixed: "Mixed result: each plan is better supported on different choices.",
    insufficient_evidence: "There isn't enough Qloo evidence to say which plan is better supported.",
    same: "No choice changed: nothing was contradicted and no better-supported option was found.",
  };
  return {
    outcome: cmp.outcome,
    changed,
    retained: total - changed,
    total,
    userSpecified,
    llmAdded: total - userSpecified,
    baselineSupported: first.supported,
    revisedSupported: last.supported,
    baselineContradicted: bC,
    revisedContradicted: lC,
    headline: `${plural(changed, "choice")} changed. ${total - changed} retained.`,
    detail: detail[cmp.outcome],
  };
}

/** The user context every stage shares: shown once, not as plan choices. */
export function briefConstants(state: RunState): BriefConstant[] {
  const b = state.brief;
  const out: BriefConstant[] = [
    { label: "Market", value: state.marketLabel },
    { label: "Audience", value: b.audienceDescription },
    { label: "Goal", value: b.launchGoal },
  ];
  if (b.brandAttributes.length) out.push({ label: "Brand", value: b.brandAttributes.join(", ") });
  const rules = b.constraints.filter((c) => c.kind === "hard" && !c.lockSlot).map((c) => c.description);
  if (rules.length) out.push({ label: "Rules", value: rules.join(" · ") });
  return out;
}

export const changeCount = (state: RunState) => buildDecisions(state).filter((d) => d.changed).length;

/** What the agent did, counted from the recorded run only. Nothing is estimated. */
export interface AgentReceipt {
  choicesTested: number;
  /** Every candidate tried, kept or not; each one was a full-plan re-test. */
  alternativesTested: number;
  accepted: number;
  retained: number;
  qlooCalls: number;
  evidenceRecords: number;
  hardConstraints: number;
  constraintsPreserved: number;
  repairRounds: number;
  /** The run's own timestamp, as "22 Oct 2026" (UTC). */
  date: string;
  lines: string[];
}

const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);

export function agentReceipt(state: RunState, recorded: boolean): AgentReceipt | null {
  const last = state.evaluations.at(-1);
  if (!last) return null;
  const decisions = buildDecisions(state);
  const accepted = decisions.filter((d) => d.changed).length;
  const hard = state.brief.constraints.filter((c) => c.kind === "hard").length;
  const preserved = Math.max(0, hard - last.hardConstraintViolations.length);
  const at = state.finishedAt ?? state.startedAt;
  const date = at ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(at)) : "";
  const r = {
    choicesTested: decisions.length,
    alternativesTested: state.changes.length,
    accepted,
    retained: decisions.length - accepted,
    qlooCalls: state.qlooCallsUsed,
    evidenceRecords: state.evidenceLedger.length,
    hardConstraints: hard,
    constraintsPreserved: preserved,
    repairRounds: state.currentIteration,
    date,
  };
  const second = [
    `${r.qlooCalls} Qloo ${r.qlooCalls === 1 ? "query" : "queries"}`,
    hard ? (preserved === hard ? `${plural(hard, "constraint")} preserved` : `${preserved} of ${hard} constraints preserved`) : "",
    r.alternativesTested ? `full plan re-tested ${times(r.alternativesTested)}` : "no re-test needed",
  ].filter(Boolean);
  return {
    ...r,
    lines: [
      `${plural(r.choicesTested, "choice")} tested · ${plural(r.alternativesTested, "alternative")} tried · ${r.accepted} accepted · ${r.retained} retained`,
      second.join(" · "),
      `${recorded ? "Recorded run" : "Live run"}${date ? ` · ${date}` : ""}`,
    ],
  };
}
