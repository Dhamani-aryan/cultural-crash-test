// Minimal Qloo GET helper for research probes. Raw output goes to research/out (git-ignored).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const env = Object.fromEntries(readFileSync(new URL("../.env.local", import.meta.url),"utf8").split(/\r?\n/).filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim()]}));
const BASE = env.QLOO_BASE_URL, KEY = env.QLOO_API_KEY;
export const OUT = fileURLToPath(new URL("./out", import.meta.url));
export let calls = 0;
export async function q(path, params = {}, tries = 4) {
  const u = new URL(path, BASE + "/");
  for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
  for (let a = 0; a < tries; a++) {
    calls++;
    const t = Date.now();
    const r = await fetch(u, { headers: { "x-api-key": KEY, accept: "application/json" } });
    const text = await r.text();
    if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 1000 * 2 ** a)); continue; }
    let body; try { body = JSON.parse(text); } catch { body = text; }
    return { status: r.status, ms: Date.now() - t, body };
  }
  return { status: 429, body: null };
}
export const ents = (r) => r?.body?.results?.entities ?? r?.body?.results ?? [];
export const save = (name, data) => writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 1));
export async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({length:n}, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }
