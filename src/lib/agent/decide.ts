import { z } from "zod";
import type { Equivalent, EquivalentsResult } from "@/lib/engine/equivalents";
import { generateStructured } from "@/lib/llm/structured";
import type { LlmClient } from "@/lib/llm/types";
import { DOMAINS, DOMAIN_LABEL, type Domain, type Market } from "@/lib/markets";
import type { Decision, ResolvedReference } from "./types";

/**
 * The agent's judgement step. The engine ranks candidates on data; the model reads them in the
 * context of the sentence and decides, per reference: swap to one of the listed candidates,
 * keep the original, flag it for a human, or search another kind of culture once. It can only
 * point at candidates by ID, never name something new.
 */

const schema = z.object({
  decisions: z.array(
    z.object({
      ref: z.string(),
      action: z.enum(["swap", "keep", "flag", "try_domain"]),
      candidate: z.string().optional().describe("candidate ID such as R1.2, for swap"),
      domain: z.enum(DOMAINS).optional().describe("for try_domain"),
      reason: z.string().min(3).max(300).describe("one plain sentence a marketer would understand"),
    }),
  ),
});

const SYSTEM = `You are a senior transcreator adapting American copy for a specific city. For each cultural reference you get a short list of local candidates found in Qloo's taste data, with evidence: what each one is, which role tags it shares with the original, how distinctive it is in the city, and whether its audience matches.

Decide for each reference:
- "swap": choose the candidate that does the same job in this sentence for a local reader. Fit the sentence: a food comparison needs something people eat, a "the X of Y" comparison needs something famous enough to be shorthand. Prefer recognisable over obscure.
- "keep": only when the reference is functional rather than cultural (a device, app or platform the product actually works with, like "works with your iPhone"), or when no candidate does the job and the original is known in this city or worldwide. Being famous everywhere is not a reason to keep: readers notice American references, and the point is to sound local. Never swap a functional reference.
- "flag": no candidate carries the meaning; a human should rewrite the line.
- "try_domain": the meaning would travel better through another kind of culture (e.g. no local sitcom fits, but a local snack brand would). Name the domain. Only use this when the current candidates clearly don't work.

Rules: only choose candidate IDs that are listed for that reference. Never suggest names that aren't listed. Return exactly one decision per reference, using its ID as given (R1, R2…). One plain sentence of reasoning each, in English, citing the evidence.`;

function describeCandidate(id: string, e: Equivalent): string {
  const bits = [
    `${id}: ${e.entity.displayName}${e.proposed ? " (your suggestion, confirmed local in Qloo)" : ""}`,
    e.entity.shortDescription ?? e.entity.description?.slice(0, 160),
    e.sharedTags.length ? `shares: ${e.sharedTags.join(", ")}` : "shares no role tags",
    `#${e.localRank} of ${e.poolSize} in this city's list`,
    e.alsoIn.length ? `also distinctive in ${e.alsoIn.join(", ")}` : "distinctive here only",
    e.parts.audience === null ? null : `audience match ${Math.round(e.parts.audience * 100)}%`,
  ];
  return bits.filter(Boolean).join(" · ");
}

export interface DecideInput {
  text: string;
  market: Market;
  references: ResolvedReference[];
  equivalents: Map<string, EquivalentsResult>;
  /** Domains already tried per ref, so a second round can't loop. */
  allowTryDomain: boolean;
}

export interface RawDecision {
  ref: string;
  action: "swap" | "keep" | "flag" | "try_domain";
  candidate?: string;
  domain?: Domain;
  reason: string;
}

export function buildDecidePrompt(input: DecideInput): string {
  const blocks = input.references.map((r) => {
    const eq = input.equivalents.get(r.ref);
    const anchor = r.entity
      ? `${r.entity.displayName} (${DOMAIN_LABEL[r.domain!] ?? r.domain}): ${r.entity.shortDescription ?? r.entity.description?.slice(0, 200) ?? ""}`
      : "not found";
    const candidates =
      eq && eq.equivalents.length
        ? eq.equivalents.map((e, i) => "  " + describeCandidate(`${r.ref}.${i + 1}`, e)).join("\n")
        : `  (no candidates: ${eq?.confidence === "off" ? `Qloo's data for ${DOMAIN_LABEL[r.domain!]} in this city is too thin` : "nothing local passed the checks"})`;
    const known = eq?.anchor.global
      ? "known worldwide"
      : eq?.anchor.inCity
        ? "already in this city's taste list"
        : "not especially known in this city";
    const dropped = eq?.rejected.filter((x) => x.proposed).map((x) => x.name) ?? [];
    const droppedLine = dropped.length
      ? `\n  (your suggestions that failed Qloo's local checks: ${dropped.join(", ")})`
      : "";
    return `${r.ref} "${r.surface}" — job: ${r.job}\n  original: ${anchor} · ${known}\n${candidates}${droppedLine}`;
  });
  return [
    `City: ${input.market.label} (${input.market.language}).`,
    `Text:\n"""\n${input.text}\n"""`,
    `References:\n${blocks.join("\n\n")}`,
    input.allowTryDomain
      ? `You may use try_domain once per reference (domains: ${DOMAINS.join(", ")}).`
      : "try_domain is not available in this round.",
  ].join("\n\n");
}

export async function decide(llm: LlmClient, input: DecideInput): Promise<RawDecision[]> {
  if (input.references.length === 0) return [];
  const { data } = await generateStructured(llm, {
    schema,
    system: SYSTEM,
    prompt: buildDecidePrompt(input),
    label: `decide:${input.market.id}`,
  });
  return data.decisions;
}

/**
 * Turn the model's raw decisions into checked ones: candidate IDs must belong to the
 * reference, unknown refs are ignored, and a reference the model skipped is flagged.
 */
export function applyDecisions(
  references: ResolvedReference[],
  raw: RawDecision[],
  equivalents: Map<string, EquivalentsResult>,
  allowTryDomain: boolean,
): { decisions: Decision[]; tryDomain: { ref: string; domain: Domain }[] } {
  // Models sometimes echo IDs loosely ("r1", "R1 \"Chipotle\"", "R1.2" as the ref), so match on
  // the number. Candidate IDs are read the same way: the number after the reference's.
  const refNumber = (s: string | undefined) => s?.match(/R?\s*(\d+)/i)?.[1];
  const byRef = new Map(raw.map((d) => [`R${refNumber(d.ref)}`, d]));
  const decisions: Decision[] = [];
  const tryDomain: { ref: string; domain: Domain }[] = [];
  for (const r of references) {
    const eq = equivalents.get(r.ref);
    const options = eq?.equivalents ?? [];
    const d = byRef.get(r.ref);
    const base = {
      ref: r.ref,
      domain: eq?.domain ?? r.domain,
      confidence: eq?.confidence ?? null,
      triedDomain: null,
      dropped: (eq?.rejected ?? [])
        .filter((x) => x.proposed)
        .map((x) => ({ name: x.name, reason: x.reason })),
    };
    if (!r.entity) {
      decisions.push({
        ...base,
        action: "flag",
        choice: null,
        alternatives: [],
        reason: r.note ?? "Not found in Qloo.",
      });
      continue;
    }
    if (!d) {
      decisions.push({
        ...base,
        action: "flag",
        choice: null,
        alternatives: options,
        reason: "No decision was made for this reference.",
      });
      continue;
    }
    if (d.action === "try_domain") {
      if (allowTryDomain && d.domain && d.domain !== eq?.domain) {
        tryDomain.push({ ref: r.ref, domain: d.domain });
        continue;
      }
      decisions.push({
        ...base,
        action: "flag",
        choice: null,
        alternatives: options,
        reason: d.reason,
      });
      continue;
    }
    if (d.action === "swap") {
      const parts = d.candidate?.match(/R?\s*(\d+)\D+(\d+)/i);
      const index = parts && `R${parts[1]}` === r.ref ? Number(parts[2]) - 1 : -1;
      const choice = options[index];
      if (!choice) {
        decisions.push({
          ...base,
          action: "flag",
          choice: null,
          alternatives: options,
          reason: `The agent picked a candidate that wasn't offered (${d.candidate ?? "none"}), so this is left for review.`,
        });
        continue;
      }
      decisions.push({
        ...base,
        action: "swap",
        choice,
        alternatives: options.filter((o) => o !== choice),
        reason: d.reason,
      });
      continue;
    }
    decisions.push({
      ...base,
      action: d.action,
      choice: null,
      alternatives: options,
      reason: d.reason,
    });
  }
  return { decisions, tryDomain };
}
