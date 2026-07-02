# ADR-0012: Canvas-agnostic board inventory with extensible tagging

## Status
Accepted (branch `v0.5-inworld-62426-excalidraw`)

## Date
2026-07-02

## Context
Every canvas capability now on the roadmap needs the same thing: a structured,
addressable model of *what is on the board*. Per-asset vision ("what does this
screenshot say?") needs a stable id to name the asset. "Take me to the pricing
stuff" needs ids plus positions. A future labeling model / GraphRAG layer needs
nodes, relationships, and a place to attach what it learns. Today none of that
exists as a first-class structure — `summarizeScene` re-derives an ad-hoc text
blob by pattern-matching element types, image identity hangs off
`customData.lumenImage`, and connector relationships are dropped entirely.

Two strategic pressures shaped the decision:

1. **Board-size scaling.** Whole-board exports grow with content (a
   screenshot-heavy board can no longer photograph itself inside the WebRTC
   data channel's message limit — see ADR-0011's failure). The scalable
   perception model is *index → overview → close-up*, and the index layer is
   this inventory: bounded text that never grows past its caps regardless of
   board size.
2. **Engine portability.** We already paid one canvas migration
   (tldraw → Excalidraw, ADR-0008), and asked whether a more suitable canvas —
   or our own — should come next. Conclusion: nothing hurting us is
   Excalidraw's fault, but the *semantic layer* we're about to build is the
   actual product and must not be welded to any engine. Build it once,
   portable; treat the canvas as a renderer behind an adapter.

## Decision
A new module, `src/canvas/inventory/`, owns the board's structured model:

- **`schema.ts` — the springboard.** Pure types, zero Excalidraw imports:
  `BoardInventory { version, nodes, links, tags }`, where every
  `BoardNode` (id, kind, label, bounds, tags) and `BoardLink` (id, from, to,
  label, tags) carries an open `Tags` record. This schema is ours; it outlives
  any canvas engine.
- **Extensible tagging everywhere.** `Tags = Record<string, string | number |
  boolean | string[]>`, namespaced by convention with provenance built into the
  namespace: `source.*` (set by the system, e.g. `source.url`), `ai.*` (set by
  the model), `user.*` (set by the user). Adapters must **preserve tags they
  don't understand** — tomorrow's capabilities ride today's schema without a
  migration.
- **Tags live on the element** — persisted in Excalidraw `customData.lumenTags`
  (a sibling of the existing `customData.lumen` boolean projection marker and
  `customData.lumenImage`, deliberately NOT nested under either), so they
  travel with the scene through the existing `lumen-scene-v1` persistence,
  undo, and copy/paste. No parallel store to drift. `source.*` is
  derived-only: the adapter drops stored `source.*` keys on read, so persisted
  or pasted data cannot spoof system provenance.
- **Links are first-class.** Arrows become edges with ids, endpoints, labels,
  and their own tags — the relationship layer exists from day one.
- **`excalidrawAdapter.ts` is the only file that may import Excalidraw types.**
  It derives a `BoardInventory` from the live scene (derived-not-stored, same
  principle as ADR-0009) and is the sole reader/writer of on-element tags.
- **`read_canvas` / grounding re-plumb onto the inventory** with no behavior
  change: `describeScene` renders its bounded text from `BoardInventory`
  instead of ad-hoc element walking. First consumer proves the layer.

Consumers this unlocks (in rough order): per-asset vision by node id,
`go_to_canvas_item` navigation (`scrollToContent` by id), scoped clears by
kind/tag, model-written annotations (`tag_item`), and the labeling/GraphRAG
north star — each a verb that takes an *address*, all sharing this spine.

## Alternatives Considered

### Keep deriving ad-hoc summaries per feature
- Pros: no new module; each feature ships slightly faster at first.
- Cons: every feature re-invents identity/addressing; N incompatible partial
  models of the board; the GraphRAG layer never gets a substrate. Rejected —
  this is how the BUG-002/003 class of gaps happened.

### Switch to (or build) a canvas with a native semantic model
- Pros: model-native scene graph; possibly better multiplayer future.
- Cons: a canvas engine is years of commodity edge cases (gestures, text
  editing, undo, mobile); we'd starve the differentiating layer to rebuild a
  commodity, and we've already paid one migration. Rejected for now — but this
  ADR *is* the hedge: with the schema portable and Excalidraw behind an
  adapter, a future engine switch is an adapter rewrite, not a product rewrite.

### Store the inventory as its own persisted document (graph as source of truth)
- Pros: the "graph is the durable thing" end-state directly.
- Cons: two sources of truth today (scene + graph) with sync/drift risk — the
  exact failure mode ADR-0009 avoided by deriving. Deferred: derive now; if/when
  auth + platform land, the persisted graph can become primary and the canvas a
  projection of *it* (a natural evolution of ADR-0003, not a contradiction).

## Consequences
- Positive: stable addresses + extensible tags make the perception ladder
  (index → overview → close-up), navigation, and future annotation/retrieval
  layers buildable as small verbs instead of research projects; canvas engine
  becomes swappable; pure-function module is the repo's first unit-tested code
  (vitest lands with it, per TESTING.md's stated direction).
- Negative / accepted: one more abstraction layer to maintain; tags in
  `customData` count against the localStorage scene budget (tiny next to image
  data, but nonzero); derived inventory means model-written tags must go
  *through the adapter to the element* to survive (enforced by making the
  adapter the only tag writer).
- The schema is versioned (`version: 1`) so a persisted-graph future (or a
  breaking tag-convention change) has a migration seam.
