import { nameKey } from "@/lib/engine/stats";
import type { LlmClient } from "@/lib/llm/types";
import type { InsightsInput, InsightsResult, InsightsTag, QlooClient, QlooEntity } from "@/lib/qloo";
import { entity, tag } from "../engine/helpers";

/**
 * A small synthetic Qloo world for crash-test runs (names are made up; no real responses).
 * London audience of two streetwear anchors; a US rapper the audience doesn't follow there,
 * a local rapper it does, a local brand, a venue, and aesthetic tags.
 */

const T = {
  artist: "urn:entity:artist",
  brand: "urn:entity:brand",
  place: "urn:entity:place",
};

export const W = {
  anchorA: entity("a1", { name: "Northcap", type: T.brand }),
  anchorB: entity("a2", { name: "Deckhouse", type: T.brand }),
  usRapper: entity("us1", { name: "Big Tex", type: T.artist, shortDescription: "American rapper.", popularity: 0.999 }),
  localRapper: entity("uk1", { name: "Grey Lane", type: T.artist, shortDescription: "British rapper from Northampton." }),
  otherUs: entity("us2", { name: "Coast Kid", type: T.artist, shortDescription: "American singer." }),
  localBrand: entity("b1", { name: "Mossgrove", type: T.brand, shortDescription: "Streetwear label" }),
  altBrand: entity("b2", { name: "Fieldnote", type: T.brand, shortDescription: "Workwear label" }),
  venue: entity("p1", {
    name: "Yard Market",
    type: T.place,
    geocode: { city: "London", metro: null, countryCode: "GB", latitude: null, longitude: null },
    tags: [tag("urn:tag:category:place:event_venue", "urn:tag:category:place", "Event venue")],
  }),
};

const tagsOf = (names: string[]): InsightsTag[] =>
  names.map((n, i) => ({
    id: `urn:tag:aesthetic_property:qloo:${nameKey(n)}`,
    name: n,
    subtype: "urn:tag:aesthetic_property:qloo",
    popularity: 0.9,
    affinity: 0.99 - i * 0.01,
    rank: i + 1,
  }));

export interface WorldOptions {
  /** Artists the repair query returns (default: the local rapper, then another US act). */
  artistCandidates?: QlooEntity[];
  /** Fail every Insights call with this error. */
  insightsError?: Error;
}

export function worldClient(opts: WorldOptions = {}) {
  const calls: InsightsInput[] = [];
  const all = Object.values(W);
  const anchors = new Set([W.anchorA.id, W.anchorB.id]);
  const asResult = (es: QlooEntity[], tags: InsightsTag[] = []): InsightsResult => ({
    entities: es.map((e, i) => ({
      ...e,
      rank: i + 1,
      affinity: 0.98 - i * 0.01,
      affinityRank: null,
      explainability: { [W.anchorA.id]: 0.6, [W.anchorB.id]: 0.4 },
    })),
    tags,
    aggregateExplainability: null,
    durationMs: null,
  });

  const client: QlooClient = {
    async searchEntities({ query, types }) {
      const q = nameKey(query.replace(/ London$/, ""));
      return all
        .filter((e) => nameKey(e.name) === q && (!types || types.includes(e.type ?? "")))
        .map((e, i) => ({ ...e, rank: i + 1 }));
    },
    async getEntities(ids) {
      return all.filter((e) => ids.includes(e.id));
    },
    async getInsights(input) {
      calls.push(input);
      if (opts.insightsError) throw opts.insightsError;
      const loc = input.signalLocationQuery ?? input.filterLocationQuery;
      if (input.filterType === "urn:tag") {
        if (!input.signalEntities?.length) return asResult([]);
        if (loc === "London") return asResult([], tagsOf(["Industrial", "Utilitarian", "Monochrome"]));
        if (loc === "New York City") return asResult([], tagsOf(["Playful", "Pastel Colors", "Industrial"]));
        return asResult([], tagsOf(["Classic"]));
      }
      // Scoring single entities: the US rapper is never returned under London's signal.
      if (input.resultEntities) {
        return asResult(all.filter((e) => input.resultEntities!.includes(e.id) && e !== W.usRapper));
      }
      const exclude = new Set(input.excludeEntities ?? []);
      if (input.signalEntities?.length) {
        if (loc !== "London") return asResult([]);
        const pool =
          input.filterType === T.artist
            ? (opts.artistCandidates ?? [W.localRapper, W.otherUs])
            : input.filterType === T.brand
              ? [W.localBrand, W.altBrand]
              : [W.venue];
        return asResult(pool.filter((e) => !exclude.has(e.id) && !anchors.has(e.id)));
      }
      // Location-only city lists for the locality checks.
      if ((input.page ?? 1) > 1) return asResult([]);
      if (loc === "London") {
        if (input.filterType === T.artist) return asResult([W.localRapper]);
        if (input.filterType === T.brand) return asResult([W.localBrand, W.altBrand]);
        return asResult([W.venue]);
      }
      if (loc === "New York City" && input.filterType === T.artist) return asResult([W.usRapper, W.otherUs]);
      return asResult([]);
    },
    async getDemographics() {
      return [];
    },
    async searchTags() {
      return [];
    },
    async compareProfiles() {
      throw new Error("not used");
    },
  };
  return { client, calls };
}

/** A fake model that answers each step of a crash test by recognising its system prompt. */
export function worldLlm(over: { draft?: Record<string, unknown>; pick?: string; reason?: string } = {}) {
  const prompts: string[] = [];
  const llm: LlmClient = {
    provider: "fake",
    model: "fake",
    async generateText({ system, prompt }) {
      prompts.push(prompt);
      const reply = (x: unknown) => ({ text: typeof x === "string" ? x : JSON.stringify(x), usage: null, model: "fake", ms: 1 });
      if (system.startsWith("You are a brand strategist"))
        return reply({
          anchors: ["Northcap", "Deckhouse"],
          artist: "Big Tex",
          brand: "Mossgrove",
          venue: "Yard Market",
          venueCategory: "event_venue",
          direction: "Industrial and utilitarian",
          assumptions: ["Assumed a one-weekend event."],
          ...over.draft,
        });
      if (system.startsWith("Map a creative direction"))
        return reply({ tags: ["Industrial", "Utilitarian"], note: "Close match." });
      if (system.startsWith("You repair one weak choice"))
        return reply({ id: over.pick ?? W.localRapper.id, reason: over.reason ?? "Ranks first for this audience in London and is from here.", expectedEffect: "Audience affinity found." });
      if (system.startsWith("Revise a launch's creative direction"))
        return reply({ tags: ["Industrial"], direction: "Industrial", reason: "Top here.", expectedEffect: "Supported." });
      if (system.startsWith("Write a 2-3 sentence")) return reply("Verdict from the recorded facts.");
      throw new Error(`no scripted reply for: ${system.slice(0, 50)}`);
    },
  };
  return { llm, prompts };
}

export const LONDON_BRIEF = {
  brandName: "Test Label",
  productCategory: "Streetwear",
  launchGoal: "Pop-up launch",
  marketId: "london",
  audienceDescription: "Streetwear fans in London",
  audienceAnchors: ["Northcap", "Deckhouse"],
  depth: "quick" as const,
};
