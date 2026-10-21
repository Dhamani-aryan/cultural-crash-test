import { describe, expect, it } from "vitest";
import { applyDecisions } from "@/lib/agent/decide";
import { extractReferences } from "@/lib/agent/extract";
import { runTranscreate } from "@/lib/agent/orchestrator";
import { lookupNames, pickMatch } from "@/lib/agent/resolve";
import { allowedNames, rewriteForMarket, unverifiedNames } from "@/lib/agent/rewrite";
import type { AgentEvent, ResolvedReference } from "@/lib/agent/types";
import type { EquivalentsResult } from "@/lib/engine/equivalents";
import type { LlmClient } from "@/lib/llm/types";
import { marketById } from "@/lib/markets";
import type { EntityMatch, QlooClient } from "@/lib/qloo";
import { demo, entity, fakeClient, tag } from "../engine/helpers";

/** A fake model: each handler gets the system+prompt and returns a JSON reply or null. */
function scriptedLlm(...handlers: ((system: string, prompt: string) => unknown)[]): LlmClient & {
  prompts: string[];
} {
  const prompts: string[] = [];
  return {
    provider: "fake",
    model: "fake",
    prompts,
    async generateText({ system, prompt }) {
      prompts.push(prompt);
      for (const h of handlers) {
        const out = h(system, prompt);
        if (out !== null && out !== undefined) {
          return { text: JSON.stringify(out), usage: null, model: "fake", ms: 1 };
        }
      }
      throw new Error(`no scripted reply for: ${system.slice(0, 60)}`);
    },
  };
}

const madrid = marketById("madrid")!;
const DINING = tag("urn:tag:genre:brand:dining", "urn:tag:genre:brand", "Dining");
const FRESH = tag("t:fresh", "urn:tag:core_value:qloo", "Freshness");

const equivalent = (id: string, name: string) => ({
  entity: entity(id, { name }),
  score: 0.9,
  parts: { role: 0.2, locality: 1, audience: 0.8, fame: 0.9 },
  sharedTags: ["Dining"],
  localRank: 1,
  poolSize: 100,
  alsoIn: [],
  proposed: false,
});

const ref = (over: Partial<ResolvedReference> = {}): ResolvedReference => ({
  ref: "R1",
  surface: "your Chipotle habit",
  name: "Chipotle",
  kind: "brand",
  job: "cheap, fast, healthy-ish lunch",
  entity: entity("anchor", { name: "Chipotle" }),
  domain: "brand",
  note: null,
  ...over,
});

const eqResult = (options: ReturnType<typeof equivalent>[]): EquivalentsResult => ({
  anchorId: "anchor",
  marketId: "madrid",
  domain: "brand",
  confidence: "strong",
  equivalents: options,
  rejected: [],
  anchor: { inCity: false, global: false },
  poolSize: 100,
  qlooCalls: 1,
});

describe("extractReferences", () => {
  it("keeps only spans that are really in the text and numbers them", async () => {
    const llm = scriptedLlm(() => ({
      references: [
        { surface: "Chipotle", name: "Chipotle", kind: "brand", job: "cheap lunch" },
        { surface: "Trader Joe", name: "Trader Joe's", kind: "brand", job: "invented span" },
        { surface: "Chipotle", name: "chipotle", kind: "brand", job: "duplicate" },
      ],
    }));
    const r = await extractReferences(llm, "Cheaper than Chipotle.");
    expect(r.references.map((x) => [x.ref, x.name])).toEqual([["R1", "Chipotle"]]);
    expect(r.dropped).toEqual(["Trader Joe"]);
  });
});

describe("pickMatch", () => {
  const match = (id: string, name: string, type: string): EntityMatch => ({
    ...entity(id, { name, type }),
    rank: 1,
  });
  it("prefers an exact name of the guessed kind, then any supported kind", () => {
    const results = [
      match("p", "Friends", "urn:entity:podcast"),
      match("t", "Friends", "urn:entity:tv_show"),
    ];
    expect(pickMatch("Friends", "tv_show", results)?.id).toBe("t");
    expect(pickMatch("Friends", "movie", results)?.id).toBe("t");
    expect(pickMatch("Nothing", "movie", results)).toBeNull();
  });
});

describe("lookupNames", () => {
  it("tries the plain name before the bracketed one and the written span last", () => {
    expect(lookupNames({ name: "The Office (U.S. TV series)", surface: "The Office" })).toEqual([
      "The Office (U.S. TV series)",
      "The Office",
    ]);
  });

  it("never takes an unrelated top result", () => {
    const unrelated: EntityMatch = {
      ...entity("m", { name: "Monster", type: "urn:entity:tv_show" }),
      rank: 1,
    };
    expect(pickMatch("The Office", "tv_show", [unrelated])).toBeNull();
  });
});

describe("applyDecisions", () => {
  const eqs = new Map([["R1", eqResult([equivalent("a", "Goiko"), equivalent("b", "Telepizza")])]]);

  it("accepts a listed candidate and keeps the rest as alternatives", () => {
    const { decisions } = applyDecisions(
      [ref()],
      [{ ref: "R1", action: "swap", candidate: "R1.2", reason: "fits" }],
      eqs,
      true,
    );
    expect(decisions[0].action).toBe("swap");
    expect(decisions[0].choice?.entity.displayName).toBe("Telepizza");
    expect(decisions[0].alternatives.map((a) => a.entity.displayName)).toEqual(["Goiko"]);
  });

  it("reads loosely formatted IDs", () => {
    const { decisions } = applyDecisions(
      [ref()],
      [{ ref: 'r1 "Chipotle"', action: "swap", candidate: "R1-2", reason: "fits" }],
      eqs,
      true,
    );
    expect(decisions[0].choice?.entity.displayName).toBe("Telepizza");
  });

  it("flags a candidate that wasn't offered, and references the model skipped", () => {
    const two = [ref(), ref({ ref: "R2", surface: "x" })];
    const { decisions } = applyDecisions(
      two,
      [{ ref: "R1", action: "swap", candidate: "R1.9", reason: "?" }],
      eqs,
      true,
    );
    expect(decisions.map((d) => d.action)).toEqual(["flag", "flag"]);
  });

  it("queues try_domain only when allowed and different", () => {
    const raw = [
      {
        ref: "R1",
        action: "try_domain" as const,
        domain: "place" as const,
        reason: "a place fits",
      },
    ];
    expect(applyDecisions([ref()], raw, eqs, true).tryDomain).toEqual([
      { ref: "R1", domain: "place" },
    ]);
    expect(applyDecisions([ref()], raw, eqs, false).decisions[0].action).toBe("flag");
  });

  it("flags references Qloo couldn't find", () => {
    const { decisions } = applyDecisions(
      [ref({ entity: null, domain: null, note: "Not found in Qloo." })],
      [],
      eqs,
      true,
    );
    expect(decisions[0]).toMatchObject({ action: "flag", reason: "Not found in Qloo." });
  });
});

describe("rewrite guard", () => {
  const decisions = applyDecisions(
    [ref()],
    [{ ref: "R1", action: "swap", candidate: "R1.1", reason: "fits" }],
    new Map([["R1", eqResult([equivalent("a", "Goiko")])]]),
    true,
  ).decisions;
  const original = "Cheaper than your Chipotle habit. Ask Maria.";

  it("allows names from the original, the chosen equivalents and the market", () => {
    const allowed = allowedNames(original, decisions, madrid);
    expect(unverifiedNames("Cheaper than your Goiko habit. Ask Maria in Madrid.", allowed)).toEqual(
      [],
    );
    expect(unverifiedNames("Cheaper than Goiko or VIPS, ask Maria.", allowed)).toEqual(["VIPS"]);
  });

  it("treats possessives and hyphenated forms as the same name", () => {
    const allowed = allowedNames(original, decisions, madrid);
    expect(
      unverifiedNames("Cheaper than your Goiko's habit, Chipotle-level value.", allowed),
    ).toEqual([]);
  });

  it("falls back to direct substitution when the model keeps adding names", async () => {
    const llm = scriptedLlm(() => ({
      text: "Cheaper than your Goiko or Telepizza habit. Ask Maria.",
      replacements: [],
    }));
    const r = await rewriteForMarket(llm, {
      text: original,
      market: madrid,
      references: [ref()],
      decisions,
    });
    expect(r.text).toBe("Cheaper than Goiko. Ask Maria.");
    expect(r.guardIssues).toContain("Telepizza");
    expect(llm.prompts).toHaveLength(2);
  });
});

describe("runTranscreate", () => {
  it("runs extract → resolve → equivalents → decide (with a second-domain round) → rewrite", async () => {
    const anchor = entity("chip", { name: "Chipotle", tags: [DINING, FRESH] });
    const goiko = entity("goiko", { name: "Goiko", tags: [DINING, FRESH] });
    const park = entity("park", { name: "Parque Local", type: "urn:entity:place", tags: [FRESH] });
    const { client } = fakeClient({
      lists: { Madrid: [goiko], "Madrid|urn:entity:place": [park] },
      demos: [demo("chip", 0.3), demo("goiko", 0.3)],
      full: { chip: anchor },
    });
    const qloo: QlooClient = {
      ...client,
      async searchEntities() {
        return [{ ...anchor, rank: 1 }];
      },
    };
    const llm = scriptedLlm(
      (s) =>
        s.includes("find the cultural references")
          ? {
              references: [
                { surface: "Chipotle", name: "Chipotle", kind: "brand", job: "cheap lunch" },
              ],
            }
          : null,
      (s, p) =>
        s.includes("senior transcreator")
          ? p.includes("try_domain is not available")
            ? {
                decisions: [
                  { ref: "R1", action: "swap", candidate: "R1.1", reason: "A park fits the mood." },
                ],
              }
            : {
                decisions: [
                  { ref: "R1", action: "try_domain", domain: "place", reason: "Try places." },
                ],
              }
          : null,
      (s) =>
        s.includes("You rewrite American copy")
          ? { text: "Cheaper than Parque Local.", replacements: [] }
          : null,
      (s) => (s.includes("lives in the city") ? { proposals: [] } : null),
    );
    const events: AgentEvent[] = [];
    const result = await runTranscreate(
      { qloo, llm },
      { text: "Cheaper than Chipotle.", marketIds: ["madrid"], skipBaseline: true },
      (e) => events.push(e),
    );
    const d = result.markets[0].decisions[0];
    expect(d).toMatchObject({ action: "swap", triedDomain: "place" });
    expect(d.choice?.entity.displayName).toBe("Parque Local");
    expect(result.markets[0].text).toBe("Cheaper than Parque Local.");
    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(["references", "decision", "market", "done"]),
    );
    expect(result.stats.llmCalls).toBe(5);
  });

  it("rejects empty text and unknown markets", async () => {
    const deps = { qloo: fakeClient({ lists: {} }).client, llm: scriptedLlm() };
    await expect(runTranscreate(deps, { text: "  ", marketIds: ["madrid"] })).rejects.toThrow(
      /Paste/,
    );
    await expect(runTranscreate(deps, { text: "x", marketIds: ["atlantis"] })).rejects.toThrow(
      /market/,
    );
  });
});

describe("runTranscreate resilience", () => {
  it("returns a flagged market instead of failing the whole run", async () => {
    const anchor = entity("chip", { name: "Chipotle", tags: [DINING] });
    const { client } = fakeClient({ lists: {}, full: { chip: anchor } });
    const qloo: QlooClient = {
      ...client,
      async searchEntities() {
        return [{ ...anchor, rank: 1 }];
      },
    };
    const llm = scriptedLlm((s) =>
      s.includes("find the cultural references")
        ? { references: [{ surface: "Chipotle", name: "Chipotle", kind: "brand", job: "lunch" }] }
        : null,
    );
    const result = await runTranscreate(
      { qloo, llm },
      { text: "Cheaper than Chipotle.", marketIds: ["madrid"], skipBaseline: true },
    );
    expect(result.markets[0].note).toMatch(/Madrid failed/);
    expect(result.markets[0].decisions[0].action).toBe("flag");
    expect(result.markets[0].text).toBe("Cheaper than Chipotle.");
  });
});

describe("localName", () => {
  it("prefers a Latin-script name in the city's language", async () => {
    const { localName } = await import("@/lib/agent/names");
    const show = {
      name: "No One Could Live Here",
      displayName: "No One Could Live Here",
      akaLanguages: [
        { value: "Aquí no hay quien viva", languages: ["es"] },
        { value: "ここに住めない", languages: ["ja"] },
      ],
    };
    expect(localName(show, marketById("madrid")!)).toBe("Aquí no hay quien viva");
    expect(localName(show, marketById("tokyo")!)).toBe("No One Could Live Here");
  });
});
