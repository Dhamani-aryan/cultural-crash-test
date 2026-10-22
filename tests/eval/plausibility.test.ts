import { describe, expect, it } from "vitest";
import { nameKey } from "@/lib/engine/stats";
import { PLAUSIBILITY } from "../../eval/plausibility";

describe("plausibility cases", () => {
  it("never use the choice under test as an audience anchor (Qloo would test it against itself)", () => {
    for (const c of PLAUSIBILITY) {
      const anchors = new Set((c.brief.audienceAnchors ?? []).map(nameKey));
      for (const choice of c.brief.existingChoices ?? []) expect(anchors.has(nameKey(choice.name)), `${c.id}: ${choice.name}`).toBe(false);
    }
  });

  it("cover every requirement the plan lists, with several expecting the original to stay", () => {
    expect(new Set(PLAUSIBILITY.map((c) => c.covers)).size).toBe(6);
    expect(PLAUSIBILITY.filter((c) => c.expect === "keep").length).toBeGreaterThanOrEqual(3);
    expect(new Set(PLAUSIBILITY.map((c) => c.brief.marketId)).size).toBeGreaterThanOrEqual(4);
  });
});
