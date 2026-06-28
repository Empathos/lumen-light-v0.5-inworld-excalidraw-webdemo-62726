# ADR-0011: Include a canvas screenshot in re-grounding when the board has images

## Status
Accepted (branch `v0.5-inworld-62426-excalidraw`)

## Date
2026-06-28

## Context
[ADR-0009](ADR-0009-session-regrounding-from-canvas.md) grounds a resumed session
with a *textual* scene summary and explicitly rejected an automatic vision capture
on every connect (latency + credits). In practice that left a gap: text can count
images and name a screenshot's host, but it cannot convey what is *inside* an
image. A live test showed the model seeing "two images" on the board and guessing
they were *generated*, when they were in fact **website snapshots** — exactly the
content text can't read.

## Decision
Add a **conditional** visual grounding: on re-grounding, if the canvas contains
image elements, capture a screenshot of the *whole* scene (Excalidraw
`exportToBlob` over all elements — not just the viewport) and inject it as a silent
`input_image` alongside the textual grounding. If the board has no images, stay
text-only.

- `App` provides `getCanvasImage()` (reusing the `capture_canvas` export path),
  returning a PNG data URL only when `getSceneElements()` contains an `image`.
- `RealtimeClient.flushGrounding` is now async: it sends the text item, then
  awaits the image and, if present, sends a second silent item framed as
  automated context (the model must not thank the user for it).

## Alternatives Considered

### Always capture on connect (ADR-0009's rejected option)
- Cons: a vision round-trip on *every* resume, including pure-diagram sessions
  the text summary already covers well. Rejected; gated on image presence instead.

### Text-only with richer image metadata (status quo + ADR-0009 follow-up)
- We already tag images with their source (screenshot URL / generated prompt) so
  text names them. But that only helps images placed *after* tagging shipped, and
  still can't read image *content*. The screenshot covers both. Kept as a
  complement, not a replacement — text gives structured facts, the image gives
  sight.

## Consequences
- The model can now *see* the board on resume — including legacy untagged images
  and the actual content of website snapshots — not just a count.
- Cost is paid only when it adds something text can't: boards with images. Pure
  diagrams stay text-only and cheap.
- The capture is best-effort and fully guarded; it can never block or disrupt the
  session (it runs after the session is marked connected, per
  [the BUG-001 timing fix](../KNOWN_ISSUES.md#bug-001)).
- The screenshot renders in forced light theme (as `capture_canvas` does) for
  legibility, even when the live canvas is dark.
