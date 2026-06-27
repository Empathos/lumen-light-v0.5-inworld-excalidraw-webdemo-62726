# ADR-0008: Excalidraw as the canvas engine (supersedes ADR-0004)

## Status
Accepted (branch `v0.5-inworld-62426-excalidraw`)

## Date
2026-06-28

## Context
[ADR-0004](ADR-0004-full-tldraw-vocabulary.md) exposed the full TLDraw vocabulary
via `draw_canvas`. Subsequent work swapped the canvas engine from TLDraw to
**Excalidraw** (`@excalidraw/excalidraw` 0.18) to get a lighter, hand-drawn
aesthetic, simpler element/image embedding, and an API that fit the
generated-image and on-canvas document-window features we were adding. That swap
changes the drawing vocabulary, so the decision in ADR-0004 no longer matches the
implementation and must be superseded rather than silently diverged from.

The practical difference: TLDraw offers a rich set of geo shapes (hexagon, star,
cloud, heart, x-box, …); **Excalidraw has only three closed shapes** —
`rectangle`, `ellipse`, `diamond` — plus arrows, free text, and freedraw.

## Decision
Use Excalidraw as the canvas/render engine. Keep the same curated, normalized
`draw_canvas` element model (`shape` / `text` / `note` / `connector` with
color/fill/size/position) and the same replace-previous semantics, but constrain
the `geo` vocabulary to what Excalidraw renders:

- `geo ∈ {rectangle, ellipse, diamond}`; any other requested geo **falls back to
  `rectangle`** during normalization rather than erroring.
- `note` is rendered as a sticky-style labelled rectangle.
- `connector` is an arrow routed border-to-border between two elements, with
  Excalidraw bindings preserved so the user can drag endpoints.
- The 13-value color enum, the fill enum, and the size enum are retained as the
  tool's contract and mapped onto Excalidraw's palette/styles internally.

`draw_flow` remains the linear-flow shortcut. The canvas defaults to **dark
theme**, and the scene is persisted to localStorage so it survives a refresh.

## Alternatives Considered

### Stay on TLDraw (keep ADR-0004 as-is)
- Pros: richer geo vocabulary; no migration.
- Cons: heavier bundle; its strict v3 schema validation repeatedly bit the draw
  pipeline (`geo.richText` vs `arrow.text`); image and on-canvas-window features
  were more awkward to build. Rejected.

### Freeform Excalidraw JSON pass-through
- Pros: maximally expressive.
- Cons: same failure mode ADR-0004 rejected — the model emits JSON that fails
  validation, with no safety net. Rejected in favor of the curated, normalized
  element model.

### Abstract over both engines behind a shared shape interface
- Pros: theoretical portability.
- Cons: large up-front cost for a single-engine product; the canvas is already a
  *projection* of tool calls (ADR-0003), which is the abstraction that matters.
  Rejected as premature.

## Consequences
- The drawing vocabulary is narrower than ADR-0004 promised: three closed shapes,
  not the full TLDraw geo set. Variety now comes from layout, color, notes, text,
  and connectors rather than shape diversity. Richer diagram types are a roadmap
  item.
- Enum values are mirrored from the installed **Excalidraw** package (not TLDraw);
  `normalizeCanvasElements` still drops invalid elements and dangling connectors
  before drawing.
- Generated images (`generate_image`), website screenshots (`screenshot_website`),
  and the document briefing window are first-class canvas citizens and are **not**
  erased by a redraw (only the previous draw-tool shapes are replaced — ADR-0003).
- The production bundle is large (Excalidraw); code-splitting is a follow-up.
- ADR-0004 is marked **Superseded by ADR-0008**; its historical record is kept.
