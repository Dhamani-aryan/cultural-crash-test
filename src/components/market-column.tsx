"use client";

import { useState } from "react";
import type { Decision, MarketResult, ResolvedReference } from "@/lib/agent/types";
import type { Equivalent } from "@/lib/engine/equivalents";
import { DOMAIN_LABEL, type Market } from "@/lib/markets";
import { nameForms } from "@/lib/agent/names";
import { highlight } from "./highlight";

const ACTION_LABEL = { swap: "Swapped", keep: "Kept", flag: "Needs a human" } as const;

function Evidence({ e, market }: { e: Equivalent; market: Market }) {
  const where =
    e.alsoIn.length === 0
      ? `Distinctive to ${market.label}: not in the other cities' lists`
      : `Also distinctive in ${e.alsoIn.join(", ")}`;
  return (
    <div className="mt-2 flex gap-3">
      {e.entity.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={e.entity.imageUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded object-cover"
          loading="lazy"
        />
      ) : null}
      <div className="min-w-0 text-sm leading-snug">
        <p className="text-ink-2">{e.entity.shortDescription ?? e.entity.description}</p>
        <ul className="mt-1 space-y-0.5 text-xs text-muted">
          {e.sharedTags.length > 0 && <li>Same role: {e.sharedTags.slice(0, 4).join(" · ")}</li>}
          <li>
            #{e.localRank} of {e.poolSize} in {market.label}&apos;s Qloo taste list · {where}
          </li>
          {e.parts.audience !== null && (
            <li>Audience match with the original: {Math.round(e.parts.audience * 100)}%</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function DecisionRow({
  decision,
  reference,
  market,
}: {
  decision: Decision;
  reference: ResolvedReference | undefined;
  market: Market;
}) {
  const [open, setOpen] = useState(false);
  const tone =
    decision.action === "swap"
      ? "text-ink"
      : decision.action === "flag"
        ? "text-flag"
        : "text-muted";
  return (
    <li className="border-t border-line py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0">
          <span className="text-muted line-through decoration-1">{reference?.surface}</span>
          {decision.choice && (
            <>
              <span className="mx-1.5 text-muted">→</span>
              <span className="font-medium" style={{ color: `var(--${market.id})` }}>
                {decision.choice.entity.displayName}
              </span>
            </>
          )}
        </span>
        <span className={`shrink-0 text-xs uppercase tracking-wide ${tone}`}>
          {ACTION_LABEL[decision.action]}
        </span>
      </button>
      <p className="mt-1 text-sm text-ink-2">{decision.reason}</p>
      {decision.triedDomain && (
        <p className="mt-1 text-xs text-muted">
          The agent searched {DOMAIN_LABEL[decision.triedDomain].toLowerCase()} instead of{" "}
          {reference?.domain ? DOMAIN_LABEL[reference.domain].toLowerCase() : "the original kind"}.
        </p>
      )}
      {decision.confidence === "off" && (
        <p className="mt-1 text-xs text-flag">
          Qloo&apos;s {decision.domain ? DOMAIN_LABEL[decision.domain].toLowerCase() : ""} data for{" "}
          {market.label} is too thin to trust, so this wasn&apos;t guessed.
        </p>
      )}
      {open && (
        <div className="mt-2 rounded-md bg-paper-2 p-3">
          {decision.choice ? (
            <Evidence e={decision.choice} market={market} />
          ) : (
            <p className="text-sm text-muted">No local equivalent was chosen.</p>
          )}
          {decision.alternatives.length > 0 && (
            <div className="mt-3 text-xs text-muted">
              Other candidates:{" "}
              {decision.alternatives
                .slice(0, 4)
                .map((a) => a.entity.displayName)
                .join(" · ")}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export function MarketColumn({
  market,
  result,
  decisions,
  references,
  pending,
}: {
  market: Market;
  result: MarketResult | undefined;
  decisions: Decision[];
  references: ResolvedReference[];
  pending: boolean;
}) {
  const byRef = new Map(references.map((r) => [r.ref, r]));
  const marks = (result?.decisions ?? decisions)
    .filter((d) => d.action === "swap" && d.choice)
    .map((d) => {
      const e = d.choice!.entity;
      const needle = nameForms(e).find((n) => result?.text.includes(n)) ?? e.displayName;
      return { needle, className: "swap" };
    });
  const swaps = (result?.decisions ?? decisions).filter((d) => d.action === "swap").length;
  return (
    <section
      className="min-w-0 rounded-lg border border-line bg-card p-4"
      style={{ ["--market" as string]: `var(--${market.id})` }}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="font-serif text-xl" style={{ color: `var(--${market.id})` }}>
          {market.label}
        </h3>
        <span className="text-xs text-muted">
          {result ? `${swaps} swap${swaps === 1 ? "" : "s"}` : pending ? "working…" : ""}
        </span>
      </header>
      {result ? (
        <p className="mt-3 text-lg leading-relaxed">{highlight(result.text, marks)}</p>
      ) : (
        <p className="mt-3 text-muted">
          <span className="pulse">●</span> Reading {market.label}&apos;s taste data…
        </p>
      )}
      {result?.note && <p className="mt-2 text-xs text-flag">{result.note}</p>}
      {(result?.decisions ?? decisions).length > 0 && (
        <ul className="mt-4">
          {(result?.decisions ?? decisions).map((d) => (
            <DecisionRow key={d.ref} decision={d} reference={byRef.get(d.ref)} market={market} />
          ))}
        </ul>
      )}
    </section>
  );
}
