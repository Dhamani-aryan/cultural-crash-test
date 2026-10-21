"use client";

import { useEffect, useRef, useState } from "react";
import { comparePlans } from "@/lib/crashtest/compare";
import { toMarkdown } from "@/lib/crashtest/report";
import { SLOT_LABEL, type ComponentAssessment, type RunState } from "@/lib/crashtest/types";
import { MAX_MESSAGE, type Chip } from "@/lib/intake/types";
import { PlanComparisonView } from "./plan-comparison";
import { StatusBadge } from "./status";
import { useCrashTest } from "./use-crash-test";
import { useIntake } from "./use-intake";

const PLACEHOLDER = "Describe your launch: the brand, what you sell, the city, who it's for…";

function Composer({
  onSend,
  busy,
  autoFocus,
}: {
  onSend: (text: string) => void;
  busy: boolean;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText("");
    if (ref.current) ref.current.style.height = "";
  };
  return (
    <div className="flex items-end gap-2 rounded-2xl border border-line bg-panel px-3 py-2 focus-within:border-muted">
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-input"
        ref={ref}
        autoFocus={autoFocus}
        rows={1}
        value={text}
        maxLength={MAX_MESSAGE}
        placeholder={PLACEHOLDER}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        className="max-h-56 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-base leading-relaxed focus-visible:outline-none"
      />
      <button
        type="button"
        onClick={send}
        disabled={busy || !text.trim()}
        aria-label="Send"
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-bg disabled:opacity-25"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
          <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return role === "user" ? (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-panel-2 px-4 py-2.5 text-[15px] leading-relaxed">{children}</div>
    </div>
  ) : (
    <div className="max-w-[92%] whitespace-pre-wrap text-[15px] leading-relaxed text-ink-2">{children}</div>
  );
}

function PlanTable({ title, sub, rows, accent }: { title: string; sub: string; rows: ComponentAssessment[]; accent?: boolean }) {
  const supported = rows.filter((r) => r.status === "supported").length;
  return (
    <div className={`overflow-hidden rounded-xl border ${accent ? "border-accent" : "border-line"} bg-panel`}>
      <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
        <div>
          <p className={`text-sm font-medium ${accent ? "text-accent" : "text-ink"}`}>{title}</p>
          <p className="text-xs text-muted">{sub}</p>
        </div>
        <p className="text-xs text-muted">
          {supported} of {rows.length} supported
        </p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.slot} className="border-b border-line last:border-0">
              <th scope="row" className="w-28 px-4 py-2.5 text-left align-top text-xs font-normal text-muted">
                {SLOT_LABEL[r.slot]}
              </th>
              <td className="px-2 py-2.5 align-top text-ink">{r.label}</td>
              <td className="px-4 py-2.5 text-right align-top">
                <StatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RunResult({ state }: { state: RunState }) {
  const [open, setOpen] = useState(false);
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  const cmp = comparePlans(state);
  if (!first || !last) return <Bubble role="assistant">The run stopped before any choice could be tested{state.stopDetail ? `: ${state.stopDetail}` : "."}</Bubble>;
  const download = () => {
    const url = URL.createObjectURL(new Blob([toMarkdown(state)], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `crash-test-${state.marketLabel.toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <PlanTable title="LLM alone" sub="No data, its own picks" rows={first.components} />
        <PlanTable title="Agent" sub={`Tested against Qloo in ${state.marketLabel}`} rows={last.components} accent />
      </div>
      {cmp && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="rounded-full border border-line px-4 py-1.5 text-sm text-ink hover:border-muted"
          >
            {open ? "Hide comparison" : "Compare"}
          </button>
          {open && (
            <button type="button" onClick={download} className="text-xs text-muted hover:text-ink">
              Download report
            </button>
          )}
        </div>
      )}
      {cmp && open && <PlanComparisonView cmp={cmp} ledger={state.evidenceLedger} />}
      {open && state.unresolvedQuestions.length > 0 && (
        <div className="rounded-xl border border-line p-4 text-sm">
          <p className="text-ink">Worth checking by hand</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-ink-2">
            {state.unresolvedQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ChatApp() {
  const intake = useIntake();
  const crash = useCrashTest();
  const end = useRef<HTMLDivElement>(null);
  const s = intake.state;
  const view = crash.view;
  const started = view.phase !== "idle";

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [s?.messages.length, view.phase, view.log.length]);

  const handle = async (reply: Awaited<ReturnType<typeof intake.send>>) => {
    if (reply?.startRequested) crash.run({ intake: reply.state, depth: "thorough" });
  };
  const send = async (text: string) => handle(await intake.send(text));
  const chip = async (c: Chip) => handle(await intake.chip(c));
  const newChat = () => {
    crash.reset();
    intake.reset();
  };
  const busy = intake.busy || view.phase === "running";
  const lastStage = [...view.log].reverse().find((l) => l.kind === "stage");

  return (
    <div className="flex min-h-dvh flex-col">
      <nav className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur sm:px-6">
        <span className="font-serif text-lg">Cultural Crash-Test</span>
        {s && (
          <button type="button" onClick={newChat} className="text-sm text-muted hover:text-ink">
            New chat
          </button>
        )}
      </nav>

      {!s ? (
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
          <h1 className="mb-8 text-center font-serif text-3xl sm:text-4xl">What are you launching?</h1>
          <div className="w-full max-w-2xl">
            <Composer onSend={send} busy={busy} autoFocus />
            {intake.error && <p className="mt-3 text-center text-sm text-nosupport">{intake.error}</p>}
          </div>
        </main>
      ) : (
        <>
          <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 pb-6 pt-8">
            {s.messages.map((m, i) => (
              <div key={m.id} className="space-y-3">
                <Bubble role={m.role}>{m.text}</Bubble>
                {i === s.messages.length - 1 && m.role === "assistant" && s.chips.length > 0 && !busy && !started && (
                  <div className="flex flex-wrap gap-2">
                    {s.chips.map((c, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => chip(c)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm ${c.action === "confirm" ? "border-accent bg-accent text-bg" : "border-line text-ink-2 hover:border-muted"}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {intake.busy && (
              <p className="text-sm text-muted">
                <span className="pulse">●</span>
              </p>
            )}
            {started && view.phase === "running" && (
              <div className="flex items-center gap-3 text-sm text-muted">
                <span className="pulse text-accent">●</span>
                <span>{lastStage?.kind === "stage" ? lastStage.message : "Starting…"}</span>
                <button type="button" onClick={crash.cancel} className="ml-auto text-xs hover:text-ink">
                  Stop
                </button>
              </div>
            )}
            {view.replay && <p className="text-xs text-muted">{view.replay}</p>}
            {view.error && <p className="text-sm text-nosupport">{view.error}</p>}
            {view.result && <RunResult state={view.result} />}
            {intake.error && <p className="text-sm text-nosupport">{intake.error}</p>}
            <div ref={end} />
          </main>
          {!started && (
            <div className="sticky bottom-0 bg-bg px-4 pb-5 pt-2">
              <div className="mx-auto w-full max-w-3xl">
                <Composer onSend={send} busy={busy} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
