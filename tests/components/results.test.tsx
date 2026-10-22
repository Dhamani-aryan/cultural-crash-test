import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildDecisions } from "@/lib/crashtest/explain";
import { runCrashTest } from "@/lib/crashtest/run";
import type { LaunchBriefInput, RunState } from "@/lib/crashtest/types";
import { DecisionDetail, DecisionMatrix, DecisionRow } from "@/components/plan-comparison";
import { RunResult } from "@/components/run-result";
import { LONDON_BRIEF, worldClient, worldLlm } from "../crashtest/world";

const finished = (brief: LaunchBriefInput = LONDON_BRIEF) => runCrashTest({ qloo: worldClient().client, llm: worldLlm().llm }, brief);
const ledgerOf = (s: RunState) => new Map(s.evidenceLedger.map((r) => [r.evidenceId, r]));
const withUserChoice = () => finished({ ...LONDON_BRIEF, existingChoices: [{ slot: "event_place", name: "Yard Hall" }] });

describe("results markup", () => {
  it("leads with the real delta and the three stages' counts", async () => {
    const html = renderToStaticMarkup(<RunResult state={await withUserChoice()} recorded />);
    expect(html).toContain("London · Recorded run");
    expect(html).toContain("1 choice changed. 3 retained.");
    expect(html).toMatch(/Your brief.*1 of 4.*choices specified/);
    expect(html).toMatch(/LLM completion.*supported · \d contradicted/);
    expect(html).toContain("Brief held constant");
    expect(html).not.toMatch(/winner|guarantee/i);
  });

  it("puts every choice in one aligned row with an explicit review control, all closed", async () => {
    const s = await withUserChoice();
    const html = renderToStaticMarkup(<DecisionMatrix decisions={buildDecisions(s)} ledger={ledgerOf(s)} />);
    expect(html.match(/<li class="border-b/g)).toHaveLength(4);
    expect(html.match(/Review decision →/g)).toHaveLength(4);
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(4);
    expect(html).not.toContain('role="region"');
    expect(html).toContain("Show plan order");
  });

  it("separates user-supplied from LLM-added choices and never backfills the user stage", async () => {
    const s = await withUserChoice();
    const ds = buildDecisions(s);
    const row = (slot: string) => renderToStaticMarkup(<DecisionRow d={ds.find((d) => d.slot === slot)!} open={false} onToggle={() => {}} ledger={ledgerOf(s)} />);
    const venue = row("event_place");
    expect(venue).toContain("User supplied");
    expect(venue).toContain("From your brief");
    expect(venue).not.toContain("Added by LLM");
    const brand = row("brand_collaboration");
    expect(brand).toContain("Not specified");
    expect(brand).toContain("Added by LLM");
    expect(brand).not.toContain("User supplied");
  });

  it("orders changed rows first and keeps Your brief → LLM → reason → agent order in each row", async () => {
    const s = await finished();
    const ds = buildDecisions(s);
    expect(ds[0].changed).toBe(true);
    const html = renderToStaticMarkup(<DecisionRow d={ds[0]} open={false} onToggle={() => {}} ledger={ledgerOf(s)} />);
    const at = (t: string) => html.indexOf(t);
    expect(at("Your brief")).toBeLessThan(at("LLM completion"));
    expect(at("LLM completion")).toBeLessThan(at("Evidence / decision"));
    expect(at("Evidence / decision")).toBeLessThan(at("Qloo-tested agent"));
    expect(html).toContain("Changed by agent");
  });

  it("an opened change has the fixed structure, labelled, with raw evidence still closed", async () => {
    const s = await finished();
    const d = buildDecisions(s).find((x) => x.changed)!;
    const html = renderToStaticMarkup(<DecisionRow d={d} open onToggle={() => {}} ledger={ledgerOf(s)} />);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(`aria-labelledby="review-${d.slot}"`);
    const order = ["Decision 01", "Why move away", "Why this replacement", "What stayed fixed", "Proof", "Limits"].map((t) => html.indexOf(t));
    expect(order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1]))).toBe(true);
    expect(html).toContain("Qloo result");
    expect(html).toContain("Application evaluation");
    expect(html).toMatch(/<details><summary[^>]*>Inspect recorded evidence/);
    expect(html).not.toContain("<details open");
  });

  it("a retained choice says why it stayed", async () => {
    const s = await finished();
    const d = buildDecisions(s).find((x) => !x.changed)!;
    const html = renderToStaticMarkup(<DecisionDetail d={d} ledger={ledgerOf(s)} id="t" />);
    expect(html).toContain("Why it stayed");
    expect(html).not.toContain("Why move away");
    expect(html).toContain("· retained");
  });

  it("renders a baseline-favoured and an unchanged result truthfully", async () => {
    const s = await finished();
    const reversed: RunState = { ...s, initialPlan: s.plan, plan: s.initialPlan, evaluations: [s.evaluations.at(-1)!, s.evaluations[0]] };
    expect(renderToStaticMarkup(<RunResult state={reversed} />)).toContain("The LLM completion is better supported");
    const same: RunState = { ...s, plan: s.initialPlan, changes: [], evaluations: [s.evaluations[0], s.evaluations[0]] };
    const html = renderToStaticMarkup(<RunResult state={same} />);
    expect(html).toContain("0 choices changed. 4 retained.");
    expect(html).toContain("No choice changed");
  });
});
