# Decisions

Newest first. Each entry: date, decision, evidence.

## 2026-10-21: Places rank by fame, with in-city co-affinity

Sweep: Central Park, Times Square, Whole Foods, SNL, Home Alone, Beyoncé × 5 markets.

- The superstar gate was removing famous landmarks (Hyde Park). Places are physically local, so they skip that gate and use Qloo popularity as *fame*.
- A city's "distinctive" list can miss its most famous places. For places only, the pool also includes what the anchor's fans like *inside* the target city (`signal.interests.entities` + `filter.location.query`). That's safe because the location filter pins it to the city.
- **Results:**
  - Central Park → Hyde Park (London), Ibirapuera Park (São Paulo), Hanging Garden (Mumbai), Hibiya Park (Tokyo).
  - Times Square → Shibuya Crossing (Tokyo), Puerta del Sol (Madrid), Girgaon Chowpatty (Mumbai).
  - SNL → Late Motiv / La resistencia (Madrid), Zee Comedy Show (Mumbai), Never Mind the Buzzcocks (London), LOL Brasil.
  - Beyoncé → Utada Hikaru (Tokyo), Craig David / Jessie Ware (London), Iza (São Paulo).
  - Home Alone → *Minha Mãe é uma Peça 3* (São Paulo), Bollywood family comedies (Mumbai).
- **Weak:** Whole Foods → Mumbai returns department stores (Shoppers Stop); Madrid returns Pescanova and Lidl. Retail categories are broad, so the agent should prefer "keep or describe" when role overlap is low.

## 2026-10-21: Equivalence engine v1 (`src/lib/engine/`)

Tested live with `scripts/try-equivalents.ts` on Chipotle, Trader Joe's, The Office and Taylor Swift across all 5 markets.

- **Cross-city affinity comparison doesn't work.** Under a location signal, Qloo leaves out entities that aren't distinctive there (Starbucks and KFC vanish from New York's list), so a missing score means "unknown". Locality is now *presence in other cities' top-100 lists*: 4 control cities. Those lists are identical for every anchor, so they cache well.
- **Gates, in order:**
  1. *global*: in ≥ 2 control lists, or Qloo popularity ≥ 0.998. The biggest local stars top out around 0.997 (Utada Hikaru, Caetano Veloso, Rosalía); global stars are 0.999+.
  2. *familiar in source*: in a New York, LA, Chicago or San Francisco list. The US audience already has it (In-N-Out, Jamba Juice).
  3. *foreign origin*: brands use the `key_market` tags; chains use Wikipedia categories; artists use the nationality in their short description. Insights results omit these tags, so the top 12 get a full-record re-check.
  4. *foreign release*: TV and film `release_country` must match.
  5. *duplicates*: name and aka match; identical audience skew plus ≥ 0.5 role overlap ("Jin Akanishi" / "赤西仁"); one name extending another ("Anushka" / "Anushka Manchanda").
- **Score:** 0.45 role (weighted Jaccard over character tags, scaled to the pool) + 0.25 locality + 0.15 audience (age/gender cosine) + 0.15 fame (rank in the target city). Factual tags (Wikipedia categories, competitor brands, business model) are excluded from role, because they pulled US entities back in.
- **Examples after the gates:**
  - Chipotle → Goiko, Telepizza (Madrid); Café Coffee Day, Behrouz Biryani (Mumbai); Sushiro, Matsuya (Tokyo); Nando's, Wagamama, Greggs (London); Casa do Pão de Queijo (São Paulo).
  - Trader Joe's → Zaffari, Pão de Açúcar (São Paulo).
  - The Office → People Just Do Nothing (London), Paquita Salas (Madrid), TVF Pitchers (Mumbai).
  - Taylor Swift → Aitana (Madrid), DUDA BEAT and Pabllo Vittar (São Paulo), Sunidhi Chauhan (Mumbai).
- **Known weak spots:**
  - The Office → Tokyo returns romantic comedies (Japan has few workplace sitcoms in Qloo's top list).
  - Tokyo artists include idol-actors.
  - Brand role scores are low in absolute terms (~0.05–0.15), so locality and fame carry more of the ranking there.

## 2026-10-21: Launch markets and per-domain confidence

- **Source market:** United States (New York as Qloo's reference location). US entities have the richest tags and the deepest data, and US content is what gets localized most.
- **Target markets:** Tokyo, London, Mumbai, São Paulo, Madrid.
- **Evidence:** `scripts/measure-coverage.ts` → `data/coverage.json`, 12 cities. For each city and domain, it takes the top 150 results under a location-only signal. *Distinct* is the share of the top 50 that appear in at most one other city; for places, category depth across 8 common venue categories.
- **Excluded:** Seoul (brands 0.48, places 0.29), Paris (TV 0.52, film 0.16, brands 0.50), Berlin (film 0.18), Mexico City (Madrid covers Spanish with stronger data), Sydney and Toronto (media too close to US and UK).
- **Grades** (`src/lib/markets.ts`): media and brands are *strong* at distinct ≥ 0.8 and *usable* at ≥ 0.4; places are *strong* at category depth ≥ 0.45 and *usable* at ≥ 0.3. Anything *off* is flagged for a human, not translated. Overrides from measured translation quality go into `OVERRIDES`, with evidence recorded here.
- Books and podcasts are not supported. In every city we probed, their location-only results were dominated by US titles.

## 2026-10-20: Translation method (from research/translator/)

- **Rejected:** entity signal + location signal, which returns US brands in Tokyo (Costco, Le Creuset), and ranking a local pool by co-affinity with the anchor, which pulls back to US chains (In-N-Out in Tokyo). Co-affinity measures what the *same people* like, not what plays the *same role* elsewhere.
- **Chosen:** build a local pool from a location-only signal, then score each candidate on role similarity (shared role tags), locality (target-city affinity percentile vs. control cities) and audience similarity (demographics).
- Batch `filter.results.entities` in groups of ≤ 50. The API caps `take` at 50, so larger lists silently lose their scores.
