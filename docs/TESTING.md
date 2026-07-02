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
```

Both must pass clean. Strict TypeScript is doing a lot of the heavy lifting:
the tool contract in `src/assistant/types.ts` and the canvas projectors are all
statically checked.

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

## Automated browser tests (recommended next step)

Drive the running app with Playwright. This project is documented under the
agent-skills conventions, so use the **`webapp-testing`** skill: it manages
server lifecycle (`scripts/with_server.py`) and runs native Python Playwright
scripts. Reconnaissance-then-action: navigate, wait for `networkidle`,
screenshot/inspect to find selectors, then assert.

Good first end-to-end checks:
- Offline `A -> B -> C` produces the expected node/edge count on the canvas.
- A malformed dev-hook `draw_canvas` payload draws the valid parts and never
  crashes the page.

## Unit tests (highest-value targets)

The pure functions are easy, fast, and protect the contract. Vitest is wired up
(`npm test`); tests are co-located (`*.test.ts`). Covered so far:

| Target | What is asserted |
|--------|------------------|
| `inventory/excalidrawAdapter.ts` | element→node/link mapping; tag round-trip; unknown-tag preservation; derived `source.*` tags win over stored |
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
- The relevant path was exercised in the browser against the live tool contract.
- New pure logic ships with unit tests.
- No secret in the diff.
