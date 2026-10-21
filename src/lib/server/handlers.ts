import { z } from "zod";
import { cacheKey, type Cache } from "@/lib/cache/cache";
import { runCrashTest } from "@/lib/crashtest/run";
import { applyIntake } from "@/lib/intake/state";
import { IntakeRequestSchema, IntakeStateSchema } from "@/lib/intake/types";
import { MISSING_LABEL, refresh, toLaunchBrief } from "@/lib/intake/validate";
import { LaunchBriefSchema, type LaunchBriefInput, type RunEvent } from "@/lib/crashtest/types";
import type { LlmClient } from "@/lib/llm/types";
import { marketById } from "@/lib/markets";
import type { QlooClient } from "@/lib/qloo";
import { errorResponse, jsonError } from "./errors";
import { sseResponse } from "./sse";

export interface Deps {
  qloo: QlooClient;
  llm: LlmClient;
}

export const CrashTestRequestSchema = z.union([
  z.object({
    brief: LaunchBriefSchema,
    /** Ignore a recorded run of the same brief and run live. */
    fresh: z.boolean().default(false),
  }),
  z.object({
    /** A confirmed intake. Re-validated here: the client's readyToRun is never trusted. */
    intake: IntakeStateSchema,
    depth: z.enum(["quick", "thorough"]).default("thorough"),
    fresh: z.boolean().default(false),
  }),
]);

/** Bump when the agent, rubric or prompts change in a way that should invalidate recordings. */
export const RUN_VERSION = "crash:v10";
const RECORDING_TTL = 14 * 24 * 60 * 60;

export function runKey(brief: unknown): string {
  return cacheKey(RUN_VERSION, brief);
}

/** Turn a callback-style run into an async stream of events. */
export function eventStream<E extends { type: string }>(
  run: (emit: (e: E) => void) => Promise<unknown>,
  onError: (message: string) => E,
): AsyncIterable<E> {
  const queue: E[] = [];
  let wake: (() => void) | null = null;
  let finished = false;
  const push = (e: E) => {
    queue.push(e);
    wake?.();
  };
  run(push)
    .catch((err) => push(onError(err instanceof Error ? err.message : String(err))))
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

interface Recording {
  recordedAt: string;
  events: RunEvent[];
}

/** Store a live run's events once it finishes without being cancelled. */
async function* record(events: AsyncIterable<RunEvent>, cache: Cache, key: string) {
  const seen: RunEvent[] = [];
  for await (const e of events) {
    seen.push(e);
    if (e.type === "done" && e.state.stopReason !== "user_cancelled" && e.state.stopReason !== "error") {
      await cache.set(key, { recordedAt: new Date().toISOString(), events: seen } satisfies Recording, RECORDING_TTL);
    }
    yield e;
  }
}

/**
 * Replay a recording with short pauses so the console still reads as a sequence. It is
 * announced as recorded: Qloo results in it are as of the recording, not fresh.
 */
async function* replay(rec: Recording, pauseMs = 60) {
  yield {
    type: "stage",
    stage: "replay",
    message: `Replaying a recorded run from ${rec.recordedAt.slice(0, 10)}. Qloo results are as recorded then, not fetched now.`,
  } satisfies RunEvent;
  for (const e of rec.events) {
    if (e.type === "stage" || e.type === "change" || e.type === "evaluation")
      await new Promise((r) => setTimeout(r, pauseMs * 4));
    else if (e.type !== "done") await new Promise((r) => setTimeout(r, pauseMs / 4));
    yield e;
  }
}

export async function handleCrashTest(
  req: Request,
  deps: () => Deps,
  cache?: () => Cache,
  /** Called only before a live run (replays are free); return a Response to refuse it. */
  beforeLive?: () => Promise<Response | null>,
): Promise<Response> {
  let body: z.infer<typeof CrashTestRequestSchema>;
  try {
    body = CrashTestRequestSchema.parse(await req.json());
  } catch (err) {
    return errorResponse(err);
  }
  let input: LaunchBriefInput;
  if ("brief" in body) {
    input = body.brief;
  } else {
    const intake = refresh(body.intake);
    if (!intake.readyToRun) {
      return jsonError(
        400,
        "brief_not_confirmed",
        intake.missingCriticalFields.length
          ? intake.missingCriticalFields.map((f) => `Missing: ${MISSING_LABEL[f]}`)
          : ["Confirm the brief before starting."],
      );
    }
    input = LaunchBriefSchema.parse(toLaunchBrief(intake, body.depth));
  }
  if (!marketById(input.marketId)) return jsonError(400, "unsupported_city");
  const store = cache?.();
  const key = runKey(input);
  if (store && !body.fresh) {
    const recording = await store.get<Recording>(key);
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
  const live = eventStream<RunEvent>(
    (emit) => runCrashTest(resolved, input, { emit, signal: req.signal }),
    (message) => ({ type: "error", message }),
  );
  return sseResponse(store ? record(live, store, key) : live, req.signal);
}

/**
 * One intake turn. Never calls Qloo: only the model reads the message (or suggests audiences).
 * The state comes back from the client every turn and is re-validated before use.
 */
export async function handleIntake(
  req: Request,
  llm: () => LlmClient,
  beforeTurn?: () => Promise<Response | null>,
): Promise<Response> {
  let body: z.infer<typeof IntakeRequestSchema>;
  try {
    body = IntakeRequestSchema.parse(await req.json());
  } catch (err) {
    return errorResponse(err);
  }
  const refused = await beforeTurn?.();
  if (refused) return refused;
  try {
    return Response.json(await applyIntake(llm(), body));
  } catch (err) {
    return errorResponse(err);
  }
}
