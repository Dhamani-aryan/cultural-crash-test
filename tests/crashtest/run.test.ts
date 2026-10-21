import { describe, expect, it } from "vitest";
import { toMarkdown } from "@/lib/crashtest/report";
import { runCrashTest } from "@/lib/crashtest/run";
import type { RunEvent } from "@/lib/crashtest/types";
import { LONDON_BRIEF, W, worldClient, worldLlm } from "./world";

describe("runCrashTest", () => {
  it("finds the unsupported choice, repairs only it, re-tests and accepts", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm();
    const events: RunEvent[] = [];
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF, { emit: (e) => events.push(e) });

    expect(state.stopReason).toBe("acceptance_criteria_met");
    const first = state.evaluations[0];
    expect(first.components.find((c) => c.slot === "artist_music")?.status).toBe("no_support");
    expect(first.weakest[0]).toBe("artist_music");

    // One targeted change; the other components are untouched.
    expect(state.changes).toHaveLength(1);
    expect(state.changes[0]).toMatchObject({ slot: "artist_music", before: "Big Tex", after: "Grey Lane" });
    const before = state.initialPlan!.components.filter((c) => c.slot !== "artist_music");
    const after = state.plan!.components.filter((c) => c.slot !== "artist_music");
    expect(after).toEqual(before);

    const last = state.evaluations.at(-1)!;
    expect(last.accepted).toBe(true);
    expect(last.supported).toBe(4);

    // Every evidence ID a change or a score cites exists in the ledger.
    const ids = new Set(state.evidenceLedger.map((r) => r.evidenceId));
    for (const id of state.changes[0].triggeringEvidenceIds) expect(ids.has(id)).toBe(true);
    for (const c of last.components) for (const d of c.dimensions) for (const id of d.evidenceIds) expect(ids.has(id)).toBe(true);

    expect(events.at(-1)?.type).toBe("done");
    expect(events.some((e) => e.type === "action")).toBe(true);
    expect(state.verdict).toBe("Verdict from the recorded facts.");
  });

  it("never changes a locked choice and says why it stopped", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm();
    const state = await runCrashTest({ qloo: client, llm }, {
      ...LONDON_BRIEF,
      constraints: [{ id: "c1", description: "Keep the headliner", kind: "hard", lockSlot: "artist_music" }],
    });
    expect(state.changes).toHaveLength(0);
    expect(state.plan!.components.find((c) => c.slot === "artist_music")?.label).toBe("Big Tex");
    // Every adjustable choice passes; the locked weak one is reported as an open risk.
    expect(state.stopReason).toBe("acceptance_criteria_met");
    expect(state.unresolvedQuestions.join(" ")).toMatch(/Big Tex" is locked/);
  });

  it("stops at exactly the Qloo call budget and still reports", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm();
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF, { limits: { maxQlooCalls: 12 } });
    expect(state.stopReason).toBe("api_budget_limit");
    expect(state.qlooCallsUsed).toBe(12);
    expect(toMarkdown(state)).toContain("Reached the Qloo call budget");
  });

  it("stops at the repair-round limit", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm();
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF, { limits: { maxRepairs: 0 } });
    expect(state.stopReason).toBe("iteration_limit");
    expect(state.changes).toHaveLength(0);
  });

  it("records an open question when no candidate passes the screen", async () => {
    const { client } = worldClient({ artistCandidates: [W.otherUs] });
    const { llm } = worldLlm({ pick: W.otherUs.id });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.changes).toHaveLength(0);
    expect(state.stopReason).toBe("no_material_improvement");
    expect(state.unresolvedQuestions.join(" ")).toMatch(/Music act/);
  });

  it("lets the model veto every candidate as the wrong role, as an open question", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ pick: "none", reason: "None of these acts suits a skate launch." });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.changes).toHaveLength(0);
    expect(state.unresolvedQuestions.join(" ")).toMatch(/none fit the role \(None of these acts suits a skate launch\)/);
  });

  it("ignores a model pick that isn't on the screened list", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ pick: "made-up-id" });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.changes[0].after).toBe("Grey Lane");
    expect(state.changes[0].reason).toMatch(/wasn't on the list/);
  });

  it("drops an excluded name from the draft's choices as a constraint conflict", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm();
    const state = await runCrashTest({ qloo: client, llm }, {
      ...LONDON_BRIEF,
      constraints: [{ id: "c1", description: "No Mossgrove", kind: "hard", excludeNames: ["Mossgrove"] }],
    });
    const first = state.evaluations[0];
    expect(first.components.find((c) => c.slot === "brand_collaboration")?.status).toBe("constraint_conflict");
    expect(first.hardConstraintViolations).toHaveLength(1);
    expect(state.plan!.components.find((c) => c.slot === "brand_collaboration")?.label).toBe("Fieldnote");
    expect(state.evaluations.at(-1)!.hardConstraintViolations).toHaveLength(0);
  });

  it("reports Qloo errors as coverage errors instead of inventing evidence", async () => {
    const { client } = worldClient({ insightsError: new Error("Qloo 503") });
    const { llm } = worldLlm();
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    const errors = state.evidenceLedger.filter((r) => r.coverageStatus === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(state.stopReason).toBe("error");
    expect(state.evaluations[0].accepted).toBe(false);
    expect(state.evaluations[0].components.every((c) => c.status !== "supported")).toBe(true);
  });

  it("stops as cancelled when the signal is aborted", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm();
    const ac = new AbortController();
    ac.abort();
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF, { signal: ac.signal });
    expect(state.stopReason).toBe("user_cancelled");
  });

  it("keeps secrets out of the state and the report", async () => {
    process.env.QLOO_API_KEY = "qk_secret_for_test";
    const { client } = worldClient();
    const { llm } = worldLlm();
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(JSON.stringify(state)).not.toContain("qk_secret_for_test");
    expect(toMarkdown(state)).not.toContain("qk_secret_for_test");
  });
});
