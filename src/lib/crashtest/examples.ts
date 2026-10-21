import type { QueryRequest } from "./query";
import type { LaunchBriefInput } from "./types";

/** Example launches in plain words, for the home page. The launching brands are fictional. */
export const EXAMPLE_QUERIES: { id: string; title: string; query: QueryRequest }[] = [
  {
    id: "london",
    title: "Streetwear pop-up, London",
    query: {
      marketId: "london",
      depth: "thorough",
      query:
        "Northbound Supply is a small streetwear and skate label launching with a weekend pop-up and a music night in East London. " +
        "Our audience is 18–30 skate and streetwear fans, the kind who wear Stüssy, Palace and Carhartt. " +
        "We want Travis Scott to headline. The pop-up is booked at BOXPARK Shoreditch and can't change. " +
        "Creative direction: playful pastel colours with Y2K nostalgia. No collaboration with Supreme.",
    },
  },
  {
    id: "tokyo",
    title: "Sneaker drop, Tokyo",
    query: {
      marketId: "tokyo",
      depth: "thorough",
      query:
        "Northbound Supply wants to enter Tokyo with a collaboration drop and a pop-up for young streetwear and sneaker collectors " +
        "who follow Stüssy, Palace and Carhartt. The brand is utilitarian, understated and community-led.",
    },
  },
  {
    id: "sao-paulo",
    title: "Skate launch, São Paulo",
    query: {
      marketId: "sao-paulo",
      depth: "thorough",
      query:
        "A skate apparel brand launching in São Paulo with a skate-session event and a local music act, for skaters and street-culture " +
        "fans aged 16–28 who like Thrasher, Vans and Element. The brand is rebellious, colourful and community-led.",
    },
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
