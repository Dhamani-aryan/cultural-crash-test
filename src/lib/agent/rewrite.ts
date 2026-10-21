import { z } from "zod";
import { nameKey } from "@/lib/engine/stats";
import { generateStructured } from "@/lib/llm/structured";
import type { LlmClient } from "@/lib/llm/types";
import type { Market } from "@/lib/markets";
import { nameForms, shortName } from "./names";
import type { Decision, Replacement, ResolvedReference } from "./types";

const schema = z.object({
  text: z.string().min(1),
  replacements: z.array(
    z.object({ ref: z.string(), original: z.string(), replacement: z.string() }),
  ),
  note: z.string().max(300).optional(),
});

const SYSTEM = `You rewrite American copy for a reader in another city, keeping it in English. You change ONLY the cultural references you are told to change, and the few words around each one that need to change so the sentence reads naturally: drop or add an article (\"your Good Bowl habit\", not \"your The Good Bowl habit\"), adjust a possessive or a verb. Keep the tone, rhythm, length and joke structure. Do not add new references, names, places, brands or facts. For flagged references, keep the original wording; a human will handle them.`;

function instruction(r: ResolvedReference, d: Decision): string {
  if (d.action === "swap" && d.choice) {
    const e = d.choice.entity;
    const what = e.shortDescription ?? e.description?.slice(0, 160) ?? "";
    // Other names (often the original-language title) let the rewrite use the form people in
    // the city know; the guard accepts any of them.
    const other = [e.name, ...e.akas].filter((n) => n !== e.displayName && /\p{Script=Latin}/u.test(n));
    const aka = other.length ? ` (also known as ${other.slice(0, 3).map((n) => `"${n}"`).join(", ")}; use whichever readers in the city would know)` : "";
    return `${r.ref} "${r.surface}" → use "${shortName(e.displayName)}"${aka}${what ? `: ${what}` : ""}. Job to preserve: ${r.job}.`;
  }
  if (d.action === "keep") return `${r.ref} "${r.surface}" → keep as is.`;
  return `${r.ref} "${r.surface}" → flagged; keep the original wording.`;
}

/**
 * Proper nouns allowed in the output: anything in the original text, every chosen equivalent
 * (with its akas) and the market's own names. Everything else capitalised mid-sentence is
 * suspicious: the model may have slipped in a name Qloo never returned.
 */
export function allowedNames(original: string, decisions: Decision[], market: Market): Set<string> {
  const words = new Set<string>();
  // Split on apostrophes too: "We're" allows "We", "Joe's" allows "Joe".
  const add = (s: string) =>
    s
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .forEach((w) => words.add(nameKey(w)));
  add(original);
  add(`${market.label} ${market.country} ${market.language}`);
  for (const d of decisions) {
    if (!d.choice) continue;
    add(d.choice.entity.displayName);
    add(d.choice.entity.name);
    d.choice.entity.akas.forEach(add);
  }
  return words;
}

/** Capitalised words that don't start a sentence and aren't in the allowed set. */
export function unverifiedNames(text: string, allowed: Set<string>): string[] {
  const out = new Set<string>();
  // Stop at apostrophes and hyphens: "Nykaa's" and "Glossier-level" are the names Nykaa
  // and Glossier, not new ones.
  const re = /(^|[.!?]\s+|["“(]\s*)?(\p{Lu}\p{L}*)/gu;
  for (const m of text.matchAll(re)) {
    if (m[1] !== undefined) continue; // sentence or quote start: capitalised for grammar
    const word = m[2];
    if (word.length < 2 || word === "I") continue;
    if (!allowed.has(nameKey(word))) out.add(word);
  }
  return [...out];
}

export async function rewriteForMarket(
  llm: LlmClient,
  input: { text: string; market: Market; references: ResolvedReference[]; decisions: Decision[] },
): Promise<{
  text: string;
  replacements: Replacement[];
  guardIssues: string[];
  note: string | null;
}> {
  const byRef = new Map(input.decisions.map((d) => [d.ref, d]));
  const changes = input.references.filter((r) => byRef.get(r.ref)?.action === "swap");
  if (changes.length === 0) {
    return { text: input.text, replacements: [], guardIssues: [], note: null };
  }
  const allowed = allowedNames(input.text, input.decisions, input.market);
  const basePrompt = [
    `Reader: someone in ${input.market.label}.`,
    `Original:\n"""\n${input.text}\n"""`,
    `Instructions:\n${input.references.map((r) => instruction(r, byRef.get(r.ref)!)).join("\n")}`,
  ].join("\n\n");

  let prompt = basePrompt;
  let issues: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { data } = await generateStructured(llm, {
      schema,
      system: SYSTEM,
      prompt,
      label: `rewrite:${input.market.id}`,
    });
    const missing = changes
      .map((r) => byRef.get(r.ref)!.choice!.entity)
      .filter((e) => !nameForms(e).some((n) => data.text.includes(n)))
      .map((e) => e.displayName);
    issues = unverifiedNames(data.text, allowed);
    if (missing.length === 0 && issues.length === 0) {
      return {
        text: data.text,
        replacements: data.replacements,
        guardIssues: [],
        // The model's own note tends to restate internal IDs ("R1 was flagged"); the decision
        // list already says this in plain words, so only system notes reach the reader.
        note: null,
      };
    }
    prompt =
      `${basePrompt}\n\nYour previous version was rejected.` +
      (missing.length ? ` It must use these exact names: ${missing.join(", ")}.` : "") +
      (issues.length
        ? ` It introduced names that aren't in the original or the instructions: ${issues.join(", ")}. Remove them.`
        : "");
    if (attempt === 2) {
      // The model wouldn't stay within the evidence. Fall back to plain substitution: clunkier
      // prose, but every name in it is one Qloo returned.
      let text = input.text;
      const replacements: Replacement[] = [];
      for (const r of changes) {
        const name = shortName(byRef.get(r.ref)!.choice!.entity.displayName);
        text = text.replace(r.surface, name);
        replacements.push({ ref: r.ref, original: r.surface, replacement: name });
      }
      return {
        text,
        replacements,
        guardIssues: [...issues, ...missing.map((m) => `missing ${m}`)],
        note: "The rewrite added unverified names twice, so references were substituted directly.",
      };
    }
  }
  throw new Error("unreachable");
}
