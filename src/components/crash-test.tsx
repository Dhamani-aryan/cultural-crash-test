"use client";

import { useRef, useState } from "react";
import type { LaunchBriefInput } from "@/lib/crashtest/types";
import { AgentConsole } from "./agent-console";
import { BriefForm } from "./brief-form";
import { Results } from "./results";
import { useCrashTest } from "./use-crash-test";

export function CrashTest() {
  const { view, run, cancel, reset } = useCrashTest();
  const [brief, setBrief] = useState<LaunchBriefInput | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const start = (b: LaunchBriefInput, fresh = false) => {
    setBrief(b);
    run(b, fresh);
    requestAnimationFrame(() => consoleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Cultural Crash-Test</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Find the cultural mismatch before launch. Then fix it.</h1>
        <p className="mt-4 text-ink-2">
          A launch plan is a stack of cultural bets: the music act, the collaboration, the venue, the look. This agent tests each one
          against Qloo&apos;s taste data for your audience in your city, finds the weakest, researches a better-supported replacement, swaps
          only that one and tests the plan again, with every step traceable to a recorded Qloo query.
        </p>
      </header>

      <div className="mt-10 rounded-lg border border-line bg-panel p-5 sm:p-6">
        <BriefForm onRun={(b) => start(b)} busy={view.phase === "running"} />
      </div>

      <div ref={consoleRef} className="scroll-mt-6">
        {view.phase !== "idle" && (
          <div className="mt-10 space-y-8">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-3xl">The run</h2>
              {view.phase !== "running" && (
                <button type="button" onClick={reset} className="text-sm text-muted hover:text-ink">
                  Clear
                </button>
              )}
            </div>
            {view.error && (
              <p role="alert" className="rounded-md border border-line bg-panel-2 px-4 py-3 text-sm text-nosupport">
                {view.error}
              </p>
            )}
            <AgentConsole view={view} onCancel={cancel} />
            {view.result && view.result.evaluations.length > 0 && (
              <Results state={view.result} onRerun={view.replay && brief ? () => start(brief, true) : undefined} />
            )}
            {view.result && view.result.evaluations.length === 0 && (
              <p className="text-sm text-muted">
                The run stopped before any choice could be tested
                {view.result.stopDetail ? `: ${view.result.stopDetail}` : "."}
              </p>
            )}
          </div>
        )}
      </div>

      <footer className="mt-16 border-t border-line pt-6 text-xs text-muted">
        Cultural evidence from{" "}
        <a className="underline" href="https://www.qloo.com/">
          Qloo
        </a>{" "}
        Taste AI. Built for the Qloo Agentic Hackathon.{" "}
        <a className="underline" href="https://github.com/Dhamani-aryan/cultural-crash-test">
          Source
        </a>
        .
      </footer>
    </main>
  );
}
