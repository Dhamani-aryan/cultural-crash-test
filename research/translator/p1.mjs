import { q, ents, save, OUT } from "../q.mjs";
const show = (label, r) => { const e = ents(r); console.log(`\n## ${label} -> ${r.status} (${r.ms}ms) n=${Array.isArray(e)?e.length:'?'}`); if (Array.isArray(e)) console.log(e.slice(0,8).map(x=>`${x.name ?? x.id} [${x.popularity?.toFixed?.(2) ?? ''}${x.properties?.geocode?.city? ' '+x.properties.geocode.city:''}]`).join(" | ")); else console.log(JSON.stringify(r.body).slice(0,500)); };
// resolve anchors
const anchors = {};
for (const [name, type] of [["Trader Joe's","urn:entity:brand"],["Chipotle","urn:entity:brand"],["Peloton","urn:entity:brand"],["Glossier","urn:entity:brand"],["Taylor Swift","urn:entity:artist"],["The Office","urn:entity:tv_show"]]) {
  const r = await q("/search", { query: name, types: type, take: 3 });
  const e = ents(r); anchors[name] = e[0]; console.log("search", name, r.status, e.slice(0,3).map(x=>`${x.name}/${x.entity_id}/${x.popularity?.toFixed?.(2)}`).join(" ; "));
}
save("anchors", anchors);
const tj = anchors["Trader Joe's"].entity_id, tsw = anchors["Taylor Swift"].entity_id;
// cross-location brand equivalents
for (const city of ["Tokyo","Mumbai","London"]) {
  show(`brand like TJ, signal.location.query=${city}`, await q("/v2/insights", { "filter.type":"urn:entity:brand", "signal.interests.entities": tj, "signal.location.query": city, take: 15 }));
  show(`place like TJ, filter.location.query=${city}`, await q("/v2/insights", { "filter.type":"urn:entity:place", "signal.interests.entities": tj, "filter.location.query": city, take: 15 }));
  show(`artist like Swift, signal.location.query=${city}`, await q("/v2/insights", { "filter.type":"urn:entity:artist", "signal.interests.entities": tsw, "signal.location.query": city, take: 15 }));
}
show("brand like TJ, no location", await q("/v2/insights", { "filter.type":"urn:entity:brand", "signal.interests.entities": tj, take: 15 }));
show("artist like Swift, no loc", await q("/v2/insights", { "filter.type":"urn:entity:artist", "signal.interests.entities": tsw, take: 15 }));
// other endpoints
show("demographics of TJ", await q("/v2/insights", { "filter.type":"urn:demographics", "signal.interests.entities": tj }));
console.log(JSON.stringify(q && (await q("/v2/insights", { "filter.type":"urn:demographics", "signal.interests.entities": tj })).body).slice(0,800));
show("heatmap TJ NYC", await q("/v2/insights", { "filter.type":"urn:heatmap", "signal.interests.entities": tj, "filter.location.query":"New York City" }));
show("tags taste of TJ", await q("/v2/insights", { "filter.type":"urn:tag", "signal.interests.entities": tj, take: 15 }));
show("audiences types", await q("/v2/audiences/types"));
show("trending", await q("/v2/trending", { "filter.type":"urn:entity:brand", take: 5 }));
show("entity lookup", await q("/entities", { entity_ids: tj }));
console.log(JSON.stringify((await q("/entities", { entity_ids: tj })).body).slice(0,1500));
show("age signal brand", await q("/v2/insights", { "filter.type":"urn:entity:brand", "signal.demographics.age":"25_to_29", "signal.location.query":"Tokyo", take: 10 }));
