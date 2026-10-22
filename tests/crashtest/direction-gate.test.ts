import { describe, expect, it } from "vitest";
import { createLedger } from "@/lib/crashtest/ledger";
import { repairDirection } from "@/lib/crashtest/repair";
import { LaunchBriefSchema, type ComponentAssessment, type CulturalPlan } from "@/lib/crashtest/types";
import { marketById } from "@/lib/markets";
import { LONDON_BRIEF, W, worldClient, worldLlm } from "./world";

/** A plan whose direction mixes a term this London audience leans to (Utilitarian) with one it doesn't (Playful). */
const plan: CulturalPlan = {
  anchors: [W.anchorA, W.anchorB].map((e) => ({ id: e.id, name: e.name, type: e.type, popularity: null, imageUrl: null, shortDescription: null })),
  components: [
    {
      slot: "creative_direction",
      label: "Utilitarian and playful",
      origin: "user_provided",
      locked: false,
      resolution: "resolved",
      entity: null,
      tags: [
        { id: "urn:tag:aesthetic_property:qloo:utilitarian", name: "Utilitarian" },
        { id: "urn:tag:aesthetic_property:qloo:playful", name: "Playful" },
      ],
      placeCategory: null,
    },
  ],
};
const assessment = { finding: "\"Playful\" isn't among this audience's top tones in London." } as ComponentAssessment;
const repair = (constraints: { id: string; kind: "hard"; description: string }[] = []) =>
  repairDirection({
    llm: worldLlm().llm,
    ctx: { client: worldClient().client, ledger: createLedger(() => 1), market: marketById("london")! },
    brief: LaunchBriefSchema.parse({ ...LONDON_BRIEF, constraints }),
    plan,
    assessment,
  });

describe("creative-direction repair gates", () => {
  it("keeps the term this audience already leans to and replaces only the unsupported one", async () => {
    const p = await repair();
    expect(p!.after.tags.map((t) => t.name)).toEqual(["Utilitarian", "Industrial"]);
  });

  it("never adopts a tag the brief rules out, and proposes nothing when only kept terms remain", async () => {
    // The model's pick ("Industrial") is ruled out, so only the kept term is left: no change to make.
    expect(await repair([{ id: "r", kind: "hard", description: "No industrial looks" }])).toBeNull();
  });
});
