import { describe, expect, it } from "vitest";
import { createMemoryCache } from "@/lib/cache/cache";
import { judgeRetest } from "@/lib/crashtest/evaluate";
import { runCrashTest } from "@/lib/crashtest/run";
import type { ComponentAssessment, ComponentStatus, PlanEvaluation, Slot } from "@/lib/crashtest/types";
import { withCache } from "@/lib/qloo/cached";
import { LONDON_BRIEF, W, worldClient, worldLlm } from "./world";

const SLOTS: Slot[] = ["artist_music", "brand_collaboration", "event_place", "creative_direction"];

/** A plan evaluation from four statuses, with contradicted choices marked. */
function plan(statuses: ComponentStatus[], opts: { contradicted?: Slot[]; violations?: number; score?: number } = {}): PlanEvaluation {
  const components: ComponentAssessment[] = SLOTS.map((slot, i) => ({
    slot,
    label: slot,
    status: statuses[i],
    total: statuses[i] === "supported" ? 0.8 : statuses[i] === "weak" ? 0.4 : undefined,
    coverage: "adequate",
    dimensions: [],
    finding: "",
    contradicted: !!opts.contradicted?.includes(slot),
  }));
  return {
    iteration: 0,
    rubricVersion: "crash-v1",
    totalScore: opts.score ?? 0.6,
    supported: statuses.filter((s) => s === "supported").length,
    scored: components.filter((c) => c.total !== undefined).length,
    contradicted: opts.contradicted?.length ?? 0,
    components,
    hardConstraintViolations: Array.from({ length: opts.violations ?? 0 }, (_, i) => `v${i}`),
    weakest: [],
    accepted: !opts.contradicted?.length,
  };
}

describe("judgeRetest (the acceptance guard)", () => {
  const S = "supported" as const;
  it("accepts a repair that removes a contradiction and loses nothing", () => {
    const r = judgeRetest(plan(["no_support", S, S, S], { contradicted: ["artist_music"] }), plan([S, S, S, S]), "artist_music", false);
    expect(r).toMatchObject({ slotStatusBefore: "no_support", slotStatusAfter: S, supportedBefore: 3, supportedAfter: 4, contradictedAfter: 0, lostSupported: [] });
    expect(r.rejectionCode).toBeUndefined();
  });

  it("rejects a swap that costs another Supported choice without removing a contradiction", () => {
    const r = judgeRetest(plan(["weak", S, S, S], { score: 0.6 }), plan([S, "weak", S, S], { score: 0.7 }), "artist_music", false);
    expect(r.rejectionCode).toBe("plan_regression");
    expect(r.lostSupported).toEqual(["brand_collaboration"]);
  });

  it("records the trade-off when the loss buys out a contradiction", () => {
    const r = judgeRetest(plan(["no_support", S, S, S], { contradicted: ["artist_music"] }), plan([S, "weak", S, S]), "artist_music", false);
    expect(r.rejectionCode).toBeUndefined();
    expect(r.lostSupported).toEqual(["brand_collaboration"]);
  });

  it("rejects a new hard-rule violation", () => {
    const r = judgeRetest(plan(["weak", S, S, S]), plan([S, S, S, S], { violations: 1 }), "artist_music", false);
    expect(r.rejectionCode).toBe("constraint_conflict");
  });

  it("rejects an upgrade that doesn't reach Supported, and a change that doesn't improve", () => {
    expect(judgeRetest(plan(["weak", S, S, S], { score: 0.5 }), plan(["weak", S, S, S], { score: 0.6 }), "artist_music", true).rejectionCode).toBe(
      "target_not_supported",
    );
    expect(judgeRetest(plan(["weak", S, S, S], { score: 0.6 }), plan(["weak", S, S, S], { score: 0.5 }), "artist_music", false).rejectionCode).toBe(
      "no_improvement",
    );
  });
});

describe("structured trace in RunState", () => {
  const run = (opts: Parameters<typeof worldClient>[0] = {}) =>
    runCrashTest({ qloo: worldClient(opts).client, llm: worldLlm().llm }, LONDON_BRIEF, { runVersion: "test:v1" });

  it("records every candidate with a re-test result or the reason it never reached one", async () => {
    const s = await run();
    expect(s.trials!.length).toBeGreaterThan(0);
    for (const t of s.trials!) {
      expect(t.iteration).toBeGreaterThan(0);
      expect(!!t.retest !== !!t.screenedOutReason).toBe(true);
    }
    const grey = s.trials!.find((t) => t.name === "Grey Lane")!;
    expect(grey).toMatchObject({ source: "qloo_list", audienceRank: 1, briefFit: "pass", retest: { accepted: true, slotStatusAfter: "supported" } });
    expect(s.trials!.find((t) => t.name === "Coast Kid")?.screenedOutReason).toBe("From another country");
  });

  it("gives every change a structured re-test, so nothing has to be read back from a sentence", async () => {
    const s = await run();
    for (const c of s.changes) {
      expect(c.retest).toBeDefined();
      expect(c.retest!.accepted).toBe(!c.reverted);
      if (c.reverted) expect(c.retest!.rejectionCode).toBeDefined();
    }
  });

  it("cites only ledger records from trials", async () => {
    const s = await run();
    const ids = new Set(s.evidenceLedger.map((r) => r.evidenceId));
    for (const t of s.trials!) for (const id of t.evidenceIds) expect(ids.has(id)).toBe(true);
  });

  it("labels a run live with its version, and keeps checks, reuse, cache hits and requests apart", async () => {
    const stats = { hits: 0, requests: 0 };
    const qloo = withCache(worldClient().client, createMemoryCache(500, new Map()), 60, stats);
    const s = await runCrashTest({ qloo, llm: worldLlm().llm, qlooStats: stats }, LONDON_BRIEF, { runVersion: "test:v1" });
    expect(s.provenance).toEqual({ mode: "live", runVersion: "test:v1" });
    const u = s.qlooUsage!;
    expect(u.reused).toBeGreaterThan(0);
    expect(u.checks).toBe(s.qlooCallsUsed + u.reused);
    // Everything that got past the run's own memory went to the cache or out to Qloo, once.
    expect(u.cacheHits! + u.requests!).toBe(s.qlooCallsUsed);
    expect(u.requests).toBeLessThanOrEqual(s.qlooCallsUsed);
  });

  it("doesn't claim cache or request counts it didn't measure", async () => {
    const u = (await run()).qlooUsage!;
    expect(u.cacheHits).toBeUndefined();
    expect(u.requests).toBeUndefined();
  });

  it("records a screened-out round when no candidate passes", async () => {
    const s = await run({ artistCandidates: [W.otherUs] });
    expect(s.trials!.every((t) => t.screenedOutReason)).toBe(true);
  });
});
