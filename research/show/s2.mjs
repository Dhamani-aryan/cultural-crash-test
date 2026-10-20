import { q, ents, save, OUT } from "../q.mjs";
import { readFileSync } from "node:fs";
const S = JSON.parse(readFileSync(OUT + "/shows.json","utf8"));
const nm = (r,n=10) => r.status!==200 ? `ERR ${r.status} ${JSON.stringify(r.body).slice(0,150)}` : ents(r).slice(0,n).map(x=>`${x.name}${x.properties?.geocode?.city?'':' (?)'}`).join(" | ");
// tag lookup
const tagIds = {};
for (const t of ["coffee","cafe","pizza","irish pub","pub","whiskey","cocktail bar","gin","speakeasy","sandwich","bakery","fine dining","french","brasserie","rooftop","jazz","bar","bowling","vintage","barber"]) {
  const r = await q("/v2/tags", { "filter.query": t, "filter.parents.types": "urn:entity:place", take: 4 });
  const e = r.body?.results?.tags ?? []; tagIds[t] = e.map(x=>x.id ?? x.tag_id);
  console.log(`tag "${t}":`, e.map(x=>`${x.name}=${x.id??x.tag_id}`).join(" ; "));
}
save("tags", tagIds);
for (const city of ["Bangalore","Jaipur"]) for (const s of ["Friends","Peaky Blinders","The Bear"]) {
  console.log(`\n== ${s} @ ${city}`);
  console.log("  co-affinity places:", nm(await q("/v2/insights", { "filter.type":"urn:entity:place", "signal.interests.entities": S[s].entity_id, "filter.location.query": city, take: 10 })));
}
