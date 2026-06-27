# Known Issues

Tracked bugs and their status. Resolved entries are kept (struck through in the
index) as a record. Fixes should reference the bug id in the commit message.

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| [BUG-001](#bug-001) | Assistant loses awareness of the canvas + conversation across sessions | High | Resolved (canvas re-grounding) |

---

## BUG-001

**Assistant loses awareness of the canvas (and prior conversation) across sessions**

- **Severity:** High (breaks continuity — the core "come back to your thinking" promise)
- **Status:** Resolved — 2026-06-28 (canvas re-grounding, gap #1). Conversation
  persistence (gap #2) is deferred; see Remaining below.
- **Reported:** 2026-06-28

### Steps to reproduce
1. Start a voice/text session and put some content on the canvas (have the agent
   draw shapes, generate an image, or paste/brief a document).
2. Stop the session.
3. Start a new session (or refresh and start one) and ask the assistant about what
   is on the canvas (e.g. "what did we put up here?", "add to the diagram").

### Expected
The assistant is re-grounded in the existing board: it knows what is already on
the canvas and can reference/extend it, and ideally remembers the prior
conversation — so returning to a canvas feels continuous.

### Actual
The assistant behaves as if the canvas is blank. It has no knowledge of existing
shapes/images/notes until it happens to call `capture_canvas`, and the prior
conversation is gone entirely.

### Root cause (verified in code)
Two distinct gaps:

1. **No canvas re-grounding at session start.** `buildSession` attaches only the
   static `INSTRUCTIONS` (`server/backend.ts`). Nothing injects a snapshot of the
   current scene (or a `capture_canvas` image) when a session connects, so the
   model has zero context about what is already on the board.
2. **Conversation is not persisted.** `src/canvas/persistence.ts` saves only the
   *scene* (`lumen-scene-v1` → elements/appState/files). The transcript lives in
   in-memory React state (`messages` in `src/App.tsx`) and is lost on reload / new
   session. The visual canvas survives; the dialogue and the model's awareness of
   it do not.

### Proposed direction
Lightweight session continuity until real auth/accounts exist (per the product
note that auth + a platform come later):

- **Re-ground the model on session start.** When a session connects and the
  canvas is non-empty, prime it with the current state — either a textual summary
  of the scene or an automatic `capture_canvas` image injected as the first
  `conversation.item` — so it can see/reference existing content immediately.
- **Persist the conversation locally.** Save the transcript (and a short rolling
  summary) alongside the scene — a cookie or a `localStorage` key (e.g.
  `lumen-session-v1`) — and replay/summarize it into the new session so the agent
  picks up where it left off.
- Keep it **device-local and keyless** for now; full cross-device persistence and
  identity land with authentication + the platform.

### Resolution
Gap #1 (re-grounding) is fixed by re-deriving context from the canvas on every
session connect, per [ADR-0009](decisions/ADR-0009-session-regrounding-from-canvas.md):
`src/canvas/summarizeScene.ts` builds a compact textual description of the live
scene (shape/connector/image counts, labels, open-document title) and
`RealtimeClient` injects it as silent context the moment the data channel opens.
Derived, not stored — so it can't drift from what the user sees.

### Remaining (deferred)
- **Conversation memory (gap #2):** the *dialogue* is still not persisted — only
  the canvas artifact grounds the model. Persisting/summarizing the transcript is
  a future complement.
- **Out of scope here:** authentication / user accounts; cross-device or
  server-side session storage (land with the platform).
