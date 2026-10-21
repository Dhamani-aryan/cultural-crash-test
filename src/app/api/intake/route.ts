import { getLlm } from "@/lib/llm";
import { handleIntake } from "@/lib/server/handlers";
import { getLimiter } from "@/lib/server/limiter";
import { limit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** One turn of the conversational intake (no Qloo calls). */
export async function POST(req: Request) {
  return handleIntake(req, () => getLlm(), () => limit(getLimiter(), "intake", req));
}
