import type { LaunchBriefInput, Slot } from "../src/lib/crashtest/types";

/**
 * Plausibility cases: does the agent's final choice still make cultural sense for the job, or
 * did it chase the evidence rubric into an implausible pick? Each case names one choice and the
 * outcome a knowledgeable human expects: keep it, or accept a replacement only if it is a
 * credible act / partner / venue for this launch. Several cases expect the original to stay.
 *
 * STATUS: drafted by the agent's developer tooling, NOT yet human-reviewed. They are not part
 * of the nine-brief evaluation and must not be used to accept or reject a change until a person
 * has reviewed every expectation and set `reviewed: true`.
 */
export interface PlausibilityCase {
  id: string;
  brief: LaunchBriefInput;
  slot: Slot;
  /** "keep": the original should survive. "replace_ok": a replacement is acceptable if credible. */
  expect: "keep" | "replace_ok";
  /** What a reviewer should check in the final choice. */
  check: string;
  reviewed: boolean;
}

const base = { brandAttributes: [], constraints: [], depth: "thorough" as const };

export const PLAUSIBILITY: PlausibilityCase[] = [
  {
    id: "london-artist-local-hero",
    brief: {
      ...base,
      brandName: "Grain Studio",
      productCategory: "Independent menswear",
      launchGoal: "A store-opening party",
      marketId: "london",
      audienceDescription: "25–35 London menswear and grime fans",
      audienceAnchors: ["Aries", "Wood Wood", "Skepta"],
      existingChoices: [{ slot: "artist_music", name: "Skepta" }],
    },
    slot: "artist_music",
    expect: "keep",
    check: "A London grime headliner is a credible act for this audience; a replacement would need to be equally credible, not just higher on the rubric.",
    reviewed: false,
  },
  {
    id: "tokyo-brand-same-business",
    brief: {
      ...base,
      brandName: "Field Unit",
      productCategory: "Outdoor technical apparel",
      launchGoal: "A collaboration jacket drop",
      marketId: "tokyo",
      audienceDescription: "Tokyo outdoor and city-wear enthusiasts",
      audienceAnchors: ["Snow Peak", "And Wander", "Arc'teryx"],
      existingChoices: [{ slot: "brand_collaboration", name: "Snow Peak" }],
    },
    slot: "brand_collaboration",
    expect: "keep",
    check: "A replacement partner must be an outdoor or apparel business; a beverage or tech brand is implausible however strong its affinity.",
    reviewed: false,
  },
  {
    id: "madrid-venue-event-capable",
    brief: {
      ...base,
      brandName: "Rumbo",
      productCategory: "Sustainable sneakers",
      launchGoal: "A pop-up launch weekend",
      marketId: "madrid",
      audienceDescription: "Madrid design and sneaker fans aged 20–35",
      audienceAnchors: ["Ecoalf", "Camper", "Veja"],
      existingChoices: [],
    },
    slot: "event_place",
    expect: "replace_ok",
    check: "The venue must be in Madrid and able to host a retail pop-up (gallery, event space, concept store); a hotel, restaurant or museum café is implausible.",
    reviewed: false,
  },
  {
    id: "sao-paulo-artist-genre-fit",
    brief: {
      ...base,
      brandName: "Viela",
      productCategory: "Streetwear",
      launchGoal: "A launch night with a live set",
      marketId: "sao-paulo",
      audienceDescription: "São Paulo streetwear and funk fans aged 18–28",
      audienceAnchors: ["Approve", "Piet", "MC Kevin o Chris"],
      existingChoices: [],
    },
    slot: "artist_music",
    expect: "replace_ok",
    check: "The act should be one this audience would plausibly see at a launch night (Brazilian funk, rap or electronic); a global pop star is implausible for a small launch.",
    reviewed: false,
  },
  {
    id: "mumbai-brand-keep-under-rule",
    brief: {
      ...base,
      brandName: "Loom Lane",
      productCategory: "Handloom fashion",
      launchGoal: "A collaboration capsule",
      marketId: "mumbai",
      audienceDescription: "Mumbai shoppers of contemporary Indian craft fashion",
      audienceAnchors: ["Good Earth", "Fabindia", "Nicobar"],
      existingChoices: [{ slot: "brand_collaboration", name: "Nicobar" }],
      constraints: [{ id: "r1", kind: "hard", description: "No fast-fashion collaborators" }],
    },
    slot: "brand_collaboration",
    expect: "keep",
    check: "A credible craft partner under a no-fast-fashion rule should stay; any replacement must also be a craft or design brand.",
    reviewed: false,
  },
  {
    id: "london-direction-keep-attributes",
    brief: {
      ...base,
      brandName: "Northbound Supply",
      productCategory: "Streetwear and skate-inspired apparel",
      launchGoal: "A weekend pop-up",
      marketId: "london",
      audienceDescription: "18–30 year-old skate and streetwear fans in East London",
      audienceAnchors: ["Stüssy", "Palace Skateboards", "Carhartt"],
      brandAttributes: ["utilitarian", "understated"],
      existingChoices: [{ slot: "creative_direction", name: "Utilitarian and understated" }],
    },
    slot: "creative_direction",
    expect: "keep",
    check: "The revised direction must keep the brand's own attributes (utilitarian, understated) when they already fit this audience.",
    reviewed: false,
  },
];
