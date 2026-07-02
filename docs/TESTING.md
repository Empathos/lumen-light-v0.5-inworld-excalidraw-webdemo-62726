# Testing

How we verify Lumen-Light / Beacon Table today, and where it's headed. This is honest
about current coverage: the gates are real, the unit suite is young (it started
with the board inventory, ADR-0012), and this doc names the remaining priority
targets.

## Current gates (run before every commit)

```bash
npm run typecheck   # tsc -b, no emit — strict type contract across the app
npm run build       # tsc -b && vite build — catches what dev mode hides
npm test            # vitest run — unit tests for pure logic
npm run smoke:offline # headless browser smoke for the keyless typed canvas loop
```

All four must pass clean for canvas-loop changes. Strict TypeScript is doing a
lot of the heavy lifting: the tool contract in `src/assistant/types.ts` and the
canvas projectors are all statically checked.

## Manual / browser verification

Because the core experience is a live canvas, the most valuable check is opening
it and exercising the flow:

1. `npm run dev`, open http://localhost:5180.
2. **Local dev mock:** type `Idea -> Sketch -> Build -> Ship` before starting a
   session and confirm a flow diagram renders. This is development scaffolding
   for exercising `mockProvider -> drawFlow -> Excalidraw`, not a product
   requirement.
3. **Live path (needs a key):** start a session, speak or type an open-ended
   prompt, and confirm the agent calls `draw_canvas` with varied shapes/notes,
   and occasionally `capture_canvas` to realign.
4. **Provider tools (each needs its key):** confirm `generate_image` (Gemini) and
   `screenshot_website` (thum.io) drop an image on the canvas, `web_search`
   (Tavily/Brave) returns an answer + sources, and the document tools
   (`open_document` / `read_document` / `highlight_passage` / `brief_from_canvas`)
   open and walk the on-canvas briefing window. Without a key, each returns a
   clean error rather than crashing.

Dev-only console hooks make canvas paths testable without the model:

```js
window.__lumenDrawCanvas([{ id: 'a', type: 'note', text: 'hi' }])
window.__lumenCapture()
```

## Automated browser tests

`npm run smoke:offline` launches Vite plus a headless Chromium/Chrome instance
through the DevTools Protocol. It types `Idea -> Sketch -> Build -> Ship` into
the offline composer and asserts that the 4-step flow renders and persists to
`localStorage` with the expected labels and arrows. Set `CHROME_BIN` if Chrome
or Chromium is not in a standard location.

Further browser checks should keep the same reconnaissance-then-action pattern:
navigate, wait for the UI to become ready, inspect rendered state, then assert.
Good next checks are malformed dev-hook `draw_canvas` payloads and reset/restore
browser behavior.

## Unit tests (highest-value targets)

The pure functions are easy, fast, and protect the contract. Vitest is wired up
(`npm test`); tests are co-located (`*.test.ts`). Covered so far:

| Target | What is asserted |
|--------|------------------|
| `clearScene.ts` | no-snapshot restore; document payload restore/removal; one-slot undo overwrite; restored scene re-persisted |
| `inventory/excalidrawAdapter.ts` | element→node/link mapping; tag round-trip; unknown-tag preservation; derived `source.*` tags win over stored |
| `sessionExport.ts` | Markdown leave-with artifact from inventory, source provenance, and bounded transcript |
| `summarizeScene.ts` | inventory→text rendering (counts, hosts, labels, capture_canvas hints) |

Remaining priority targets:

| Target | What to assert |
|--------|----------------|
| `normalizeFlow.ts` | dangling edges dropped; bad `kind` coerced; ids deduped |
| `drawCanvas.ts` → `normalizeCanvasElements` | invalid enums dropped; connectors to unknown ids skipped; missing x/y auto-grids |
| `mockProvider.ts` | `A -> B -> C` yields the expected `draw_flow` diagram |

## What we deliberately don't test (yet)

- The Inworld Realtime WebRTC handshake (external, networked, key-gated) — verify
  manually. Inworld speaks the OpenAI Realtime protocol but the signaling is
  proxied server-side ([ADR-0007](decisions/ADR-0007-inworld-realtime-provider.md);
  the earlier OpenAI approach is [ADR-0002](decisions/ADR-0002-openai-realtime-webrtc.md)).
- The provider HTTP APIs themselves (Gemini, Tavily/Brave, thum.io) — external and
  key-gated; verify manually.
- Excalidraw's own rendering internals.

## Definition of done for a change

- `npm run typecheck`, `npm run build`, and `npm test` pass.
- `npm run smoke:offline` passes when the change touches the typed/canvas loop.
- New pure logic ships with unit tests.
- No secret in the diff.
