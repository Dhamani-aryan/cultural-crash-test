import { z } from "zod";
import { CONTROL_COUNT, GLOBAL_PRESENCE, cityList, isLocalOrigin } from "@/lib/engine/equivalents";
import { isForeignOrigin } from "@/lib/engine/origin";
import { categoryTags, kindLabel, roleSimilarity, roleTags } from "@/lib/engine/role";
import { mapLimit, nameKey } from "@/lib/engine/stats";
import { generateStructured } from "@/lib/llm/structured";
import type { LlmClient } from "@/lib/llm/types";
import { CONTROL_LOCATIONS, SOURCE_LOCATIONS, type Domain } from "@/lib/markets";
import type { QlooEntity } from "@/lib/qloo";
import { LIST_SIZE, tagList, type GatherContext } from "./gather";
import { itemsFrom, sanitizeInsights } from "./ledger";
import { briefText, findInMarket, findPlace, toRef } from "./plan";
import {
  SLOT_LABEL,
  SLOT_TYPE,
  type Component,
  type ComponentAssessment,
  type CulturalPlan,
  type LaunchBrief,
  type Slot,
} from "./types";

/**
 * Targeted repair: research replacements for ONE weak component in Qloo, screen them, and let
 * the model choose among the survivors only. Code checks that the choice is one of them.
 */

export const SHORTLIST = 6;
const SCREEN = 40;
/** Candidates re-tested per round, in the model's order, before the round gives up. */
export const MAX_TRIALS = 3;

export interface Candidate {
  entity: QlooEntity;
  /** Rank under `anchors + other choices + city`: fit with the audience and the plan. */
  fitRank: number;
  local: boolean;
  localWhy: string;
  role: number;
  sharedRole: string[];
  score: number;
}

export interface RepairProposal {
  slot: Slot;
  after: Component;
  reason: string;
  expectedEffect: string;
  evidenceIds: string[];
  /** Shown in the trace: what else was considered. */
  considered: string[];
}

const domainOf = (slot: Slot): Domain =>
  slot === "artist_music" ? "artist" : slot === "brand_collaboration" ? "brand" : "place";

/** Cheap locality screen with the original's category lists (already cached by the evaluation). */
async function screen(
  ctx: GatherContext,
  domain: Domain,
  category: string[],
  entities: QlooEntity[],
): Promise<Map<string, { local: boolean; why: string }>> {
  const controls = CONTROL_LOCATIONS.filter((c) => c !== ctx.market.qlooLocation).slice(0, CONTROL_COUNT);
  const cities = [ctx.market.qlooLocation, ...controls, ...SOURCE_LOCATIONS];
  const lists = await mapLimit(cities, 3, (city) => cityList(ctx.client, domain, city, category));
  const key = (e: QlooEntity) => (domain === "place" ? nameKey(e.name) : e.id);
  const out = new Map<string, { local: boolean; why: string }>();
  for (const e of entities) {
    const me = key(e);
    const inCity = lists[0].some((x) => key(x) === me);
    const controlHits = lists.slice(1, 1 + controls.length).filter((l) => l.some((x) => key(x) === me)).length;
    const inSource = lists.slice(1 + controls.length).some((l) => l.some((x) => key(x) === me));
    const fromHere = isLocalOrigin(e, domain, ctx.market);
    const foreign = domain !== "place" && isForeignOrigin(e, ctx.market.country);
    let local: boolean;
    let why: string;
    if (domain === "place") {
      local = fromHere;
      why = inCity ? "one of the city's distinctive venues" : "in the city";
    } else if (fromHere) {
      local = true;
      why = "from here";
    } else if (foreign) {
      local = false;
      why = "from another country";
    } else if (inCity && controlHits < GLOBAL_PRESENCE && !inSource) {
      local = true;
      why = "distinctive here";
    } else {
      local = false;
      why = inCity ? "just as big elsewhere" : "not in the city's own list";
    }
    out.set(e.id, { local, why });
  }
  return out;
}

/** "38 from another country, 2 just as big elsewhere" */
export function screenSummary(candidates: Pick<Candidate, "localWhy">[]): string {
  const counts = new Map<string, number>();
  for (const c of candidates) counts.set(c.localWhy, (counts.get(c.localWhy) ?? 0) + 1);
  return `of the top ${candidates.length} for this audience, ${[...counts].map(([why, n]) => `${n} ${why}`).join(", ")}`;
}

/** Venues a launch event can't be held in, whatever the audience data says. */
const UNSUITABLE_VENUE =
  /:(hotel|motel|hostel|resort|lodging|bed_and_breakfast|apartment|serviced_apartment|outlet|factory_outlet|outlet_store|self_storage|storage|airport|hospital|clinic|car_rental|gas_station|parking)$/;

/**
 * The same job as the original: a brand from the same kind of business (shared genre tags), a
 * venue of the kind the plan asked for and able to host an event. Artists need no gate.
 */
export function roleFits(
  slot: Slot,
  candidate: { tags: { id: string; type: string | null }[] },
  original: { tags: { id: string; type: string | null }[] } | null,
  placeCategory: string | null,
): boolean {
  if (slot === "event_place") {
    const cats = candidate.tags.filter((t) => t.id.startsWith("urn:tag:category:place:")).map((t) => t.id);
    if (cats.some((c) => UNSUITABLE_VENUE.test(c))) return false;
    return !placeCategory || cats.includes(placeCategory);
  }
  if (slot === "brand_collaboration" && original) {
    const genres = new Set(categoryTags(original as never, "brand"));
    if (!genres.size) return true;
    return categoryTags(candidate as never, "brand").some((g) => genres.has(g));
  }
  return true;
}

const tagNames = (e: QlooEntity, prefix: string) =>
  e.tags.filter((t) => t.id.startsWith(prefix) && t.name).map((t) => t.name!).slice(0, 3);

// ---------- candidate sources ----------

const proposeSchema = z.object({
  names: z.array(z.string()).describe("up to 6 real names, exactly as usually written"),
});

/**
 * The model's own candidates. Qloo's lists rank what is distinctive for the audience, which can
 * miss the obvious right answer for the job; the model knows what does the job. Every name it
 * gives is looked up and scored in Qloo like any other candidate, and dropped if Qloo can't
 * find it or shows no affinity for it.
 */
async function proposeNames(input: {
  llm: LlmClient;
  ctx: GatherContext;
  brief: LaunchBrief;
  slot: Exclude<Slot, "creative_direction">;
  current: Component;
  finding: string;
  avoid: string[];
}): Promise<string[]> {
  const { ctx } = input;
  const what =
    input.slot === "artist_music"
      ? "music acts (artists or DJs) who could headline this launch"
      : input.slot === "brand_collaboration"
        ? "brands that would make a credible collaboration partner for this product"
        : `venues in ${ctx.market.label} that could host this launch event`;
  const { data } = await generateStructured(input.llm, {
    schema: proposeSchema,
    system: `You are a cultural strategist who lives in ${ctx.market.label}. Name up to 6 real ${what}. Prefer ones from ${ctx.market.label}'s own scene that this audience follows, over global defaults. Exact names only.`,
    prompt: [
      briefText(input.brief, ctx.market),
      `Current ${SLOT_LABEL[input.slot].toLowerCase()}: ${input.current.label}. Why it is being replaced: ${input.finding}`,
      input.avoid.length ? `Don't suggest: ${input.avoid.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    label: `propose:${input.slot}`,
  });
  return data.names.slice(0, 6);
}

const rankSchema = z.object({
  choices: z
    .array(
      z.object({
        id: z.string().describe("a candidate's id, copied exactly"),
        reason: z.string().describe("one or two sentences citing the evidence given"),
        expectedEffect: z
          .string()
          .describe("which test should improve in the re-test (audience affinity, local relevance or fit with the plan)"),
      }),
    )
    .describe("up to 3 candidates, best first; empty when none can do the job"),
  none: z.string().optional().describe("when choices is empty: why no candidate fits the role"),
});

const PICK_SYSTEM = `You repair one weak choice in a launch plan. Rank up to 3 candidates, best first, that credibly do the same job for this brand: a venue that can host this launch, a partner brand that makes sense for this product, an act that suits the event and audience. Prefer what a local expert would actually pick, among candidates with strong evidence. If none can do the job, return no choices and say why: a forced bad fit is worse than an open question. Use only the evidence given; never predict sales, engagement or attendance. Copy ids exactly.`;

export async function repairEntity(input: {
  llm: LlmClient;
  ctx: GatherContext;
  brief: LaunchBrief;
  plan: CulturalPlan;
  slot: Exclude<Slot, "creative_direction">;
  assessment: ComponentAssessment;
  rejected: string[];
  /**
   * Upgrade a choice the evidence doesn't contradict but only thinly supports. Candidates (the
   * agent's suggestions and the audience list alike) must be from the city's own country: an
   * upgrade must be a sensible local pick, not merely a higher-scoring import.
   */
  upgrade?: boolean;
}): Promise<RepairProposal[]> {
  const { ctx, plan, slot, brief } = input;
  const current = plan.components.find((c) => c.slot === slot)!;
  const domain = domainOf(slot);
  const place = slot === "event_place";
  const others = plan.components.filter((c) => c.slot !== slot && c.entity).map((c) => c.entity!.id);
  const signal = [...plan.anchors.map((a) => a.id), ...others];
  const bannedNames = [
    ...brief.constraints.flatMap((c) => (c.kind === "hard" ? (c.excludeNames ?? []) : [])),
    ...input.rejected,
    ...plan.anchors.map((a) => a.name),
    ...plan.components.flatMap((c) => (c.entity ? [c.entity.name] : [])),
    current.label,
  ];
  const banned = new Set(bannedNames.map(nameKey));
  const allowed = (e: QlooEntity) => !banned.has(nameKey(e.name)) && !banned.has(nameKey(e.displayName));

  // Source 1: what this audience, with the rest of the plan, has affinity for in the city.
  const query = {
    filterType: SLOT_TYPE[slot],
    signalEntities: signal,
    signalLocationQuery: place ? undefined : ctx.market.qlooLocation,
    filterLocationQuery: place ? ctx.market.qlooLocation : undefined,
    filterTags: place && current.placeCategory ? [current.placeCategory] : undefined,
    excludeEntities: current.entity ? [current.entity.id] : undefined,
    explainability: true,
    take: LIST_SIZE,
  };
  const result = await ctx.client.getInsights(query);
  const record = ctx.ledger.add({
    purpose: `Find ${SLOT_LABEL[slot].toLowerCase()} candidates that fit this audience and the rest of the plan in ${ctx.market.label}`,
    queryKind: "insights",
    sanitizedRequest: sanitizeInsights(query),
    qlooEntityIds: signal,
    results: itemsFrom(result),
    resultCount: result.entities.length,
    coverageStatus: result.entities.length >= 10 ? "usable" : result.entities.length ? "partial" : "empty",
    warnings: [],
  });
  const listAff = result.entities.map((e) => e.affinity ?? 0);
  const rankOf = (aff: number) => 1 + listAff.filter((a) => a > aff).length;

  // Source 2: the agent's own suggestions, found and scored in Qloo under the same signal.
  const names = await proposeNames({
    llm: input.llm,
    ctx,
    brief,
    slot,
    current,
    finding: input.assessment.finding,
    avoid: bannedNames,
  }).catch(() => [] as string[]);
  const found = await mapLimit(names, 3, (n) =>
    (place
      ? findPlace(ctx.client, n, ctx.market)
      : findInMarket(ctx.client, n, [domain as "artist" | "brand"], ctx.market)
    ).catch(() => null),
  );
  const proposals = found.filter((e): e is QlooEntity => e !== null && allowed(e));
  const proposalFit = new Map<string, { affinity: number; rank: number }>();
  let proposalRecordId: string | null = null;
  if (proposals.length) {
    const scoring = {
      ...query,
      filterTags: undefined,
      excludeEntities: undefined,
      resultEntities: proposals.map((e) => e.id),
      take: proposals.length,
    };
    const scored = await ctx.client.getInsights(scoring);
    for (const e of scored.entities)
      if (e.affinity !== null) proposalFit.set(e.id, { affinity: e.affinity, rank: rankOf(e.affinity) });
    proposalRecordId = ctx.ledger.add({
      purpose: `Score the agent's own ${SLOT_LABEL[slot].toLowerCase()} suggestions for this audience and plan in ${ctx.market.label}`,
      queryKind: "insights",
      sanitizedRequest: sanitizeInsights(scoring),
      qlooEntityIds: proposals.map((e) => e.id),
      results: itemsFrom(scored),
      resultCount: scored.entities.length,
      coverageStatus: scored.entities.length ? "usable" : "empty",
      warnings: [
        ...names.filter((_, i) => !found[i]).map((n) => `"${n}" isn't in Qloo.`),
        ...proposals.filter((e) => !proposalFit.has(e.id)).map((e) => `No affinity returned for ${e.displayName}.`),
      ],
    }).evidenceId;
  }

  const fromList = result.entities.filter(allowed).slice(0, SCREEN);
  const seen = new Set<string>();
  const pool: { e: QlooEntity; rank: number; proposed: boolean }[] = [];
  for (const p of [
    ...proposals.filter((e) => proposalFit.has(e.id)).map((e) => ({ e, rank: proposalFit.get(e.id)!.rank, proposed: true })),
    ...fromList.map((e) => ({ e: e as QlooEntity, rank: e.rank, proposed: false })),
  ]) {
    if (seen.has(p.e.id)) continue;
    seen.add(p.e.id);
    pool.push(p);
  }
  if (!pool.length) return [];

  // Full records carry the origin and role tags the screen needs.
  const full = await ctx.client.getEntities(pool.map((p) => p.e.id));
  const byId = new Map(full.map((e) => [e.id, e]));
  const records = pool.map((p) => ({ ...p, e: { ...p.e, ...(byId.get(p.e.id) ?? {}) } }));
  const [original] = current.entity ? await ctx.client.getEntities([current.entity.id]) : [];
  const category = original ? categoryTags(original, domain) : [];
  const local = await screen(
    ctx,
    domain,
    category,
    records.map((r) => r.e),
  );
  const originalRole = original ? roleTags(original) : new Map<string, number>();

  const candidates: (Candidate & { proposed: boolean })[] = records.map(({ e, rank, proposed }) => {
    const l = { ...local.get(e.id)! };
    // The agent's venue suggestions may be of another kind than the draft's; only unsuitable venues are out.
    const roleOk = roleFits(slot, e, original ?? null, proposed ? null : current.placeCategory);
    // An upgrade replaces a choice nothing contradicts, so it must be a local pick: from the
    // city's own country (venues: in it), whoever suggested it.
    const upgradeOk = !input.upgrade || isLocalOrigin(e, domain, ctx.market);
    const fits = roleOk && upgradeOk;
    if (!roleOk) l.why = place ? "not a venue of the planned kind" : "a different kind of business";
    else if (!upgradeOk) l.why = "not from here (an upgrade must be a local pick)";
    const role = original ? roleSimilarity(originalRole, roleTags(e)) : { score: 0, shared: [] as string[] };
    const shared = role.shared.map((id) => kindLabel(id) ?? e.tags.find((t) => t.id === id)?.name ?? id);
    const fit = Math.max(0, 1 - (rank - 1) / LIST_SIZE);
    return {
      entity: e,
      fitRank: rank,
      local: l.local && fits,
      localWhy: l.why,
      role: role.score,
      sharedRole: shared,
      proposed,
      score: 0.5 * fit + 0.3 * role.score + (l.local ? 0.2 : 0),
    };
  });
  const shortlist = candidates
    .filter((c) => c.local)
    .sort((a, b) => b.score - a.score)
    .slice(0, SHORTLIST);
  const screenRecord = ctx.ledger.add({
    purpose: `Screen candidates for locality in ${ctx.market.label} and for the same job as ${current.label}`,
    queryKind: "locality",
    sanitizedRequest: {
      method: `${ctx.market.label}'s own top list vs 4 other world cities and 4 US cities, plus origin data and the role check`,
      candidates: records.map((r) => r.e.id),
    },
    qlooEntityIds: records.map((r) => r.e.id),
    results: shortlist.map((c) => ({
      id: c.entity.id,
      name: c.entity.displayName,
      rank: c.fitRank,
      popularity: c.entity.popularity ?? undefined,
    })),
    resultCount: candidates.length,
    coverageStatus: shortlist.length ? "usable" : "empty",
    warnings: shortlist.length ? [] : [`No candidate passed the screen: ${screenSummary(candidates)}.`],
  });
  if (!shortlist.length) return [];

  const lines = shortlist.map(
    (c) =>
      `id ${c.entity.id}: ${c.entity.displayName}${c.proposed ? " (your suggestion, scored by Qloo)" : ""} — #${c.fitRank} for this audience with the plan in ${ctx.market.label}; ${c.localWhy}` +
      (c.sharedRole.length ? `; same role: ${c.sharedRole.slice(0, 4).join(", ")}` : "") +
      (place ? `; kind: ${tagNames(c.entity, "urn:tag:category:place:").join(", ")}` : "") +
      (slot === "brand_collaboration" ? `; business: ${tagNames(c.entity, "urn:tag:genre:brand").join(", ")}` : "") +
      (c.entity.shortDescription ? `; ${c.entity.shortDescription}` : ""),
  );
  const { data } = await generateStructured(input.llm, {
    schema: rankSchema,
    system: PICK_SYSTEM,
    prompt: [
      briefText(brief, ctx.market),
      `Weak choice — ${SLOT_LABEL[slot]}: ${current.label}. Finding: ${input.assessment.finding}`,
      `Candidates (all checked in Qloo):\n${lines.join("\n")}`,
    ].join("\n\n"),
    label: `repair:${slot}`,
  });
  if (!data.choices.length) {
    ctx.ledger.add({
      purpose: `The model judged that none of the screened candidates can do the job of the ${SLOT_LABEL[slot].toLowerCase()}`,
      queryKind: "locality",
      sanitizedRequest: { candidates: shortlist.map((c) => c.entity.id) },
      qlooEntityIds: shortlist.map((c) => c.entity.id),
      results: shortlist.map((c) => ({ id: c.entity.id, name: c.entity.displayName })),
      resultCount: shortlist.length,
      coverageStatus: "empty",
      warnings: [
        `No candidate passed the screen: the model found none fit the role (${(data.none ?? "no reason given").replace(/\.$/, "")}).`,
      ],
    });
    return [];
  }
  // Only ids from the shortlist count; an unknown id falls back to the top-ranked candidate.
  const picks = data.choices.flatMap((ch) => {
    const c = shortlist.find((x) => x.entity.id === ch.id.trim());
    return c ? [{ c, reason: ch.reason, expectedEffect: ch.expectedEffect }] : [];
  });
  if (!picks.length)
    picks.push({
      c: shortlist[0],
      reason: "Top-ranked screened candidate (the model's pick wasn't on the list).",
      expectedEffect: data.choices[0].expectedEffect,
    });
  const evidenceIds = [record.evidenceId, ...(proposalRecordId ? [proposalRecordId] : []), screenRecord.evidenceId];
  return picks.slice(0, MAX_TRIALS).map(({ c, reason, expectedEffect }) => ({
    slot,
    after: {
      slot,
      label: c.entity.displayName,
      origin: "agent_repair",
      locked: false,
      resolution: "resolved",
      entity: toRef(c.entity),
      tags: [],
      placeCategory: place ? ((c.proposed ? categoryOfVenue(c.entity) : null) ?? current.placeCategory) : null,
    },
    reason: c.proposed ? `${reason} (Suggested by the agent, then scored in Qloo.)` : reason,
    expectedEffect,
    evidenceIds,
    considered: shortlist.map((x) => x.entity.displayName),
  }));
}

/** The first suitable category a venue is filed under, to test it among venues of its own kind. */
function categoryOfVenue(e: QlooEntity): string | null {
  return (
    e.tags
      .map((t) => t.id)
      .find((id) => id.startsWith("urn:tag:category:place:") && !UNSUITABLE_VENUE.test(id)) ?? null
  );
}

const directionSchema = z.object({
  tags: z.array(z.string()).describe("1-3 words copied exactly from the list"),
  direction: z.string().describe("the revised creative direction in a few words"),
  reason: z.string().describe("one or two sentences citing the ranks given"),
  expectedEffect: z.string().describe("which test should improve in the re-test, in one line; no predictions of sales or engagement"),
});

export async function repairDirection(input: {
  llm: LlmClient;
  ctx: GatherContext;
  brief: LaunchBrief;
  plan: CulturalPlan;
  assessment: ComponentAssessment;
  /** Keep the direction's intent; replace only the words this audience here doesn't lean to. */
  upgrade?: boolean;
}): Promise<RepairProposal | null> {
  const { ctx, plan } = input;
  const current = plan.components.find((c) => c.slot === "creative_direction")!;
  const anchors = plan.anchors.map((a) => a.id);
  if (!anchors.length) return null;
  const lists = await tagList(ctx, anchors, ctx.market.qlooLocation, `What this audience in ${ctx.market.label} leans to`);
  const options = lists.flatMap(({ tags }) => tags.slice(0, 15));
  if (!options.length) return null;
  const { data } = await generateStructured(input.llm, {
    schema: directionSchema,
    system:
      "Revise a launch's creative direction so it matches what the audience in this city leans to, while keeping the brand's attributes. Choose 1-3 words from the list only, copied exactly, ordered by fit." +
      (input.upgrade
        ? " Keep the current direction's intent: keep any current word that is on the list, and replace only the ones that aren't."
        : ""),
    prompt: [
      briefText(input.brief, ctx.market),
      `Current direction: "${current.label}" (${current.tags.map((t) => t.name).join(", ")}). Finding: ${input.assessment.finding}`,
      `This audience's top aesthetics and tones in ${ctx.market.label}, strongest first:\n${options.map((t) => t.name).join(", ")}`,
    ].join("\n\n"),
    label: "repair:direction",
  });
  const byName = new Map(options.map((t) => [nameKey(t.name), t]));
  const tags = data.tags.flatMap((n) => byName.get(nameKey(n)) ?? []).slice(0, 3);
  if (!tags.length) return null;
  return {
    slot: "creative_direction",
    after: {
      ...current,
      label: data.direction,
      origin: "agent_repair",
      tags: tags.map((t) => ({ id: t.id, name: t.name })),
      resolution: "resolved",
    },
    reason: data.reason,
    expectedEffect: data.expectedEffect,
    evidenceIds: lists.map((l) => l.record.evidenceId),
    considered: options.slice(0, 8).map((t) => t.name),
  };
}

/** Swap one component; every other component stays exactly as it was. */
export function applyRepair(plan: CulturalPlan, p: RepairProposal): CulturalPlan {
  return { ...plan, components: plan.components.map((c) => (c.slot === p.slot ? p.after : c)) };
}
