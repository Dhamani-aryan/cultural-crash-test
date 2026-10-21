"use client";

import { useRef, useState } from "react";
import type { QueryRequest } from "@/lib/crashtest/query";
import type { LaunchBriefInput } from "@/lib/crashtest/types";
import { AgentConsole } from "./agent-console";
import { BriefForm } from "./brief-form";
import { QueryBox } from "./query-box";
import { Results } from "./results";
import { useCrashTest } from "./use-crash-test";

export function CrashTest() {
  const { view, run, cancel, reset } = useCrashTest();
  const [input, setInput] = useState<LaunchBriefInput | QueryRequest | null>(null);
  const [form, setForm] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const start = (i: LaunchBriefInput | QueryRequest, fresh = false) => {
    setInput(i);
    run(i, fresh);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const running = view.phase === "running";
  const done = view.result && view.result.evaluations.length > 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Cultural Crash-Test</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Is your launch plan culturally right for the city?</h1>
        <p className="mt-4 text-ink-2">
          Describe your launch. An LLM drafts the plan on its own; then the agent tests every choice against Qloo&apos;s taste data for
          your audience in your city and fixes what the evidence contradicts. You see both, side by side.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-3xl">
        {form ? <BriefForm onRun={start} busy={running} /> : <QueryBox onRun={start} busy={running} />}
        <div className="mt-3 flex justify-between text-xs text-muted">
          <span>Aggregate taste data only: it doesn&apos;t identify or predict any person.</span>
          <button type="button" onClick={() => setForm((f) => !f)} className="underline-offset-2 hover:text-ink hover:underline">
            {form ? "Describe it in words instead" : "Use the detailed form"}
          </button>
        </div>
      </div>

      <div ref={resultsRef} className="scroll-mt-6">
        {view.phase !== "idle" && (
          <div className="mt-14 space-y-6">
            {view.replay && (
              <p className="rounded-md border border-line bg-panel px-4 py-2 text-xs text-accent">
                {view.replay}
                {input && (
                  <button type="button" onClick={() => start(input, true)} className="ml-2 underline">
                    Run it live
                  </button>
                )}
              </p>
            )}
            {view.error && (
              <p role="alert" className="rounded-md border border-line bg-panel px-4 py-3 text-sm text-nosupport">
                {view.error}
              </p>
            )}

            {done ? (
              <>
                <Results state={view.result!} />
                <details className="rounded-lg border border-line bg-panel">
                  <summary className="cursor-pointer px-4 py-3 text-sm text-ink">
                    How the agent worked: {view.result!.currentIteration} repair rounds, {view.evidence.length} recorded Qloo
                    operations, {view.result!.qlooCallsUsed} Qloo calls
                  </summary>
                  <div className="border-t border-line">
                    <AgentConsole view={view} onCancel={cancel} />
                  </div>
                </details>
                <div className="text-center">
                  <button type="button" onClick={reset} className="text-sm text-muted hover:text-ink">
                    Start over
                  </button>
                </div>
              </>
            ) : (
              <>
                <AgentConsole view={view} onCancel={cancel} />
                {view.result && (
                  <p className="text-sm text-muted">
                    The run stopped before any choice could be tested{view.result.stopDetail ? `: ${view.result.stopDetail}` : "."}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <footer className="mt-20 border-t border-line pt-6 text-center text-xs text-muted">
        Cultural evidence from{" "}
        <a className="underline" href="https://www.qloo.com/">
          Qloo
        </a>{" "}
        Taste AI · Built for the Qloo Agentic Hackathon ·{" "}
        <a className="underline" href="https://github.com/Dhamani-aryan/cultural-crash-test">
          Source
        </a>
      </footer>
    </main>
  );
}
