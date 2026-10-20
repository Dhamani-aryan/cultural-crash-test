"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AgentEvent,
  BaselineResult,
  Decision,
  MarketResult,
  ResolvedReference,
  TranscreateResult,
} from "@/lib/agent/types";

export interface RunState {
  phase: "idle" | "running" | "done" | "error";
  stages: { stage: string; message: string }[];
  references: ResolvedReference[];
  decisions: Record<string, Decision[]>;
  markets: Record<string, MarketResult>;
  baseline: BaselineResult[];
  result: TranscreateResult | null;
  replayed: boolean;
  error: string | null;
}

const initial: RunState = {
  phase: "idle",
  stages: [],
  references: [],
  decisions: {},
  markets: {},
  baseline: [],
  result: null,
  replayed: false,
  error: null,
};

function reduce(s: RunState, e: AgentEvent): RunState {
  switch (e.type) {
    case "stage":
      return {
        ...s,
        replayed: s.replayed || e.stage === "replay",
        stages:
          e.stage === "replay" ? s.stages : [...s.stages, { stage: e.stage, message: e.message }],
      };
    case "references":
      return { ...s, references: e.references };
    case "decision":
      return {
        ...s,
        decisions: {
          ...s.decisions,
          [e.marketId]: [...(s.decisions[e.marketId] ?? []), e.decision],
        },
      };
    case "market":
      return { ...s, markets: { ...s.markets, [e.result.marketId]: e.result } };
    case "baseline":
      return { ...s, baseline: e.result };
    case "done":
      return { ...s, phase: "done", result: e.result };
    case "error":
      return { ...s, phase: "error", error: e.message };
  }
}

/** Parse server-sent events from a fetch body (the endpoint is POST, so no EventSource). */
async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<AgentEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const data = block
        .split("\n")
        .filter((l) => l.startsWith("data: "))
        .map((l) => l.slice(6))
        .join("\n");
      if (data) yield JSON.parse(data) as AgentEvent;
    }
  }
}

export function useTranscreate() {
  const [state, setState] = useState<RunState>(initial);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (text: string, marketIds: string[], fresh = false) => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ ...initial, phase: "running" });
    try {
      const res = await fetch("/api/transcreate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, marketIds, fresh }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        const detail = Array.isArray(body?.detail) ? body.detail.join("; ") : body?.detail;
        throw new Error(detail ?? body?.error ?? `Request failed (${res.status})`);
      }
      let current = { ...initial, phase: "running" } as RunState;
      for await (const event of readSse(res.body)) {
        if (controller.signal.aborted) return;
        current = reduce(current, event);
        setState(current);
      }
      if (current.phase === "running") {
        setState({
          ...current,
          phase: "error",
          error: "The connection closed before the run finished.",
        });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState((s) => ({
        ...s,
        phase: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abort.current?.abort();
    setState(initial);
  }, []);

  return { state, run, reset };
}
