import { describe, expect, it } from "vitest";
import { kindLabel, kindOf, roleSimilarity, roleTags } from "@/lib/engine/role";

describe("kindOf", () => {
  it("keeps what a thing is and drops country, decade and place", () => {
    expect(kindOf("Fast-food chains of the United States")).toBe("fast-food chains");
    expect(kindOf("Bakeries of the United Kingdom")).toBe("bakeries");
    expect(kindOf("Doughnut shops")).toBe("doughnut shops");
    expect(kindOf("2000s American workplace comedy television series")).toBe(
      "workplace comedy television series",
    );
    expect(kindOf("British workplace comedy television series")).toBe(
      "workplace comedy television series",
    );
    expect(kindOf("Television series set in offices")).toBe("television series set in offices");
    expect(kindOf("Supermarkets of Spain")).toBe("supermarkets");
  });

  it("drops company facts and generic kinds", () => {
    expect(kindOf("American companies established in 1950")).toBeNull();
    expect(kindOf("Companies based in Massachusetts")).toBeNull();
    expect(kindOf("Companies listed on the London Stock Exchange")).toBeNull();
    expect(kindOf("English brands")).toBeNull();
    expect(kindOf("Restaurants in Massachusetts")).toBeNull();
  });
});

describe("role tags with kinds", () => {
  const tag = (id: string, type: string, name = id) => ({ id, type, name, value: null });
  it("lets a US chain and a local one share their kind", () => {
    const dunkin = roleTags({
      tags: [
        tag("w1", "urn:tag:wikipedia_category:wikipedia", "Doughnut shops"),
        tag("w2", "urn:tag:wikipedia_category:wikipedia", "Fast-food chains of the United States"),
        tag("g", "urn:tag:genre:brand", "Dining"),
      ],
    });
    const greggs = roleTags({
      tags: [
        tag("w3", "urn:tag:wikipedia_category:wikipedia", "Doughnut shops"),
        tag("w4", "urn:tag:wikipedia_category:wikipedia", "Fast-food chains of the United Kingdom"),
        tag("g", "urn:tag:genre:brand", "Dining"),
      ],
    });
    const sim = roleSimilarity(dunkin, greggs);
    expect(sim.score).toBe(1);
    expect(sim.shared.map((id) => kindLabel(id) ?? id)).toContain("Doughnut shops");
  });
});

import { originCountries } from "@/lib/engine/origin";

describe("originCountries", () => {
  const tag = (type: string, name: string) => ({ id: `${type}:${name}`, type, name });
  it("reads origin from Wikipedia categories before key markets", () => {
    const uniqlo = { name: "Uniqlo", type: "urn:entity:brand", shortDescription: null, tags: [tag("urn:tag:key_market:qloo", "China"), tag("urn:tag:wikipedia_category", "Clothing brands of Japan")] };
    expect(originCountries(uniqlo)).toEqual(["JP"]);
  });
  it("doesn't treat a list of key markets as an origin", () => {
    const dc = { name: "DC Shoes", type: "urn:entity:brand", shortDescription: null, tags: ["United States", "Japan", "Brazil"].map((n) => tag("urn:tag:key_market:qloo", n)) };
    expect(originCountries(dc)).toEqual([]);
  });
});
