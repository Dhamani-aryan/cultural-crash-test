import { q, ents, save, pool as par, calls } from "../q.mjs";
const CITIES = ["New York City","Los Angeles","Chicago","San Francisco","Austin","Miami","Toronto","Mexico City","São Paulo","Buenos Aires","London","Paris","Berlin","Madrid","Amsterdam","Milan","Tokyo","Seoul","Mumbai","Delhi","Singapore","Sydney","Dubai","Lagos","Istanbul","Bangkok","Jakarta","Manila"];
const TYPES = ["artist","tv_show","movie","brand"];
const lists = {}; // type -> city -> [ids]
const meta = {};
await par(CITIES.flatMap(c=>TYPES.map(t=>[c,t])), 4, async ([c,t]) => {
  const r = await q("/v2/insights", { "filter.type":`urn:entity:${t}`, "signal.location.query":c, take: 50 });
  const e = ents(r);
  (lists[t] ??= {})[c] = e.map(x=>x.entity_id);
  (meta[c] ??= {})[t] = { status: r.status, n: e.length, sample: e.slice(0,5).map(x=>x.name), avgTags: e.reduce((s,x)=>s+(x.tags?.length??0),0)/(e.length||1) };
});
// places: up to 4 pages
await par(CITIES, 3, async (c) => {
  let all = [];
  for (let p=1;p<=4;p++){ const r = await q("/v2/insights", { "filter.type":"urn:entity:place", "filter.location.query":c, "signal.location.query":c, take: 50, page: p }); const e = ents(r); if (r.status!==200) { meta[c].placeErr = r.status; break; } all = all.concat(e); if (e.length<50) break; }
  const genre = (x)=> (x.tags??[]).filter(t=>/genre:place/.test(t.type??"")).map(t=>t.tag_id);
  const hotel = all.filter(x=>genre(x).some(g=>/hotel|lodging/.test(g)) || /hotel|hostel|inn\b|resort/i.test(x.name)).length;
  const cats = new Set(all.flatMap(genre));
  const ext = all.filter(x=>x.external && Object.keys(x.external).some(k=>/tripadvisor|resy|michelin/.test(k))).length;
  const inCity = all.filter(x=>x.properties?.geocode?.city).length;
  meta[c].place = { n: all.length, hotelShare: +(hotel/(all.length||1)).toFixed(2), categories: cats.size, reviewed: +(ext/(all.length||1)).toFixed(2), avgTags: +(all.reduce((s,x)=>s+(x.tags?.length??0),0)/(all.length||1)).toFixed(0), sample: all.filter(x=>!/hotel/i.test(x.name)).slice(0,5).map(x=>x.name) };
});
// distinctiveness: share of a city's list that appears in <=1 other city's list
for (const t of TYPES) for (const c of CITIES) {
  const mine = lists[t][c] ?? []; let uniq = 0;
  for (const id of mine) { let k=0; for (const o of CITIES) if (o!==c && (lists[t][o]??[]).includes(id)) k++; if (k<=1) uniq++; }
  meta[c][t].distinct = +(uniq/(mine.length||1)).toFixed(2);
}
save("city-density", meta);
console.log("city | artist tv movie brand distinct | place n hotel cats reviewed avgTags");
const rows = CITIES.map(c=>{ const m=meta[c]; const d = TYPES.map(t=>m[t].distinct); const p=m.place??{}; const score = d.reduce((s,x)=>s+x,0)/4*0.6 + Math.min(1,(p.n??0)/200)*0.15 + (1-(p.hotelShare??1))*0.1 + Math.min(1,(p.categories??0)/40)*0.15; return {c, d, p, score}; }).sort((a,b)=>b.score-a.score);
for (const r of rows) console.log(`${r.c.padEnd(14)} | ${r.d.map(x=>x.toFixed(2)).join(" ")} | ${r.p.n} ${r.p.hotelShare} ${r.p.categories} ${r.p.reviewed} ${r.p.avgTags} | score ${r.score.toFixed(2)}`);
console.log("\nSamples:"); for (const c of CITIES) console.log(c, "| art:", meta[c].artist.sample.slice(0,3).join(", "), "| tv:", meta[c].tv_show.sample.slice(0,3).join(", "), "| brand:", meta[c].brand.sample.slice(0,3).join(", "), "| place:", (meta[c].place?.sample??[]).slice(0,3).join(", "));
console.log("calls", calls);
