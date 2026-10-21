import { describe, expect, it } from "vitest";
import { fitsBrief, ruledOut } from "@/lib/crashtest/repair";
import { runCrashTest } from "@/lib/crashtest/run";
import { LONDON_BRIEF, worldClient, worldLlm } from "./world";

const tag = (name: string, type = "urn:tag:keyword:qloo") => ({ id: `${type}:${name}`, name, type });
const brand = (shortDescription: string, tags: string[] = []) => ({
  shortDescription,
  description: null,
  tags: tags.map((t) => tag(t)),
});
const madrid = {
  productCategory: "Sustainable fashion",
  brandAttributes: ["honest", "Mediterranean", "modern"],
  constraints: [
    { id: "c1", kind: "hard" as const, description: "No fast-fashion collaborators", excludeNames: ["Zara", "H&M"] },
  ],
};

describe("fitsBrief", () => {
  it("reads 'no …' rules into phrases", () => {
    expect(ruledOut(madrid)).toEqual(["fast fashion"]);
    expect(ruledOut({ constraints: [{ id: "r", kind: "hard", description: "No luxury collaboration" }] })).toEqual(["luxury"]);
  });

  it("rejects a candidate that Qloo's evidence ties to a ruled-out phrase, in any slot", () => {
    const fast = brand("A fast-fashion retailer of trend clothing.");
    expect(fitsBrief(fast, madrid, { requireAttributes: false }).ok).toBe(false);
  });

  it("with an unknown original, needs a brief term in Qloo's description or tags", () => {
    const sustainable = brand("A vintage clothing reseller.", ["Sustainability", "Circular Economy"]);
    const unrelated = brand("A sportswear giant known for running shoes.", ["Performance"]);
    expect(fitsBrief(sustainable, madrid, { requireAttributes: true }).ok).toBe(true);
    expect(fitsBrief(unrelated, madrid, { requireAttributes: true })).toMatchObject({ ok: false });
    expect(fitsBrief(unrelated, madrid, { requireAttributes: false }).ok).toBe(true);
  });

  it("ignores generic words like 'fashion' and 'brand' as evidence of fit", () => {
    const generic = brand("A fashion brand.", ["Fashion"]);
    expect(fitsBrief(generic, madrid, { requireAttributes: true }).ok).toBe(false);
  });
});

describe("upgrading an unknown collaboration brand", () => {
  it("upgrades to a candidate whose Qloo evidence fits the brief", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ draft: { brand: "Unknown Collective" }, pick: ["b1", "b2"] });
    const run = await runCrashTest({ qloo: client, llm }, { ...LONDON_BRIEF, brandAttributes: ["workwear"] });
    // Fieldnote is described as a workwear label; Mossgrove isn't.
    expect(run.plan!.components.find((c) => c.slot === "brand_collaboration")?.label).toBe("Fieldnote");
  });

  it("keeps the unknown brand when no candidate fits the brief on evidence", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ draft: { brand: "Unknown Collective" }, pick: ["b1", "b2"] });
    const run = await runCrashTest({ qloo: client, llm }, { ...LONDON_BRIEF, brandAttributes: ["sustainable"] });
    expect(run.plan!.components.find((c) => c.slot === "brand_collaboration")?.label).toBe("Unknown Collective");
  });
});
