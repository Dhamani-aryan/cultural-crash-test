"use client";

import { useState } from "react";
import { EXAMPLE_BRIEFS } from "@/lib/crashtest/examples";
import { SLOT_LABEL, SLOTS, type Constraint, type LaunchBriefInput, type Slot } from "@/lib/crashtest/types";
import { TARGET_MARKETS } from "@/lib/markets";

const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const PLACEHOLDER: Record<Slot, string> = {
  artist_music: "e.g. a headliner you have in mind",
  brand_collaboration: "e.g. a brand you'd collaborate with",
  event_place: "e.g. a venue you've booked or shortlisted",
  creative_direction: "e.g. playful pastels with Y2K nostalgia",
};

interface FormState {
  brandName: string;
  productCategory: string;
  launchGoal: string;
  marketId: string;
  audienceDescription: string;
  anchors: string;
  attributes: string;
  budgetBand: string;
  choices: Record<Slot, string>;
  locks: Record<Slot, boolean>;
  exclude: string;
  notes: string;
  depth: "quick" | "thorough";
}

function fromBrief(b: LaunchBriefInput): FormState {
  const choice = (s: Slot) => b.existingChoices?.find((c) => c.slot === s)?.name ?? "";
  const lock = (s: Slot) => Boolean(b.constraints?.some((c) => c.kind === "hard" && c.lockSlot === s));
  return {
    brandName: b.brandName ?? "",
    productCategory: b.productCategory,
    launchGoal: b.launchGoal,
    marketId: b.marketId,
    audienceDescription: b.audienceDescription,
    anchors: (b.audienceAnchors ?? []).join(", "),
    attributes: (b.brandAttributes ?? []).join(", "),
    budgetBand: b.budgetBand ?? "",
    choices: Object.fromEntries(SLOTS.map((s) => [s, choice(s)])) as Record<Slot, string>,
    locks: Object.fromEntries(SLOTS.map((s) => [s, lock(s)])) as Record<Slot, boolean>,
    exclude: (b.constraints ?? []).flatMap((c) => c.excludeNames ?? []).join(", "),
    notes: (b.constraints ?? [])
      .filter((c) => !c.lockSlot && !c.excludeNames?.length)
      .map((c) => c.description)
      .join("; "),
    depth: b.depth ?? "quick",
  };
}

function toBrief(f: FormState): LaunchBriefInput {
  const constraints: Constraint[] = [];
  for (const s of SLOTS) {
    if (f.locks[s] && f.choices[s].trim())
      constraints.push({ id: `lock-${s}`, kind: "hard", lockSlot: s, description: `Keep the ${SLOT_LABEL[s].toLowerCase()}: ${f.choices[s].trim()}` });
  }
  const exclude = list(f.exclude);
  if (exclude.length)
    constraints.push({ id: "exclude", kind: "hard", excludeNames: exclude, description: `Never use: ${exclude.join(", ")}` });
  for (const [i, n] of f.notes.split(";").map((x) => x.trim()).filter(Boolean).entries())
    constraints.push({ id: `note-${i}`, kind: "hard", description: n });
  return {
    brandName: f.brandName.trim() || undefined,
    productCategory: f.productCategory,
    launchGoal: f.launchGoal,
    marketId: f.marketId,
    audienceDescription: f.audienceDescription,
    audienceAnchors: list(f.anchors).slice(0, 4),
    brandAttributes: list(f.attributes).slice(0, 8),
    budgetBand: f.budgetBand.trim() || undefined,
    existingChoices: SLOTS.filter((s) => f.choices[s].trim()).map((s) => ({ slot: s, name: f.choices[s].trim() })),
    constraints,
    depth: f.depth,
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm text-ink-2">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function BriefForm({ onRun, busy }: { onRun: (brief: LaunchBriefInput) => void; busy: boolean }) {
  const [f, setF] = useState<FormState>(() => fromBrief(EXAMPLE_BRIEFS[0].brief));
  const [example, setExample] = useState(EXAMPLE_BRIEFS[0].id);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    setExample("");
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) onRun(toBrief(f));
      }}
    >
      <div>
        <p className="text-sm text-muted">Start from an example</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EXAMPLE_BRIEFS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setF(fromBrief(b.brief));
                setExample(b.id);
              }}
              className={`rounded-full border px-3 py-1 text-sm ${example === b.id ? "border-accent text-ink" : "border-line text-ink-2 hover:border-muted"}`}
              aria-pressed={example === b.id}
            >
              {b.title}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-serif text-lg">The launch</legend>
        <Field label="Brand" hint="optional; fictional is fine">
          <input value={f.brandName} onChange={(e) => set("brandName", e.target.value)} maxLength={80} />
        </Field>
        <Field label="Product or category">
          <input required value={f.productCategory} onChange={(e) => set("productCategory", e.target.value)} maxLength={120} />
        </Field>
        <Field label="Launch goal">
          <input required value={f.launchGoal} onChange={(e) => set("launchGoal", e.target.value)} maxLength={200} />
        </Field>
        <Field label="City" hint="where Qloo's data is measured deep enough">
          <select value={f.marketId} onChange={(e) => set("marketId", e.target.value)}>
            {TARGET_MARKETS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Audience" hint="broad, in your words">
          <input required value={f.audienceDescription} onChange={(e) => set("audienceDescription", e.target.value)} maxLength={400} />
        </Field>
        <Field label="The audience are fans of" hint="2–4 brands or artists, comma-separated; blank lets the agent propose">
          <input value={f.anchors} onChange={(e) => set("anchors", e.target.value)} />
        </Field>
        <Field label="Brand attributes" hint="comma-separated">
          <input value={f.attributes} onChange={(e) => set("attributes", e.target.value)} />
        </Field>
        <Field label="Budget" hint="optional; a constraint, not something Qloo predicts">
          <input value={f.budgetBand} onChange={(e) => set("budgetBand", e.target.value)} maxLength={60} />
        </Field>
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-serif text-lg">Choices to test</legend>
        <p className="mb-3 text-sm text-muted">Leave any blank and the agent drafts one. Lock a choice to keep it whatever the evidence says.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SLOTS.map((s) => (
            <div key={s}>
              <Field label={SLOT_LABEL[s]}>
                <input value={f.choices[s]} placeholder={PLACEHOLDER[s]} onChange={(e) => set("choices", { ...f.choices, [s]: e.target.value })} maxLength={120} />
              </Field>
              <label className="mt-1 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={f.locks[s]}
                  disabled={!f.choices[s].trim()}
                  onChange={(e) => set("locks", { ...f.locks, [s]: e.target.checked })}
                />
                Locked (hard constraint)
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 font-serif text-lg">Constraints</legend>
        <Field label="Never use" hint="names, comma-separated; enforced in code">
          <input value={f.exclude} onChange={(e) => set("exclude", e.target.value)} />
        </Field>
        <Field label="Other rules" hint="separate with ;  shown to the model, not machine-checked">
          <input value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-serif text-lg">Research depth</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="depth" checked={f.depth === "quick"} onChange={() => set("depth", "quick")} />
            Quick: up to 3 repair rounds, 700 Qloo calls
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="depth" checked={f.depth === "thorough"} onChange={() => set("depth", "thorough")} />
            Thorough: up to 6 rounds, 1,400 Qloo calls
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-5 py-2.5 font-medium text-bg disabled:opacity-50"
        >
          Run Cultural Crash-Test
        </button>
        <p className="max-w-xl text-xs text-muted">
          Qloo&apos;s evidence is aggregate cultural affinity. It doesn&apos;t identify anyone or predict what any person will do. A live run takes
          about a minute; example briefs replay a recorded run.
        </p>
      </div>
    </form>
  );
}
