import { q, ents, OUT } from "../q.mjs";
import { readFileSync } from "node:fs";
const S = JSON.parse(readFileSync(OUT + "/shows.json","utf8"));
const nm = (r,n=8) => r.status!==200 ? `ERR ${r.status}` : `(${ents(r).length}) ` + ents(r).slice(0,n).map(x=>x.name).join(" | ");
const motifs = {
  "Friends": [["coffee shop","urn:tag:category:place:coffee_shop"],["cafe","urn:tag:genre:place:restaurant:cafe"],["pizza","urn:tag:genre:place:restaurant:pizza"]],
  "Peaky Blinders": [["irish pub","urn:tag:genre:place:restaurant:irish_pub"],["pub","urn:tag:genre:place:restaurant:pub"],["speakeasy","urn:tag:setting:qloo:speakeasy"],["cocktail bar","urn:tag:genre:place:restaurant:cocktail_bar"],["whiskey","urn:tag:specialty_dish:place:whiskey"],["vintage decor","urn:tag:decor:qloo:vintage"],["barber","urn:tag:genre:place:barber_shop"]],
  "Emily in Paris": [["french","urn:tag:genre:place:restaurant:french"],["bakery","urn:tag:genre:place:restaurant:bakery"],["rooftop","urn:tag:setting:qloo:rooftop"]],
};
for (const city of ["Bangalore","Jaipur","Mumbai"]) for (const [s, ms] of Object.entries(motifs)) for (const [label, tag] of ms) {
  const r = await q("/v2/insights", { "filter.type":"urn:entity:place", "filter.tags": tag, "signal.interests.entities": S[s].entity_id, "filter.location.query": city, take: 50 });
  console.log(`${city.padEnd(9)} ${s.padEnd(14)} ${label.padEnd(12)} ${nm(r,6)}`);
}
console.log("\n--- brands by show signal");
for (const s of ["Peaky Blinders","Friends","Emily in Paris"]) console.log(s, "->", nm(await q("/v2/insights", { "filter.type":"urn:entity:brand", "signal.interests.entities": S[s].entity_id, take: 25 }), 25));
const spir = await q("/v2/tags", { "filter.query": "spirits", take: 8 }); console.log("spirit tags:", (spir.body?.results?.tags??[]).map(x=>x.id??x.tag_id).join(" ; "));
const bev = await q("/v2/tags", { "filter.query": "alcohol", "filter.parents.types":"urn:entity:brand", take: 8 }); console.log("alcohol brand tags:", (bev.body?.results?.tags??[]).map(x=>x.id??x.tag_id).join(" ; "));
for (const s of ["Peaky Blinders","Friends"]) console.log(s, "artists ->", nm(await q("/v2/insights", { "filter.type":"urn:entity:artist", "signal.interests.entities": S[s].entity_id, take: 10 }), 10));
