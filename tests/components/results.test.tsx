import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDecisions } from "@/lib/crashtest/explain";
import { runCrashTest } from "@/lib/crashtest/run";
import type { LaunchBriefInput } from "@/lib/crashtest/types";
import { ComparisonTable, decisionNarrative, narrativeSegments } from "@/components/plan-comparison";
import JudgeGraphView from "@/components/judge-graph-view";
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

  it("frames the result with a run receipt, a Table-first switch and the agent loop, without loading the graph", async () => {
    const html = renderToStaticMarkup(<RunResult state={await withUserChoice()} recorded />);
    expect(html).toContain("What the agent did");
    expect(html).toMatch(/4 choices tested · \d+ alternatives? tried · 1 accepted · 3 retained/);
    expect(html).toMatch(/Recorded run · \d{1,2} \w{3} \d{4}/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Table</);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Decision graph</);
    expect(html).toContain("Draft without Qloo");
    expect(html).toContain("Keep only improvements");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("Loading the decision graph");
    expect(html.match(/Evidence path →/g)).toHaveLength(4);
  });

  it("tags claims with their provenance inside the prose", async () => {
    const ds = buildDecisions(await finished({ ...LONDON_BRIEF, constraints: [{ id: "l", kind: "hard", lockSlot: "event_place", description: "Booked" }] }));
    const html = renderToStaticMarkup(<ComparisonTable decisions={ds} />);
    expect(html).toContain("Qloo audience result");
    expect(html).toContain("Full-plan re-test");
    expect(html).toContain("User constraint");
    expect(html).not.toContain("Evidence path");
    const changed = narrativeSegments(ds.find((d) => d.changed)!);
    expect(changed.find((s) => s.tag === "Full-plan re-test")?.text).toMatch(/re-tested/);
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

describe("decision graph view", () => {
  // Under the test runner there is no WebGL, so the view renders its text path: the same fallback a browser without WebGL gets.
  it("falls back to the text path, with Qloo evidence and candidates inspectable", async () => {
    const s = await finished();
    const html = renderToStaticMarkup(
      <JudgeGraphView state={s} decisions={buildDecisions(s)} recorded focus="artist_music" onFocus={() => {}} onStep={() => {}} />,
    );
    expect(html).toContain("The 3D view isn&#x27;t available in this browser");
    expect(html).not.toContain("<canvas");
    expect(html).toContain("Big Tex → Grey Lane");
    expect(html).toMatch(/aria-pressed="true"[^>]*>Music act · changed/);
    expect(html).toMatch(/<button[^>]*aria-expanded="false"[^>]*>Qloo evidence \(did not support\)/);
    expect(html).toMatch(/Candidate tested \(tested against\): Grey Lane — Accepted after the full-plan re-test/);
    expect(html).toContain("Replay decision path");
    expect(html).not.toContain("Fit graph"); // nothing to fit without the 3D view
    expect(html).toContain("not cause and effect");
  });

  it("opens on an overview when no decision is focused", async () => {
    const s = await finished();
    const html = renderToStaticMarkup(<JudgeGraphView state={s} decisions={buildDecisions(s)} recorded={false} focus={null} onFocus={() => {}} onStep={() => {}} />);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Overview/);
    expect(html).toContain("Your brief leads to four decisions and the final plan");
    expect(html).not.toContain("Evidence path</p>");
  });
});
