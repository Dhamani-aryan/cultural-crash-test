import { z } from "zod";

/**
 * Environment loaders, validated lazily per area so the app boots and the parts that don't
 * need a missing key keep working. No `server-only` here so scripts and tests can use it;
 * app code reaches these values only through server modules (e.g. `@/lib/qloo/server`).
 */

type Env = Record<string, string | undefined>;

export class MissingEnvError extends Error {
  constructor(area: string, issues: string[]) {
    super(
      `${area} is not configured: ${issues.join("; ")}. ` +
        "Copy .env.example to .env.local and fill in the missing values.",
    );
    this.name = "MissingEnvError";
  }
}

const nonEmpty = (name: string) =>
  z
    .string({ error: `${name} is missing` })
    .trim()
    .min(1, `${name} is empty`);

const qlooSchema = z.object({
  QLOO_API_KEY: nonEmpty("QLOO_API_KEY"),
  QLOO_BASE_URL: z.url().default("https://hackathon.api.qloo.com"),
});

const redisSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.url({ error: "UPSTASH_REDIS_REST_URL must be a URL" }),
  UPSTASH_REDIS_REST_TOKEN: nonEmpty("UPSTASH_REDIS_REST_TOKEN"),
});

function load<S extends z.ZodType>(area: string, schema: S, env: Env): z.infer<S> {
  // Treat empty strings from .env files as "not set" so defaults apply.
  const cleaned = Object.fromEntries(Object.entries(env).filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    throw new MissingEnvError(
      area,
      parsed.error.issues.map((i) => i.message),
    );
  }
  return parsed.data;
}

export interface QlooEnv {
  apiKey: string;
  baseUrl: string;
}

export function getQlooEnv(env: Env = process.env): QlooEnv {
  const e = load("Qloo API", qlooSchema, env);
  return { apiKey: e.QLOO_API_KEY, baseUrl: e.QLOO_BASE_URL.replace(/\/+$/, "") };
}

export function getRedisEnv(env: Env = process.env) {
  const e = load("Redis cache", redisSchema, env);
  return { url: e.UPSTASH_REDIS_REST_URL, token: e.UPSTASH_REDIS_REST_TOKEN };
}
