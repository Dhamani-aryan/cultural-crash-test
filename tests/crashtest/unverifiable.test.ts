import { describe, expect, it } from "vitest";
import { isVerifiable, unverifiableRules } from "@/lib/crashtest/constraints";
import { runCrashTest } from "@/lib/crashtest/run";
import type { Constraint } from "@/lib/crashtest/types";
import { LONDON_BRIEF, worldClient, worldLlm } from "./world";

const rule = (description: string, extra: Partial<Constraint> = {}): Constraint => ({ id: "r", kind: "hard", description, ...extra });

describe("which hard rules code can verify", () => {
  it("verifies locks and name-only exclusions", () => {
    expect(isVerifiable(rule("Keep the venue", { lockSlot: "event_place" }))).toBe(true);
    expect(isVerifiable(rule("No collaboration with Supreme", { excludeNames: ["Supreme"] }))).toBe(true);
    expect(isVerifiable(rule("Never use: Zara, H&M", { excludeNames: ["Zara", "H&M"] }))).toBe(true);
  });

  it("can't verify a rule whose wording reaches beyond its names, or free text", () => {
    expect(isVerifiable(rule("No fast-fashion collaborators", { excludeNames: ["Zara", "H&M", "Shein"] }))).toBe(false);
    expect(isVerifiable(rule("No luxury collaboration"))).toBe(false);
    expect(isVerifiable({ ...rule("Prefer local makers"), kind: "soft" })).toBe(true);
    expect(unverifiableRules([rule("No luxury collaboration"), rule("Keep it", { lockSlot: "artist_music" })])).toEqual([
      "No luxury collaboration",
    ]);
  });
});

describe("an unknown collaboration brand under a rule code can't verify", () => {
  // Fieldnote would otherwise qualify: local, a workwear label, and "workwear" is in the brief.
  const base = { ...LONDON_BRIEF, brandAttributes: ["workwear"] };
  const llm = () => worldLlm({ draft: { brand: "Unknown Collective" }, pick: ["b2"] }).llm;

  it("keeps it unresolved and asks a human to check it against the rule", async () => {
    const run = await runCrashTest({ qloo: worldClient().client, llm: llm() }, { ...base, constraints: [rule("No luxury collaboration")] });
    const brand = run.plan!.components.find((c) => c.slot === "brand_collaboration")!;
    expect(brand).toMatchObject({ label: "Unknown Collective", resolution: "not_found" });
    expect(run.changes.filter((c) => c.slot === "brand_collaboration")).toHaveLength(0);
    const q = run.unresolvedQuestions.find((x) => x.includes("Unknown Collective"))!;
    expect(q).toMatch(/kept unresolved/);
    expect(q).toMatch(/"No luxury collaboration"/);
    expect(q).toMatch(/confirm by hand/);
  });

  it("still keeps it when the rule comes with names but says more", async () => {
    const run = await runCrashTest({ qloo: worldClient().client, llm: llm() }, {
      ...base,
      constraints: [rule("No fast-fashion collaborators", { excludeNames: ["Zara"] })],
    });
    expect(run.plan!.components.find((c) => c.slot === "brand_collaboration")?.label).toBe("Unknown Collective");
  });

  it("may still upgrade it when every hard rule is verifiable", async () => {
    const run = await runCrashTest({ qloo: worldClient().client, llm: llm() }, {
      ...base,
      constraints: [rule("No collaboration with Supreme", { excludeNames: ["Supreme"] })],
    });
    expect(run.plan!.components.find((c) => c.slot === "brand_collaboration")?.label).toBe("Fieldnote");
  });

  it("doesn't hold back other slots", async () => {
    const run = await runCrashTest({ qloo: worldClient().client, llm: llm() }, { ...base, constraints: [rule("No luxury collaboration")] });
    // The US rapper with no support is still replaced.
    expect(run.plan!.components.find((c) => c.slot === "artist_music")?.label).toBe("Grey Lane");
  });
});
