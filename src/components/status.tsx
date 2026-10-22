import { STATUS_LABEL, type ComponentStatus, type Coverage } from "@/lib/crashtest/types";

const STATUS_STYLE: Record<ComponentStatus, { color: string; mark: string }> = {
  supported: { color: "var(--supported)", mark: "✓" },
  weak: { color: "var(--weak)", mark: "–" },
  no_support: { color: "var(--nosupport)", mark: "×" },
  unresolved: { color: "var(--unresolved)", mark: "?" },
  constraint_conflict: { color: "var(--conflict)", mark: "!" },
};

/** Status as a word with a shape; colour is never the only signal. */
export function StatusBadge({ status }: { status: ComponentStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[9px] font-medium uppercase tracking-[0.08em]" style={{ color: s.color }}>
      <span aria-hidden>{s.mark}</span>
      {STATUS_LABEL[status]}
    </span>
  );
}

const COVERAGE_LABEL: Record<Coverage, string> = {
  usable: "usable",
  partial: "partial",
  empty: "no results",
  error: "error",
};

export function CoverageTag({ coverage }: { coverage: Coverage }) {
  const color =
    coverage === "usable" ? "var(--muted)" : coverage === "partial" ? "var(--weak)" : "var(--nosupport)";
  return (
    <span className="rounded border px-1.5 py-px text-[11px]" style={{ color, borderColor: "var(--line)" }}>
      {COVERAGE_LABEL[coverage]}
    </span>
  );
}

/** A 0–1 value as a bar plus the number; missing values say so instead of drawing zero. */
export function ScoreBar({ value }: { value?: number }) {
  if (value === undefined) return <span className="text-xs text-muted">no evidence</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-20 overflow-hidden rounded bg-panel-2" aria-hidden>
        <span className="block h-full rounded bg-ink-2" style={{ width: `${Math.round(value * 100)}%` }} />
      </span>
      <span className="w-7 text-right text-xs tabular-nums text-ink-2">{Math.round(value * 100)}</span>
    </span>
  );
}
