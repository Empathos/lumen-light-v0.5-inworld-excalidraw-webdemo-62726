# ADR-0009: Re-ground the model from the canvas on session start

## Status
Accepted (branch `v0.5-inworld-62426-excalidraw`)

## Date
2026-06-28

## Context
The canvas scene persists across reloads ([persistence](../../src/canvas/persistence.ts)),
but the *model's awareness* of it did not: a new realtime session attached only
the static `INSTRUCTIONS`, so when a user stopped a session and came back, the
assistant treated the board as blank until it happened to call `capture_canvas`,
and the prior conversation was gone. This is [BUG-001](../KNOWN_ISSUES.md#bug-001).

Two directions were on the table: persist the **conversation transcript** and
replay it, or re-derive context from the **canvas itself** on each connect. We
chose the canvas, because the canvas is the durable artifact that defines a
session's referential integrity — "a session" is "a specific canvas."

## Decision
On session connect, if the canvas is non-empty, inject a compact **textual
summary of the current scene** as the first conversation item, framed as
automated context (the model must not thank the user for it — same convention as
the `capture_canvas` image). No `response.create` follows, so it silently informs
the model's next reply rather than triggering one.

- `src/canvas/summarizeScene.ts` walks the live Excalidraw scene → shape/connector/
  image counts, text/label list, and the open briefing document's title + length.
- `RealtimeClient` gains a session-grounding callback, invoked in the
  data-channel `open` handler after `session.update`. (Later generalized to
  `getSessionGrounding` in [ADR-0010](ADR-0010-persist-conversation-transcript.md)
  to also carry a conversation recap.)
- `App` supplies the canvas summary via `summarizeScene(apiRef.current)`.

## Alternatives Considered

### Persist and replay the conversation transcript
- Pros: remembers the actual dialogue, not just the artifact.
- Cons: a saved log can **drift** from the board — the user may delete, move, or
  paste between sessions, so the transcript would describe a canvas that no longer
  exists. It also needs its own storage + sync. Rejected as the *primary*
  mechanism; may be layered in later as a complement.

### Auto `capture_canvas` (vision) on connect
- Pros: the model literally sees the exact layout.
- Cons: a vision round-trip on every connect costs latency + credits, and is
  overkill for "what is on the board." Kept as an on-demand follow-up the model
  can still call when it needs exact geometry; the textual summary is the cheap,
  always-on baseline.

### Do nothing until authentication / a platform exists
- Cons: the stop-and-return flow is a core promise ("come back to your thinking")
  and breaks today. Rejected.

## Consequences
- Continuity is **derived, not stored**: the summary is recomputed from the live
  scene every connect, so it can never drift from what the user sees. It needs no
  new persistence beyond the scene we already keep, and works across refreshes and
  (once the scene syncs) devices, independent of which model is in the router.
- This operates at the seam *between* sessions. It does not contradict
  [ADR-0003](ADR-0003-canvas-as-projection.md) (within a session the source of
  truth is tool-call intent, not the rendered scene): across sessions the
  persisted canvas is the only durable artifact, so it becomes the thing we
  reconstruct the model's referent from.
- The summary is intentionally lightweight (counts + labels + doc title, capped),
  not a full scene dump, to keep token cost low on busy canvases. Exact layout is
  available on demand via `capture_canvas`.
- The conversation transcript is still not persisted; remembering the *dialogue*
  (vs. the *artifact*) remains future work, as does cross-device persistence and
  identity, which arrive with authentication + the platform.
