# Decisions

Newest first. Each entry: date, decision, evidence.

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
