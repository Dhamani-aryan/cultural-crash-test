import { describe, expect, it } from "vitest";
import { createQlooClient } from "@/lib/qloo";
import { normalizeDemographics, normalizeEntities, pickDisplayName } from "@/lib/qloo/normalize";
import { jsonResponse, mockFetch, noSleep } from "./helpers";

// Synthetic shapes matching the live API (names and IDs are made up).
const entitiesBody = {
  success: true,
  results: [
    {
      entity_id: "E-1",
      name: "サンプル寿司",
      types: ["urn:entity:brand"],
      properties: {
        akas: [
          { language: "ja", value: "サンプル寿司" },
          { language: "en_au", value: "Sample Sushi" },
        ],
      },
      tags: [{ tag_id: "urn:tag:genre:brand:dining", name: "Dining", type: "urn:tag:genre:brand" }],
    },
    {
      entity_id: "E-2",
      name: "Fake Sitcom",
      types: ["urn:entity:tv_show"],
      properties: { release_country: "United Kingdom", akas: [] },
    },
  ],
};

const demographicsBody = {
  success: true,
  results: {
    demographics: [
      {
        entity_id: "E-1",
        query: {
          age: { "24_and_younger": 0.2, "25_to_29": 0.4, "30_to_34": 0.1 },
          gender: { male: -0.3, female: 0.3 },
        },
      },
    ],
  },
};

describe("entity extensions", () => {
  it("picks a Latin display name and keeps akas and release country", () => {
    const [sushi, sitcom] = normalizeEntities(entitiesBody);
    expect(sushi.displayName).toBe("Sample Sushi");
    expect(sushi.akas).toEqual(["サンプル寿司", "Sample Sushi"]);
    expect(sushi.tags[0].type).toBe("urn:tag:genre:brand");
    expect(sitcom.displayName).toBe("Fake Sitcom");
    expect(sitcom.releaseCountries).toEqual(["United Kingdom"]);
  });

  it("falls back to the original name when no Latin aka exists", () => {
    expect(pickDisplayName("宇多田", [{ value: "宇多田光", languages: ["zh"] }])).toBe("宇多田");
  });

  it("normalizes demographics and fills missing age buckets with 0", () => {
    const [d] = normalizeDemographics(demographicsBody);
    expect(d.entityId).toBe("E-1");
    expect(d.age["25_to_29"]).toBe(0.4);
    expect(d.age["55_and_older"]).toBe(0);
    expect(d.femaleSkew).toBe(0.3);
  });

  it("sends the right parameters for entity lookup, demographics and location signals", async () => {
    const m = mockFetch(
      jsonResponse(entitiesBody),
      jsonResponse(demographicsBody),
      jsonResponse({ success: true, results: { entities: [{ entity_id: "X", name: "X" }] } }),
    );
    const client = createQlooClient({
      apiKey: "k",
      baseUrl: "https://example.test",
      fetch: m.fetch,
      sleep: noSleep,
    });
    await client.getEntities(["E-1", "E-2"]);
    await client.getDemographics(["E-1"]);
    await client.getInsights({
      filterType: "urn:entity:brand",
      signalLocationQuery: "Tokyo",
      filterTags: ["a", "b"],
      filterTagsOperator: "union",
      signalAge: ["25_to_29"],
    });
    expect(m.calls[0].url.pathname).toBe("/entities");
    expect(m.calls[0].url.searchParams.get("entity_ids")).toBe("E-1,E-2");
    expect(m.calls[1].url.searchParams.get("filter.type")).toBe("urn:demographics");
    const p = m.calls[2].url.searchParams;
    expect(p.get("signal.location.query")).toBe("Tokyo");
    expect(p.get("operator.filter.tags")).toBe("union");
    expect(p.get("signal.demographics.age")).toBe("25_to_29");
  });
});
