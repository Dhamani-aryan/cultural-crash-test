/** Small numeric helpers for the engine. */

/**
 * Percentile rank (0–1) of each value within the list, ties sharing their average rank.
 * Missing values (`undefined`) rank lowest. Qloo affinities cluster near 1, so ranks are far
 * more informative than raw differences.
 */
export function percentileRanks(values: (number | undefined)[]): number[] {
  const n = values.length;
  if (n <= 1) return values.map(() => 1);
  const order = values
    .map((v, i) => ({ v: v ?? Number.NEGATIVE_INFINITY, i }))
    .sort((a, b) => a.v - b.v);
  const out = new Array<number>(n);
  for (let start = 0; start < n;) {
    let end = start;
    while (end + 1 < n && order[end + 1].v === order[start].v) end++;
    const rank = (start + end) / 2 / (n - 1);
    for (let k = start; k <= end; k++) out[order[k].i] = rank;
    start = end + 1;
  }
  return out;
}

/** Cosine similarity, 0 when either vector is missing or all zeros. */
export function cosine(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : 0;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Run `fn` over items with at most `n` in flight, preserving order. */
export async function mapLimit<T, R>(
  items: T[],
  n: number,
  fn: (t: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const k = next++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

/** A normalized key for spotting the same entity listed twice (e.g. two scripts, two IDs). */
export function nameKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}
