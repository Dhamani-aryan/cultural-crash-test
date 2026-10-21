// Crash-test probe 5: creative-direction tags (aesthetic, tone, identity) for an audience in a city.
import { q, save } from "../q.mjs";
const seeds = ["92384FD1-363D-4423-926C-EAF478CE079B","91D22C42-E4F7-4FBC-9D0D-A0182794C86D","2D69DB33-B4DF-4879-B3DC-308E3402A1FD"].join(",");
const out = {};
const types = ["urn:tag:aesthetic_property:qloo","urn:tag:emotional_tone:qloo","urn:tag:customer_identity:qloo","urn:tag:cultural_relevance:qloo"];
for (const city of ["London","Tokyo","São Paulo"]) for (const tt of types) {
  const r = await q("/v2/insights", { "filter.type": "urn:tag", "signal.interests.entities": seeds, "signal.location.query": city, "filter.tag.types": tt, take: 15 });
  out[`${city} ${tt.split(":")[2]}`] = (r.body?.results?.tags ?? []).map((t) => `${t.name} ${t.query?.affinity?.toFixed(3)}`);
}
// Search tag names a brief might use
for (const s of ["minimalist", "rebellious", "nostalgic", "luxury", "playful"]) {
  const r = await q("/v2/tags", { "filter.query": s, take: 6 });
  out[`search ${s}`] = (r.body?.results?.tags ?? []).map((t) => `${t.id}`);
}
// Score a specific tag for the audience: filter.results.tags?
const r = await q("/v2/insights", { "filter.type": "urn:tag", "signal.interests.entities": seeds, "signal.location.query": "London", "filter.results.tags": "urn:tag:aesthetic_property:qloo:minimalist", take: 5 });
out["score minimalist London"] = { s: r.status, tags: (r.body?.results?.tags ?? []).map((t) => `${t.tag_id} ${t.query?.affinity}`) };
save("c5", out);
for (const [k, v] of Object.entries(out)) console.log(k, "\n   ", Array.isArray(v) ? v.join(" | ") : JSON.stringify(v));
