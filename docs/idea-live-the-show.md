# "Live the show": research note

**Idea:** you name a show you love (Friends, Peaky Blinders, Emily in Paris) and the city you're in. An agent builds a real outing in that show's spirit: the coffee shop, the food, the bar and the drink, the playlist, even what to wear. It works in any supported city, not only where the show is set. Every place and brand is real and comes from Qloo.

**Date:** 2026-10-20 (updated). About 1,000 live calls on the hackathon key. Raw responses are in `research/out/` (git-ignored, per Qloo's terms). Probe scripts are `research/s1–s7.mjs`. City depth data: `out/city-place-depth.json`.

---

## 1. Can Qloo support it? Yes

| Need | Qloo feature | Evidence from the probe |
|---|---|---|
| Understand the show's "world" | Show entity tags (100–250 per show) | **Friends:** Coffee culture, Coffeehouse, Coffee shop, Apartment, Found family. **Peaky Blinders:** 1910s, Gambling, Period costume, Industrial England. **The Bear:** Sandwich shop, Fine dining, Culinary arts. **Emily in Paris:** Fashion, Luxury lifestyle, Postcard Parisian |
| Turn a motif into a place filter | `/v2/tags` | Valid tag IDs for café, coffee shop, bar, cocktail bar, pub, Irish pub, speakeasy, wine bar, pizza, bakery, French, diner, steakhouse, jazz club, bookstore, museum, vintage decor, moody ambience and rooftop |
| Real places that fit the motif **and** the show's fans | `filter.tags` + `signal.interests.entities=show` + `filter.location.query=city` + `bias.quality` | See the table in section 3: speakeasies, Irish pubs, French bistros and bakeries in 5 cities |
| Drinks matched to the show | Brands with `filter.tags=urn:tag:genre:brand:wine_and_spirits:spirits` | **Peaky Blinders → Jameson Irish Whiskey,** Dalmore, Bunnahabhain, Proper No. Twelve |
| Music | Artists by show signal | **Peaky Blinders → Nick Cave (who sings the theme song), Arctic Monkeys, PJ Harvey**, all on the actual soundtrack |
| What to wear | Brands by show signal | **Emily in Paris →** Chanel, Louboutin, Dior, Zara. **Peaky →** Triumph Motorcycles, Omega, Aston Martin |
| Food-led shows | Co-affinity alone | **The Bear → NYC:** Momofuku Noodle Bar, Russ & Daughters. **London:** The Clove Club, Core by Clare Smyth. **Tokyo:** Narisawa, Sukiyabashi Jiro |
| Who the fans are | `urn:demographics` | Friends skews 30–34; Peaky Blinders skews under 24 |
| Themed venues that already exist | `/search` | Qloo knows real Central Perk cafés and Peaky Blinders bars, which allows an "it actually exists" bonus |
| Fan density on a map | `urn:heatmap` (geohash or locality only on this key) | Works as a grid. Named neighbourhoods aren't available |

### Known issues to handle
- **Without motifs, results go generic.** A show signal alone can return landmarks or hotels, so the agent must add motif filters. That's also the reason this needs an agent rather than one API call.
- **Noise inside a motif.** "Friends + coffee shop" in London returned BFI IMAX and a camera museum, and in Paris some hotels. Fix: keep only places whose own category tags match, drop hotels unless asked for, and use `bias.quality`.
- **Generic drinks for some shows.** Spirits work for shows where drinking is part of the identity (Peaky Blinders, Mad Men, Succession). For Friends they come back generic (Absolut, Johnnie Walker), so the agent should skip the drinks slot when it isn't part of the show.
- **Fiction sometimes needs LLM lore.** Qloo's tags don't say "Joey loves pizza". The LLM supplies lore *motifs* (pizza, Central Perk-style café), but **every venue, brand and artist must come from Qloo**. A guard enforces this, as in Common Ground.

---

## 2. Which cities: launch only where the data is deepest

We counted how many places Qloo returns per category in 29 cities (capped at 150; 19 show-relevant categories). The score is average coverage from 0 to 1.

| Rank | City | Score | Notable depth |
|---|---|---|---|
| 1 | **New York** | 0.68 | 150+ cafés, bars, cocktail bars, wine bars, pizza, bakeries, diners; 48 Irish pubs, 24 speakeasies, 94 French |
| 2 | **London** | 0.60 | 150+ pubs, cafés, bars, bakeries; 73 French; good speakeasies |
| 3 | **Paris** | 0.55 | 150+ French, cafés, wine bars; 15 Irish pubs, 14 speakeasies |
| 4 | **Melbourne** | 0.50 | 150+ cafés, pubs, cocktail bars; strong pizza and bakery |
| 5 | **Los Angeles** | 0.49 | 150+ cafés, bars, pizza, bakeries; 101 diners |
| 6 | **Tokyo** | 0.47 | 150+ cafés, wine bars, French; 67 steakhouses |
| 7 | Chicago | 0.46 | 150+ cafés, bars, pizza, bakeries |
| 8 | Sydney | 0.45 | 150+ pubs, cafés, bars |
| 9–14 | Rome, São Paulo, Barcelona, Berlin, Toronto, Amsterdam | 0.36–0.44 | Good everyday categories; thin niche ones |
| Lower | Singapore, Madrid, Mexico City, Dublin, Seoul, Hong Kong, Bangalore, Mumbai, Miami, Dubai | 0.15–0.29 | Fine for cafés and bars; little for speakeasies, jazz or French |

(Miami, Austin and San Francisco may score low partly because Qloo's city boundary is small. Check `filter.location.radius` before ruling them out.)

**Launch set (6): New York, London, Paris, Los Angeles, Tokyo, Melbourne.** They cover 4 continents and each one is deep across categories. Chicago and Sydney are the next wave.

**Pitch line:** *"We launched only in the six cities where Qloo's taste data is deep enough to plan a whole evening, and we measured it."* Show the coverage table in the app and the README.

---

## 3. Quality check in the top cities (top results, `bias.quality=medium`)

| Show → motif | New York | London | Paris | Tokyo | Melbourne |
|---|---|---|---|---|---|
| Peaky Blinders → speakeasy | The Last Word, Patent Pending, 124 Old Rabbit Club | **Mr Fogg's Gin Parlour, Evans & Peel Detective Agency**, The Blind Pig | **Gentlemen 1919**, Le 1905, Castor Club | **Bar Benfiddich**, SG Low, Bar Composition | 1806, Murmur Piano Bar |
| Peaky Blinders → Irish pub / pub | **McSorley's Old Ale House**, Hibernia Bar | Waxy O'Connor's, The Auld Shillelagh | The Harp Bar, Little Temple Bar | An Sólás, **Swan & Lion Modern British Pub** | Jimmy O'Neills Whiskey & Alehouse |
| Emily in Paris → French | Le Coucou, Maison Premiere | Clos Maggiore, Randall & Aubin | Madame Brasserie, Ducasse sur Seine | L'Effervescence, Tour d'Argent | Reine & La Rue, Philippe |
| Emily in Paris → bakery | Russ & Daughters | Ottolenghi, Crumbs & Doilies | **Du Pain et des Idées**, Le Grenier à Pain | Boulangerie Seiji Asakura | Mile End Bagels, Bread Club |
| Friends → pizza | **John's of Bleecker Street**, Roberta's | Pizza Pilgrims | East Mamma | Pizzeria Alloro | SPQR Pizzeria |
| Friends → coffee shop | 787 Coffee, Principles | Lodestar Coffee (+ noise) | The People Belleville, KOKO (+ hotels) | Coffee Elementary School | Patricia Coffee Brewers |

Most top-5 results are exactly what a local fan would pick. Coffee shops need the noise filter described in section 1.

---

## 4. How to make it agentic

1. **Read the show.** Pull Qloo's tags. The LLM adds lore it knows (Central Perk, Joey's pizza, the Garrison pub, Shelby whiskey) and writes a **world bible**: 4–6 motifs, each with a slot (café, meal, drink, music, outfit, activity).
2. **Map motifs to Qloo.** Tool `search_tags` turns "1920s gangster pub" into tag IDs (speakeasy + pub + moody + vintage decor).
3. **Find candidates.** Tools:
   - `find_places(tags, show, city, price, open_on)`, using `filter.tags`, show co-affinity, `bias.quality`, `filter.price_level` and `filter.hours`;
   - `find_brands` for spirits and fashion;
   - `find_music`.
4. **Check and replan.** If a motif comes back thin or noisy, the agent widens it, swaps it for a related motif, or drops the slot and says why. This loop is the visible "agent thinking".
5. **Assemble the evening.** Choose 3–4 stops that are near each other (geocodes), fit the budget, time and group ("Saturday, 3 friends, $40 each") and aren't repetitive. Shape it like an episode:
   - *Cold open:* café
   - *Act one:* food
   - *Act two:* bar and drink
   - *End credits:* playlist
   - plus *Dress the part*
6. **Explain every stop:** "Tagged speakeasy + vintage decor, and in the top 10% with Peaky Blinders fans in Paris."
7. **Ground everything.** The LLM never names a venue, brand or artist that didn't come back from Qloo, and a guard checks it.

**Extras if time allows:** blend two shows for a couple (Friends × Emily in Paris), group mode (each friend names a show), "it really exists" badges for themed venues, and an MCP tool `live_the_show` so any assistant can call it.

**B2B angle (helps the impact score):** the same engine answers *"which 10 venues in London should host our Peaky Blinders launch night?"* for streaming marketing teams, and *"which shows should our bar theme a night around?"* for venues. These tie-ups happen all the time today and are planned by hand.

---

## 5. Comparison with the cultural translator

| | Live the show | Cultural translator |
|---|---|---|
| Category | A cross-domain recommender, close to what many teams will build | Something new: translating meaning between cultures |
| Originality | Medium. The "fiction → real local places" step and the episode-shaped itinerary are the differentiators | High |
| Fun and demo appeal | **Very high.** Peaky Blinders → Gentlemen 1919 + Jameson + Nick Cave lands instantly | High, needs a sentence of explanation |
| Data confidence | **High** in the 6 launch cities, measured | Medium; per-domain gaps in several cities |
| Engine difficulty (9 days) | Moderate | Harder |
| Audience and money | Consumers (fun, but weak willingness to pay) + marketers and venues (B2B) | Localization and marketing teams (clear buyers) |

**Overall:** "Live the show" is now the **safer build with the stronger demo**, because the data in the top six cities is clearly good. The translator is the **more original idea** but carries more engine risk. Either is realistic before Oct 30. Both together aren't.
