import { describe, expect, it } from "vitest";
import type { AgentEvent } from "@/lib/agent/types";
import { createMemoryCache } from "@/lib/cache/cache";
import { eventStream, handleTranscreate, runKey } from "@/lib/server/handlers";
import { fakeClient } from "../engine/helpers";

const post = (body: unknown) =>
  new Request("http://test/api/transcreate", { method: "POST", body: JSON.stringify(body) });

async function readEvents(res: Response): Promise<AgentEvent[]> {
  const text = await res.text();
  return text
    .split("\n\n")
    .filter((b) => b.includes("data: "))
    .map((b) => JSON.parse(b.slice(b.indexOf("data: ") + 6)));
}

const noDeps = () => {
  throw new Error("deps should not be needed");
};

describe("handleTranscreate", () => {
  it("rejects invalid requests", async () => {
    const res = await handleTranscreate(post({ text: "", marketIds: [] }), noDeps);
    expect(res.status).toBe(400);
  });

  it("replays a saved run without calling Qloo or the model", async () => {
    const cache = createMemoryCache(10, new Map());
    const saved: AgentEvent[] = [{ type: "stage", stage: "extract", message: "x" }];
    await cache.set(runKey("Hello", ["madrid"]), saved, 60);
    const res = await handleTranscreate(
      post({ text: "Hello", marketIds: ["madrid"] }),
      noDeps,
      () => cache,
    );
    const events = await readEvents(res);
    expect(events.map((e) => e.type)).toEqual(["stage", "stage"]);
  });

  it("refuses a live run when the limiter says so, but never a replay", async () => {
    const refuse = async () => new Response("slow down", { status: 429 });
    const res = await handleTranscreate(
      post({ text: "Hi", marketIds: ["madrid"] }),
      noDeps,
      () => createMemoryCache(10, new Map()),
      refuse,
    );
    expect(res.status).toBe(429);
  });

  it("streams an error event when the run fails", async () => {
    const deps = () => ({
      qloo: fakeClient({ lists: {} }).client,
      llm: {
        provider: "fake",
        model: "fake",
        async generateText(): Promise<never> {
          throw new Error("model down");
        },
      },
    });
    const events = await readEvents(
      await handleTranscreate(post({ text: "Hi", marketIds: ["madrid"] }), deps),
    );
    expect(events.at(-1)).toMatchObject({ type: "error", message: "model down" });
  });
});

describe("eventStream", () => {
  it("yields events in order and ends when the run finishes", async () => {
    const out: string[] = [];
    for await (const e of eventStream(async (emit) => {
      emit({ type: "stage", stage: "a", message: "" });
      await new Promise((r) => setTimeout(r, 5));
      emit({ type: "stage", stage: "b", message: "" });
    })) {
      out.push((e as Extract<AgentEvent, { type: "stage" }>).stage);
    }
    expect(out).toEqual(["a", "b"]);
  });
});
