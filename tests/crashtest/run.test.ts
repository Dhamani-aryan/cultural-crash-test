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

  it("keeps upgrading thin choices when a contradicted choice can't be replaced", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ draft: { artist: "Canal Echo" } });
    // Both brands in this world are excluded, so the contradicted brand has no possible replacement.
    const state = await runCrashTest({ qloo: client, llm }, {
      ...LONDON_BRIEF,
      constraints: [{ id: "x", kind: "hard", description: "No Mossgrove or Fieldnote", excludeNames: ["Mossgrove", "Fieldnote"] }],
    });
    expect(state.evaluations[0].components.find((c) => c.slot === "brand_collaboration")).toMatchObject({ status: "constraint_conflict", contradicted: true });
    expect(state.evaluations[0].components.find((c) => c.slot === "artist_music")?.status).toBe("weak");
    // The brand round finds nothing; the spare round still upgrades the thin music act.
    expect(state.actions.map((a) => a.slot)).toEqual(["brand_collaboration", "artist_music"]);
    expect(state.actions[1].why).toMatch(/^No candidate could replace the contradicted choices/);
    expect(state.changes).toHaveLength(1);
    expect(state.changes[0]).toMatchObject({ slot: "artist_music", before: "Canal Echo", after: "Grey Lane", retest: { accepted: true } });
    const last = state.evaluations.at(-1)!;
    expect(last.components.find((c) => c.slot === "artist_music")?.status).toBe("supported");
    // The unfixable choice stays, still flagged, and the run says why it stopped.
    expect(last.components.find((c) => c.slot === "brand_collaboration")?.label).toBe("Mossgrove");
    expect(state.stopReason).toBe("no_material_improvement");
    expect(state.unresolvedQuestions.join(" ")).toMatch(/Collaboration brand/);
  });

  it("lets the model veto every candidate as the wrong role, as an open question", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ pick: "none", reason: "None of these acts suits a skate launch." });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.changes).toHaveLength(0);
    expect(state.unresolvedQuestions.join(" ")).toMatch(/none fit the role \(None of these acts suits a skate launch\)/);
  });

  it("scores the agent's own suggestions in Qloo and can pick one outside Qloo's list", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ propose: ["Canal Echo", "Not A Real Act"], pick: [W.canalEcho.id] });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.changes[0]).toMatchObject({ slot: "artist_music", after: "Canal Echo" });
    expect(state.changes[0].reason).toMatch(/Suggested by the agent, then scored in Qloo/);
    const scoring = state.evidenceLedger.find((r) => /agent's own music act suggestions/.test(r.purpose));
    expect(scoring?.warnings.join(" ")).toMatch(/"Not A Real Act" isn't in Qloo/);
  });

  it("stops trying candidates once one makes the choice supported", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ propose: ["Canal Echo"], pick: [W.localRapper.id, W.canalEcho.id] });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.changes.filter((c) => c.iteration === 1)).toHaveLength(1);
    expect(state.changes[0].after).toBe("Grey Lane");
  });

  it("keeps a local choice with thin evidence, and one Qloo doesn't know, as open questions", async () => {
    // No local alternative in the audience list, so nothing can upgrade them.
    const { client } = worldClient({ artistCandidates: [W.otherUs] });
    const { llm } = worldLlm({ draft: { artist: "Canal Echo", brand: "Unknown Collective" } });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.changes).toHaveLength(0);
    expect(state.stopReason).toBe("acceptance_criteria_met");
    const final = state.evaluations.at(-1)!;
    expect(final.components.find((c) => c.slot === "artist_music")).toMatchObject({ status: "weak", contradicted: false });
    expect(final.components.find((c) => c.slot === "brand_collaboration")).toMatchObject({ status: "unresolved", contradicted: false });
    const open = state.unresolvedQuestions.join(" ");
    expect(open).toMatch(/"Canal Echo" was kept: the evidence is thin/);
    expect(open).toMatch(/"Unknown Collective" was kept but couldn't be tested/);
  });

  it("tests an audience anchor used as a choice against the other anchors, not itself", async () => {
    const { client, calls } = worldClient();
    const { llm } = worldLlm({ draft: { brand: "Northcap" } });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    const scored = calls.filter((c) => c.resultEntities?.includes(W.anchorA.id));
    expect(scored.length).toBeGreaterThan(0);
    for (const c of scored) expect(c.signalEntities).not.toContain(W.anchorA.id);
    expect(state.evaluations[0].components.find((c) => c.slot === "brand_collaboration")?.status).not.toBe("no_support");
  });

  it("upgrades a thin choice only to an agent suggestion Qloo rates Supported", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ draft: { artist: "Canal Echo" }, propose: ["Grey Lane"], pick: [W.localRapper.id] });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.changes[0]).toMatchObject({ before: "Canal Echo", after: "Grey Lane" });
    expect(state.actions[0].why).toMatch(/Nothing in the plan is contradicted/);
    expect(state.stopReason).toBe("acceptance_criteria_met");
  });

  it("keeps the thin choice when the upgrade wouldn't be Supported", async () => {
    const { client } = worldClient({ artistCandidates: [W.otherUs] });
    const { llm } = worldLlm({ draft: { artist: "Canal Echo", brand: "Unknown Collective" }, propose: ["Unknown Collective"] });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.plan!.components.find((c) => c.slot === "artist_music")?.label).toBe("Canal Echo");
    expect(state.stopReason).toBe("acceptance_criteria_met");
  });

  it("upgrades a thin choice to a local act from Qloo's list, but never to an import", async () => {
    const { client } = worldClient({ artistCandidates: [W.otherUs, W.localRapper] });
    const { llm } = worldLlm({ draft: { artist: "Canal Echo" }, pick: [W.otherUs.id, W.localRapper.id] });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.plan!.components.find((c) => c.slot === "artist_music")?.label).toBe("Grey Lane");
    expect(state.changes.some((c) => c.after === "Coast Kid")).toBe(false);
  });

  it("never upgrades to an agent suggestion from another country", async () => {
    const { client } = worldClient({ artistCandidates: [W.otherUs] });
    const { llm } = worldLlm({ draft: { artist: "Canal Echo" }, propose: ["Coast Kid"], pick: [W.otherUs.id] });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.plan!.components.find((c) => c.slot === "artist_music")?.label).toBe("Canal Echo");
  });

  it("flags a wrong namesake instead of testing (or replacing) the wrong entity", async () => {
    const { client } = worldClient();
    // The model means a British "Big Tex"; Qloo's only one is American.
    const { llm } = worldLlm({ draft: { countries: { anchors: ["UK", "UK"], artist: "United Kingdom", brand: "United Kingdom" } } });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    const artist = state.plan!.components.find((c) => c.slot === "artist_music")!;
    expect(artist).toMatchObject({ label: "Big Tex", resolution: "ambiguous" });
    expect(state.changes.filter((c) => c.slot === "artist_music")).toHaveLength(0);
    expect(state.unresolvedQuestions.join(" ")).toMatch(/Qloo only knows a different "Big Tex"/);
  });

  it("reads a plain-words description into a brief, then runs on it", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm();
    const state = await runCrashTest({ qloo: client, llm }, {
      query: "Streetwear pop-up in London for Northcap and Deckhouse fans. We want Big Tex to play. No Mossgrove.",
      marketId: "london",
    });
    expect(state.query).toMatch(/Streetwear pop-up/);
    expect(state.brief.audienceAnchors).toEqual(["Northcap", "Deckhouse"]);
    expect(state.brief.constraints[0]).toMatchObject({ excludeNames: ["Mossgrove"] });
    expect(state.assumptions[0]).toMatch(/Read from your description/);
    expect(state.initialPlan!.components.find((c) => c.slot === "artist_music")?.origin).toBe("user_provided");
    expect(state.stopReason).toBeDefined();
  });

  it("never tests the launching brand as its own collaborator", async () => {
    const { client } = worldClient();
    const { llm } = worldLlm({ draft: { brand: "Test Label" } });
    const state = await runCrashTest({ qloo: client, llm }, LONDON_BRIEF);
    expect(state.initialPlan!.components.find((c) => c.slot === "brand_collaboration")?.resolution).toBe("not_found");
    expect(state.assumptions.join(" ")).toMatch(/launching brand itself/);
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
