// Does a location signal + filter.results.entities tell iconic local picks apart from US ones?
import { q } from "../q.mjs";
const cases = {
  Madrid: [["El Retiro Park","place"],["Rosalía","artist"],["Paquita Salas","tv_show"],["Mercadona","brand"],["Aquí no hay quien viva","tv_show"],["Taylor Swift","artist"],["Whole Foods Market","brand"]],
  London: [["Peep Show","tv_show"],["Greggs","brand"],["Tesco","brand"],["Leicester Square","place"],["The Office","tv_show"],["Dunkin' Donuts","brand"]],
  Mumbai: [["DMart","brand"],["Panchayat","tv_show"],["The Kapil Sharma Show","tv_show"],["Dhvani Bhanushali","artist"],["Starbucks","brand"]],
};
for (const [city, items] of Object.entries(cases)) {
  for (const [name, kind] of items) {
    const s = await q("search", { query: name, types: `urn:entity:${kind}`, take: 1 });
    const hit = s.body?.results?.[0];
    if (!hit) { console.log(city, name, "NOT FOUND"); continue; }
    const res = {};
    for (const loc of [city, "New York City"]) {
      const r = await q("v2/insights", { "filter.type": `urn:entity:${kind}`, "signal.location.query": loc, "filter.results.entities": hit.entity_id, ...(kind==="place"?{"filter.location.query":city}:{}) });
      const e = r.body?.results?.entities?.[0];
      res[loc] = e ? (e.query?.affinity ?? e.affinity ?? "present") : "-";
    }
    console.log(`${city.padEnd(7)} ${hit.name.padEnd(28)} pop=${hit.popularity?.toFixed(4)} ${city}=${JSON.stringify(res[city])} NYC=${JSON.stringify(res["New York City"])}`);
  }
}
