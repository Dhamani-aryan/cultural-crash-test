// Crash-test probe 2: cross-category insights seeded by brand anchors, under a city signal, with explainability.
import { q, ents, save } from "../q.mjs";
const SUP = "7161ADA0-8DC8-471E-A4A8-61EE15578400", STU = "92384FD1-363D-4423-926C-EAF478CE079B",
  PAL = "91D22C42-E4F7-4FBC-9D0D-A0182794C86D", CAR = "2D69DB33-B4DF-4879-B3DC-308E3402A1FD",
  SKEPTA = "DED6ED95-7871-4C61-9460-FBB54BF320EE";
const seeds = [STU, PAL, CAR].join(",");
const out = {};
const brief = (r) => ({ status: r.status, ms: r.ms, warnings: r.body?.warnings ?? r.body?.results?.warnings, keys: Object.keys(r.body ?? {}), resKeys: Object.keys(r.body?.results ?? {}),
  top: ents(r).slice(0, 10).map((e) => ({ name: e.name, aff: e.query?.affinity, rank: e.query?.rank, pop: e.popularity, expl: e.query?.explainability ?? e.explainability, qkeys: Object.keys(e.query ?? {}) })) });
for (const city of ["London", "Tokyo"]) {
  const base = { "signal.interests.entities": seeds, "signal.location.query": city, take: 15, "feature.explainability": true };
  out[`artist@${city}`] = brief(await q("/v2/insights", { ...base, "filter.type": "urn:entity:artist" }));
  out[`brand@${city}`] = brief(await q("/v2/insights", { ...base, "filter.type": "urn:entity:brand" }));
  out[`place@${city}`] = brief(await q("/v2/insights", { "signal.interests.entities": seeds, "filter.location.query": city, take: 15, "feature.explainability": true, "filter.type": "urn:entity:place" }));
  // Specific candidate's score: Skepta / Supreme under the seeds.
  out[`check@${city}`] = brief(await q("/v2/insights", { ...base, "filter.type": "urn:entity:artist", "filter.results.entities": SKEPTA }));
}
const raw = await q("/v2/insights", { "signal.interests.entities": seeds, "signal.location.query": "London", take: 3, "feature.explainability": true, "filter.type": "urn:entity:artist" });
save("c2-raw", raw.body);
save("c2", out);
console.log(JSON.stringify(out, null, 1).slice(0, 9000));
console.log("RAW first entity query:", JSON.stringify(ents(raw)[0]?.query, null, 1)?.slice(0, 1500));
console.log("RAW top-level non-results:", JSON.stringify(Object.fromEntries(Object.entries(raw.body ?? {}).filter(([k]) => k !== "results")), null, 1).slice(0, 1500));
