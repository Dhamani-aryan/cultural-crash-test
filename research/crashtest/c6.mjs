// Crash-test probe 6: which place category tags exist for pop-up venues, and place search by name.
import { q, ents } from "../q.mjs";
const seeds = ["92384FD1-363D-4423-926C-EAF478CE079B","91D22C42-E4F7-4FBC-9D0D-A0182794C86D","2D69DB33-B4DF-4879-B3DC-308E3402A1FD"].join(",");
for (const c of ["night_club","live_music_venue","event_venue","cafe","coffee_shop","shopping_mall","concert_hall","record_store","sneaker_store","shoe_store","museum","warehouse","exhibition_center","cultural_center"]) {
  const r = await q("/v2/insights", { "signal.interests.entities": seeds, "filter.location.query": "London", "filter.type": "urn:entity:place", "filter.tags": `urn:tag:category:place:${c}`, take: 4 });
  console.log(c, r.status, ents(r).map((e) => e.name).join(" | "));
}
for (const n of ["Old Truman Brewery", "Boxpark Shoreditch", "Shoreditch", "Printworks London", "Selfridges"]) {
  const r = await q("/search", { query: n, types: "urn:entity:place", take: 3 });
  console.log("search", n, "→", ents(r).map((e) => `${e.name} [${e.properties?.geocode?.city ?? e.location?.city ?? ""}] ${(e.tags ?? []).filter((t) => (t.type ?? t.tag_id ?? "").includes("category")).slice(0, 2).map((t) => t.tag_id ?? t.id).join(",")}`).join(" | "));
}
