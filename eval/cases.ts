import type { LaunchBriefInput } from "../src/lib/crashtest/types";

/**
 * Fixed evaluation briefs. Brands launching are fictional; audience anchors are real.
 *
 * - `dev` briefs are the example briefs the agent was built and tuned on.
 * - `heldout` briefs were written after the agent was frozen for this run and never used for tuning.
 *
 * Every brief also names `heldOutAnchors`: a different set of brands or artists standing for
 * the same audience. The agent never sees them. Re-scoring both plans with them tests whether
 * an improvement generalises beyond the exact signal the agent optimised against.
 */
export interface EvalCase {
  id: string;
  split: "dev" | "heldout";
  brief: LaunchBriefInput;
  heldOutAnchors: string[];
}

const base = { brandAttributes: [], existingChoices: [], constraints: [], depth: "thorough" as const };

export const CASES: EvalCase[] = [
  {
    id: "london-streetwear",
    split: "dev",
    brief: {
      ...base,
      brandName: "Northbound Supply",
      productCategory: "Streetwear and skate-inspired apparel",
      launchGoal: "A weekend pop-up launch with a music night",
      marketId: "london",
      audienceDescription: "18–30 year-old skate and streetwear fans in East London",
      audienceAnchors: ["Stüssy", "Palace Skateboards", "Carhartt"],
      brandAttributes: ["utilitarian", "understated", "community-led"],
    },
    heldOutAnchors: ["Patta", "A-Cold-Wall", "Skepta"],
  },
  {
    id: "tokyo-sneakers",
    split: "dev",
    brief: {
      ...base,
      brandName: "Northbound Supply",
      productCategory: "Streetwear and skate-inspired apparel",
      launchGoal: "Enter Tokyo with a collaboration drop and a pop-up",
      marketId: "tokyo",
      audienceDescription: "Young streetwear and sneaker collectors in Tokyo",
      audienceAnchors: ["Stüssy", "Palace Skateboards", "Carhartt"],
      brandAttributes: ["utilitarian", "understated", "community-led"],
    },
    heldOutAnchors: ["Neighborhood", "WTAPS", "Nujabes"],
  },
  {
    id: "sao-paulo-skate",
    split: "dev",
    brief: {
      ...base,
      brandName: "Northbound Supply",
      productCategory: "Skate apparel",
      launchGoal: "A skate-session launch event with a local music act",
      marketId: "sao-paulo",
      audienceDescription: "Skaters and street-culture fans in São Paulo, 16–28",
      audienceAnchors: ["Thrasher", "Vans", "Element Skateboards"],
      brandAttributes: ["rebellious", "community-led", "colourful"],
    },
    heldOutAnchors: ["Charlie Brown Jr.", "Independent Truck Company", "Supreme"],
  },
  {
    id: "london-coffee",
    split: "heldout",
    brief: {
      ...base,
      brandName: "Fieldwork Coffee",
      productCategory: "Speciality coffee and a café",
      launchGoal: "Open a first café with a launch week of events",
      marketId: "london",
      audienceDescription: "Design-minded young professionals who care about craft coffee",
      audienceAnchors: ["Aesop", "Monocle", "Kinfolk"],
      brandAttributes: ["calm", "crafted", "minimal"],
    },
    heldOutAnchors: ["Muji", "COS", "Bon Iver"],
  },
  {
    id: "tokyo-skincare",
    split: "heldout",
    brief: {
      ...base,
      brandName: "Lumen Lab",
      productCategory: "Skincare for young adults",
      launchGoal: "A launch campaign with a creator collaboration and a pop-up",
      marketId: "tokyo",
      audienceDescription: "Women in their twenties in Tokyo who follow beauty and pop culture",
      audienceAnchors: ["Shiseido", "Sanrio", "Kyary Pamyu Pamyu"],
      brandAttributes: ["gentle", "playful", "clean"],
    },
    heldOutAnchors: ["Uniqlo", "Aimyon"],
  },
  {
    id: "sao-paulo-running",
    split: "heldout",
    brief: {
      ...base,
      brandName: "Pace Club",
      productCategory: "Running apparel",
      launchGoal: "Launch with a city run club event and an ambassador",
      marketId: "sao-paulo",
      audienceDescription: "Urban runners in São Paulo, 22–40",
      audienceAnchors: ["Asics", "Lululemon", "Strava"],
      brandAttributes: ["energetic", "inclusive", "technical"],
    },
    heldOutAnchors: ["Adidas", "Garmin"],
  },
  {
    id: "madrid-beer",
    split: "heldout",
    brief: {
      ...base,
      brandName: "Barrio Brew",
      productCategory: "Craft beer",
      launchGoal: "Launch at a live music night with a partner brand",
      marketId: "madrid",
      audienceDescription: "Indie music fans in Madrid, 25–35",
      audienceAnchors: ["Mahou", "Vetusta Morla", "Primavera Sound"],
      brandAttributes: ["warm", "local", "unpretentious"],
    },
    heldOutAnchors: ["Estrella Galicia", "Love of Lesbian"],
  },
  {
    id: "madrid-sustainable",
    split: "heldout",
    brief: {
      ...base,
      brandName: "Marea",
      productCategory: "Sustainable fashion",
      launchGoal: "A launch event and a collaboration capsule",
      marketId: "madrid",
      audienceDescription: "Environmentally minded fashion buyers in Madrid, 20–35",
      audienceAnchors: ["Ecoalf", "Patagonia", "Rosalía"],
      brandAttributes: ["honest", "Mediterranean", "modern"],
      constraints: [{ id: "c1", description: "No fast-fashion collaborators", kind: "hard", excludeNames: ["Zara", "H&M", "Shein"] }],
    },
    heldOutAnchors: ["Veja", "C. Tangana"],
  },
  {
    id: "mumbai-sneakers",
    split: "heldout",
    brief: {
      ...base,
      brandName: "Gully Kicks",
      productCategory: "Sneakers",
      launchGoal: "A launch drop with an artist collaboration and a store event",
      marketId: "mumbai",
      audienceDescription: "Sneaker and hip-hop fans in Mumbai, 18–28",
      audienceAnchors: ["Nike", "Bewakoof", "DIVINE"],
      brandAttributes: ["bold", "street", "homegrown"],
    },
    heldOutAnchors: ["Puma", "Badshah"],
  },
];
