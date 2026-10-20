import { q, ents, save, pool as par } from "../q.mjs";
const T = {
  cafe:"urn:tag:genre:place:restaurant:cafe", coffee:"urn:tag:category:place:coffee_shop", bar:"urn:tag:genre:place:restaurant:bar",
  cocktail:"urn:tag:genre:place:restaurant:cocktail_bar", pub:"urn:tag:category:place:pub", irishpub:"urn:tag:category:place:irish_pub",
  speakeasy:"urn:tag:setting:qloo:speakeasy", wine:"urn:tag:category:place:wine_bar", pizza:"urn:tag:genre:place:restaurant:pizza",
  bakery:"urn:tag:genre:place:restaurant:bakery", french:"urn:tag:genre:place:restaurant:french", diner:"urn:tag:category:place:diner",
  steak:"urn:tag:category:place:steak_house", jazz:"urn:tag:genre:place:jazz_club", books:"urn:tag:genre:place:book_store",
  museum:"urn:tag:category:place:museum", vintage:"urn:tag:decor:qloo:vintage", moody:"urn:tag:ambience:qloo:moody",
  livemusic:"urn:tag:good_for:qloo:live_music", rooftop:"urn:tag:setting:qloo:rooftop",
};
async function depth(city, tag) {
  const base = { "filter.type":"urn:entity:place", "filter.tags": tag, "filter.location.query": city, "signal.location.query": city, take: 50 };
  const p3 = await q("/v2/insights", { ...base, page: 3 }); if (p3.status!==200) return -1;
  if (ents(p3).length) return 100 + ents(p3).length;
  const p1 = ents(await q("/v2/insights", base)).length; if (p1 < 50) return p1;
  return 50 + ents(await q("/v2/insights", { ...base, page: 2 })).length;
}
const mode = process.argv[2];
if (mode === "validate") {
  for (const [k,t] of Object.entries(T)) console.log(k.padEnd(10), await depth("New York City", t));
} else {
  const keep = JSON.parse(process.argv[3]);
  const CITIES = ["New York City","Los Angeles","Chicago","San Francisco","Miami","Austin","Toronto","London","Paris","Berlin","Madrid","Barcelona","Amsterdam","Rome","Lisbon","Dublin","Tokyo","Seoul","Singapore","Hong Kong","Sydney","Melbourne","Dubai","Mexico City","São Paulo","Mumbai","Bangalore","Istanbul","Bangkok"];
  const res = {};
  await par(CITIES.flatMap(c=>keep.map(k=>[c,k])), 5, async ([c,k]) => { (res[c] ??= {})[k] = await depth(c, T[k]); });
  save("city-place-depth", res);
  const score = (c) => keep.reduce((s,k)=>s+Math.min(150,Math.max(0,res[c][k]))/150,0)/keep.length;
  const rows = CITIES.sort((a,b)=>score(b)-score(a));
  console.log("city".padEnd(14), keep.map(k=>k.slice(0,6).padStart(7)).join(""), "  score");
  for (const c of rows) console.log(c.padEnd(14), keep.map(k=>String(res[c][k]).padStart(7)).join(""), "  "+score(c).toFixed(2));
}
