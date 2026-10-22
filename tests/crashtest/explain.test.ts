import { describe, expect, it } from "vitest";
import { buildChangeExplanations, changeCount, sameChoice } from "@/lib/crashtest/explain";
import { runCrashTest } from "@/lib/crashtest/run";
import type { Component, LaunchBriefInput, RunState } from "@/lib/crashtest/types";
import { LONDON_BRIEF, worldClient, worldLlm } from "./world";

const run = (brief: LaunchBriefInput = LONDON_BRIEF, over: Parameters<typeof worldLlm>[0] = {}) =>
  runCrashTest({ qloo: worldClient().client, llm: worldLlm(over).llm }, brief);
const slot = (s: RunState, name: string) => buildChangeExplanations(s).find((e) => e.slot === name)!;
const allText = (e: ReturnType<typeof slot>) =>
  [...e.reasonToReconsider, ...e.reasonForAgentChoice, e.keptReason ?? "", ...e.caveats].join(" ");

describe("buildChangeExplanations", () => {
  it("explains both sides of a change", async () => {
    const s = await run();
    const e = slot(s, "artist_music");
    expect(e).toMatchObject({ changed: true, originalChoice: "Big Tex", agentChoice: "Grey Lane", originalStatus: "no_support", agentStatus: "supported" });
    expect(e.reasonToReconsider.join(" ")).toMatch(/no affinity/);
    expect(e.reasonToReconsider.join(" ")).toMatch(/contradicts it, so it was eligible for repair/);
    expect(e.reasonForAgentChoice.join(" ")).toMatch(/Supported/);
    expect(e.reasonForAgentChoice.join(" ")).toMatch(/Re-test:/);
    expect(e.acceptedChange?.after).toBe("Grey Lane");
    expect(changeCount(s)).toBe(1);
  });

  it("says why a supported choice stayed", async () => {
    const e = slot(await run(), "event_place");
    expect(e.changed).toBe(false);
    expect(e.keptReason).toMatch(/already supported/);
    expect(e.reasonToReconsider).toEqual([]);
  });

  it("says a locked choice was assessed but never eligible", async () => {
    const s = await run({ ...LONDON_BRIEF, constraints: [{ id: "l", kind: "hard", lockSlot: "artist_music", description: "Booked" }] });
    const e = slot(s, "artist_music");
    expect(e.changed).toBe(false);
    expect(e.keptReason).toMatch(/fixed in your brief.*never eligible/);
  });

  it("uses uncertainty language for a choice Qloo doesn't know, never a verdict", async () => {
    const s = await run(
      { ...LONDON_BRIEF, brandAttributes: ["workwear"], constraints: [{ id: "r", kind: "hard", description: "No luxury collaboration" }] },
      { draft: { brand: "Unknown Collective" } },
    );
    const e = slot(s, "brand_collaboration");
    expect(e.changed).toBe(false);
    expect(allText(e)).toMatch(/could not verify/);
    expect(allText(e)).not.toMatch(/\bis (wrong|bad|unsuitable|a poor)\b/);
  });

  it("keeps tried-and-rejected candidates apart from the accepted change", async () => {
    const s = await run();
    const reverted = { ...s.changes[0], after: "Coast Kid", reverted: true, observedEffect: "Music act n/a → 0.25 (weak)" };
    const e = slot({ ...s, changes: [reverted, ...s.changes] }, "artist_music");
    expect(e.acceptedChange?.after).toBe("Grey Lane");
    expect(e.rejectedChanges.map((c) => c.after)).toEqual(["Coast Kid"]);
    expect(e.reasonForAgentChoice.join(" ")).toMatch(/beat 1 other tested candidate/);
  });

  it("cites only evidence that exists in the ledger", async () => {
    const s = await run();
    const ids = new Set(s.evidenceLedger.map((r) => r.evidenceId));
    const cited = buildChangeExplanations(s).flatMap((e) => e.evidenceIds);
    expect(cited.length).toBeGreaterThan(0);
    for (const id of cited) expect(ids.has(id)).toBe(true);
  });

  it("treats a relabelled direction with the same tags as unchanged", () => {
    const c = (label: string): Component => ({
      slot: "creative_direction",
      label,
      origin: "agent_proposed",
      locked: false,
      resolution: "resolved",
      entity: null,
      tags: [{ id: "t1", name: "Industrial" }],
      placeCategory: null,
    });
    expect(sameChoice(c("Industrial"), c("Industrial, refined"))).toBe(true);
  });

  it("returns nothing for a run with no evaluation", () => {
    expect(buildChangeExplanations({ evaluations: [] } as unknown as RunState)).toEqual([]);
  });
});
