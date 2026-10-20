import { z } from "zod";
import { MAX_MARKETS, runTranscreate } from "@/lib/agent/orchestrator";
import { MAX_TEXT } from "@/lib/agent/extract";
import type { AgentEvent } from "@/lib/agent/types";
import { cacheKey, type Cache } from "@/lib/cache/cache";
import type { LlmClient } from "@/lib/llm/types";
import type { QlooClient } from "@/lib/qloo";
import { errorResponse } from "./errors";
import { sseResponse } from "./sse";

export interface Deps {
  qloo: QlooClient;
  llm: LlmClient;
}

export const TranscreateRequestSchema = z.object({
  text: z.string().trim().min(1, "Paste some text.").max(MAX_TEXT),
  marketIds: z.array(z.string()).min(1).max(MAX_MARKETS),
  /** Ignore a cached recording and run live. */
  fresh: z.boolean().default(false),
});

/** Bump when the engine or prompts change in a way that should invalidate recordings. */
export const RUN_VERSION = "run:v1";
const RECORDING_TTL = 7 * 24 * 60 * 60;

export function runKey(text: string, marketIds: string[]): string {
  return cacheKey(RUN_VERSION, { text: text.trim(), markets: [...marketIds].sort() });
}

/** Turn the orchestrator's callback into an async stream of events. */
export function eventStream(
  run: (emit: (e: AgentEvent) => void) => Promise<unknown>,
): AsyncIterable<AgentEvent> {
  const queue: AgentEvent[] = [];
  let wake: (() => void) | null = null;
  let finished = false;
  const push = (e: AgentEvent) => {
    queue.push(e);
    wake?.();
  };
  run(push)
    .catch((err) =>
      push({ type: "error", message: err instanceof Error ? err.message : String(err) }),
    )
    .finally(() => {
      finished = true;
      wake?.();
    });
  return {
    async *[Symbol.asyncIterator]() {
      while (true) {
        if (queue.length) {
          yield queue.shift()!;
          continue;
        }
        if (finished) return;
        await new Promise<void>((r) => (wake = r));
        wake = null;
      }
    },
  };
}

/** Record a live run's events; a run is stored only when it completed. */
async function* record(events: AsyncIterable<AgentEvent>, cache: Cache, key: string) {
  const seen: AgentEvent[] = [];
  for await (const e of events) {
    seen.push(e);
    if (e.type === "done") await cache.set(key, seen, RECORDING_TTL);
    yield e;
  }
}

/** Replay a recording with short pauses so the progress view still reads as a sequence. */
async function* replay(events: AgentEvent[], pauseMs = 120) {
  yield { type: "stage", stage: "replay", message: "Replaying a saved run" } as AgentEvent;
  for (const e of events) {
    if (e.type !== "done") await new Promise((r) => setTimeout(r, pauseMs));
    yield e;
  }
}

export async function handleTranscreate(
  req: Request,
  deps: () => Deps,
  cache?: () => Cache,
  /** Called only before a live run (replays are free); return a Response to refuse it. */
  beforeLive?: () => Promise<Response | null>,
): Promise<Response> {
  let body: z.infer<typeof TranscreateRequestSchema>;
  try {
    body = TranscreateRequestSchema.parse(await req.json());
  } catch (err) {
    return errorResponse(err);
  }
  const store = cache?.();
  const key = runKey(body.text, body.marketIds);
  if (store && !body.fresh) {
    const recording = await store.get<AgentEvent[]>(key);
    if (recording) return sseResponse(replay(recording), req.signal);
  }
  const refused = await beforeLive?.();
  if (refused) return refused;
  let resolved: Deps;
  try {
    resolved = deps();
  } catch (err) {
    return errorResponse(err);
  }
  const live = eventStream((emit) =>
    runTranscreate(resolved, { text: body.text, marketIds: body.marketIds }, emit),
  );
  return sseResponse(store ? record(live, store, key) : live, req.signal);
}
