// Brand category tags: which genre:brand tags do anchors and good local equivalents carry?
import { q } from "../q.mjs";
const names = process.argv.slice(2);
for (const n of names) {
  const s = await q("search", { query: n, types: "urn:entity:brand", take: 1 });
  const hit = s.body?.results?.[0];
  if (!hit) { console.log(n, "NOT FOUND"); continue; }
  const e = await q("entities", { entity_ids: hit.entity_id });
  const full = e.body?.results?.[0] ?? hit;
  const tags = (full.tags ?? []).filter(t => /genre:brand|category/.test(t.type));
  console.log(`\n${full.name} pop=${full.popularity?.toFixed(3)}`);
  console.log("  " + tags.map(t => `${t.name} [${t.type.replace("urn:tag:","")}]`).join(" | "));
}
