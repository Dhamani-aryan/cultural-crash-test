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
import { briefText, categoryOf, toRef } from "./plan";
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

export const SHORTLIST = 5;
const SCREEN = 40;

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

const pickSchema = z.object({
  id: z.string().describe("the chosen candidate's id, copied exactly"),
  reason: z.string().describe("one or two sentences citing the evidence given"),
  expectedEffect: z
    .string()
    .describe("which test should improve in the re-test (audience affinity, local relevance or fit with the plan), in one line"),
});

const PICK_SYSTEM = `You repair one weak choice in a launch plan. Choose the candidate that best keeps the brand's intent while fixing the weakness. Use only the evidence given; never claim anything it doesn't show, and never predict sales, engagement or attendance: the expected effect names which test should improve. Answer with the candidate's id exactly as given.`;

export async function repairEntity(input: {
  llm: LlmClient;
  ctx: GatherContext;
  brief: LaunchBrief;
  plan: CulturalPlan;
  slot: Exclude<Slot, "creative_direction">;
  assessment: ComponentAssessment;
  rejected: string[];
}): Promise<RepairProposal | null> {
  const { ctx, plan, slot, brief } = input;
  const current = plan.components.find((c) => c.slot === slot)!;
  const domain = domainOf(slot);
  const others = plan.components.filter((c) => c.slot !== slot && c.entity).map((c) => c.entity!.id);
  const signal = [...plan.anchors.map((a) => a.id), ...others];
  const banned = new Set(
    [
      ...brief.constraints.flatMap((c) => (c.kind === "hard" ? (c.excludeNames ?? []) : [])),
      ...input.rejected,
      ...plan.anchors.map((a) => a.name),
      ...plan.components.flatMap((c) => (c.entity ? [c.entity.name] : [])),
    ].map(nameKey),
  );
  const place = slot === "event_place";
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
  const pool = result.entities.filter((e) => !banned.has(nameKey(e.name)) && !banned.has(nameKey(e.displayName)));
  if (!pool.length) return null;

  // Full records carry the origin and role tags the screen needs.
  const top = pool.slice(0, SCREEN);
  const full = await ctx.client.getEntities(top.map((e) => e.id));
  const byId = new Map(full.map((e) => [e.id, e]));
  const records = top.map((e) => ({ ...e, ...(byId.get(e.id) ?? {}) }));
  const [original] = current.entity ? await ctx.client.getEntities([current.entity.id]) : [];
  const category = original ? categoryTags(original, domain) : [];
  const local = await screen(ctx, domain, category, records);
  const originalRole = original ? roleTags(original) : new Map<string, number>();

  const candidates: Candidate[] = records.map((e, i) => {
    const l = local.get(e.id)!;
    const role = original ? roleSimilarity(originalRole, roleTags(e)) : { score: 0, shared: [] as string[] };
    const shared = role.shared.map((id) => kindLabel(id) ?? e.tags.find((t) => t.id === id)?.name ?? id);
    return {
      entity: e,
      fitRank: top[i].rank,
      local: l.local,
      localWhy: l.why,
      role: role.score,
      sharedRole: shared,
      score: 0.5 * (1 - (top[i].rank - 1) / LIST_SIZE) + 0.3 * role.score + (l.local ? 0.2 : 0),
    };
  });
  const shortlist = candidates
    .filter((c) => c.local)
    .sort((a, b) => b.score - a.score)
    .slice(0, SHORTLIST);
  const screenRecord = ctx.ledger.add({
    purpose: `Screen candidates for locality in ${ctx.market.label} and for the same role as ${current.label}`,
    queryKind: "locality",
    sanitizedRequest: {
      method: `${ctx.market.label}'s own top list vs 4 other world cities and 4 US cities, plus origin data`,
      candidates: top.map((e) => e.id),
    },
    qlooEntityIds: top.map((e) => e.id),
    results: candidates.slice(0, 10).map((c) => ({ id: c.entity.id, name: c.entity.displayName, rank: c.fitRank, popularity: c.entity.popularity ?? undefined })),
    resultCount: candidates.length,
    coverageStatus: shortlist.length ? "usable" : "empty",
    warnings: shortlist.length ? [] : [`No candidate passed the locality screen: ${screenSummary(candidates)}.`],
  });
  if (!shortlist.length) return null;

  const lines = shortlist.map(
    (c) =>
      `id ${c.entity.id}: ${c.entity.displayName} — #${c.fitRank} for this audience with the plan in ${ctx.market.label}; ${c.localWhy}` +
      (c.sharedRole.length ? `; same role: ${c.sharedRole.slice(0, 4).join(", ")}` : "") +
      (c.entity.shortDescription ? `; ${c.entity.shortDescription}` : ""),
  );
  const { data } = await generateStructured(input.llm, {
    schema: pickSchema,
    system: PICK_SYSTEM,
    prompt: [
      briefText(brief, ctx.market),
      `Weak choice — ${SLOT_LABEL[slot]}: ${current.label}. Finding: ${input.assessment.finding}`,
      `Candidates (all checked in Qloo):\n${lines.join("\n")}`,
    ].join("\n\n"),
    label: `repair:${slot}`,
  });
  const chosen = shortlist.find((c) => c.entity.id === data.id.trim()) ?? shortlist[0];
  const after: Component = {
    slot,
    label: chosen.entity.displayName,
    origin: "agent_repair",
    locked: false,
    resolution: "resolved",
    entity: toRef(chosen.entity),
    tags: [],
    placeCategory: place ? (current.placeCategory ?? categoryOf(chosen.entity, "event_venue")) : null,
  };
  return {
    slot,
    after,
    reason: chosen.entity.id === data.id.trim() ? data.reason : `Top-ranked screened candidate (the model's pick wasn't on the list).`,
    expectedEffect: data.expectedEffect,
    evidenceIds: [record.evidenceId, screenRecord.evidenceId],
    considered: shortlist.map((c) => c.entity.displayName),
  };
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
      "Revise a launch's creative direction so it matches what the audience in this city leans to, while keeping the brand's attributes. Choose 1-3 words from the list only, copied exactly, ordered by fit.",
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
