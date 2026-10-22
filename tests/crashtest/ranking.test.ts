import { describe, expect, it } from "vitest";
import { fuseRanks, RRF_K } from "@/lib/crashtest/repair";
import { runCrashTest } from "@/lib/crashtest/run";
import { LONDON_BRIEF, worldClient, worldLlm } from "./world";

describe("reciprocal rank fusion", () => {
  it("adds 1 / (k + rank) per list and keeps each candidate's rank in every view", () => {
    const f = fuseRanks([
      { view: "audience", ids: ["a", "b", "c"] },
      { view: "local", ids: ["c", "a"] },
      { view: "coherence", ids: ["b"] },
    ]);
    expect(f.get("a")!.score).toBeCloseTo(1 / (RRF_K + 1) + 1 / (RRF_K + 2));
    expect(f.get("a")!.views).toEqual({ audience: 1, local: 2 });
    expect(f.get("c")!.views).toEqual({ audience: 3, local: 1 });
    // A candidate near the top of two views ranks first overall.
    const order = [...f].sort((x, y) => y[1].score - x[1].score).map(([id]) => id);
    expect(order[0]).toBe("a");
  });

  it("counts a candidate once per view even if a list repeats it", () => {
    const f = fuseRanks([{ view: "audience", ids: ["a", "a"] }]);
    expect(f.get("a")).toEqual({ score: 1 / (RRF_K + 1), views: { audience: 1 } });
  });
});

describe("ranking v2 (multi-view retrieval) in a full run", () => {
  it("repairs the same choice, records each view and the fused rank, and keeps v1 as the default", async () => {
    const v1 = await runCrashTest({ qloo: worldClient().client, llm: worldLlm().llm }, LONDON_BRIEF, { ranking: "v1" });
    const v2 = await runCrashTest({ qloo: worldClient().client, llm: worldLlm().llm }, LONDON_BRIEF, { ranking: "v2" });
    expect(v2.changes.find((c) => !c.reverted)).toMatchObject({ slot: "artist_music", before: "Big Tex", after: "Grey Lane" });
    const grey = v2.trials!.find((t) => t.name === "Grey Lane")!;
    expect(grey.views).toMatchObject({ audience: 1, local: 1 });
    expect(grey.fusedRank).toBe(1);
    // Every view is in the ledger, and the trial cites only those it appeared in.
    const purposes = v2.evidenceLedger.map((r) => r.purpose);
    expect(purposes.some((p) => /candidates for this audience/.test(p))).toBe(true);
    expect(purposes.some((p) => /own top list/.test(p))).toBe(true);
    const ids = new Set(v2.evidenceLedger.map((r) => r.evidenceId));
    for (const id of grey.evidenceIds) expect(ids.has(id)).toBe(true);
    // v1 keeps its single combined list and no view ranks.
    expect(v1.trials!.find((t) => t.name === "Grey Lane")!.views).toBeUndefined();
  });
});
