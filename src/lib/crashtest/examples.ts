import type { LaunchBriefInput } from "./types";

/**
 * Home-page examples: the text a user might write, and the brief it stands for. Loading an
 * example fills the intake from the brief directly (no model reading), so a recorded run of it
 * replays exactly.
 */
export const EXAMPLE_INTAKES: { id: string; title: string; text: string; briefId: string }[] = [
  {
    id: "london",
    title: "Streetwear pop-up, London",
    briefId: "london",
    text:
      "Northbound Supply is a small streetwear and skate label launching with a weekend pop-up and a music night in East London. " +
      "Our audience is 18–30 skate and streetwear fans, the kind who wear Stüssy, Palace and Carhartt. We're utilitarian, understated and community-led. " +
      "We want Travis Scott to headline. The pop-up is booked at BOXPARK Shoreditch and can't change. " +
      "Creative direction: playful pastel colours with Y2K nostalgia. No collaboration with Supreme.",
  },
  {
    id: "northline",
    title: "Sustainable capsule, London",
    briefId: "northline",
    text:
      "We are Northline, a small sustainable streetwear label. We want to launch a limited capsule in East London for 18–30-year-old skate and independent-fashion fans. " +
      "We are considering Village Underground, a UK electronic act and an industrial DIY look. The venue is fixed, the budget is modest, and we do not want a luxury collaboration. Help us test the plan.",
  },
  {
    id: "tokyo",
    title: "Sneaker drop, Tokyo",
    briefId: "tokyo",
    text:
      "Northbound Supply wants to enter Tokyo with a collaboration drop and a pop-up for young streetwear and sneaker collectors who follow Stüssy, Palace and Carhartt. " +
      "The brand is utilitarian, understated and community-led.",
  },
];

/** Example briefs for the detailed form, the CLI and tests. */
export const EXAMPLE_BRIEFS: { id: string; title: string; brief: LaunchBriefInput }[] = [
  {
    id: "london",
    title: "Streetwear pop-up in East London",
    brief: {
      brandName: "Northbound Supply",
      productCategory: "Streetwear and skate-inspired apparel",
      launchGoal: "A weekend pop-up launch for the first collection, with a music night",
      marketId: "london",
      audienceDescription: "18–30 year-old skate and streetwear fans in East London",
      audienceAnchors: ["Stüssy", "Palace Skateboards", "Carhartt"],
      brandAttributes: ["utilitarian", "understated", "community-led"],
      budgetBand: "Small: under £30k",
      existingChoices: [
        { slot: "artist_music", name: "Travis Scott" },
        { slot: "event_place", name: "BOXPARK Shoreditch" },
        { slot: "creative_direction", name: "Playful pastel colours with Y2K nostalgia" },
      ],
      constraints: [
        { id: "c1", description: "Keep the venue: BOXPARK Shoreditch is already booked", kind: "hard", lockSlot: "event_place" },
        { id: "c2", description: "No collaboration with Supreme", kind: "hard", excludeNames: ["Supreme"] },
      ],
      depth: "thorough",
    },
  },
  {
    id: "northline",
    title: "Sustainable capsule launch in East London",
    brief: {
      brandName: "Northline",
      productCategory: "Sustainable streetwear",
      launchGoal: "A limited capsule launch",
      marketId: "london",
      audienceDescription: "18–30-year-old skate and independent-fashion fans in East London",
      audienceAnchors: [],
      brandAttributes: ["sustainable", "independent", "DIY"],
      budgetBand: "Modest",
      existingChoices: [
        { slot: "event_place", name: "Village Underground" },
        { slot: "creative_direction", name: "Industrial DIY look" },
      ],
      constraints: [
        { id: "lock-event_place", description: "Keep the pop-up venue: Village Underground", kind: "hard", lockSlot: "event_place" },
        { id: "rule-0", description: "No luxury collaboration", kind: "hard" },
      ],
      depth: "thorough",
    },
  },
  {
    id: "tokyo",
    title: "Sneaker-culture launch in Tokyo",
    brief: {
      brandName: "Northbound Supply",
      productCategory: "Streetwear and skate-inspired apparel",
      launchGoal: "Enter Tokyo with a collaboration drop and a pop-up",
      marketId: "tokyo",
      audienceDescription: "Young streetwear and sneaker collectors in Tokyo",
      audienceAnchors: ["Stüssy", "Palace Skateboards", "Carhartt"],
      brandAttributes: ["utilitarian", "understated", "community-led"],
      existingChoices: [],
      constraints: [],
      depth: "quick",
    },
  },
  {
    id: "sao-paulo",
    title: "Skate brand entering São Paulo",
    brief: {
      brandName: "Northbound Supply",
      productCategory: "Skate apparel",
      launchGoal: "A skate-session launch event with a local music act",
      marketId: "sao-paulo",
      audienceDescription: "Skaters and street-culture fans in São Paulo, 16–28",
      audienceAnchors: ["Thrasher", "Vans", "Element Skateboards"],
      brandAttributes: ["rebellious", "community-led", "colourful"],
      existingChoices: [],
      constraints: [],
      depth: "quick",
    },
  },
];
