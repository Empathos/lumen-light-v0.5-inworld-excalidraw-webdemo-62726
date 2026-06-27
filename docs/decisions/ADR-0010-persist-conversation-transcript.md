# ADR-0010: Persist and recap the conversation transcript (complements ADR-0009)

## Status
Accepted (branch `v0.5-inworld-62426-excalidraw`)

## Date
2026-06-28

## Context
[ADR-0009](ADR-0009-session-regrounding-from-canvas.md) re-grounds a resumed
session in *what is on the canvas*, and explicitly deferred *what was said*. That
left [BUG-001](../KNOWN_ISSUES.md#bug-001) gap #2 open: the model knew the board
but not the prior dialogue, and the transcript itself vanished on refresh (it
lived only in React state).

The canvas can be re-derived from a live artifact; the conversation cannot — there
is no rendered surface to read it back from. So unlike the canvas, the transcript
must actually be **stored**.

## Decision
Persist the conversation transcript to `localStorage` (`lumen-transcript-v1`) and
fold a recap of it into the session grounding:

- `src/assistant/transcriptStore.ts` provides `loadTranscript` / `saveTranscript`
  (capped to the last 200 entries) and `summarizeTranscript`, which replays the
  last ~12 real turns (bracketed system/error lines dropped), truncated, framed as
  automated context.
- `App` restores `messages` from storage on mount (so a returning user also *sees*
  the prior conversation) and saves on every change.
- The realtime callback is generalized from `getCanvasGrounding` to
  **`getSessionGrounding`**, which concatenates the canvas summary (ADR-0009) and
  the conversation recap into one silent context item on connect.

## Alternatives Considered

### Leave it deferred (canvas-only grounding)
- Cons: the model re-greets and forgets decisions already made in the thread;
  continuity feels half-there. Rejected now that gap #1 shipped.

### Server-side / cross-device transcript storage
- Pros: real durability and multi-device history.
- Cons: needs identity + a backend. Out of scope until authentication + the
  platform; `localStorage` is the device-local stopgap, consistent with the rest
  of the app's persistence.

### Send the full transcript every connect
- Cons: unbounded token cost on long-lived canvases. Rejected in favor of a capped
  recent-turns recap; the canvas summary already covers durable artifacts.

## Consequences
- BUG-001 is fully resolved: a resumed session is grounded in **both** the board
  and the recent dialogue, and the transcript survives refresh / new sessions.
- Storage is bounded (200 stored, ~12 recapped) so token and quota cost stay
  predictable.
- This is **stored**, not derived (unlike ADR-0009's canvas grounding), so it can
  in principle drift if the user edits the board without a matching dialogue turn
  — acceptable because the canvas summary, which *is* derived, remains the
  authoritative description of what is actually present.
- Cross-device history and identity remain future work (authentication + platform).
