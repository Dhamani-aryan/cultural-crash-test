// Why did DC Shoes pass as "from Brazil" and Hilton Tokyo Bay pass the venue gate?
import { q, ents } from "../q.mjs";
for (const [n, t] of [["DC Shoes", "urn:entity:brand"], ["Hilton Tokyo Bay", "urn:entity:place"], ["Uniqlo", "urn:entity:brand"]]) {
  const s = ents(await q("/search", { query: n, types: t, take: 1 }))[0];
  const full = (await q("/entities", { entity_ids: s.entity_id })).body?.results?.[0] ?? {};
  const tags = (full.tags ?? []).map((x) => `${x.type?.replace("urn:tag:", "")}=${x.name}`);
  console.log(n, "|", full.properties?.short_description, "|", tags.filter((x) => /key_market|wikipedia|category|genre:place|origin/.test(x)).slice(0, 14).join("; "));
}
