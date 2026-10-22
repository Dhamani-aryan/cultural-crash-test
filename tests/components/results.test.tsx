import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildChangeExplanations } from "@/lib/crashtest/explain";
import { runCrashTest } from "@/lib/crashtest/run";
import { Explanation, PlanComparisonView } from "@/components/plan-comparison";
import { RunResult } from "@/components/run-result";
import { LONDON_BRIEF, worldClient, worldLlm } from "../crashtest/world";

const finished = () => runCrashTest({ qloo: worldClient().client, llm: worldLlm().llm }, LONDON_BRIEF);

describe("results markup", () => {
  it("starts compact: two cards, Changed/Kept markers, the comparison hidden behind one button", async () => {
    const html = renderToStaticMarkup(<RunResult state={await finished()} />);
    expect(html).toContain("LLM alone");
    expect(html).toContain("Qloo-grounded agent");
    expect(html).toContain("→ Changed");
    expect(html).toContain("= Kept");
    expect(html).toContain("Compare plans &amp; see why · 1 change");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('id="compare-plans"');
    expect(html).not.toContain("View Qloo evidence");
  });

  it("comparison mode shows every choice with its outcome and a 'why' action, explanations closed", async () => {
    const state = await finished();
    const html = renderToStaticMarkup(<PlanComparisonView state={state} explanations={buildChangeExplanations(state)} />);
    expect(html).toContain("Agent better supported");
    expect(html).toContain("Decided by code from the recorded evaluations");
    expect(html.match(/Why this change\?/g)).toHaveLength(1);
    expect(html.match(/Why it stayed/g)).toHaveLength(3);
    expect(html).toContain('aria-controls="why-artist_music"');
    expect(html).not.toContain("Why reconsider");
    expect(html).toContain("<summary");
  });

  it("an opened change explains both sides, with alternatives and evidence still collapsed", async () => {
    const state = await finished();
    const e = buildChangeExplanations(state).find((x) => x.changed)!;
    const ledger = new Map(state.evidenceLedger.map((r) => [r.evidenceId, r]));
    const html = renderToStaticMarkup(<Explanation e={e} ledger={ledger} id="t" />);
    expect(html).toContain("Why reconsider Big Tex?");
    expect(html).toContain("Why Grey Lane?");
    expect(html).toMatch(/<details><summary[^>]*>View Qloo evidence/);
    expect(html).not.toContain("<details open");
  });
});
