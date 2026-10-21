"use client";

import { useEffect, useRef, useState } from "react";
import { EXAMPLE_BRIEFS, EXAMPLE_INTAKES } from "@/lib/crashtest/examples";
import type { IntakeState } from "@/lib/intake/types";
import { MAX_MESSAGE } from "@/lib/intake/types";
import { intakeFromBrief } from "@/lib/intake/validate";
import { TARGET_MARKETS } from "@/lib/markets";
import { BriefReview } from "./brief-review";
import { useIntake } from "./use-intake";

const PLACEHOLDER =
  "Describe your launch: the brand, what you sell, the city, who it's for, and any choices you've made or ruled out. A rough brief, a campaign plan or your website's About copy all work.";

export function IntakeChat({
  onStart,
  running,
}: {
  onStart: (intake: IntakeState, depth: "quick" | "thorough") => void;
  running: boolean;
}) {
  const intake = useIntake();
  const [text, setText] = useState("");
  const [marketId, setMarketId] = useState("london");
  const log = useRef<HTMLDivElement>(null);
  const s = intake.state;
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" });
  }, [s?.messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || intake.busy) return;
    setText("");
    const r = await intake.send(t, s ? undefined : marketId);
    if (r?.startRequested) onStart(r.state, "thorough");
  };

  const loadExample = (id: string) => {
    const ex = EXAMPLE_INTAKES.find((e) => e.id === id)!;
    const brief = EXAMPLE_BRIEFS.find((b) => b.id === ex.briefId)!.brief;
    intake.setState(intakeFromBrief(brief, ex.text, crypto.randomUUID()));
  };

  const composer = (
    <div className="rounded-xl border border-line bg-panel focus-within:border-accent">
      <label htmlFor="intake-message" className="sr-only">
        Message
      </label>
      <textarea
        id="intake-message"
        value={text}
        maxLength={MAX_MESSAGE}
        rows={s ? 3 : 6}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
        }}
        placeholder={s ? "Answer, add details, or say “start the test” once the brief is confirmed." : PLACEHOLDER}
        className="block w-full resize-y border-0 bg-transparent px-4 py-3 text-base leading-relaxed focus-visible:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3 border-t border-line px-3 py-2">
        {!s && (
          <label className="flex items-center gap-2 text-sm text-muted">
            City
            <select value={marketId} onChange={(e) => setMarketId(e.target.value)} className="w-auto py-1">
              {TARGET_MARKETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <span className="text-[11px] text-muted">Ctrl/⌘ + Enter to send</span>
        <button
          type="button"
          onClick={send}
          disabled={intake.busy || !text.trim()}
          className="ml-auto rounded-md bg-accent px-5 py-1.5 font-medium text-bg disabled:opacity-50"
        >
          {intake.busy ? "Reading…" : s ? "Send" : "Start"}
        </button>
      </div>
    </div>
  );

  if (!s) {
    return (
      <div>
        {composer}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Or load an example:</span>
          {EXAMPLE_INTAKES.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => loadExample(ex.id)}
              className="rounded-full border border-line px-3 py-0.5 text-ink-2 hover:border-muted"
            >
              {ex.title}
            </button>
          ))}
        </div>
        {intake.error && <p className="mt-3 text-sm text-nosupport">{intake.error}</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <section aria-label="Conversation" className="flex min-w-0 flex-col">
        <div ref={log} className="max-h-[32rem] space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {s.messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
              <p
                className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-panel-2 text-ink" : "border border-line text-ink-2"
                }`}
              >
                {m.text}
              </p>
            </div>
          ))}
          {intake.busy && <p className="text-sm text-muted"><span className="pulse">●</span> Reading…</p>}
        </div>
        {s.chips.length > 0 && !intake.busy && (
          <div className="mt-3 flex flex-wrap gap-2">
            {s.chips.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={async () => {
                  const r = await intake.chip(c);
                  if (r?.startRequested) onStart(r.state, "thorough");
                }}
                className="rounded-full border border-line px-3 py-1 text-sm text-ink-2 hover:border-accent"
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        {s.audienceHypotheses.length > 0 && s.mode === "explore_audience" && (
          <div className="mt-3 space-y-2">
            {s.audienceHypotheses.map((h) => (
              <div key={h.id} className="rounded-md border border-line p-3 text-sm">
                <p className="text-ink">
                  {h.label} <span className="ml-1 text-[10px] uppercase tracking-wide text-weak">suggestion</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-2">{h.description}</p>
                {h.suggestedAnchors.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-muted">Fans of (unchecked): {h.suggestedAnchors.join(", ")}</p>
                )}
                {h.assumptions.length > 0 && <p className="mt-0.5 text-[11px] text-muted">Assumes: {h.assumptions.join("; ")}</p>}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">{composer}</div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          {intake.error ? <span className="text-nosupport">{intake.error}</span> : <span />}
          <button type="button" onClick={intake.reset} className="hover:text-ink">
            Start over
          </button>
        </div>
      </section>
      <BriefReview
        state={s}
        busy={intake.busy || running}
        onEdit={(patch) => intake.edit(patch)}
        onConfirm={() => intake.confirm()}
        onStart={(depth) => onStart(s, depth)}
      />
    </div>
  );
}
