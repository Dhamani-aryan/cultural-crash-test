import type { Demographics, InsightsInput, QlooClient, QlooEntity } from "@/lib/qloo";

/** A synthetic entity with sensible defaults (names and IDs are made up). */
export function entity(id: string, over: Partial<QlooEntity> = {}): QlooEntity {
  return {
    id,
    name: id,
    displayName: over.name ?? id,
    akas: [],
    releaseCountries: [],
    type: "urn:entity:brand",
    subtype: null,
    description: null,
    shortDescription: null,
    imageUrl: null,
    popularity: 0.5,
    disambiguation: null,
    geocode: null,
    tags: [],
    ...over,
  };
}

export const tag = (id: string, type: string, name = id) => ({ id, name, type });

export function demo(entityId: string, young: number): Demographics {
  return {
    entityId,
    age: {
      "24_and_younger": young,
      "25_to_29": young / 2,
      "30_to_34": 0,
      "35_to_44": -young / 2,
      "45_to_54": -young,
      "55_and_older": -young,
    },
    femaleSkew: 0,
  };
}

/**
 * A fake Qloo client. `lists` maps a location to the entities its location-only query
 * returns (page 1 only); `full` overrides what `getEntities` returns per ID.
 */
export function fakeClient(opts: {
  lists: Record<string, QlooEntity[]>;
  demos?: Demographics[];
  full?: Record<string, QlooEntity>;
}) {
  const calls: InsightsInput[] = [];
  const client: QlooClient = {
    async getInsights(input) {
      calls.push(input);
      // Lists are keyed "City|type" for a specific entity type, or "City" for any type.
      const loc = input.signalLocationQuery ?? input.filterLocationQuery ?? "";
      const list =
        (input.page ?? 1) === 1
          ? (opts.lists[`${loc}|${input.filterType}`] ?? opts.lists[loc] ?? [])
          : [];
      return {
        entities: list.map((e, i) => ({
          ...e,
          rank: i + 1,
          affinity: 1,
          affinityRank: null,
          explainability: null,
        })),
        tags: [],
        aggregateExplainability: null,
        durationMs: null,
      };
    },
    async getDemographics(ids) {
      return (opts.demos ?? []).filter((d) => ids.includes(d.entityId));
    },
    async getEntities(ids) {
      return ids.map((id) => opts.full?.[id]).filter((e): e is QlooEntity => Boolean(e));
    },
    async searchEntities() {
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
