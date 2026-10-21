"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { comparePlans } from "@/lib/crashtest/compare";
import { toMarkdown } from "@/lib/crashtest/report";
import { SLOT_LABEL, type ComponentAssessment, type RunState } from "@/lib/crashtest/types";
import { MAX_MESSAGE, type Chip } from "@/lib/intake/types";
import { chatTitle, getChats, getServerChats, putChats, subscribeChats, type SavedChat } from "./chat-store";
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

/** The ChatGPT-style "thinking" dots. */
function Thinking({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted" role="status" aria-live="polite">
      <span className="typing" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      {label && <span>{label}</span>}
      <span className="sr-only">{label ?? "Thinking"}</span>
    </div>
  );
}

function Sidebar({
  chats,
  activeId,
  onOpen,
  onNew,
  onDelete,
  open,
  onClose,
}: {
  chats: SavedChat[];
  activeId: string | null;
  onOpen: (c: SavedChat) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open && <button type="button" aria-label="Close chats" onClick={onClose} className="fixed inset-0 z-20 bg-black/50 md:hidden" />}
      <aside
        aria-label="Chats"
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-line bg-panel transition-transform md:static md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-14 items-center px-3">
          <button
            type="button"
            onClick={onNew}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-panel-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {chats.length > 0 && <p className="px-3 pb-1 pt-3 text-xs text-muted">Recent</p>}
          <ul className="space-y-0.5">
            {chats.map((c) => (
              <li key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onOpen(c)}
                  aria-current={c.id === activeId ? "page" : undefined}
                  className={`w-full truncate rounded-lg px-3 py-2 pr-8 text-left text-sm ${c.id === activeId ? "bg-panel-2 text-ink" : "text-ink-2 hover:bg-panel-2"}`}
                  title={c.title}
                >
                  {c.title}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  aria-label={`Delete ${c.title}`}
                  className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded px-1.5 text-muted hover:text-ink group-hover:block group-focus-within:block"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  );
}

export function ChatApp() {
  const intake = useIntake();
  const crash = useCrashTest();
  const chats = useSyncExternalStore(subscribeChats, getChats, getServerChats);
  const [pending, setPending] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const s = intake.state;
  const view = crash.view;
  const started = view.phase !== "idle";
  const activeId = s?.intakeId ?? null;

  // Keep the scroll at the newest message, including the one just sent.
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [s?.messages.length, pending, intake.busy, view.phase, view.log.length]);

  // Save the open chat whenever it changes (its finished run too).
  useEffect(() => {
    if (!s || !s.messages.some((m) => m.role === "user")) return;
    const existing = getChats().find((c) => c.id === s.intakeId);
    const result = view.phase === "done" && view.result ? view.result : (existing?.result ?? null);
    putChats([
      { id: s.intakeId, title: chatTitle(s), updatedAt: new Date().toISOString(), intake: s, result },
      ...getChats().filter((c) => c.id !== s.intakeId),
    ]);
  }, [s, view.phase, view.result]);

  const handle = async (reply: Awaited<ReturnType<typeof intake.send>>) => {
    if (reply?.startRequested) crash.run({ intake: reply.state, depth: "thorough" });
  };
  const send = async (text: string) => {
    // The message shows at once, then the thinking dots, like any chat.
    setPending(text);
    const reply = await intake.send(text);
    setPending(null);
    await handle(reply);
  };
  const chip = async (c: Chip) => {
    setPending(c.label);
    const reply = await intake.chip(c);
    setPending(null);
    await handle(reply);
  };
  const newChat = () => {
    crash.reset();
    intake.reset();
    setSidebar(false);
  };
  const openChat = (c: SavedChat) => {
    intake.setState(c.intake);
    crash.restore(c.result);
    setSidebar(false);
  };
  const deleteChat = (id: string) => {
    putChats(getChats().filter((c) => c.id !== id));
    if (id === activeId) newChat();
  };
  const busy = intake.busy || view.phase === "running";
  const lastStage = [...view.log].reverse().find((l) => l.kind === "stage");
  const messages = s?.messages ?? [];
  const inConversation = Boolean(s) || pending !== null;

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        chats={chats}
        activeId={activeId}
        onOpen={openChat}
        onNew={newChat}
        onDelete={deleteChat}
        open={sidebar}
        onClose={() => setSidebar(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6">
          <button type="button" onClick={() => setSidebar(true)} aria-label="Open chats" className="-ml-1 rounded p-1 text-muted hover:text-ink md:hidden">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <span className="font-serif text-lg">Cultural Crash-Test</span>
        </nav>

        {!inConversation ? (
          <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-24">
            <h1 className="mb-8 text-center font-serif text-3xl sm:text-4xl">What are you launching?</h1>
            <div className="w-full max-w-2xl">
              <Composer onSend={send} busy={busy} autoFocus />
              {intake.error && <p className="mt-3 text-center text-sm text-nosupport">{intake.error}</p>}
            </div>
          </main>
        ) : (
          <>
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-6 pt-8">
                {messages.map((m, i) => (
                  <div key={m.id} className="space-y-3">
                    <Bubble role={m.role}>{m.text}</Bubble>
                    {i === messages.length - 1 && m.role === "assistant" && s!.chips.length > 0 && !busy && !started && !pending && (
                      <div className="flex flex-wrap gap-2">
                        {s!.chips.map((c, j) => (
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
                {pending && <Bubble role="user">{pending}</Bubble>}
                {intake.busy && <Thinking />}
                {started && view.phase === "running" && (
                  <div className="flex items-center gap-3">
                    <Thinking label={lastStage?.kind === "stage" ? lastStage.message : "Starting…"} />
                    <button type="button" onClick={crash.cancel} className="ml-auto text-xs text-muted hover:text-ink">
                      Stop
                    </button>
                  </div>
                )}
                {view.replay && <p className="text-xs text-muted">{view.replay}</p>}
                {view.error && <p className="text-sm text-nosupport">{view.error}</p>}
                {view.result && <RunResult state={view.result} />}
                {intake.error && <p className="text-sm text-nosupport">{intake.error}</p>}
                <div ref={end} />
              </div>
            </main>
            {!started && (
              <div className="shrink-0 px-4 pb-5 pt-2">
                <div className="mx-auto w-full max-w-3xl">
                  <Composer onSend={send} busy={busy} />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
