// Crash-test probe 4: can tags be scored for an audience in a city (creative direction)?
import { q, ents, save } from "../q.mjs";
const seeds = ["92384FD1-363D-4423-926C-EAF478CE079B","91D22C42-E4F7-4FBC-9D0D-A0182794C86D","2D69DB33-B4DF-4879-B3DC-308E3402A1FD"].join(",");
const out = {};
for (const city of ["London","Tokyo"]) for (const tt of ["urn:tag:genre:music","urn:tag:keyword:brand","urn:tag:style:qloo", undefined]) {
  const r = await q("/v2/insights", { "filter.type": "urn:tag", "signal.interests.entities": seeds, "signal.location.query": city, "filter.tag.types": tt, take: 12 });
  const list = r.body?.results?.tags ?? ents(r);
  out[`${city} ${tt}`] = { s: r.status, err: r.status !== 200 ? JSON.stringify(r.body).slice(0, 200) : undefined, top: (list ?? []).map((t) => `${t.name ?? t.id} ${(t.query?.affinity ?? t.affinity)?.toFixed?.(3) ?? ""} [${(t.subtype ?? t.type ?? "").replace("urn:tag:", "")}]`) };
}
const r = await q("/v2/insights", { "filter.type": "urn:tag", "signal.interests.entities": seeds, "signal.location.query": "London", take: 2 });
console.log(JSON.stringify(r.body, null, 1).slice(0, 1500));
save("c4", out);
for (const [k, v] of Object.entries(out)) console.log(k, v.s, v.err ?? "", "\n   ", v.top.join(" | "));
