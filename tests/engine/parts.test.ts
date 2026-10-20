import { describe, expect, it } from "vitest";
import { descriptionOrigin, isForeignOrigin, originCountries } from "@/lib/engine/origin";
import { categoryTags, roleSimilarity, roleTags, tagWeight } from "@/lib/engine/role";
import { cosine, nameKey, percentileRanks } from "@/lib/engine/stats";
import { entity, tag } from "./helpers";

describe("role", () => {
  it("weights character tags and ignores factual ones", () => {
    expect(tagWeight("urn:tag:genre:brand")).toBe(2);
    expect(tagWeight("urn:tag:lifestyle:qloo")).toBe(1.5);
    expect(tagWeight("urn:tag:wikipedia_category")).toBe(0);
    expect(tagWeight("urn:tag:competitor_brand:qloo")).toBe(0);
    expect(tagWeight(null)).toBe(0);
  });

  it("computes weighted Jaccard over role tags", () => {
    const a = roleTags({
      tags: [tag("g", "urn:tag:genre:brand"), tag("l", "urn:tag:lifestyle:qloo")],
    });
    const b = roleTags({ tags: [tag("g", "urn:tag:genre:brand"), tag("x", "urn:tag:theme:qloo")] });
    const r = roleSimilarity(a, b);
    expect(r.shared).toEqual(["g"]);
    expect(r.score).toBeCloseTo(2 / (2 + 1.5 + 1));
  });

  it("uses broad categories only for brands and places", () => {
    const e = { tags: [tag("urn:tag:genre:brand:dining", "urn:tag:genre:brand")] };
    expect(categoryTags(e, "brand")).toEqual(["urn:tag:genre:brand:dining"]);
    expect(categoryTags(e, "artist")).toEqual([]);
  });
});

describe("origin", () => {
  it("reads key markets first", () => {
    const e = entity("x", { tags: [tag("k", "urn:tag:key_market:qloo", "Spain")] });
    expect(originCountries(e)).toEqual(["ES"]);
    expect(isForeignOrigin(e, "ES")).toBe(false);
    expect(isForeignOrigin(e, "JP")).toBe(true);
  });

  it("reads Wikipedia categories for chains", () => {
    const e = entity("x", {
      tags: [tag("w", "urn:tag:wikipedia_category", "Fast-food chains of the United States")],
    });
    expect(originCountries(e)).toEqual(["US"]);
  });

  it("reads a person's nationality from the first words of the description", () => {
    expect(descriptionOrigin("Nick Example is an American singer and actor.")).toBe("US");
    expect(descriptionOrigin("English singer, formerly of a British band.")).toBe("GB");
    expect(descriptionOrigin("A Japanese-inspired sushi chain from London.")).toBe("GB");
    expect(descriptionOrigin(null)).toBeNull();
    const artist = entity("a", {
      type: "urn:entity:artist",
      shortDescription: "Indian playback singer.",
    });
    expect(isForeignOrigin(artist, "IN")).toBe(false);
  });

  it("treats unknown origin as not foreign", () => {
    expect(isForeignOrigin(entity("x"), "JP")).toBe(false);
  });
});

describe("stats", () => {
  it("ranks with ties sharing the average and missing values lowest", () => {
    expect(percentileRanks([3, 1, 2])).toEqual([1, 0, 0.5]);
    expect(percentileRanks([1, 1, undefined])).toEqual([0.75, 0.75, 0]);
  });

  it("computes cosine and handles missing vectors", () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine(null, [1])).toBe(0);
  });

  it("normalizes names for duplicate checks", () => {
    expect(nameKey("Café Coffee-Day")).toBe(nameKey("cafe coffee day"));
  });
});
