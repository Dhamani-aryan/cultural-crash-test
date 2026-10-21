/**
 * Evaluation cases. All texts are written for this project (no third-party copy). The first
 * three are the demo texts the agent was tuned on ("dev"); the rest were written afterwards
 * and never used for tuning ("held out").
 *
 * Expectations are deterministic checks, not answer keys: which names must survive untouched
 * (global icons that need no translation, invented names Qloo can't know) and whether the
 * text should come back unchanged.
 */
export interface EvalCase {
  id: string;
  label: string;
  split: "dev" | "held_out";
  text: string;
  markets: string[];
  /** Names that must still appear in every market's output. */
  mustKeep?: string[];
  /** The output should equal the input (nothing to translate). */
  unchanged?: boolean;
  /** Domains that must not be swapped in a market (coverage is "off" there). */
  noSwap?: { market: string; domain: string }[];
}

export const CASES: EvalCase[] = [
  {
    id: "pitch",
    label: "Startup pitch",
    split: "dev",
    text: "We're the Peloton of home cooking: a slick weekly subscription with Glossier-level branding, and it still costs less than your Chipotle habit.",
    markets: ["tokyo", "mumbai", "london"],
  },
  {
    id: "ad",
    label: "TV ad script",
    split: "dev",
    text: "Remember lazy Sunday nights rewatching The Office with a Trader Joe's frozen pizza? Our meal kit brings that feeling back. No Times Square crowds, no waiting in line. Just dinner that feels like home.",
    markets: ["madrid", "sao-paulo", "london"],
  },
  {
    id: "product",
    label: "Product page",
    split: "dev",
    text: "Pack a picnic like it's Central Park in June, put on some Taylor Swift, and let the CoolCase keep everything cold for 24 hours. Tougher than a Whole Foods tote, lighter than you'd think.",
    markets: ["tokyo", "sao-paulo", "madrid"],
    mustKeep: ["CoolCase"],
  },
  {
    id: "playlist",
    label: "Newsletter",
    split: "held_out",
    text: "This week's playlist sounds like Olivia Rodrigo crashing a Saturday Night Live afterparty. Perfect for the drive to Target.",
    markets: ["mumbai", "madrid", "sao-paulo"],
  },
  {
    id: "coffee",
    label: "Social post",
    split: "held_out",
    text: "Our cold brew is the Dunkin' of specialty coffee: no fuss, open early, and better than another Starbucks run.",
    markets: ["london", "tokyo", "mumbai"],
    mustKeep: ["Starbucks"],
  },
  {
    id: "travel",
    label: "Travel app",
    split: "held_out",
    text: "Skip the Hollywood Walk of Fame. Our guides take you where locals actually eat: think a Shake Shack line, but for street food.",
    markets: ["tokyo", "madrid", "london"],
  },
  {
    id: "streaming",
    label: "Streaming promo",
    split: "held_out",
    text: "If Stranger Things and Parks and Recreation had a podcast, it would sound like this: weird, warm and impossible to stop.",
    markets: ["mumbai", "sao-paulo", "madrid"],
  },
  {
    id: "fitness",
    label: "Fitness class",
    split: "held_out",
    text: "Train like you're in a Rocky montage, with a playlist straight out of Eminem's gym bag.",
    markets: ["london", "tokyo", "sao-paulo"],
    noSwap: [{ market: "london", domain: "movie" }],
  },
  {
    id: "retail",
    label: "Retail banner",
    split: "held_out",
    text: "Costco-sized savings with Nordstrom-level service, delivered faster than Amazon Prime.",
    markets: ["mumbai", "sao-paulo", "london"],
    mustKeep: ["Amazon"],
  },
  {
    id: "brunch",
    label: "Restaurant menu",
    split: "held_out",
    text: "Sunday brunch with Magnolia Bakery cupcakes, a Bon Iver record on loop and a view that beats the High Line.",
    markets: ["tokyo", "london"],
  },
  {
    id: "plain",
    label: "No references",
    split: "held_out",
    text: "Plan a week of dinners in five minutes. No subscription, no ads, and every recipe uses ingredients you already have.",
    markets: ["london", "madrid"],
    unchanged: true,
  },
  {
    id: "global",
    label: "Global brands only",
    split: "held_out",
    text: "Works with your iPhone, syncs with Google Calendar and fits in any pocket.",
    markets: ["tokyo", "mumbai"],
    mustKeep: ["iPhone", "Google Calendar"],
  },
  {
    id: "invented",
    label: "Invented brand",
    split: "held_out",
    text: "Everyone at the office is obsessed with Brindle & Pike, the tiny bakery from our last campaign.",
    markets: ["madrid", "sao-paulo"],
    mustKeep: ["Brindle & Pike"],
  },
];
