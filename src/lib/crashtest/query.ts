import { z } from "zod";
import { generateStructured } from "@/lib/llm/structured";
import type { LlmClient } from "@/lib/llm/types";
import type { Market } from "@/lib/markets";
import { SLOTS, type Constraint, type LaunchBriefInput } from "./types";

/**
 * A launch described in plain words becomes a structured brief. The model only reads what the
 * person wrote: it fills a field when the text says it and leaves it empty otherwise, so the
 * draft step (and the assumptions it records) handles everything the text doesn't say.
 */

export const MAX_QUERY = 1500;

export const QueryRequestSchema = z.object({
  query: z.string().trim().min(10, "Describe the launch in a sentence or two.").max(MAX_QUERY),
  marketId: z.string(),
  depth: z.enum(["quick", "thorough"]).default("quick"),
});
export type QueryRequest = z.input<typeof QueryRequestSchema>;

const parsedSchema = z.object({
  brandName: z.string().describe("the launching brand's name, or empty"),
  productCategory: z.string().describe("what the brand sells, in a few words"),
  launchGoal: z.string().describe("what the launch is (pop-up, drop, event...), in a few words"),
  audienceDescription: z.string().describe("who the launch is for, in the person's words"),
  audienceAnchors: z.array(z.string()).describe("brands or artists the person says the audience likes; empty if none named"),
  brandAttributes: z.array(z.string()).describe("adjectives the person uses for the brand"),
  budgetBand: z.string().describe("budget if stated, else empty"),
  choices: z
    .array(z.object({ slot: z.enum(SLOTS), name: z.string() }))
    .describe("only choices the person has already made: a music act, a collaboration brand, a venue, a creative direction"),
  keep: z.array(z.enum(SLOTS)).describe("slots the person says must not change (booked, signed, fixed)"),
  exclude: z.array(z.string()).describe("names the person rules out"),
  otherRules: z.array(z.string()).describe("other hard rules the person states, in their words"),
});

const SYSTEM = `Turn a description of a product launch into a structured brief. Use only what the text says; leave a field empty when the text doesn't say it, and never invent names. Copy names exactly as written.`;

export async function parseQuery(
  llm: LlmClient,
  req: z.infer<typeof QueryRequestSchema>,
  market: Market,
): Promise<{ brief: LaunchBriefInput; read: string[] }> {
  const { data } = await generateStructured(llm, {
    schema: parsedSchema,
    system: SYSTEM,
    prompt: `City: ${market.label}\n\nDescription:\n"""${req.query}"""`,
    label: "query",
  });
  const constraints: Constraint[] = [];
  for (const slot of data.keep) {
    const choice = data.choices.find((c) => c.slot === slot);
    if (choice) constraints.push({ id: `keep-${slot}`, kind: "hard", lockSlot: slot, description: `Keep ${choice.name}` });
  }
  if (data.exclude.length)
    constraints.push({ id: "exclude", kind: "hard", excludeNames: data.exclude.slice(0, 10), description: `Never use: ${data.exclude.join(", ")}` });
  data.otherRules.slice(0, 4).forEach((r, i) => constraints.push({ id: `rule-${i}`, kind: "hard", description: r }));

  const or = (s: string, fallback: string) => (s.trim().length >= 2 ? s.trim() : fallback);
  const brief: LaunchBriefInput = {
    brandName: data.brandName.trim() || undefined,
    productCategory: or(data.productCategory, "Consumer brand"),
    launchGoal: or(data.launchGoal, "Launch"),
    marketId: req.marketId,
    audienceDescription: or(data.audienceDescription, req.query.slice(0, 200)),
    audienceAnchors: data.audienceAnchors.slice(0, 4),
    brandAttributes: data.brandAttributes.slice(0, 8),
    budgetBand: data.budgetBand.trim() || undefined,
    existingChoices: data.choices.slice(0, 4),
    constraints,
    depth: req.depth,
  };
  const read = [
    `Read from your description: ${brief.productCategory}; goal: ${brief.launchGoal}; audience: ${brief.audienceDescription}.`,
    brief.audienceAnchors?.length ? `Audience anchors you named: ${brief.audienceAnchors.join(", ")}.` : "",
    brief.existingChoices?.length ? `Choices you've made: ${brief.existingChoices.map((c) => c.name).join(", ")}.` : "",
    constraints.length ? `Constraints: ${constraints.map((c) => c.description).join("; ")}.` : "",
  ].filter(Boolean);
  return { brief, read };
}
