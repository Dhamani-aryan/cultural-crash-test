import { describe, expect, it } from "vitest";
import { buildDecisions } from "@/lib/crashtest/explain";
import { buildDecisionGraph } from "@/lib/crashtest/graph";
import { runCrashTest } from "@/lib/crashtest/run";
import type { LaunchBriefInput } from "@/lib/crashtest/types";
import { LONDON_BRIEF, worldClient, worldLlm } from "./world";

const graphOf = async (brief: LaunchBriefInput = LONDON_BRIEF) => {
  const s = await runCrashTest({ qloo: worldClient().client, llm: worldLlm().llm }, brief);
  const decisions = buildDecisions(s);
  return { s, decisions, g: buildDecisionGraph(s, decisions) };
};

describe("buildDecisionGraph", () => {
  it("has one lane per decision, in the decision model's order", async () => {
    const { g, decisions } = await graphOf();
    expect(g.lanes.map((l) => l.slot)).toEqual(decisions.map((d) => d.slot));
  });

  it("a changed lane runs choice → Qloo test → opened → candidates → re-test → final", async () => {
    const { g } = await graphOf();
    const lane = g.nodes.filter((n) => n.lane === "artist_music");
    expect(lane.map((n) => n.column)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(lane.find((n) => n.column === 2)?.label).toBe("Opened");
    expect(lane.find((n) => n.column === 4)?.sub).toBe("No support → Supported");
    expect(lane.find((n) => n.column === 5)).toMatchObject({ kind: "final", label: "Grey Lane", status: "supported" });
  });

  it("a retained lane without alternatives skips the candidate steps", async () => {
    const { g } = await graphOf();
    const lane = g.nodes.filter((n) => n.lane === "event_place");
    expect(lane.map((n) => n.column)).toEqual([0, 1, 2, 5]);
    expect(g.edges.some((e) => e.lane === "event_place" && e.label === "unchanged")).toBe(true);
  });

  it("draws user input, Qloo results, app evaluations and final choices as distinct kinds", async () => {
    const { g } = await graphOf({ ...LONDON_BRIEF, existingChoices: [{ slot: "event_place", name: "Yard Hall" }] });
    const node = (id: string) => g.nodes.find((n) => n.id === id)!;
    expect(node("event_place:original").kind).toBe("user");
    expect(node("brand_collaboration:original").kind).toBe("qloo");
    expect(node("event_place:test").kind).toBe("qloo");
    expect(node("event_place:gate").kind).toBe("app");
    expect(node("event_place:final").kind).toBe("final");
    expect(g.inputs.find((n) => n.id === "in:market")?.kind).toBe("user");
  });

  it("shows a lock as locked and only adds the rules input when the brief has rules", async () => {
    const plain = await graphOf();
    expect(plain.g.inputs.map((n) => n.id)).toEqual(["in:anchors", "in:market"]);
    const { g } = await graphOf({
      ...LONDON_BRIEF,
      existingChoices: [{ slot: "event_place", name: "Yard Hall" }],
      constraints: [{ id: "l", kind: "hard", lockSlot: "event_place", description: "Venue is booked" }],
    });
    expect(g.inputs.find((n) => n.id === "in:rules")?.sub).toBe("1 fixed");
    expect(g.nodes.find((n) => n.id === "event_place:gate")?.label).toBe("Locked");
    expect(g.edges.find((e) => e.from === "in:rules" && e.lane === "event_place")?.label).toBe("locked");
  });

  it("every edge joins nodes that exist, and no label claims causation", async () => {
    const { g } = await graphOf();
    const ids = new Set([...g.inputs, ...g.nodes].map((n) => n.id));
    for (const e of g.edges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
    const words = [...g.edges.map((e) => e.label ?? ""), ...g.nodes.map((n) => `${n.label} ${n.sub ?? ""}`)].join(" ");
    expect(words).not.toMatch(/\b(caus|because|drives|proves?|will)\b/i);
  });
});
