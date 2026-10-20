import { describe, expect, it } from "vitest";
import { findEquivalents } from "@/lib/engine/equivalents";
import { marketById } from "@/lib/markets";
import { demo, entity, fakeClient, tag } from "./helpers";

const DINING = tag("urn:tag:genre:brand:dining", "urn:tag:genre:brand", "Dining");
const HEALTHY = tag("t:healthy", "urn:tag:lifestyle:qloo", "Healthy Living");
const OFFICE = tag("t:office", "urn:tag:customer_segment:qloo", "Office Workers");
const LUXURY = tag("t:luxury", "urn:tag:lifestyle:qloo", "Luxury");
const madrid = marketById("madrid")!;

const anchor = entity("anchor", { name: "Burrito Chain", tags: [DINING, HEALTHY, OFFICE] });

function setup(extra: { lists?: Record<string, ReturnType<typeof entity>[]> } = {}) {
  const localFit = entity("local-fit", {
    name: "Bocadillo Rápido",
    tags: [DINING, HEALTHY, OFFICE],
  });
  const localLuxe = entity("local-luxe", { name: "Casa Lujo", tags: [DINING, LUXURY] });
  const globalChain = entity("global", { name: "Everywhere Coffee", tags: [DINING, HEALTHY] });
  const usChain = entity("us-chain", { name: "Freeway Burgers", tags: [DINING, HEALTHY, OFFICE] });
  const foreign = entity("foreign", { name: "Sydney Wraps", tags: [DINING, HEALTHY, OFFICE] });
  return fakeClient({
    lists: {
      Madrid: [globalChain, localLuxe, localFit, usChain, foreign],
      London: [globalChain],
      Tokyo: [globalChain],
      Mumbai: [],
      "São Paulo": [],
      "Los Angeles": [usChain],
      ...extra.lists,
    },
    demos: [demo("anchor", 0.5), demo("local-fit", 0.4), demo("local-luxe", -0.6)],
    full: {
      foreign: {
        ...foreign,
        tags: [...foreign.tags, tag("t:au", "urn:tag:key_market:qloo", "Australia")],
      },
    },
  });
}

describe("findEquivalents", () => {
  it("ranks the local entity with the same role first and rejects global, US and foreign ones", async () => {
    const { client } = setup();
    const r = await findEquivalents(client, { anchor, domain: "brand", market: madrid });
    expect(r.equivalents.map((e) => e.entity.id)).toEqual(["local-fit", "local-luxe"]);
    expect(r.equivalents[0].sharedTags).toContain("Healthy Living");
    const reasons = Object.fromEntries(r.rejected.map((x) => [x.name, x.reason]));
    expect(reasons).toMatchObject({
      "Everywhere Coffee": "global",
      "Freeway Burgers": "familiar_in_source",
      "Sydney Wraps": "foreign_origin",
    });
  });

  it("builds the pool for the anchor's broad category", async () => {
    const { client, calls } = setup();
    await findEquivalents(client, { anchor, domain: "brand", market: madrid });
    expect(calls.every((c) => c.filterTags?.[0] === DINING.id)).toBe(true);
  });

  it("is deterministic", async () => {
    const a = await findEquivalents(setup().client, { anchor, domain: "brand", market: madrid });
    const b = await findEquivalents(setup().client, { anchor, domain: "brand", market: madrid });
    expect(a.equivalents.map((e) => [e.entity.id, e.score])).toEqual(
      b.equivalents.map((e) => [e.entity.id, e.score]),
    );
  });

  it("rejects TV shows released in another country", async () => {
    const show = entity("show", {
      type: "urn:entity:tv_show",
      tags: [tag("g", "urn:tag:genre:qloo")],
    });
    const spanish = entity("es", { name: "Serie", releaseCountries: ["Spain"], tags: show.tags });
    const american = entity("us", {
      name: "Import",
      releaseCountries: ["United States"],
      tags: show.tags,
    });
    const { client } = fakeClient({ lists: { Madrid: [american, spanish] } });
    const r = await findEquivalents(client, { anchor: show, domain: "tv_show", market: madrid });
    expect(r.equivalents.map((e) => e.entity.id)).toEqual(["es"]);
    expect(r.rejected).toContainEqual({ name: "Import", reason: "foreign_release" });
  });

  it("drops the same entity listed under two names", async () => {
    const latin = entity("a1", { name: "Jin Example", tags: [DINING, HEALTHY] });
    const script = entity("a2", { name: "赤西例", tags: [DINING, HEALTHY] });
    const { client } = fakeClient({
      lists: { Madrid: [latin, script] },
      demos: [demo("a1", 0.31), demo("a2", 0.31)],
    });
    const r = await findEquivalents(client, { anchor, domain: "brand", market: madrid });
    expect(r.equivalents.map((e) => e.entity.id)).toEqual(["a1"]);
    expect(r.rejected).toContainEqual({ name: "赤西例", reason: "duplicate" });
  });

  it("returns nothing for a domain the market doesn't cover", async () => {
    const london = marketById("london")!;
    const { client, calls } = fakeClient({ lists: {} });
    const r = await findEquivalents(client, { anchor, domain: "movie", market: london });
    expect(r.confidence).toBe("off");
    expect(r.equivalents).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
