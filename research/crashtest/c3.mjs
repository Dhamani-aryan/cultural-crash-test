// Crash-test probe 3: pop-up venue candidates by place category, seeded by brand anchors, in a city.
import { q, ents, save } from "../q.mjs";
const seeds = ["92384FD1-363D-4423-926C-EAF478CE079B","91D22C42-E4F7-4FBC-9D0D-A0182794C86D","2D69DB33-B4DF-4879-B3DC-308E3402A1FD"].join(",");
const out = {};
const tags = ["urn:tag:category:place:clothing_store","urn:tag:category:place:art_gallery","urn:tag:category:place:skateboard_park","urn:tag:category:place:bar","urn:tag:category:place:market","urn:tag:category:place:tourist_attraction","urn:tag:genre:place:skateboard_shop"];
for (const city of ["London","Tokyo","São Paulo"]) for (const t of tags) {
  const r = await q("/v2/insights", { "signal.interests.entities": seeds, "filter.location.query": city, "filter.type": "urn:entity:place", "filter.tags": t, take: 6 });
  out[`${city} ${t.split(":").pop()}`] = { s: r.status, top: ents(r).map((e) => `${e.name} ${e.query?.affinity?.toFixed(3)} p${e.popularity?.toFixed(2)}`) };
}
// Location-only streetwear brands, and a demographics-only check.
for (const city of ["London","Tokyo"]) {
  const r = await q("/v2/insights", { "signal.location.query": city, "filter.type": "urn:entity:brand", "filter.tags": "urn:tag:genre:brand:fashion:footwear:sneakers", take: 8 });
  out[`loc-only sneakers ${city}`] = { s: r.status, top: ents(r).map((e) => `${e.name} ${e.query?.affinity?.toFixed(3)}`) };
  const d = await q("/v2/insights", { "signal.interests.entities": seeds, "signal.location.query": city, "signal.demographics.age": "24_and_younger", "filter.type": "urn:entity:artist", take: 6 });
  out[`age<=24 artists ${city}`] = { s: d.status, top: ents(d).map((e) => `${e.name} ${e.query?.affinity?.toFixed(3)}`) };
}
save("c3", out);
for (const [k, v] of Object.entries(out)) console.log(k, v.s, "\n   ", v.top.join(" | "));
