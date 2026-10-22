import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDecisions } from "@/lib/crashtest/explain";
import { runCrashTest } from "@/lib/crashtest/run";
import type { LaunchBriefInput } from "@/lib/crashtest/types";
import { ComparisonTable, decisionNarrative } from "@/components/plan-comparison";
import { RunResult } from "@/components/run-result";
import { LONDON_BRIEF, worldClient, worldLlm } from "../crashtest/world";

const finished = (brief: LaunchBriefInput = LONDON_BRIEF) => runCrashTest({ qloo: worldClient().client, llm: worldLlm().llm }, brief);
const withUserChoice = () => finished({ ...LONDON_BRIEF, existingChoices: [{ slot: "event_place", name: "Yard Hall" }] });

describe("results comparison", () => {
  it("introduces the three stages without dashboard cards", async () => {
    const html = renderToStaticMarkup(<RunResult state={await withUserChoice()} recorded />);
    expect(html).toContain("Here&#x27;s how the three plans compare.");
    expect(html).toContain("You specified 1 of 4 choices");
    expect(html).toContain("Your direction");
    expect(html).toContain("Your direction, the LLM draft and the agent&#x27;s recommendation");
    expect(html).not.toContain(">Graph<");
    expect(html).not.toContain("Review decision");
  });

  it("shows User, LLM and Agent side by side for every choice", async () => {
    const s = await withUserChoice();
    const html = renderToStaticMarkup(<ComparisonTable decisions={buildDecisions(s)} />);
    expect(html).toMatch(/<th[^>]*>You<\/th>/);
    expect(html).toMatch(/<th[^>]*>LLM<\/th>/);
    expect(html).toMatch(/<th[^>]*>Agent<\/th>/);
    expect(html.match(/<th scope="row"[^>]*>Why<\/th>/g)).toHaveLength(4);
    expect(html).toContain("Not specified");
    expect(html).toContain("Added by the LLM");
    expect(html).toContain("Carried forward from you");
  });

  it("keeps every explanation visible in the row immediately after its choice", async () => {
    const html = renderToStaticMarkup(<ComparisonTable decisions={buildDecisions(await finished())} />);
    expect(html).not.toContain("<details");
    expect(html).not.toContain('aria-expanded="false"');
    expect(html).toContain("The agent chose Grey Lane instead");
    expect(html).toContain("The agent kept Yard Market");
  });

  it("plainly distinguishes a user choice from an LLM addition", async () => {
    const ds = buildDecisions(await withUserChoice());
    const venue = ds.find((d) => d.slot === "event_place")!;
    const brand = ds.find((d) => d.slot === "brand_collaboration")!;
    expect(decisionNarrative(venue)).toMatch(/^You chose Yard Hall.*LLM carried/);
    expect(decisionNarrative(brand)).toMatch(/^You left this open, so the LLM proposed/);
  });

  it("explains retained choices as well as changed choices", async () => {
    const ds = buildDecisions(await finished());
    for (const d of ds) {
      const text = decisionNarrative(d);
      expect(text.length).toBeGreaterThan(60);
      expect(text).toMatch(d.changed ? /agent chose .* instead/i : /agent kept/i);
    }
  });
});
