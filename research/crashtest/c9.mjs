// Evidence check for the Madrid fix: what do Qloo's records say about these brands?
import { q, ents } from "../q.mjs";
for (const n of ["Arizona Vintage", "Ecoalf", "Thinking MU", "Mam Originals", "Fred Perry", "Dxpe Chef"]) {
  const s = ents(await q("/search", { query: n, types: "urn:entity:brand", take: 1 }))[0];
  if (!s) { console.log(n, "→ not found"); continue; }
  const full = (await q("/entities", { entity_ids: s.entity_id })).body?.results?.[0] ?? {};
  console.log(n, "|", full.properties?.short_description, "|", (full.tags ?? []).filter((t) => /genre:brand|keyword|core_value|style/.test(t.type ?? "")).slice(0, 10).map((t) => t.name).join(", "));
}
