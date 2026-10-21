import type { LaunchBriefInput } from "./types";

/** Example briefs for the form and the demo. The launching brands are fictional. */
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
