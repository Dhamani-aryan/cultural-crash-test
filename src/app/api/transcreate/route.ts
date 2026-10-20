import { getCache } from "@/lib/cache/server";
import { getDeps } from "@/lib/server/deps";
import { handleTranscreate } from "@/lib/server/handlers";
import { getLimiter } from "@/lib/server/limiter";
import { limit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
/** A live run takes about a minute (Qloo engine per reference and market, plus the model). */
export const maxDuration = 300;

/** Runs the agent (or replays a saved run) and streams its events as server-sent events. */
export async function POST(req: Request) {
  return handleTranscreate(req, getDeps, getCache, () => limit(getLimiter(), "transcreate", req));
}
