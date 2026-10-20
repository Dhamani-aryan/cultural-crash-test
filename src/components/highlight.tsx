import type { ReactNode } from "react";

export interface Mark {
  needle: string;
  className: string;
  title?: string;
  onClick?: () => void;
}

/** Wrap each first occurrence of every needle in a <mark>, longest needles first. */
export function highlight(text: string, marks: Mark[]): ReactNode[] {
  const found: { start: number; end: number; mark: Mark }[] = [];
  for (const mark of [...marks].sort((a, b) => b.needle.length - a.needle.length)) {
    if (!mark.needle) continue;
    let from = 0;
    while (from <= text.length) {
      const start = text.indexOf(mark.needle, from);
      if (start < 0) break;
      const end = start + mark.needle.length;
      if (!found.some((f) => start < f.end && end > f.start)) {
        found.push({ start, end, mark });
        break;
      }
      from = start + 1;
    }
  }
  found.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let at = 0;
  found.forEach((f, i) => {
    if (f.start > at) out.push(text.slice(at, f.start));
    out.push(
      <mark
        key={i}
        className={f.mark.className}
        title={f.mark.title}
        onClick={f.mark.onClick}
        style={f.mark.onClick ? { cursor: "pointer" } : undefined}
      >
        {text.slice(f.start, f.end)}
      </mark>,
    );
    at = f.end;
  });
  if (at < text.length) out.push(text.slice(at));
  return out;
}
