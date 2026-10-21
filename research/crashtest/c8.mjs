// Why were Sanrio, DIVINE and Vans swapped (for Uniqlo, Badshah, Dxpe Chef)?
import { q, ents } from "../q.mjs";
for (const [n, t] of [["Sanrio", "urn:entity:brand"], ["DIVINE", "urn:entity:artist"], ["Divine", "urn:entity:artist"], ["Dxpe Chef", "urn:entity:brand"], ["Vans", "urn:entity:brand"]]) {
  const hits = ents(await q("/search", { query: n, types: t, take: 4 }));
  for (const s of hits.slice(0, 3)) {
    const full = (await q("/entities", { entity_ids: s.entity_id })).body?.results?.[0] ?? {};
    const tags = (full.tags ?? []).map((x) => `${x.type?.replace("urn:tag:", "")}=${x.name}`);
    console.log(n, "→", s.name, s.entity_id.slice(0, 8), "pop", s.popularity?.toFixed(3), "|", (full.properties?.short_description ?? "").slice(0, 90), "|", tags.filter((x) => /key_market|wikipedia|genre:brand/.test(x)).slice(0, 8).join("; "));
  }
}
