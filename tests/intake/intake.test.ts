import { describe, expect, it } from "vitest";
import { LaunchBriefSchema } from "@/lib/crashtest/types";
import type { LlmClient } from "@/lib/llm/types";
import { applyIntake, newIntake } from "@/lib/intake/state";
import { MAX_CLARIFICATION_TURNS, type IntakeState } from "@/lib/intake/types";
import { infersSensitiveTrait, missingFields, refresh, toLaunchBrief } from "@/lib/intake/validate";
import { handleCrashTest } from "@/lib/server/handlers";

/** Empty extraction: every field present, nothing stated. */
const none: Record<string, unknown> = {
  brandName: "",
  productCategory: "",
  launchGoal: "",
  cityText: "",
  audienceDescription: "",
  audienceAnchors: [],
  brandAttributes: [],
  budgetBand: "",
  website: "",
  choices: [],
  exclude: [],
  otherRules: [],
};

/** A fake model: `facts` maps a message substring to what extraction returns for it. */
function fakeLlm(facts: Record<string, Record<string, unknown>>, hypotheses: unknown[] = []) {
  const calls: string[] = [];
  const llm: LlmClient = {
    provider: "fake",
    model: "fake",
    async generateText({ system, prompt }) {
      calls.push(system.slice(0, 30));
      const reply = (x: unknown) => ({ text: JSON.stringify(x), usage: null, model: "fake", ms: 1 });
      if (system.startsWith("You read one message")) {
        const msg = prompt.slice(prompt.indexOf('Message:\n"""') + 12);
        const hit = Object.entries(facts).find(([k]) => msg.includes(k));
        return reply({ ...none, ...(hit?.[1] ?? {}) });
      }
      if (system.startsWith("Suggest 2 or 3 broad audience")) return reply({ hypotheses });
      throw new Error(`unexpected prompt: ${system.slice(0, 40)}`);
    },
  };
  return { llm, calls };
}

const FULL = "FULL";
const fullFacts = {
  [FULL]: {
    brandName: "Northline",
    productCategory: "Sustainable streetwear",
    launchGoal: "Limited capsule launch",
    cityText: "London",
    audienceDescription: "18–30 skate and independent-fashion fans",
    brandAttributes: ["sustainable", "DIY"],
    choices: [{ slot: "event_place" as const, name: "Village Underground", locked: true }],
    exclude: ["Gucci"],
  },
};

const lastAssistant = (s: IntakeState) => [...s.messages].reverse().find((m) => m.role === "assistant")!.text;

describe("intake", () => {
  it("turns a complete description into a ready brief only after review and confirmation", async () => {
    const { llm } = fakeLlm(fullFacts);
    const r1 = await applyIntake(llm, { action: "message", message: FULL, marketId: "london" });
    expect(r1.state.missingCriticalFields).toEqual([]);
    expect(r1.state.readyToRun).toBe(false);
    expect(lastAssistant(r1.state)).toMatch(/confirm/i);
    const r2 = await applyIntake(llm, { action: "confirm", state: r1.state });
    expect(r2.state.confirmed).toBe(true);
    expect(r2.state.readyToRun).toBe(true);
  });

  it("asks only for what's genuinely missing", async () => {
    const { llm } = fakeLlm({ pop: { productCategory: "Sneakers", launchGoal: "pop-up", cityText: "London" } });
    const r = await applyIntake(llm, { action: "message", message: "A sneaker pop-up in London", marketId: "london" });
    expect(r.state.missingCriticalFields).toEqual(["audience", "brandContext"]);
    const text = lastAssistant(r.state);
    expect(text).toMatch(/Who is it for/);
    expect(text).toMatch(/stand for/);
    expect(text).not.toMatch(/What kind of launch/);
    expect(text).not.toMatch(/Which city/);
    expect(r.state.chips.some((c) => c.action === "explore_audience")).toBe(true);
  });

  it("merges a later answer without erasing earlier facts", async () => {
    const { llm } = fakeLlm({
      pop: { productCategory: "Sneakers", launchGoal: "pop-up", audienceAnchors: ["Nike"] },
      fans: { audienceDescription: "Sneaker collectors", audienceAnchors: ["Stüssy"], brandAttributes: ["bold"] },
    });
    const r1 = await applyIntake(llm, { action: "message", message: "A sneaker pop-up", marketId: "london" });
    const r2 = await applyIntake(llm, { action: "message", message: "For sneaker fans, bold", state: r1.state });
    const b = r2.state.brief;
    expect(b.productCategory).toBe("Sneakers");
    expect(b.launchGoal).toBe("pop-up");
    expect(b.audienceAnchors).toEqual(["Nike", "Stüssy"]);
    expect(b.audienceDescription).toBe("Sneaker collectors");
    expect(r2.state.missingCriticalFields).toEqual([]);
  });

  it("asks the user to settle a city the text and the selector disagree on", async () => {
    const { llm } = fakeLlm({ Tokyo: { ...fullFacts[FULL], cityText: "Tokyo" } });
    const r = await applyIntake(llm, { action: "message", message: "Launching in Tokyo", marketId: "london" });
    expect(r.state.missingCriticalFields).toContain("cityConflict");
    expect(lastAssistant(r.state)).toMatch(/You mention Tokyo, but London is selected/);
    const pick = r.state.chips.find((c) => c.label === "Tokyo")!;
    const r2 = await applyIntake(llm, { action: pick.action!, patch: pick.patch as never, state: r.state });
    expect(r2.state.brief.marketId).toBe("tokyo");
    expect(r2.state.missingCriticalFields).not.toContain("cityConflict");
  });

  it("proposes non-sensitive audience ideas and requires the user to pick one", async () => {
    const { llm } = fakeLlm(
      { pop: { productCategory: "Sneakers", launchGoal: "pop-up", brandAttributes: ["bold"] } },
      [
        { label: "Sneaker collectors", description: "People who queue for limited drops", suggestedAnchors: ["Nike", "Patta"], assumptions: ["Drop culture"] },
        { label: "Religious youth groups", description: "Defined by religion", suggestedAnchors: [], assumptions: [] },
        { label: "Skate scene", description: "Skaters and DIY fans", suggestedAnchors: ["Palace"], assumptions: [] },
      ],
    );
    const r1 = await applyIntake(llm, { action: "message", message: "A sneaker pop-up", marketId: "london" });
    const r2 = await applyIntake(llm, { action: "explore_audience", state: r1.state });
    expect(r2.state.audienceHypotheses.map((h) => h.label)).toEqual(["Sneaker collectors", "Skate scene"]);
    expect(r2.state.missingCriticalFields).toContain("audience");
    const r3 = await applyIntake(llm, { action: "select_audience", hypothesisId: "H1", state: r2.state });
    expect(r3.state.brief.audienceDescription).toMatch(/Sneaker collectors/);
    expect(r3.state.origins.audienceDescription).toBe("user_confirmed");
    expect(r3.state.brief.audienceAnchors).toEqual(["Nike", "Patta"]);
    expect(r3.state.origins.audienceAnchors).toBe("model_suggested");
    expect(r3.state.missingCriticalFields).not.toContain("audience");
  });

  it("rejects audience descriptions built on sensitive traits", () => {
    expect(infersSensitiveTrait("young Muslim women")).toBe(true);
    expect(infersSensitiveTrait("low-income families")).toBe(true);
    expect(infersSensitiveTrait("London skate and independent streetwear fans")).toBe(false);
  });

  it("stops asking after the clarification-turn limit and keeps the run disabled", async () => {
    const { llm } = fakeLlm({});
    let s = (await applyIntake(llm, { action: "message", message: "hello there", marketId: "london" })).state;
    for (let i = 0; i < MAX_CLARIFICATION_TURNS + 2; i++)
      s = (await applyIntake(llm, { action: "message", message: `nothing useful ${i}`, state: s })).state;
    expect(s.clarificationTurns).toBe(MAX_CLARIFICATION_TURNS);
    expect(lastAssistant(s)).toMatch(/I've asked all I'll ask/);
    expect(s.readyToRun).toBe(false);
  });

  it("won't start before the brief is confirmed, even when asked", async () => {
    const { llm } = fakeLlm(fullFacts);
    const r1 = await applyIntake(llm, { action: "message", message: FULL, marketId: "london" });
    const r2 = await applyIntake(llm, { action: "message", message: "start the test", state: r1.state });
    expect(r2.startRequested).toBe(false);
    expect(lastAssistant(r2.state)).toMatch(/confirmed the brief/);
    const r3 = await applyIntake(llm, { action: "confirm", state: r2.state });
    const r4 = await applyIntake(llm, { action: "message", message: "start the test", state: r3.state });
    expect(r4.startRequested).toBe(true);
  });

  it("doesn't trust a client that claims readiness", async () => {
    const forged: IntakeState = { ...newIntake("london"), confirmed: true, readyToRun: true };
    expect(refresh(forged).readyToRun).toBe(false);
    const res = await handleCrashTest(
      new Request("http://test/api/crashtest", { method: "POST", body: JSON.stringify({ intake: forged }) }),
      () => {
        throw new Error("must not run");
      },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("brief_not_confirmed");
  });

  it("carries locks, exclusions and the exploration switch into the crash-test brief", async () => {
    const { llm } = fakeLlm(fullFacts);
    const r = await applyIntake(llm, { action: "message", message: FULL, marketId: "london" });
    expect(r.state.brief.exploreUserChoices).toBe(false);
    const brief = LaunchBriefSchema.parse(toLaunchBrief(r.state));
    expect(brief.exploreUserChoices).toBe(false);
    expect(brief.constraints).toContainEqual(expect.objectContaining({ lockSlot: "event_place" }));
    expect(brief.constraints).toContainEqual(expect.objectContaining({ excludeNames: ["Gucci"] }));
    const on = await applyIntake(llm, { action: "update_brief", patch: { exploreUserChoices: true }, state: r.state });
    expect(on.state.confirmed).toBe(false);
    expect(LaunchBriefSchema.parse(toLaunchBrief(on.state)).exploreUserChoices).toBe(true);
  });

  it("applies a brief edit through the HTTP handler without blanking other fields", async () => {
    const { handleIntake } = await import("@/lib/server/handlers");
    const { llm } = fakeLlm(fullFacts);
    const r = await applyIntake(llm, { action: "message", message: FULL, marketId: "london" });
    const res = await handleIntake(
      new Request("http://test/api/intake", {
        method: "POST",
        body: JSON.stringify({ action: "update_brief", patch: { budgetBand: "£20k" }, state: r.state }),
      }),
      () => llm,
    );
    const { state } = await res.json();
    expect(state.brief.budgetBand).toBe("£20k");
    expect(state.brief.productCategory).toBe("Sustainable streetwear");
    expect(state.brief.choices).toHaveLength(1);
    expect(state.origins.productCategory).toBe("user_supplied");
  });

  it("treats a model-suggested audience as not yet confirmed", () => {
    const s = newIntake("london");
    const withSuggestion = { ...s, brief: { ...s.brief, audienceDescription: "Skaters" }, origins: { audienceDescription: "model_suggested" as const } };
    expect(missingFields(withSuggestion)).toContain("audience");
  });

  it("never calls Qloo or anything but the model during the intake", async () => {
    const { llm, calls } = fakeLlm(fullFacts);
    await applyIntake(llm, { action: "message", message: FULL, marketId: "london" });
    expect(calls).toEqual(["You read one message from some"]);
  });
});
