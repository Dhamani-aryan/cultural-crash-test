import type { LaunchBriefInput, Slot } from "../src/lib/crashtest/types";

/**
 * Plausibility cases: does the agent's final choice still make cultural sense for the job, or
 * did it chase the evidence rubric into an implausible pick? Each case names one choice and the
 * outcome a knowledgeable human expects: keep it, or accept a replacement only if it is a
 * credible act / partner / venue / direction for this launch. Several cases expect the original
 * to stay.
 *
 * STATUS: drafted by the developer tooling and NOT yet human-reviewed. A case counts towards the
 * merge gates only after a person has checked its brief, expectation and check and set
 * `reviewed: true`. Outcomes are graded by a person too (see `PlausibilityReview`), never by a
 * model. Run them with `npm run eval:plausibility`.
 *
 * No audience anchor may also be the choice under test: Qloo leaves signal entities out of its
 * results, so the choice would be tested against itself.
 */
export interface PlausibilityCase {
  id: string;
  brief: LaunchBriefInput;
  slot: Slot;
  /** "keep": the original should survive. "replace_ok": a replacement is acceptable if credible. */
  expect: "keep" | "replace_ok";
  /** Which plan requirement this case covers. */
  covers:
    | "credible_original_retained"
    | "artist_event_genre_fit"
    | "venue_in_market_event_capable"
    | "brand_compatible_business"
    | "direction_attributes_survive"
    | "unverifiable_rule_preserves_and_flags";
  /** What a reviewer should check in the final choice. */
  check: string;
  reviewed: boolean;
}

/** A person's grade for one run's outcome of one case. Filled in by hand in the results file. */
export interface PlausibilityReview {
  verdict: "credible" | "questionable" | "implausible";
  /** One sentence. */
  reason: string;
  reviewer: string;
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
      audienceAnchors: ["Aries", "Wood Wood", "Little Simz"],
      existingChoices: [{ slot: "artist_music", name: "Skepta" }],
    },
    slot: "artist_music",
    expect: "keep",
    covers: "credible_original_retained",
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
      audienceAnchors: ["Goldwin", "And Wander", "Arc'teryx"],
      existingChoices: [{ slot: "brand_collaboration", name: "Snow Peak" }],
    },
    slot: "brand_collaboration",
    expect: "keep",
    covers: "brand_compatible_business",
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
    covers: "venue_in_market_event_capable",
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
    covers: "artist_event_genre_fit",
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
      audienceAnchors: ["Good Earth", "Fabindia", "Raw Mango"],
      existingChoices: [{ slot: "brand_collaboration", name: "Nicobar" }],
      constraints: [{ id: "r1", kind: "hard", description: "No fast-fashion collaborators" }],
    },
    slot: "brand_collaboration",
    expect: "keep",
    covers: "credible_original_retained",
    check: "A credible craft partner the evidence doesn't contradict should stay; any replacement must also be a craft or design brand.",
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
      // Part-supported on purpose, with exploration on, so the direction repair actually runs.
      existingChoices: [{ slot: "creative_direction", name: "Utilitarian and playful pastel" }],
      exploreUserChoices: true,
    },
    slot: "creative_direction",
    expect: "replace_ok",
    covers: "direction_attributes_survive",
    check: "A revised direction must keep Utilitarian (the brand's attribute, and supported here) and replace only the pastel part; it must not become a different look.",
    reviewed: false,
  },
  {
    id: "london-unknown-brand-unverifiable-rule",
    brief: {
      ...base,
      brandName: "Kettle & Kiln",
      productCategory: "Small-batch ceramics",
      launchGoal: "A studio open day",
      marketId: "london",
      audienceDescription: "London design and craft enthusiasts aged 25–40",
      audienceAnchors: ["HAY", "Muji", "Toast"],
      // A small studio Qloo is unlikely to know, under a rule code can't verify.
      existingChoices: [{ slot: "brand_collaboration", name: "Hackney Clay Collective" }],
      constraints: [{ id: "r1", kind: "hard", description: "No luxury collaboration" }],
    },
    slot: "brand_collaboration",
    expect: "keep",
    covers: "unverifiable_rule_preserves_and_flags",
    check: "If Qloo doesn't know the brand, it must stay unchanged and be flagged with a question for a human; it must never be upgraded.",
    reviewed: false,
  },
];
