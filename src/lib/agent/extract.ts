import { z } from "zod";
import { generateStructured } from "@/lib/llm/structured";
import type { LlmClient } from "@/lib/llm/types";
import { DOMAINS } from "@/lib/markets";
import type { Reference } from "./types";

export const MAX_TEXT = 2500;
export const MAX_REFERENCES = 8;

const schema = z.object({
  references: z
    .array(
      z.object({
        surface: z.string().min(1).describe("the exact characters in the text, copied verbatim"),
        name: z.string().min(1).describe("the canonical name to look up"),
        kind: z.enum([...DOMAINS, "other"]),
        job: z.string().min(3).max(200).describe("what the reference does for the reader here"),
      }),
    )
    .max(MAX_REFERENCES + 4),
});

const SYSTEM = `You are a transcreation specialist. You find the cultural references in marketing, pitch, comedy or dialogue text written for an American audience: named brands, chains, artists, TV shows, films and places that the text uses to carry meaning.

For each reference give:
- surface: the exact span as written (copy it character for character),
- name: the plain canonical name to look the entity up, with no notes in brackets (e.g. surface "your Chipotle habit" → name "Chipotle"; "The Office", not "The Office (U.S. TV series)"),
- kind: artist (musicians, bands), tv_show, movie, brand (companies, chains, products, stores, publications), place (landmarks, parks, neighbourhoods, venues), or other (people who aren't musicians, sports leagues, events, holidays, anything else),
- job: in a few words, what the reference does for the reader in this sentence ("shorthand for affordable, cult-loved grocery", "the benchmark for slick premium fitness").

Only include references whose meaning depends on the reader's culture. Skip generic nouns, the speaker's own product, and anything not named. Keep them in reading order. At most ${MAX_REFERENCES}.`;

export async function extractReferences(
  llm: LlmClient,
  text: string,
): Promise<{ references: Reference[]; dropped: string[] }> {
  const { data } = await generateStructured(llm, {
    schema,
    system: SYSTEM,
    prompt: `Text:\n"""\n${text}\n"""`,
    label: "extract",
  });
  const dropped: string[] = [];
  const references: Reference[] = [];
  const seen = new Set<string>();
  for (const r of data.references) {
    // The surface must really be in the text; anything else would be invented.
    if (!text.includes(r.surface)) {
      dropped.push(r.surface);
      continue;
    }
    const key = r.name.toLowerCase();
    if (seen.has(key) || references.length >= MAX_REFERENCES) continue;
    seen.add(key);
    references.push({ ref: `R${references.length + 1}`, ...r });
  }
  return { references, dropped };
}
