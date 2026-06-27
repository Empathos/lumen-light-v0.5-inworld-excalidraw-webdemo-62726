# Architecture

How Lumen-Light is put together and why. For the product vision see
[`../PRD.md`](../PRD.md); for the runtime contract see [`SPEC.md`](SPEC.md); for
the reasoning behind specific choices see [`decisions/`](decisions/).

## One-line model

An Excalidraw canvas is the stage; an Inworld Realtime agent (voice **or** text)
calls Lumen tools to draw on it, generate images, pull web pages and search
results onto it, and brief through documents — as the conversation happens.

## The central seam: input modality is decoupled from canvas behavior

Every input path resolves to the **same tool calls**, and the canvas only ever
reacts to tool calls. This is the single most important property of the design —
it's what lets voice and text be equal, and what let us build over text before
adding voice without redesigning anything.

```text
voice (mic) ─┐                                ┌─► draw_canvas / draw_flow ─┐
             ├─► Inworld Realtime session ────┤  generate_image / screenshot │
text (live) ─┘   (router brain + WebRTC)      ├─► open_document / web_search ├─► Excalidraw
                                              └─► spoken/text reply          ┘   (a projection)

text (offline) ─► MockAssistantProvider ──────► draw_flow ─────────────────────► Excalidraw
```

Inworld speaks the OpenAI Realtime protocol (data channel `oai-events`, identical
events), so only the connection + session-config layer is provider-specific
(see [ADR-0007](decisions/ADR-0007-inworld-realtime-provider.md)).

## Components

### Client (browser)

| Module | Responsibility |
|--------|----------------|
| `src/main.tsx` | React entry point; registers the PWA service worker. |
| `src/App.tsx` | Wires inputs → tool handlers → canvas. Owns the editor ref, the "shapes drawn by the last tool call" ref, session state, and the resizable/hideable panel state. |
| `src/canvas/LumenCanvas.tsx` | Mounts Excalidraw (dark theme default) and hands the API instance up on mount. |
| `src/canvas/drawCanvas.ts` | Projects a free-form element list (shapes, notes, text, connectors) onto Excalidraw. Primary drawing path. |
| `src/canvas/drawFlow.ts` | Projects a linear flow diagram onto Excalidraw. Shortcut path. |
| `src/canvas/normalizeFlow.ts` | Validates/coerces raw tool args into a safe `FlowDiagram`. |
| `src/canvas/excalidrawScene.ts` | Connector routing (border-to-border) and arrow bindings. |
| `src/canvas/addImage.ts` | Places generated images and website screenshots on the canvas. |
| `src/canvas/docWindow.ts` / `markdownDoc.ts` | The on-canvas briefing window: open, read, highlight passages; Markdown rendering. |
| `src/canvas/persistence.ts` | Serializes the scene to localStorage so drawings, images, and the briefing window survive refresh / back-navigation. |
| `src/realtime/RealtimeClient.ts` | WebRTC peer connection, mic capture, model-audio playback, data-channel events, and function-call handling. |
| `src/ui/ConversationPanel.tsx` | Text input, session controls, status, transcripts; resizable + hideable. |
| `src/assistant/types.ts` | Shared contract: `FlowDiagram`, `AssistantAction`, `AssistantProvider`. |

### Server

`server/backend.ts` holds all server-side logic in a framework-agnostic form
(session config, tool schemas, image generation, web search, website
screenshots). It deals only in plain inputs/outputs so it runs in any Node 18+
runtime, and is wired up two ways:

| Wiring | Responsibility |
|--------|----------------|
| `server/realtimePlugin.ts` (dev) | Vite dev-server middleware exposing `/api/realtime/{ice,session,call}`, `/api/image/generate`, `/api/search`, `/api/screenshot`. |
| `netlify/functions/*.mts` (prod) | The same `backend.ts` logic exposed as Netlify Functions at the identical `/api/...` paths. |

In both cases the API keys (Inworld, Gemini, Tavily/Brave, thum.io) stay
server-side and never reach the browser.

## Request / event flow

### Live session (voice or text)

1. User clicks **Start voice session**. `RealtimeClient.connect()` fetches ICE
   servers from `/api/realtime/ice`.
2. It opens a `RTCPeerConnection({ iceServers })` (mic track in, model audio out,
   `oai-events` data channel), then POSTs its SDP offer to `/api/realtime/call`,
   which forwards it to Inworld (with the session config) and returns the answer.
   On data-channel open it sends a `session.update` to apply Lumen's config.
3. User speaks or types. The model decides to call a tool.
4. The client receives `response.function_call_arguments.done`, runs the tool
   via `App`'s `onToolCall`, then replies with `function_call_output` +
   `response.create`.
5. Tool handlers normalize args and act:
   - **draw tools** project onto Excalidraw (canvas updates);
   - **generate_image / screenshot_website / web_search** call the server proxy,
     then place an image on the canvas or return data to the model;
   - **document tools** open/read/highlight the on-canvas briefing window.
6. The scene is persisted to localStorage as it changes.

## Tools (the contract)

| Tool | Purpose |
|------|---------|
| `draw_canvas` | Full vocabulary: closed shapes (rectangle/ellipse/diamond), sticky notes, text, connectors, with color/fill/size/position. Primary. |
| `draw_flow` | Linear flowchart shortcut. |
| `capture_canvas` | Screenshot the canvas → `input_image` for a look-then-realign vision loop. |
| `generate_image` | Prompt → Google "Nano Banana" image → canvas. |
| `screenshot_website` | URL → thum.io live screenshot → canvas. |
| `web_search` | Live web search (Tavily/Brave) → synthesized answer + sources. |
| `open_document` | Open a Markdown doc in a canvas window; return a section outline. |
| `read_document` | Read back the window's current contents (incl. user edits). |
| `highlight_passage` | Highlight + scroll to a passage while briefing. |
| `brief_from_canvas` | Lift pasted/selected canvas text into the briefing window. |

Full schemas and behaviors are in [`SPEC.md`](SPEC.md).

## Key principles

- **The canvas is a projection, never the source of truth.** Each draw call
  replaces what the previous call drew; the durable record is the tool-call
  intent, not Excalidraw's element JSON. localStorage persistence is a
  convenience cache, not the system of record.
  ([ADR-0003](decisions/ADR-0003-canvas-as-projection.md))
- **Every API key is server-side only.** Inworld's realtime signaling uses a
  Bearer key with no ephemeral-token option, so the server proxies the handshake;
  image/search/screenshot keys are proxied the same way.
  ([ADR-0007](decisions/ADR-0007-inworld-realtime-provider.md))
- **Untrusted args are validated before they touch the canvas.** See
  `normalizeFlow.ts` / `normalizeCanvasElements`.
- **Drawing vocabulary is constrained to what Excalidraw actually renders.**
  Excalidraw has three closed shapes (rectangle, ellipse, diamond); richer geos
  fall back to rectangle. ([ADR-0004](decisions/ADR-0004-full-tldraw-vocabulary.md))

## Tech stack

- React 18 + TypeScript 5, bundled by Vite 5.
- Excalidraw 0.18 as the canvas/render engine (dark theme default).
- Inworld Realtime API over WebRTC for voice + text + tools; LLM via an Inworld
  router, voice via `inworld-tts-2` / `inworld-stt-1` / `semantic_vad`.
- Google Gemini for image generation; Tavily/Brave for search; thum.io for
  website screenshots.
- Server logic shared between a Vite dev middleware and Netlify Functions.

## Known constraints

- Realtime image input must ride in a `user`-role message; the `capture_canvas`
  screenshot is labelled as an automated capture so the model doesn't thank the
  user for it.
- The production bundle is large (Excalidraw); code-splitting is a future task.
- `generate_image`, `web_search`, and `screenshot_website` each depend on their
  provider key being set; without it the tool returns a clean error.
