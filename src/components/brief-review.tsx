"use client";

import { useState } from "react";
import { SLOT_LABEL, SLOTS, type Slot } from "@/lib/crashtest/types";
import type { FieldOrigin, IntakeBrief, IntakeState } from "@/lib/intake/types";
import { MISSING_LABEL } from "@/lib/intake/validate";
import { TARGET_MARKETS } from "@/lib/markets";

const ORIGIN_LABEL: Record<FieldOrigin, string> = {
  user_supplied: "from you",
  model_suggested: "suggested",
  user_confirmed: "confirmed",
};

function Origin({ o }: { o?: FieldOrigin }) {
  if (!o) return null;
  return (
    <span className={`ml-2 text-[10px] uppercase tracking-wide ${o === "model_suggested" ? "text-weak" : "text-muted"}`}>
      {ORIGIN_LABEL[o]}
    </span>
  );
}

const list = (s: string, sep = ",") =>
  s
    .split(sep)
    .map((x) => x.trim())
    .filter(Boolean);

/** A text field that commits on blur, so typing doesn't send a request per keystroke. */
function TextField({
  label,
  value,
  origin,
  onCommit,
  multiline,
  hint,
  missing,
}: {
  label: string;
  value: string;
  origin?: FieldOrigin;
  onCommit: (v: string) => void;
  multiline?: boolean;
  hint?: string;
  missing?: boolean;
}) {
  const [v, setV] = useState(value);
  // Follow the brief when it changes from outside (a new answer in the chat).
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setV(value);
  }
  const commit = () => v.trim() !== value.trim() && onCommit(v.trim());
  return (
    <label className="block">
      <span className={`text-xs ${missing ? "text-nosupport" : "text-muted"}`}>
        {label}
        {missing && " · needed"}
      </span>
      <Origin o={origin} />
      {multiline ? (
        <textarea value={v} rows={2} onChange={(e) => setV(e.target.value)} onBlur={commit} className="mt-1 text-sm" />
      ) : (
        <input value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} className="mt-1 text-sm" />
      )}
      {hint && <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function BriefReview({
  state,
  busy,
  onEdit,
  onConfirm,
  onStart,
}: {
  state: IntakeState;
  busy: boolean;
  onEdit: (patch: Partial<IntakeBrief>) => void;
  onConfirm: () => void;
  onStart: (depth: "quick" | "thorough") => void;
}) {
  const b = state.brief;
  const o = state.origins;
  const missing = new Set(state.missingCriticalFields);
  const [depth, setDepth] = useState<"quick" | "thorough">("thorough");
  const choice = (slot: Slot) => b.choices.find((c) => c.slot === slot);
  const setChoice = (slot: Slot, name: string, locked: boolean) => {
    const rest = b.choices.filter((c) => c.slot !== slot);
    onEdit({ choices: name.trim() ? [...rest, { slot, name: name.trim(), locked }] : rest });
  };

  return (
    <aside aria-label="Launch brief" className="rounded-xl border border-line bg-panel p-4">
      <h2 className="font-serif text-lg">What I understand</h2>
      <p className="mt-0.5 text-xs text-muted">Edit anything. The test starts only after you confirm this brief.</p>

      <div className="mt-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Brand" value={b.brandName} origin={o.brandName} onCommit={(v) => onEdit({ brandName: v })} />
          <label className="block">
            <span className={`text-xs ${missing.has("marketId") || missing.has("cityConflict") ? "text-nosupport" : "text-muted"}`}>
              City{missing.has("cityConflict") ? ` · your text says ${b.cityText}` : missing.has("marketId") ? " · needed" : ""}
            </span>
            <select
              value={b.marketId}
              onChange={(e) => onEdit({ marketId: e.target.value, cityText: "" })}
              className="mt-1 text-sm"
            >
              <option value="">Choose…</option>
              {TARGET_MARKETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TextField label="What you sell" value={b.productCategory} origin={o.productCategory} missing={missing.has("productCategory")} onCommit={(v) => onEdit({ productCategory: v })} />
        <TextField label="The launch" value={b.launchGoal} origin={o.launchGoal} missing={missing.has("launchGoal")} onCommit={(v) => onEdit({ launchGoal: v })} />
        <TextField
          label="Audience"
          value={b.audienceDescription}
          origin={o.audienceDescription}
          multiline
          missing={missing.has("audience")}
          onCommit={(v) => onEdit({ audienceDescription: v })}
        />
        <TextField
          label="They're fans of"
          value={b.audienceAnchors.join(", ")}
          origin={o.audienceAnchors}
          hint={o.audienceAnchors === "model_suggested" ? "Suggested, not yet checked in Qloo. Edit or keep." : "Optional. The agent proposes some if empty."}
          onCommit={(v) => onEdit({ audienceAnchors: list(v).slice(0, 4) })}
        />
        <TextField
          label="What the brand stands for"
          value={b.brandAttributes.join(", ")}
          origin={o.brandAttributes}
          missing={missing.has("brandContext")}
          hint="Attributes, values or what makes it different, comma-separated."
          onCommit={(v) => onEdit({ brandAttributes: list(v).slice(0, 8) })}
        />

        <fieldset className="rounded-md border border-line p-3">
          <legend className="px-1 text-xs text-muted">
            Choices you&apos;ve made <span className="text-[11px]">(optional)</span>
          </legend>
          <div className="space-y-2">
            {SLOTS.map((slot) => {
              const c = choice(slot);
              return (
                <div key={slot} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                  <TextField label={SLOT_LABEL[slot]} value={c?.name ?? ""} onCommit={(v) => setChoice(slot, v, c?.locked ?? false)} />
                  <label className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted" title="The agent will never change a fixed choice.">
                    <input type="checkbox" checked={c?.locked ?? false} disabled={!c} onChange={(e) => c && setChoice(slot, c.name, e.target.checked)} />
                    Booked/fixed
                  </label>
                </div>
              );
            })}
          </div>
          <label className="mt-3 flex items-start gap-2 text-xs text-ink-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={b.exploreUserChoices}
              onChange={(e) => onEdit({ exploreUserChoices: e.target.checked })}
            />
            <span>
              Explore better-supported alternatives to my choices
              <span className="block text-[11px] text-muted">
                Off: your unfixed choices change only if the evidence contradicts them. On: the agent may also upgrade thin ones, keeping a
                swap only if it clearly tests better. Fixed choices never change.
              </span>
            </span>
          </label>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Never use" value={b.exclude.join(", ")} origin={o.exclude} hint="Names, comma-separated." onCommit={(v) => onEdit({ exclude: list(v).slice(0, 10) })} />
          <TextField label="Budget" value={b.budgetBand} origin={o.budgetBand} hint="Optional." onCommit={(v) => onEdit({ budgetBand: v })} />
        </div>
        <TextField
          label="Other rules"
          value={b.otherRules.join("; ")}
          origin={o.otherRules}
          hint="Separate with ; (shown to the model, not machine-checked)."
          onCommit={(v) => onEdit({ otherRules: list(v, ";").slice(0, 4) })}
        />
        <TextField
          label="Website"
          value={b.website}
          origin={o.website}
          hint="Optional and kept as a note only: it isn't opened. Paste any About or product copy in the chat instead."
          onCommit={(v) => onEdit({ website: v })}
        />
      </div>

      {state.missingCriticalFields.length > 0 && (
        <div className="mt-4 rounded-md bg-panel-2 p-3">
          <p className="text-xs text-ink">Still needed before the test:</p>
          <ul className="mt-1 space-y-0.5 text-xs text-nosupport">
            {state.missingCriticalFields.map((f) => (
              <li key={f}>○ {MISSING_LABEL[f]}</li>
            ))}
          </ul>
        </div>
      )}
      {state.assumptions.length > 0 && (
        <ul className="mt-3 list-disc space-y-0.5 pl-4 text-[11px] text-muted">
          {state.assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-4">
        {!state.confirmed ? (
          <button
            type="button"
            disabled={busy || state.missingCriticalFields.length > 0}
            onClick={onConfirm}
            className="w-full rounded-md border border-accent px-4 py-2 text-sm text-ink disabled:border-line disabled:text-muted"
          >
            {state.missingCriticalFields.length ? "Review brief (complete the missing items first)" : "Confirm brief"}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-supported">● Brief confirmed</p>
            <div role="radiogroup" aria-label="Research depth" className="flex rounded-md border border-line text-xs">
              {(["quick", "thorough"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={depth === d}
                  onClick={() => setDepth(d)}
                  className={`flex-1 px-3 py-1 capitalize ${depth === d ? "bg-panel-2 text-ink" : "text-muted"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy || !state.readyToRun}
              onClick={() => onStart(depth)}
              className="w-full rounded-md bg-accent px-4 py-2.5 font-medium text-bg disabled:opacity-50"
            >
              Start cultural crash-test
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
