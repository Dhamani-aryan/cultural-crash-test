// Crash-test probe 1: streetwear entities, tag search, cross-category insights with explainability.
import { q, ents, save } from "../q.mjs";
const out = {};
const find = async (query, type) => {
  const r = await q("/search", { query, types: type, take: 3 });
  return ents(r).map((e) => ({ id: e.entity_id, name: e.name, pop: e.popularity }));
};
for (const n of ["Supreme", "Stüssy", "Palace Skateboards", "Carhartt WIP", "A Bathing Ape", "Corteiz"])
  out[n] = await find(n, "urn:entity:brand");
out.artists = await find("Skepta", "urn:entity:artist");
out.places = await find("Dover Street Market London", "urn:entity:place");
// Tag search
for (const t of ["streetwear", "skate", "grime", "sneakers"]) {
  const r = await q("/v2/tags", { "filter.query": t, take: 8 });
  out["tag:" + t] = { status: r.status, tags: (r.body?.results?.tags ?? []).map((x) => [x.id ?? x.tag_id, x.name, x.type ?? x.subtype]) };
}
save("c1-search", out);
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
