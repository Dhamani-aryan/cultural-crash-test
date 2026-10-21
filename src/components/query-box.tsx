"use client";

import { useState } from "react";
import { EXAMPLE_QUERIES } from "@/lib/crashtest/examples";
import { MAX_QUERY, type QueryRequest } from "@/lib/crashtest/query";
import { TARGET_MARKETS } from "@/lib/markets";

export function QueryBox({ onRun, busy }: { onRun: (q: QueryRequest) => void; busy: boolean }) {
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0].query.query);
  const [marketId, setMarketId] = useState(EXAMPLE_QUERIES[0].query.marketId);
  const [depth, setDepth] = useState<"quick" | "thorough">("thorough");
  const ok = query.trim().length >= 10;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && ok) onRun({ query: query.trim(), marketId, depth });
      }}
    >
      <label htmlFor="query" className="sr-only">
        Describe your launch
      </label>
      <div className="rounded-xl border border-line bg-panel focus-within:border-accent">
        <textarea
          id="query"
          value={query}
          maxLength={MAX_QUERY}
          rows={5}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ok && !busy) onRun({ query: query.trim(), marketId, depth });
          }}
          placeholder="Describe your launch: the brand, who it's for, the city, and any choices you've already made (a headliner, a partner, a venue, a look)."
          className="block w-full resize-y border-0 bg-transparent px-4 py-4 text-base leading-relaxed focus-visible:outline-none"
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-3 py-2.5">
          <label className="flex items-center gap-2 text-sm text-muted">
            City
            <select value={marketId} onChange={(e) => setMarketId(e.target.value)} className="w-auto py-1">
              {TARGET_MARKETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div role="radiogroup" aria-label="Research depth" className="flex rounded-md border border-line text-sm">
            {(["quick", "thorough"] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={depth === d}
                onClick={() => setDepth(d)}
                className={`px-3 py-1 capitalize ${depth === d ? "bg-panel-2 text-ink" : "text-muted"}`}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={busy || !ok}
            className="ml-auto rounded-md bg-accent px-5 py-2 font-medium text-bg disabled:opacity-50"
          >
            {busy ? "Running…" : "Run crash-test"}
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Try:</span>
        {EXAMPLE_QUERIES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => {
              setQuery(ex.query.query);
              setMarketId(ex.query.marketId);
              setDepth(ex.query.depth ?? "thorough");
            }}
            className="rounded-full border border-line px-3 py-0.5 text-ink-2 hover:border-muted"
          >
            {ex.title}
          </button>
        ))}
      </div>
    </form>
  );
}
