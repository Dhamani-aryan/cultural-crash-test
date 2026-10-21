import { randomUUID } from "node:crypto";
import { SLOT_LABEL } from "@/lib/crashtest/types";
import type { LlmClient } from "@/lib/llm/types";
import { marketById, TARGET_MARKETS } from "@/lib/markets";
import { extractFacts, mergeFacts, suggestAudiences } from "./extract";
import {
  IntakeBriefSchema,
  IntakeRequestSchema,
  IntakeStateSchema,
  MAX_CLARIFICATION_TURNS,
  MAX_MESSAGES,
  MAX_QUESTIONS,
  type Chip,
  type CriticalField,
  type IntakeReply,
  type IntakeRequest,
  type IntakeState,
} from "./types";
import { MISSING_LABEL, marketFromText, refresh } from "./validate";

/**
 * The intake state machine. Code owns every transition: what counts as missing, which questions
 * are asked (at most three per turn, in at most four turns), when the brief is confirmed and
 * when a run may start. The model only reads facts and suggests audiences.
 *
 *   START → EXTRACT → VALIDATE → (ask | review) → MERGE ANSWER → VALIDATE → REVIEW → CONFIRM → READY
 */

export function newIntake(marketId = ""): IntakeState {
  return refresh(
    IntakeStateSchema.parse({
      intakeId: randomUUID(),
      brief: IntakeBriefSchema.parse({ marketId }),
    }),
  );
}

const START = /^\s*(please\s+)?(start|run|go|begin|launch)\b.*\b(test|crash|it|now)?\b/i;

function say(state: IntakeState, role: "user" | "assistant", text: string): IntakeState {
  const msg = { id: `${role[0]}${state.messages.length + 1}`, role, text, createdAt: new Date().toISOString() };
  return { ...state, messages: [...state.messages, msg] };
}

const cityChips = (): Chip[] =>
  TARGET_MARKETS.map((m) => ({ label: m.label, action: "update_brief" as const, patch: { marketId: m.id, cityText: "" } }));

/** The questions for what's missing, in a fixed order, at most three. */
export function questionsFor(state: IntakeState): { lines: string[]; chips: Chip[]; asks: CriticalField[] } {
  const b = state.brief;
  const lines: string[] = [];
  const chips: Chip[] = [];
  const asks: CriticalField[] = [];
  for (const f of state.missingCriticalFields) {
    if (asks.length >= MAX_QUESTIONS) break;
    asks.push(f);
    if (f === "cityConflict") {
      const fromText = marketFromText(b.cityText);
      const selected = marketById(b.marketId)?.label ?? b.marketId;
      if (fromText) {
        lines.push(`You mention ${b.cityText}, but ${selected} is selected. Which city is the launch in?`);
        chips.push(
          { label: `${marketById(fromText)!.label}`, action: "update_brief", patch: { marketId: fromText, cityText: "" } },
          { label: `${selected}`, action: "update_brief", patch: { cityText: "" } },
        );
      } else {
        lines.push(
          `You mention ${b.cityText}, which isn't one of the cities with deep enough Qloo data yet. Pick one of ${TARGET_MARKETS.map((m) => m.label).join(", ")}.`,
        );
        chips.push(...cityChips());
      }
    } else if (f === "marketId") {
      lines.push(`Which city is the launch in? Supported: ${TARGET_MARKETS.map((m) => m.label).join(", ")}.`);
      chips.push(...cityChips());
    } else if (f === "productCategory") {
      lines.push("What are you launching: the product or category?");
    } else if (f === "launchGoal") {
      lines.push("What kind of launch is it?");
      chips.push(
        { label: "A pop-up", send: "It's a pop-up launch." },
        { label: "A collaboration drop", send: "It's a collaboration drop." },
        { label: "A launch event", send: "It's a launch event." },
      );
    } else if (f === "audience") {
      lines.push(
        b.audienceDescription && state.origins.audienceDescription === "model_suggested"
          ? `Is this the audience: "${b.audienceDescription}"? Confirm it on the brief, or describe your own.`
          : "Who is it for? Describe the audience in your words, or I can suggest a few audience ideas for you to choose from.",
      );
      chips.push({ label: "Suggest audiences", action: "explore_audience" });
    } else if (f === "brandContext") {
      lines.push("What does the brand stand for? A few words on its values, style or what makes it different.");
    }
  }
  return { lines, chips, asks };
}

function reviewText(state: IntakeState): string {
  const b = state.brief;
  const notes: string[] = [];
  if (!b.audienceAnchors.length)
    notes.push("Optional: name 2–4 brands or artists your audience loves. If you don't, the agent proposes some and labels them.");
  if (b.choices.length)
    notes.push(
      `Your choices: ${b.choices.map((c) => `${SLOT_LABEL[c.slot].toLowerCase()} ${c.name}${c.locked ? " (fixed)" : ""}`).join(", ")}. Mark any that are booked as fixed.`,
    );
  return ["I have what I need. Check the brief, edit anything, then confirm it.", ...notes].join(" ");
}

/** Decide the assistant's next message from the (refreshed) state. Pure apart from the text. */
export function respond(state: IntakeState, opts: { websiteJustGiven?: boolean } = {}): IntakeState {
  let s = refresh(state);
  const prefix = opts.websiteJustGiven
    ? "I can't open websites here, so I haven't read that one. Paste any About, product or campaign copy that helps. "
    : "";
  if (!s.missingCriticalFields.length) {
    s = say(s, "assistant", prefix + reviewText(s));
    return { ...s, chips: [{ label: "Confirm brief", action: "confirm" }] };
  }
  if (s.clarificationTurns >= MAX_CLARIFICATION_TURNS) {
    s = say(
      s,
      "assistant",
      `${prefix}I've asked all I'll ask. Still missing: ${s.missingCriticalFields.map((f) => MISSING_LABEL[f].toLowerCase()).join("; ")}. Fill those in on the brief and the test unlocks.`,
    );
    return { ...s, chips: [] };
  }
  const q = questionsFor(s);
  s = say(s, "assistant", prefix + q.lines.join(" "));
  return { ...s, chips: q.chips.slice(0, 6), clarificationTurns: s.clarificationTurns + 1 };
}

export async function applyIntake(llm: LlmClient, input: IntakeRequest): Promise<IntakeReply> {
  const req = IntakeRequestSchema.parse(input);
  // The client's state is data, not truth: re-parse it and recompute everything derived.
  let state = req.state ? refresh(IntakeStateSchema.parse(req.state)) : newIntake(req.marketId ?? "");
  if (req.marketId && marketById(req.marketId) && req.action !== "reset") {
    if (state.brief.marketId !== req.marketId) {
      state = { ...state, brief: { ...state.brief, marketId: req.marketId }, confirmed: false };
    }
  }

  switch (req.action) {
    case "reset":
      return { state: newIntake(req.marketId ?? state.brief.marketId), startRequested: false };

    case "confirm": {
      state = refresh(state);
      if (state.missingCriticalFields.length) return { state: respond(state), startRequested: false };
      state = refresh({ ...state, confirmed: true });
      state = say(state, "assistant", "Brief confirmed. Start the cultural crash-test when you're ready.");
      return { state: { ...state, chips: [] }, startRequested: false };
    }

    case "update_brief": {
      const patch = IntakeBriefSchema.partial().parse(req.patch ?? {});
      const origins = { ...state.origins };
      for (const k of Object.keys(patch)) origins[k] = "user_confirmed";
      state = { ...state, brief: { ...state.brief, ...patch }, origins, confirmed: false };
      return { state: { ...refresh(state), chips: refresh(state).missingCriticalFields.length ? questionsFor(refresh(state)).chips : [{ label: "Confirm brief", action: "confirm" }] }, startRequested: false };
    }

    case "explore_audience": {
      const hypotheses = await suggestAudiences(llm, state.brief);
      state = { ...state, mode: "explore_audience", audienceHypotheses: hypotheses };
      state = say(
        state,
        "assistant",
        hypotheses.length
          ? `Here are ${hypotheses.length} audience ideas. They're my suggestions, not findings: pick one (you can edit it after), or describe your own.`
          : "I couldn't suggest audiences from what I have. Describe who it's for in your words.",
      );
      return {
        state: {
          ...state,
          chips: hypotheses.map((h) => ({ label: h.label, action: "select_audience" as const, hypothesisId: h.id })),
        },
        startRequested: false,
      };
    }

    case "select_audience": {
      const h = state.audienceHypotheses.find((x) => x.id === req.hypothesisId);
      if (!h) return { state: respond(state), startRequested: false };
      const origins: IntakeState["origins"] = { ...state.origins, audienceDescription: "user_confirmed" };
      const brief = { ...state.brief, audienceDescription: `${h.label}: ${h.description}`.slice(0, 400) };
      if (!brief.audienceAnchors.length && h.suggestedAnchors.length) {
        brief.audienceAnchors = h.suggestedAnchors.slice(0, 4);
        origins.audienceAnchors = "model_suggested";
      }
      state = {
        ...state,
        mode: "validate_plan",
        brief,
        origins,
        confirmed: false,
        assumptions: [...state.assumptions, ...h.assumptions.map((a) => `Audience idea "${h.label}": ${a}`)].slice(0, 12),
      };
      return { state: respond(state), startRequested: false };
    }

    case "message": {
      const text = (req.message ?? "").trim();
      if (!text) return { state: respond(state), startRequested: false };
      if (state.messages.length >= MAX_MESSAGES * 2) {
        state = say(state, "assistant", "This conversation is long enough. Edit the brief directly, or start over.");
        return { state, startRequested: false };
      }
      state = say(state, "user", text);
      // "Start the test" runs only when the brief is complete and confirmed.
      if (START.test(text) && text.length < 60) {
        const r = refresh(state);
        if (r.readyToRun) {
          return { state: say(r, "assistant", "Starting the cultural crash-test."), startRequested: true };
        }
        const why = r.missingCriticalFields.length
          ? `It can't start yet. Still missing: ${r.missingCriticalFields.map((f) => MISSING_LABEL[f].toLowerCase()).join("; ")}.`
          : "It can't start until you've confirmed the brief.";
        return {
          state: { ...say(r, "assistant", why), chips: r.missingCriticalFields.length ? questionsFor(r).chips : [{ label: "Confirm brief", action: "confirm" }] },
          startRequested: false,
        };
      }
      const facts = await extractFacts(llm, state, text);
      const merged = mergeFacts(state.brief, state.origins, facts);
      const brief = { ...merged.brief };
      // A city the text names becomes the selection when nothing more specific was chosen yet.
      if (merged.changed.includes("cityText")) {
        const m = marketFromText(brief.cityText);
        if (m && (!brief.marketId || m === brief.marketId)) brief.cityText = "";
        if (m && !brief.marketId) brief.marketId = m;
      }
      state = { ...state, brief, origins: merged.origins, confirmed: merged.changed.length ? false : state.confirmed };
      return { state: respond(state, { websiteJustGiven: merged.changed.includes("website") }), startRequested: false };
    }
  }
}
