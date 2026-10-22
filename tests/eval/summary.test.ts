import { describe, expect, it } from "vitest";
import type { CaseRow } from "../../eval/run";
import { gates, summarize } from "../../eval/summary";

const scored = (supported: number) => ({ supported, total: 0.6, statuses: {} });
function row(id: string, draft: number, final: number, opts: Partial<{ evidence: "agent" | "tie" | "draft"; ms: number; violations: number; unknown: number; checks: number }> = {}): CaseRow {
  return {
    id,
    split: "heldout",
    city: "London",
    draft: [],
    final: [],
    draftUnresolved: [],
    inRun: { draft: scored(draft), final: scored(final) },
    heldOut: { anchors: [], missing: [], draft: scored(draft), final: scored(final) },
    evidenceJudge: opts.evidence ? ({ preferred: opts.evidence, consistent: true } as CaseRow["evidenceJudge"]) : null,
    judge: { preferred: "draft", consistent: true } as CaseRow["judge"],
    run: {
      stopReason: "acceptance_criteria_met",
      stopDetail: undefined,
      currentIteration: 1,
      qlooCallsUsed: opts.checks ?? 100,
      llmCalls: 4,
      ms: opts.ms ?? 60_000,
      changes: [
        { slot: "artist_music", before: "a", after: "b", reverted: false },
        { slot: "artist_music", before: "a", after: "c", reverted: true },
      ],
      metrics: {
        violations: opts.violations ?? 0,
        unknownUserChoicesChanged: opts.unknown ?? 0,
        accepted: 1,
        rejected: 1,
        abstained: 1,
        qlooChecks: opts.checks ?? 100,
        qlooReused: 10,
        qlooCacheHits: 40,
        qlooRequests: 50,
      },
    },
    error: null,
  };
}

describe("eval summary", () => {
  it("counts exactly, with the median and slowest run", () => {
    const s = summarize([row("a", 0, 2, { evidence: "agent", ms: 30_000 }), row("b", 1, 1, { evidence: "tie", ms: 50_000 }), row("c", 2, 1, { evidence: "draft", ms: 90_000 })]);
    expect(s).toMatchObject({ heldOutDraft: 3, heldOutFinal: 4, slots: 12, improved: 1, unchanged: 1, worsened: 1, accepted: 3, rejected: 3, abstained: 3, qlooRequests: 150, qlooCacheHits: 120, medianMs: 50_000, slowestMs: 90_000 });
    expect(s.evidence).toEqual({ agent: 1, tie: 1, draft: 1, judged: 3, consistent: 3 });
  });

  it("says 'not measured' rather than inventing request counts", () => {
    const r = row("a", 0, 1);
    r.run.metrics!.qlooRequests = null;
    expect(summarize([r, row("b", 0, 1)]).qlooRequests).toBeNull();
  });
});

describe("merge gates", () => {
  const A = summarize([row("a", 0, 2, { evidence: "agent" }), row("b", 0, 2, { evidence: "agent" })]);

  it("pass when B is no worse on every gate", () => {
    const B = summarize([row("a", 0, 3, { evidence: "agent" }), row("b", 0, 2, { evidence: "tie" })]);
    const g = gates(A, B, null, 0);
    expect(g.filter((x) => x.pass === false)).toEqual([]);
    // Plausibility isn't active until a case has been reviewed.
    expect(g.find((x) => x.name.startsWith("No reviewed plausibility"))?.pass).toBeNull();
  });

  it("fail on a held-out reduction, an evidence loss, a violation or a cost blow-up", () => {
    const B = summarize([row("a", 0, 1, { evidence: "draft", violations: 1, checks: 300 }), row("b", 0, 2, { evidence: "agent", unknown: 1 })]);
    const failed = gates(A, B, 1, 2).filter((x) => x.pass === false).map((x) => x.name);
    expect(failed).toEqual([
      "Zero hard-constraint violations",
      "Zero Qloo-unknown user choices replaced",
      "No evidence-judge losses",
      "No reduction in total held-out support",
      "No reviewed plausibility case implausible",
      "No material cost or latency regression (≤ 25% more)",
    ]);
  });
});
