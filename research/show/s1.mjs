import { q, ents, save, OUT } from "../q.mjs";
const nm = (r,n=10) => ents(r).slice(0,n).map(x=>x.name).join(" | ");
const shows = {};
for (const s of ["Friends","Peaky Blinders","The Bear","Emily in Paris","Breaking Bad"]) {
  const r = await q("/search", { query: s, types: "urn:entity:tv_show", take: 2 }); const e = ents(r)[0];
  const full = ents(await q("/entities", { entity_ids: e.entity_id }))[0];
  shows[s] = full;
  const byType = {}; for (const t of full.tags??[]) (byType[t.type?.replace("urn:tag:","")] ??= []).push(t.name);
  console.log(`\n### ${s} (${e.entity_id}) tags=${full.tags?.length}`);
  for (const [k,v] of Object.entries(byType)) console.log(`  ${k}: ${v.slice(0,12).join(", ")}`);
}
save("shows", shows);
