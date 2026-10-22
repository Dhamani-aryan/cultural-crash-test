import { describe, expect, it } from "vitest";
import { buildDecisions } from "@/lib/crashtest/explain";
import { buildJudgeGraph, graphAsTree, pathText, RELATION_LABEL, retestOutcome, visibleGraph } from "@/lib/crashtest/judge-graph";
import { layoutGraph } from "@/lib/crashtest/judge-layout";
import { runCrashTest } from "@/lib/crashtest/run";
import type { LaunchBriefInput, RunState } from "@/lib/crashtest/types";
import { LONDON_BRIEF, worldClient, worldLlm } from "./world";

/** A London-style brief on the synthetic world: one open user choice, one booked venue, one rule. */
const DEMO: LaunchBriefInput = {
  ...LONDON_BRIEF,
  existingChoices: [
    { slot: "artist_music", name: "Big Tex" },
    { slot: "event_place", name: "Yard Hall" },
  ],
  constraints: [
    { id: "c1", kind: "hard", lockSlot: "event_place", description: "Keep the venue: Yard Hall is booked" },
    { id: "c2", kind: "hard", description: "No collaboration with Supreme", excludeNames: ["Supreme"] },
  ],
};

const run = (brief: LaunchBriefInput = DEMO, over: Parameters<typeof worldLlm>[0] = {}) =>
  runCrashTest({ qloo: worldClient().client, llm: worldLlm(over).llm }, brief);

describe("buildJudgeGraph", () => {
  it("overview is one plan, one brief and one node per decision", async () => {
    const g = buildJudgeGraph(await run());
    const { nodes, edges } = visibleGraph(g);
    expect(nodes.map((n) => n.kind).sort()).toEqual(["brief", "final_choice", "final_choice", "final_choice", "final_choice", "plan"]);
    expect(edges.filter((e) => e.relation === "decided_from")).toHaveLength(4);
    expect(edges.filter((e) => e.relation === "part_of")).toHaveLength(4);
  });

  it("keeps user and LLM provenance apart", async () => {
    const g = buildJudgeGraph(await run());
    const rel = (s: string) => g.edges.find((e) => e.source === `${s}:user` && e.target === `${s}:llm`)!.relation;
    expect(rel("artist_music")).toBe("supplied_by_user");
    expect(rel("brand_collaboration")).toBe("added_by_llm");
    expect(g.nodes.find((n) => n.id === "brand_collaboration:user")?.label).toBe("Open slot");
  });

  it("every Qloo node and every edge carrying evidence cites real ledger records", async () => {
    const s = await run();
    const ids = new Set(s.evidenceLedger.map((r) => r.evidenceId));
    const g = buildJudgeGraph(s);
    const qloo = g.nodes.filter((n) => n.kind === "qloo_evidence");
    expect(qloo.length).toBeGreaterThan(0);
    for (const n of qloo) {
      expect(n.evidenceIds.length).toBeGreaterThan(0);
      for (const id of n.evidenceIds) expect(ids.has(id)).toBe(true);
    }
    for (const e of g.edges) for (const id of e.evidenceIds) expect(ids.has(id)).toBe(true);
  });

  it("candidates come only from recorded changes; rejections need a reverted re-test", async () => {
    const s = await run();
    const reverted = { ...s.changes[0], after: "Coast Kid", reverted: true, observedEffect: "Music act n/a → 0.25 (weak); plan 2/4 supported, score 0.40 → 2/4, 0.41." };
    const state: RunState = { ...s, changes: [reverted, ...s.changes] };
    const g = buildJudgeGraph(state);
    const candidates = g.nodes.filter((n) => n.kind === "candidate");
    expect(candidates.map((n) => n.label).sort()).toEqual(state.changes.map((c) => c.after).sort());
    const coast = candidates.find((n) => n.label === "Coast Kid")!;
    expect(coast.state).toBe("rejected");
    expect(coast.detail).toBe("Rejected after the full-plan re-test: as the music act it tested weak; the plan went from 2/4 to 2/4 supported.");
    const rejections = g.edges.filter((e) => e.relation === "rejected_after_retest");
    expect(rejections.map((e) => e.target)).toEqual([coast.id]);
    expect(g.nodes.find((n) => n.label === "Grey Lane" && n.kind === "candidate")?.state).toBe("accepted");
    expect(g.edges.some((e) => e.relation === "accepted_after_retest" && e.target === "artist_music:final")).toBe(true);
  });

  it("takes constraints only from the brief, attached where they applied", async () => {
    const g = buildJudgeGraph(await run());
    expect(g.nodes.find((n) => n.id === "event_place:lock")?.detail).toBe("Keep the venue: Yard Hall is booked");
    expect(g.edges.some((e) => e.source === "event_place:llm" && e.relation === "constrained_by")).toBe(true);
    expect(g.edges.some((e) => e.source === "artist_music:retest" && e.target === "artist_music:rule:c2")).toBe(true);
    expect(g.nodes.filter((n) => n.label === "Your rule").every((n) => n.detail?.includes("Supreme"))).toBe(true);
  });

  it("shows missing evidence as uncertainty, never as failure", async () => {
    const s = await run(
      { ...LONDON_BRIEF, brandAttributes: ["workwear"], constraints: [{ id: "r", kind: "hard", description: "No luxury collaboration" }] },
      { draft: { brand: "Unknown Collective" } },
    );
    const g = buildJudgeGraph(s);
    const brand = g.nodes.filter((n) => n.slot === "brand_collaboration");
    expect(brand.find((n) => n.kind === "final_choice")?.state).toBe("uncertain");
    expect(brand.find((n) => n.id.endsWith(":lookup"))?.detail).toMatch(/missing evidence, not evidence against it/);
    expect(brand.find((n) => n.label === "Your rule")?.state).toBe("uncertain");
    expect(g.nodes.some((n) => (n.state as string) === "failed")).toBe(false);
  });

  it("reaches the same conclusions as the table", async () => {
    const s = await run();
    const ds = buildDecisions(s);
    const g = buildJudgeGraph(s, ds);
    for (const d of ds) {
      const final = g.nodes.find((n) => n.id === `${d.slot}:final`)!;
      expect(final.label).toBe(d.revised.label);
      expect(final.state === "accepted").toBe(d.changed);
      expect(g.decisions.find((x) => x.slot === d.slot)!.changed).toBe(d.changed);
    }
  });

  it("never paints a win the evidence doesn't show (baseline-favoured run)", async () => {
    const s = await run();
    const reversed: RunState = { ...s, initialPlan: s.plan, plan: s.initialPlan, evaluations: [s.evaluations.at(-1)!, s.evaluations[0]] };
    const g = buildJudgeGraph(reversed);
    const music = g.nodes.find((n) => n.id === "artist_music:final")!;
    expect(music.label).toBe("Big Tex");
    expect(music.state).toBe("uncertain");
    expect(g.nodes.find((n) => n.id === "artist_music:llm")!.state).toBe("supported");
    expect(g.nodes.filter((n) => n.state === "accepted").every((n) => n.kind !== "final_choice" || n.detail?.includes("Supported"))).toBe(true);
  });

  it("draws a run that changed nothing as four retained decisions, with no candidates or green change", async () => {
    const s = await run();
    const same: RunState = { ...s, plan: s.initialPlan, changes: [], evaluations: [s.evaluations[0], s.evaluations[0]] };
    const g = buildJudgeGraph(same);
    expect(g.nodes.filter((n) => n.kind === "candidate")).toEqual([]);
    expect(g.nodes.filter((n) => n.state === "accepted")).toEqual([]);
    expect(g.edges.filter((e) => e.relation === "retained")).toHaveLength(4);
    expect(g.decisions.every((d) => !d.changed && d.headline.endsWith("· kept"))).toBe(true);
  });

  it("names every relationship and never claims causation or success", async () => {
    const g = buildJudgeGraph(await run());
    const words = [...g.edges.map((e) => RELATION_LABEL[e.relation]), ...g.nodes.map((n) => `${n.label} ${n.detail ?? ""}`)].join(" ");
    expect(words).not.toMatch(/\b(caus\w*|drives|proves?|guarantee|will (succeed|sell|win))\b/i);
  });

  it("gives every focused decision a readable text path in replay order", async () => {
    const g = buildJudgeGraph(await run());
    const path = pathText(g, "artist_music");
    expect(path[0].text).toMatch(/^Your brief/);
    expect(path.at(-1)?.text).toMatch(/^Final choice/);
    expect(path.some((p) => p.inspectable && p.kind === "qloo_evidence")).toBe(true);
  });

  it("reads an unparsable re-test record plainly", () => {
    expect(retestOutcome({ iteration: 1, slot: "artist_music", before: "a", after: "b", reason: "", triggeringEvidenceIds: [], expectedEffect: "", reverted: true })).toBe(
      "Rejected after the full-plan re-test.",
    );
  });

  it("lays out deterministically: plan centred in the overview, focus by replay step", async () => {
    const g = buildJudgeGraph(await run());
    const a = layoutGraph(g);
    expect(layoutGraph(g)).toEqual(a);
    const plan = a.positions.plan;
    const finals = g.nodes.filter((n) => n.kind === "final_choice").map((n) => a.positions[n.id]);
    // Four decisions surround the plan: two on each side, two above and two below it.
    expect(finals.filter((p) => p[0] < plan[0])).toHaveLength(2);
    expect(finals.filter((p) => p[1] > plan[1])).toHaveLength(2);
    // The brief sits outside that ring, so its lines to the decisions never cross the plan.
    expect(a.positions.brief[0]).toBeLessThan(Math.min(...finals.map((p) => p[0])));
    const f = layoutGraph(g, "artist_music");
    const x = (id: string) => f.positions[id][0];
    expect(x("artist_music:user")).toBeLessThan(x("artist_music:llm"));
    expect(x("artist_music:llm")).toBeLessThan(x("artist_music:q:audience"));
    expect(x("artist_music:q:audience")).toBeLessThan(x("artist_music:candidate:0"));
    expect(x("artist_music:candidate:0")).toBeLessThan(x("artist_music:retest"));
    expect(x("artist_music:retest")).toBeLessThan(x("artist_music:final"));
    expect(f.active.has("brand_collaboration:final")).toBe(false);
    for (const n of visibleGraph(g, "artist_music").nodes) expect(f.positions[n.id]).toBeDefined();
  });

  it("matches the reviewed London fixture", async () => {
    await expect(graphAsTree(buildJudgeGraph(await run()))).toMatchFileSnapshot("./__fixtures__/judge-graph.london.txt");
  });
});
