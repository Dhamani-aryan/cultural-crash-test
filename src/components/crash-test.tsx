"use client";

import { useRef, useState } from "react";
import type { LaunchBriefInput } from "@/lib/crashtest/types";
import type { IntakeState } from "@/lib/intake/types";
import { AgentConsole } from "./agent-console";
import { BriefForm } from "./brief-form";
import { IntakeChat } from "./intake-chat";
import { Results } from "./results";
import { useCrashTest, type View } from "./use-crash-test";

type RunInput = LaunchBriefInput | { intake: IntakeState; depth: "quick" | "thorough" };

const PHASES = [
  { label: "Brief confirmed", stages: [] as string[] },
  { label: "LLM-only plan drafted, no Qloo", stages: ["draft", "resolve"] },
  { label: "Qloo-grounded crash-test", stages: ["evaluate"] },
  { label: "Targeted repair", stages: ["repair"] },
  { label: "Re-test and comparison", stages: ["retest", "report"] },
];

function Phases({ view }: { view: View }) {
  const seen = new Set(view.log.flatMap((l) => (l.kind === "stage" ? [l.stage] : [])));
  const done = view.phase === "done";
  const reached = PHASES.map((p, i) => i === 0 || done || p.stages.some((s) => seen.has(s)));
  const current = done ? -1 : reached.lastIndexOf(true);
  return (
    <ol className="grid gap-2 text-xs sm:grid-cols-5" aria-label="Run phases">
      {PHASES.map((p, i) => (
        <li
          key={p.label}
          aria-current={i === current ? "step" : undefined}
          className={`rounded-md border px-3 py-2 ${i === current ? "border-accent text-ink" : reached[i] ? "border-line text-ink-2" : "border-line text-muted opacity-60"}`}
        >
          <span className="mr-1 font-mono">{reached[i] && i !== current ? "✓" : i + 1}</span>
          {p.label}
        </li>
      ))}
    </ol>
  );
}

export function CrashTest() {
  const { view, run, cancel, reset } = useCrashTest();
  const [input, setInput] = useState<RunInput | null>(null);
  const [form, setForm] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const start = (i: RunInput, fresh = false) => {
    setInput(i);
    run(i, fresh);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const running = view.phase === "running";
  const done = view.result && view.result.evaluations.length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">Cultural Crash-Test</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Is your launch plan culturally right for the city?</h1>
        <p className="mt-4 text-ink-2">
          Tell me about your launch in your own words. I&apos;ll ask only what&apos;s missing, you confirm the brief, then an LLM drafts a plan
          on its own and the agent tests every choice against Qloo&apos;s taste data. You see both plans side by side.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-5xl">
        {form ? (
          <div className="mx-auto max-w-3xl rounded-xl border border-line bg-panel p-5">
            <BriefForm onRun={start} busy={running} />
          </div>
        ) : (
          <IntakeChat running={running} onStart={(intake, depth) => start({ intake, depth })} />
        )}
        <div className="mx-auto mt-3 flex max-w-5xl justify-between text-xs text-muted">
          <span>Aggregate taste data only: it doesn&apos;t identify or predict any person, and audiences are never defined by sensitive traits.</span>
          <button type="button" onClick={() => setForm((f) => !f)} className="shrink-0 pl-4 underline-offset-2 hover:text-ink hover:underline">
            {form ? "Describe it in a conversation instead" : "Use the detailed form"}
          </button>
        </div>
      </div>

      <div ref={resultsRef} className="scroll-mt-6">
        {view.phase !== "idle" && (
          <div className="mt-14 space-y-6">
            <Phases view={view} />
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
                    Clear results
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
