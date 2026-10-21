import { describe, expect, it } from "vitest";
import { compareEvaluations, evaluatePlan, hitScore } from "@/lib/crashtest/evaluate";
import type { ComponentEvidence, ListHit } from "@/lib/crashtest/gather";
import { BudgetExceeded, budgeted, itemsFrom, sanitizeInsights } from "@/lib/crashtest/ledger";
import { roleFits } from "@/lib/crashtest/repair";
import type { Component, CulturalPlan, PlanEvaluation, Slot } from "@/lib/crashtest/types";
import { fakeClient } from "../engine/helpers";

const hit = (over: Partial<ListHit> = {}): ListHit => ({
  evidenceId: "E1",
  inList: true,
  rank: 1,
  listSize: 50,
  affinity: 0.97,
  returned: true,
  ...over,
});

const local = (over: Partial<NonNullable<ComponentEvidence["local"]>> = {}) => ({
  evidenceId: "E2",
  place: false,
  fromHere: false,
  inCityList: true,
  global: false,
  familiarInSource: false,
  foreign: false,
  origins: [],
  ...over,
});

const comp = (slot: Slot, label: string, over: Partial<Component> = {}): Component => ({
  slot,
  label,
  origin: "agent_proposed",
  locked: false,
  resolution: "resolved",
  entity: { id: label, name: label, type: null, popularity: null, imageUrl: null, shortDescription: null },
  tags: [],
  placeCategory: null,
  ...over,
});

const ev = (slot: Slot, over: Partial<ComponentEvidence> = {}): ComponentEvidence => ({
  slot,
  audience: [hit()],
  coherence: [hit({ evidenceId: "E3" })],
  local: local(),
  tagLocal: null,
  duplicateOf: null,
  ...over,
});

function evaluate(evidence: ComponentEvidence, component = comp(evidence.slot, "X"), constraints = []) {
  const plan: CulturalPlan = { anchors: [], components: [component] };
  return evaluatePlan({
    plan,
    evidence: new Map([[component.slot, evidence]]),
    constraints,
    city: "London",
    iteration: 0,
  }).components[0];
}

describe("hitScore", () => {
  it("scores list positions from 1.0 down to 0.6, and outside the list low", () => {
    expect(hitScore(hit({ rank: 1 }))).toBe(1);
    expect(hitScore(hit({ rank: 50 }))).toBeCloseTo(0.608, 3);
    expect(hitScore(hit({ inList: false, rank: undefined }))).toBe(0.25);
  });
  it("never turns a missing result into a number", () => {
    expect(hitScore(hit({ inList: false, rank: undefined, returned: false }))).toBeUndefined();
  });
});

describe("assessComponent", () => {
  it("supports a local top pick for the audience", () => {
    const a = evaluate(ev("artist_music"));
    expect(a.status).toBe("supported");
    expect(a.coverage).toBe("adequate");
    expect(a.total).toBeCloseTo(1, 5);
  });

  it("gives no total, not zero, when Qloo returns nothing for the audience", () => {
    const a = evaluate(ev("artist_music", { audience: [hit({ inList: false, rank: undefined, returned: false })] }));
    expect(a.status).toBe("no_support");
    expect(a.total).toBeUndefined();
    expect(a.dimensions.find((d) => d.key === "audience")?.score).toBeUndefined();
  });

  it("calls a global name weak even when the audience likes it", () => {
    const a = evaluate(ev("artist_music", { local: local({ inCityList: false, global: true }) }));
    expect(a.status).toBe("weak");
    expect(a.finding).toMatch(/global default/);
    expect(a.contradicted).toBe(true);
  });

  it("treats a foreign choice missing from the city list as thin evidence, not a contradiction", () => {
    const a = evaluate(ev("brand_collaboration", { audience: [hit({ inList: false, rank: undefined })], local: local({ inCityList: false, foreign: true, origins: ["DK"] }) }));
    expect(a.status).toBe("weak");
    expect(a.contradicted).toBe(false);
  });

  it("doesn't treat no returned affinity as a contradiction for a name from here", () => {
    const none = [hit({ inList: false, rank: undefined, returned: false })];
    expect(evaluate(ev("brand_collaboration", { audience: none, local: local({ inCityList: false, fromHere: true }) })).contradicted).toBe(false);
    expect(evaluate(ev("brand_collaboration", { audience: none, local: local({ inCityList: false, foreign: true }) })).contradicted).toBe(true);
  });

  it("renormalises over measured dimensions and lowers coverage", () => {
    const a = evaluate(ev("artist_music", { coherence: null }));
    expect(a.coverage).toBe("partial");
    expect(a.total).toBeCloseTo(1, 5);
    expect(a.dimensions.find((d) => d.key === "coherence")?.score).toBeUndefined();
  });

  it("flags a repeat as weak with the app-heuristic label", () => {
    const a = evaluate(ev("brand_collaboration", { duplicateOf: "audience anchor Northcap" }));
    expect(a.status).toBe("weak");
    expect(a.dimensions.find((d) => d.key === "distinct")).toMatchObject({ score: 0, heuristic: true });
  });

  it("marks an excluded name as a constraint conflict", () => {
    const a = evaluate(ev("brand_collaboration"), comp("brand_collaboration", "Banned Co"), [
      { id: "c", description: "No Banned Co", kind: "hard", excludeNames: ["banned co"] },
    ] as never);
    expect(a.status).toBe("constraint_conflict");
  });

  it("treats a venue outside the country as not local", () => {
    const a = evaluate(ev("event_place", { local: local({ place: true, fromHere: false }) }));
    expect(a.dimensions.find((d) => d.key === "local")?.score).toBe(0.1);
  });

  it("scores creative direction by where its tags rank here versus New York", () => {
    const tags = [{ id: "t1", name: "Industrial" }, { id: "t2", name: "Playful" }];
    const a = evaluate(
      ev("creative_direction", {
        audience: [hit({ rank: 2 }), hit({ inList: false, rank: undefined })],
        coherence: null,
        local: null,
        tagLocal: [
          { evidenceId: "E1", tag: "Industrial", cityRank: 2, sourceRank: 20 },
          { evidenceId: "E1", tag: "Playful" },
        ],
      }),
      comp("creative_direction", "Industrial but playful", { entity: null, tags }),
    );
    expect(a.dimensions.find((d) => d.key === "local")?.score).toBeCloseTo(0.6, 5);
    expect(a.status).toBe("weak");
    expect(a.finding).toMatch(/Playful/);
  });
});

describe("evaluatePlan", () => {
  const plan: CulturalPlan = {
    anchors: [],
    components: [comp("artist_music", "A"), comp("brand_collaboration", "B", { locked: true }), comp("event_place", "C")],
  };
  const evidence = new Map<Slot, ComponentEvidence>([
    ["artist_music", ev("artist_music", { local: local({ inCityList: false, global: true }) })],
    ["brand_collaboration", ev("brand_collaboration", { audience: [hit({ inList: false, rank: undefined, returned: false })] })],
    ["event_place", ev("event_place", { audience: [hit({ inList: false, rank: undefined, returned: false })] })],
  ]);
  const e = evaluatePlan({ plan, evidence, constraints: [], city: "London", iteration: 0 });

  it("orders the weakest adjustable choice first and skips locked ones", () => {
    expect(e.weakest).toEqual(["event_place", "artist_music"]);
    expect(e.accepted).toBe(false);
  });

  it("counts supported and scored choices", () => {
    expect(e.supported).toBe(0);
    expect(e.scored).toBe(1);
  });
});

describe("compareEvaluations", () => {
  const ev0 = (supported: number, total: number, status = "weak", contradicted = 0): PlanEvaluation =>
    ({
      supported,
      contradicted,
      totalScore: total,
      components: [{ slot: "artist_music", status }],
    }) as unknown as PlanEvaluation;

  it("counts fewer contradicted choices first", () => {
    expect(compareEvaluations(ev0(2, 0.9, "weak", 1), ev0(1, 0.7, "weak", 0), "artist_music").better).toBe(true);
  });
  it("prefers more supported choices over a higher score", () => {
    expect(compareEvaluations(ev0(1, 0.9), ev0(2, 0.7), "artist_music").better).toBe(true);
    expect(compareEvaluations(ev0(2, 0.7), ev0(1, 0.9), "artist_music").worse).toBe(true);
  });
  it("counts a status step up as progress even when the score drops", () => {
    const p = compareEvaluations(ev0(1, 0.8, "no_support"), ev0(1, 0.7, "weak"), "artist_music");
    expect(p).toEqual({ better: true, worse: false, material: true });
  });
  it("treats a tiny score gain as immaterial", () => {
    const p = compareEvaluations(ev0(1, 0.7), ev0(1, 0.71), "artist_music");
    expect(p.better).toBe(true);
    expect(p.material).toBe(false);
  });
});

describe("ledger", () => {
  it("rejects the call after the budget, before it reaches Qloo", async () => {
    const { client, calls } = fakeClient({ lists: {} });
    const b = budgeted(client, 2, () => {});
    await b.client.getInsights({ filterType: "urn:entity:artist" });
    await b.client.getInsights({ filterType: "urn:entity:artist" });
    await expect(b.client.getInsights({ filterType: "urn:entity:artist" })).rejects.toBeInstanceOf(BudgetExceeded);
    expect(calls).toHaveLength(2);
    expect(b.used()).toBe(2);
  });

  it("sanitises requests to Qloo's own parameter names, without empty fields", () => {
    expect(sanitizeInsights({ filterType: "urn:entity:brand", signalLocationQuery: "London", take: 5 })).toEqual({
      "filter.type": "urn:entity:brand",
      "signal.location.query": "London",
      take: 5,
    });
  });

  it("keeps the queried item even when it ranks below the shown top", () => {
    const entities = Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, displayName: `E${i}`, rank: i + 1, affinity: null, popularity: null, type: null, explainability: null }));
    const items = itemsFrom({ entities, tags: [], aggregateExplainability: null, durationMs: null } as never, ["e11"]);
    expect(items.map((x) => x.id)).toContain("e11");
    expect(items).toHaveLength(9);
  });
});

describe("roleFits", () => {
  const t = (id: string, type: string) => ({ id, type });
  const venue = "urn:tag:category:place:event_venue";
  it("rejects hotels and outlets as launch venues, and venues of another kind", () => {
    expect(roleFits("event_place", { tags: [t(venue, "urn:tag:category:place"), t("urn:tag:category:place:hotel", "urn:tag:category:place")] }, null, venue)).toBe(false);
    expect(roleFits("event_place", { tags: [t("urn:tag:category:place:bar", "urn:tag:category:place")] }, null, venue)).toBe(false);
    expect(roleFits("event_place", { tags: [t(venue, "urn:tag:category:place")] }, null, venue)).toBe(true);
    // Hilton Tokyo Bay: an event venue that is also a resort hotel.
    expect(roleFits("event_place", { tags: [t(venue, "urn:tag:category:place"), t("urn:tag:category:place:resort_hotel", "urn:tag:category:place")] }, null, venue)).toBe(false);
    expect(roleFits("event_place", { tags: [t(venue, "urn:tag:category:place"), t("urn:tag:genre:place:hotel", "urn:tag:genre:place")] }, null, null)).toBe(false);
  });
  it("keeps a partner brand in the same kind of business", () => {
    const beer = { tags: [t("urn:tag:genre:brand:beverage:beer", "urn:tag:genre:brand")] };
    const app = { tags: [t("urn:tag:genre:brand:marketplace", "urn:tag:genre:brand")] };
    expect(roleFits("brand_collaboration", app, beer, null)).toBe(false);
    expect(roleFits("brand_collaboration", beer, beer, null)).toBe(true);
    expect(roleFits("artist_music", app, beer, null)).toBe(true);
  });
});
