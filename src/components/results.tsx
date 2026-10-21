"use client";

import { DISCLAIMER, toMarkdown } from "@/lib/crashtest/report";
import {
  DIMENSION_LABEL,
  SLOT_LABEL,
  STOP_LABEL,
  WEIGHTS,
  type ComponentAssessment,
  type Component,
  type CulturalPlan,
  type RunState,
} from "@/lib/crashtest/types";
import { ScoreBar, StatusBadge } from "./status";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const pct = (x?: number) => (x === undefined ? "–" : Math.round(x * 100));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function choiceText(c: Component | undefined) {
  if (!c) return "–";
  return c.tags.length ? `${c.label} (${c.tags.map((t) => t.name).join(", ")})` : c.label;
}

function PlanSide({
  label,
  sub,
  component,
  assessment,
  strike,
}: {
  label: string;
  sub: string;
  component?: Component;
  assessment?: ComponentAssessment;
  strike?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-muted sm:hidden">
        {label} <span className="normal-case">{sub}</span>
      </p>
      <p className={strike ? "text-ink-2" : "font-medium text-ink"}>{choiceText(component)}</p>
      {assessment && (
        <div className="mt-1">
          <StatusBadge status={assessment.status} />
          <p className="mt-0.5 text-xs leading-snug text-muted">{assessment.finding}</p>
        </div>
      )}
    </div>
  );
}

function keptNote(a?: ComponentAssessment): string {
  if (!a) return "Kept.";
  if (a.status === "supported") return "Kept: the evidence supports it.";
  if (a.status === "unresolved") return "Kept: Qloo doesn't know it, so it couldn't be tested. Check it by hand.";
  if (a.contradicted) return "Kept: no better-supported alternative was found. Worth a human look.";
  return "Kept: the evidence is thin, but nothing contradicts it.";
}

/**
 * The comparison judges care about: what the model alone recommended, what the agent ended up
 * recommending, and what Qloo's evidence says about each. Both sides are scored by the same
 * rubric; the left column is the model's first draft, before it saw any Qloo data.
 */
function PlanCompare({ state }: { state: RunState }) {
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  const find = (p: CulturalPlan | null, s: string) => p?.components.find((c) => c.slot === s);
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="hidden grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-5 border-b border-line bg-panel-2 px-4 py-3 sm:grid">
        <span className="text-xs uppercase tracking-wide text-muted">Choice</span>
        <span>
          <span className="block text-xs uppercase tracking-wide text-muted">LLM alone</span>
          <span className="text-xs text-muted">
            no Qloo data · {first?.supported ?? 0} of {first?.components.length ?? 0} supported · {first?.contradicted ?? 0} contradicted
          </span>
        </span>
        <span>
          <span className="block text-xs uppercase tracking-wide text-accent">Agent</span>
          <span className="text-xs text-muted">
            tested against Qloo · {last?.supported ?? 0} of {last?.components.length ?? 0} supported · {last?.contradicted ?? 0} contradicted
          </span>
        </span>
      </div>
      {(state.plan?.components ?? []).map((c) => {
        const b = find(state.initialPlan, c.slot);
        const changed = b?.label !== c.label;
        return (
          <div
            key={c.slot}
            className="grid gap-x-5 gap-y-3 border-b border-line px-4 py-4 text-sm last:border-0 sm:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)_minmax(0,1fr)]"
          >
            <span className="text-muted">
              {SLOT_LABEL[c.slot]}
              {b?.origin === "user_provided" && <span className="block text-xs">your choice</span>}
              {c.locked && <span className="block text-xs">locked</span>}
            </span>
            <PlanSide
              label="LLM alone"
              sub="(no Qloo data)"
              component={b}
              assessment={first?.components.find((x) => x.slot === c.slot)}
              strike={changed}
            />
            <div className={changed ? "rounded-md border-l-2 border-accent pl-3" : ""}>
              <PlanSide
                label="Agent"
                sub="(tested against Qloo)"
                component={c}
                assessment={last?.components.find((x) => x.slot === c.slot)}
              />
              {!changed && <p className="mt-1 text-xs text-muted">{keptNote(last?.components.find((x) => x.slot === c.slot))}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComponentCard({ a, component }: { a: ComponentAssessment; component?: Component }) {
  const e = component?.entity;
  return (
    <article className="rounded-lg border border-line bg-panel p-4">
      <header className="flex items-start gap-3">
        {e?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" loading="lazy" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted">{SLOT_LABEL[a.slot]}</p>
          <h4 className="font-serif text-lg leading-tight">{choiceText(component) || a.label}</h4>
          {e?.shortDescription && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{e.shortDescription}</p>}
        </div>
        <div className="text-right">
          <StatusBadge status={a.status} />
          <p className="mt-1 text-xs text-muted">
            score {pct(a.total)} · coverage {a.coverage}
          </p>
        </div>
      </header>
      <p className="mt-3 text-sm text-ink-2">{a.finding}</p>
      {a.dimensions.length > 0 && (
        <dl className="mt-3 space-y-2">
          {a.dimensions.map((d) => (
            <div key={d.key} className="grid grid-cols-[8.5rem_auto_minmax(0,1fr)] items-start gap-x-3 text-xs">
              <dt className="text-muted">
                {DIMENSION_LABEL[d.key]}
                {d.heuristic && <span className="block text-[10px]">app heuristic</span>}
              </dt>
              <dd>
                <ScoreBar value={d.score} />
              </dd>
              <dd className="text-ink-2">
                {d.explanation}
                {d.evidenceIds.length > 0 && <span className="ml-1 font-mono text-muted">[{d.evidenceIds.join(", ")}]</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

export function Results({ state, onRerun }: { state: RunState; onRerun?: () => void }) {
  const first = state.evaluations[0];
  const last = state.evaluations.at(-1);
  const name = slug(`${state.brief.brandName ?? "crash-test"}-${state.marketLabel}`);
  return (
    <section aria-label="Results" className="space-y-8">
      <div>
        <h3 className="font-serif text-2xl">What the LLM alone recommends vs. what the agent recommends</h3>
        <p className="mb-3 mt-1 text-sm text-muted">
          Same brief, same model. The left column is the model&apos;s plan before it saw any Qloo data; the right is the plan after the agent
          tested every choice and replaced the ones Qloo&apos;s evidence contradicts. Choices with thin evidence are kept and flagged, not
          swapped for the sake of a score. Both sides are judged by the same Qloo tests.
        </p>
        <PlanCompare state={state} />
      </div>
      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="text-xs uppercase tracking-wide text-muted">Verdict</p>
        {state.verdict ? (
          <p className="mt-2 font-serif text-xl leading-snug">{state.verdict}</p>
        ) : (
          <p className="mt-2 text-ink-2">No verdict was written for this run.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>
            <span className="text-muted">Supported choices </span>
            {first?.supported ?? 0} of {first?.components.length ?? 0} → <strong>{last?.supported ?? 0} of {last?.components.length ?? 0}</strong>
          </span>
          <span>
            <span className="text-muted">Plan score </span>
            {pct(first?.totalScore)} → <strong>{pct(last?.totalScore)}</strong>
          </span>
          <span>
            <span className="text-muted">Stopped: </span>
            {state.stopReason ? STOP_LABEL[state.stopReason] : "–"}
            {state.stopDetail && <span className="text-muted"> ({state.stopDetail})</span>}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted">
          The verdict is written by the model from the recorded evidence; scores are this app&apos;s own, built from Qloo results. {DISCLAIMER}
        </p>
      </div>


      {last && (
        <div>
          <h3 className="mb-3 font-serif text-2xl">Each choice, tested</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {last.components.map((a) => (
              <ComponentCard key={a.slot} a={a} component={state.plan?.components.find((c) => c.slot === a.slot)} />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 font-serif text-2xl">Revision log</h3>
        {state.changes.length === 0 ? (
          <p className="text-sm text-muted">No changes were made.</p>
        ) : (
          <ol className="space-y-4">
            {state.changes.map((c, i) => (
              <li key={i} className="border-l-2 border-line pl-4">
                <p className="text-sm">
                  <span className="text-muted">Round {c.iteration} · {SLOT_LABEL[c.slot]}: </span>
                  <span className="line-through decoration-1 text-muted">{c.before}</span> → <strong>{c.after}</strong>
                  {c.reverted && <span className="ml-2 text-xs text-weak">tested, not kept</span>}
                </p>
                <p className="mt-1 text-sm text-ink-2">{c.reason}</p>
                <p className="mt-1 text-xs text-muted">Expected: {c.expectedEffect}</p>
                <p className="text-xs text-muted">Observed: {c.observedEffect}</p>
                <p className="text-xs text-muted">
                  Evidence: <span className="font-mono">{c.triggeringEvidenceIds.join(", ")}</span>
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {(state.unresolvedQuestions.length > 0 || state.assumptions.length > 0) && (
        <div className="grid gap-6 md:grid-cols-2">
          {state.unresolvedQuestions.length > 0 && (
            <div>
              <h3 className="mb-2 font-serif text-xl">Still open</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                {state.unresolvedQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {state.assumptions.length > 0 && (
            <div>
              <h3 className="mb-2 font-serif text-xl">Assumptions</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                {state.assumptions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <details className="rounded-lg border border-line bg-panel p-4 text-sm">
        <summary className="cursor-pointer text-ink">How the score is built (rubric {last?.rubricVersion})</summary>
        <div className="mt-3 space-y-2 text-ink-2">
          <p>
            Every choice is tested against Qloo in {state.marketLabel}, for the audience its anchors stand for (
            {state.plan?.anchors.map((a) => a.name).join(", ")}):
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>{DIMENSION_LABEL.audience}</strong> ({WEIGHTS.audience * 100}%): its rank among what this audience has affinity for in
              the city (Qloo Insights with the anchors and the city as signals). Not returned at all means <em>no support found</em>.
            </li>
            <li>
              <strong>{DIMENSION_LABEL.local}</strong> ({WEIGHTS.local * 100}%): whether it is from here or distinctive here, versus a name
              just as big in other world cities or the US (Qloo location-only lists and origin data).
            </li>
            <li>
              <strong>{DIMENSION_LABEL.coherence}</strong> ({WEIGHTS.coherence * 100}%): its rank when the plan&apos;s other choices are the
              signal: do the choices support each other?
            </li>
            <li>
              <strong>{DIMENSION_LABEL.distinct}</strong> ({WEIGHTS.distinct * 100}%): not a repeat of another choice. An app heuristic.
            </li>
          </ul>
          <p>
            The agent replaces a choice only when the evidence <em>contradicts</em> it: no support for this audience here, a hard
            constraint broken, a global or foreign import, or a direction this audience here doesn&apos;t lean to. Dimensions without
            evidence are left out and the weights renormalise; coverage is shown separately. A choice is
            <em> Supported</em> when its score, audience affinity and local relevance are all at least 60 and every part of it is in the
            audience&apos;s list. Affinity and ranks are Qloo&apos;s; the combination is this app&apos;s, and it is not a probability.
          </p>
        </div>
      </details>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-md border border-line px-4 py-2 text-sm hover:border-muted"
          onClick={() => download(`${name}.md`, toMarkdown(state), "text/markdown")}
        >
          Download report (Markdown)
        </button>
        <button
          type="button"
          className="rounded-md border border-line px-4 py-2 text-sm hover:border-muted"
          onClick={() => download(`${name}.json`, JSON.stringify(state, null, 2), "application/json")}
        >
          Download run (JSON)
        </button>
        {onRerun && (
          <button type="button" className="rounded-md border border-line px-4 py-2 text-sm text-muted hover:border-muted" onClick={onRerun}>
            Run it live again
          </button>
        )}
      </div>
    </section>
  );
}
