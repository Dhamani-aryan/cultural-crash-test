import { getCache } from "@/lib/cache/server";
import { getDeps } from "@/lib/server/deps";
import { handleCrashTest } from "@/lib/server/handlers";
import { getLimiter } from "@/lib/server/limiter";
import { limit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
/** A live run takes one to two minutes (about 300 Qloo calls and 6 model calls). */
export const maxDuration = 300;

/** Runs a crash test (or replays a recorded one) and streams its events as server-sent events. */
export async function POST(req: Request) {
  return handleCrashTest(req, getDeps, getCache, () => limit(getLimiter(), "crashtest", req));
}
