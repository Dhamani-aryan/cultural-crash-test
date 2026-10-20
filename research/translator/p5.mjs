import { q, ents, save, pool as par } from "../q.mjs";
import { readFileSync } from "node:fs";
const A = JSON.parse(readFileSync(OUT + "/anchors.json","utf8"));
const TYPE_OK = /genre|category|lifestyle|core_value|cultural_relevance|customer_segment|aesthetic|archetype|emotional_tone|audience|theme|style|characteristic|mood|keyword/;
const tagSet = (e) => new Set((e.tags??[]).filter(t=>TYPE_OK.test(t.type??"")).map(t=>t.tag_id ?? t.id));
const jacc = (a,b) => { let i=0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); };
const vec = (d) => d ? [...Object.values(d.age), d.gender.female] : null;
const cos = (a,b) => { if(!a||!b) return 0; let s=0,x=0,y=0; for(let i=0;i<a.length;i++){s+=a[i]*b[i];x+=a[i]**2;y+=b[i]**2} return s/Math.sqrt(x*y||1); };
const CONTROLS = ["New York City","Tokyo","Mumbai","London","Mexico City","Paris"];
export async function translate(anchor, type, city) {
  const full = ents(await q("/entities", { entity_ids: anchor.entity_id }))[0] ?? anchor;
  const at = tagSet(full);
  const genres = (full.tags??[]).filter(t=>/genre/.test(t.type??"")).map(t=>t.tag_id).slice(0,6);
  const pages = await par([1,2], 2, (p)=>q("/v2/insights", { "filter.type":type, "signal.location.query":city, "filter.tags":genres, take: 50, page: p }));
  let cands = [...new Map(pages.flatMap(ents).map(e=>[e.entity_id,e])).values()].filter(e=>e.entity_id!==anchor.entity_id);
  if (!cands.length) return console.log(`\n${anchor.name}->${city}: empty pool (genres ${genres})`);
  const ids = cands.map(e=>e.entity_id);
  // local lift: affinity under target city minus mean under control cities
  const ctrl = CONTROLS.filter(c=>c!==city).slice(0,3);
  const chunks = []; for (let i=0;i<ids.length;i+=50) chunks.push(ids.slice(i,i+50));
  const aff = await par([city,...ctrl], 4, async (c) => { const m = new Map(); for (const ch of chunks) for (const e of ents(await q("/v2/insights", { "filter.type":type, "signal.location.query":c, "filter.results.entities":ch, take: 50 }))) m.set(e.entity_id, e.query?.affinity ?? 0); return m; });
  const demo = new Map(); for (const ch of [[anchor.entity_id, ...chunks[0].slice(0,49)], ...chunks.slice(1)]) for (const d of (await q("/v2/insights", { "filter.type":"urn:demographics", "signal.interests.entities":ch })).body?.results?.demographics ?? []) demo.set(d.entity_id, vec(d.query));
  const av = demo.get(anchor.entity_id);
  const rows = cands.map(e => {
    const t = aff[0].get(e.entity_id) ?? 0, c = ctrl.map((_,i)=>aff[i+1].get(e.entity_id) ?? 0);
    const lift = t - c.reduce((s,x)=>s+x,0)/c.length;
    const role = jacc(at, tagSet(e)); const dm = cos(av, demo.get(e.entity_id));
    return { name: e.name, role, dm, lift, pop: e.popularity };
  });
  const norm = (k) => { const v = rows.map(r=>r[k]); const lo=Math.min(...v), hi=Math.max(...v); rows.forEach(r=>r[k+"N"]=(r[k]-lo)/((hi-lo)||1)); };
  ["role","dm","lift"].forEach(norm);
  rows.forEach(r=> r.score = 0.4*r.roleN + 0.15*r.dmN + 0.45*r.liftN);
  rows.sort((a,b)=>b.score-a.score);
  console.log(`\n=== ${anchor.name} -> ${city} | pool ${cands.length} | genres ${genres.map(g=>g.split(':').pop()).join(',')}`);
  console.log("  TOP:", rows.slice(0,8).map(r=>`${r.name}(r${r.role.toFixed(2)} d${r.dm.toFixed(2)} L${r.lift.toFixed(2)})`).join(" | "));
  console.log("  most local:", [...rows].sort((a,b)=>b.lift-a.lift).slice(0,6).map(r=>r.name).join(" | "));
  return rows;
}
const jobs = [["Chipotle","urn:entity:brand"],["Taylor Swift","urn:entity:artist"],["The Office","urn:entity:tv_show"]];
for (const [a,t] of jobs) for (const c of ["São Paulo","Madrid","Mexico City"]) await translate(A[a], t, c);
