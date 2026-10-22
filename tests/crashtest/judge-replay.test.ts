import { describe, expect, it } from "vitest";
import { buildJudgeGraph, visibleGraph } from "@/lib/crashtest/judge-graph";
import { buildReplay, replayTimes, stepChanges } from "@/lib/crashtest/judge-replay";
import { runCrashTest } from "@/lib/crashtest/run";
import type { RunState } from "@/lib/crashtest/types";
import { LONDON_BRIEF, worldClient, worldLlm } from "./world";

const graph = async () => {
  const s = await runCrashTest({ qloo: worldClient().client, llm: worldLlm().llm }, LONDON_BRIEF);
  const reverted = { ...s.changes[0], after: "Coast Kid", reverted: true, retest: { ...s.changes[0].retest!, accepted: false, rejectionCode: "no_improvement" as const } };
  return buildJudgeGraph({ ...s, changes: [reverted, ...s.changes] } as RunState);
};

/** Every drawn line starts after its source appears, and its target is not complete before it arrives. */
function checkLines(g: Awaited<ReturnType<typeof graph>>, focus?: "artist_music") {
  const tl = buildReplay(g, focus);
  const { shownAt, edgeAt } = replayTimes(tl);
  const { edges } = visibleGraph(g, focus);
  for (const e of edges) {
    const line = edgeAt.get(e.id);
    if (!line) continue;
    expect(shownAt.get(e.source)!).toBeLessThanOrEqual(line.at);
    // A target revealed by this line appears exactly as the line arrives, never before it starts.
    const target = shownAt.get(e.target)!;
    if (target > line.at) expect(target).toBeGreaterThanOrEqual(line.at + line.duration);
  }
  return tl;
}

describe("buildReplay", () => {
  it("the overview progresses through several visible events before the plan appears", async () => {
    const g = await graph();
    const tl = checkLines(g);
    const planAt = replayTimes(tl).shownAt.get("plan")!;
    const before = tl.events.filter((e) => e.at < planAt);
    expect(before.filter((e) => e.type === "show_node").length).toBeGreaterThanOrEqual(5);
    expect(before.filter((e) => e.type === "draw_edge").length).toBe(4);
    // Then each decision's line into the plan, one at a time.
    const into = tl.events.filter((e) => e.type === "draw_edge" && e.edgeId.endsWith(">part_of>plan"));
    expect(new Set(into.map((e) => e.at)).size).toBe(4);
  });

  it("replays a focused decision in recorded order, rejected candidates receding after the re-test", async () => {
    const g = await graph();
    const tl = checkLines(g, "artist_music");
    const { shownAt, recedeAt } = replayTimes(tl);
    const at = (id: string) => shownAt.get(id)!;
    expect(at("artist_music:user")).toBeLessThan(at("artist_music:llm"));
    expect(at("artist_music:llm")).toBeLessThan(at("artist_music:q:audience"));
    expect(at("artist_music:q:audience")).toBeLessThan(at("artist_music:candidate:0"));
    expect(at("artist_music:candidate:1")).toBeLessThan(at("artist_music:retest"));
    expect(at("artist_music:retest")).toBeLessThan(at("artist_music:final"));
    const rejected = g.nodes.find((n) => n.slot === "artist_music" && n.kind === "candidate" && n.state === "rejected")!;
    expect(recedeAt.get(rejected.id)).toBeGreaterThan(at("artist_music:retest"));
    // The other decisions are context from the start.
    expect(tl.initial).toContain("brand_collaboration:final");
    expect(stepChanges(tl).map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("is deterministic", async () => {
    const g = await graph();
    expect(buildReplay(g, "artist_music")).toEqual(buildReplay(g, "artist_music"));
  });
});
