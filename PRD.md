# Lumen Light — Product Requirements

Status: living draft. UX-first, high-level. This PRD describes the current
canvas-first Lumen Light product direction.

> **"Beacon Table"** was this project's original codename — kept here in quotes
> as a memento of where it started. The product name is **Lumen Light**.

> **Where things live:** this PRD is the *product* view (what/why/for whom).
> The *engineering* views live beside it — runtime contract in
> [`docs/SPEC.md`](docs/SPEC.md), structure in
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and the reasoning behind key
> choices in [`docs/decisions/`](docs/decisions/). How to run and contribute is
> in [`README.md`](README.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## 1. What It Is

Lumen Light is a **thinking canvas with a live AI collaborator**.

You open a large open whiteboard. You talk or type. As you do, an AI assistant
listens and **draws alongside you in real time** — turning loose conversation
into flow diagrams, structure, generated visuals, and even live web pages, so the
ideas become coherent while you're still working through them.

It is not a chat window with a canvas bolted on. The **canvas is the main stage**,
and the assistant is a creative partner drawing on it with you.

One sentence:

> **Lumen Light is a voice-and-text whiteboard where an AI collaborator diagrams
> your conversation as it happens, pulls in live information and web pages, and
> can brief you through documents by talking, highlighting, and drawing the
> connections live.**

---

## 2. Who It's For

The first user is a **thinker working through something complex out loud**:
a founder, researcher, strategist, product lead, facilitator, coach, or analyst.

They reach for Lumen Light when they want to:

- think out loud and watch the structure of their thoughts appear
- make a messy conversation coherent without stopping to draw it themselves
- be briefed on a dense document instead of reading it alone
- bring live facts and real web pages into the same visual space
- leave with a visual artifact that captures the thinking, not just a transcript

---

## 3. What It Does (Core Capabilities)

### 3.1 Live conversation-to-diagram (hero feature)

As the user speaks or types, the assistant extracts the key points and **draws
them on the canvas in real time** — flow diagrams, mind maps, sticky-note
clusters, labelled shapes, and connectors that bring structure and coherence to
what's being said.

- Diagrams appear and update as the conversation moves.
- The canvas content is **supplemental** — it supports and clarifies what the
  user is saying, rather than transcribing it.
- Output follows a **defined, validated visual vocabulary** (shapes, notes, text,
  connectors with color/fill/size) so it stays consistent and legible, not random
  scribbles.

### 3.2 Voice and text input (both first-class)

- **Voice** is the headline experience: speak naturally, the canvas responds.
- **Text chat** is an equal input path and drives the **same** assistant actions.
- Both feed **one shared canvas**. The user can mix modes freely.

### 3.3 Document briefing mode

When the user provides or pastes a document and asks to be briefed, the assistant
acts like a **Toastmaster / live presenter**:

- opens the document in a window on the canvas and walks through it section by
  section, talking it through
- **highlights the interesting passages** as it discusses them
- **draws the correlations** between ideas visually on the canvas
- guides the user's attention rather than dumping a summary

### 3.4 Creative visuals and generated media

The assistant can be **creative** in how it represents ideas — diagrams,
arrangements, emphasis — and can **generate pictures/media** and place them on the
canvas to enrich the thinking.

### 3.5 Live web research and web pages on the canvas

The assistant isn't limited to what it already knows:

- it can **search the live web** mid-conversation and bring back a synthesized
  answer with sources, then diagram or brief the findings
- it can **capture a real web page** and drop it onto the canvas as an image, so a
  source can be looked at together — find it and show it in one move

### 3.6 A canvas you leave with

The session produces a **visual artifact** — the populated canvas — that captures
the shape of the thinking, not just a chat log. The scene persists across a
refresh, and the app can be installed to a phone home screen.

---

## 4. How It Works (User's-Eye View)

The experience, end to end:

```text
open canvas
  -> user speaks or types
  -> assistant understands the point
  -> assistant draws / updates the canvas (live) — diagrams, images, web pages
  -> conversation continues, canvas keeps pace
```

Document briefing:

```text
user loads or pastes a document + asks for a briefing
  -> assistant opens it in a window on the canvas
  -> walks through it section by section (talking)
  -> highlights the passage it's discussing
  -> draws the connections between passages on the canvas
  -> user follows along, asks questions, redirects
```

The user always stays in control: they can interrupt, redirect, edit the canvas
directly, and steer what the assistant focuses on.

---

## 5. Trust Model (carried forward, sharpened)

Even on a creative canvas, the user must be able to tell **what's grounded from
what's invented**. We keep a clear distinction between:

1. **Source** — what a provided document (or cited web result) literally says.
2. **Assistant interpretation** — what the AI is inferring, structuring, or drawing.
3. **What the user has kept** — what the user accepts/edits as theirs.

When the assistant briefs from a document or reports a web search, anything it
draws should be traceable back to the passage or source it came from. Creativity
is encouraged; ungrounded claims dressed up as fact are not.

> Note: in the original product this was a strict "stage everything before it's
> durable" review gate. On a live creative canvas this needs a lighter touch —
> exact mechanism is an open question (see §8).

---

## 6. Key Technology Direction (high-level only)

Detailed architecture lives in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); the
direction in brief:

- **Canvas:** Excalidraw (programmable elements, easy image embedding, hand-drawn
  feel; dark theme by default).
- **Live voice + text:** Inworld Realtime API over WebRTC, with a router as the
  model "brain." Inworld speaks the OpenAI Realtime protocol, so the loop is
  provider-portable. (The earlier OpenAI Realtime approach is recorded in the ADRs.)
- **Assistant → canvas:** a defined, validated element/shape vocabulary the
  assistant emits to create/update diagrams.
- **Supporting providers:** Google Gemini ("Nano Banana") for generated images,
  Tavily/Brave for web search, thum.io for website screenshots — all proxied
  server-side so keys never reach the browser.
- **Build order advantage:** because voice and text trigger the *same* canvas
  actions, the whole loop was built and tested over **text first**, then voice
  layered on without redesign.

---

## 7. What's In vs. Later

**In (working today):**

- open canvas as the main surface (persisted across refresh; installable PWA)
- text- and voice-driven live conversation-to-diagram (Inworld Realtime)
- the full validated drawing vocabulary (shapes, notes, text, connectors)
- document briefing mode with passage highlighting + connection drawing
- generated images on the canvas
- live web search, and website screenshots placed on the canvas

**Later (not yet):**

- multi-user / live collaboration
- deep memory / export-to-external-systems integration
- file/PDF upload + OCR as briefing sources (paste/Markdown works today)
- richer diagram types and creative visual styles beyond the current vocabulary

---

## 8. Open Questions

- How light or strict should the trust/review model be on a live canvas?
- How does the user correct or reshape what the assistant drew?
- What's the strongest "hero demo" slice to lead with?
- The scene persists locally (localStorage) — what should cross-device
  persistence / "what the user leaves with" look like concretely?

---

## 9. Related Documents

| Document | Purpose |
|----------|---------|
| [`docs/SPEC.md`](docs/SPEC.md) | Runtime contract: tools, commands, structure, boundaries, success criteria. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the pieces fit together and the data/event flow. |
| [`docs/decisions/`](docs/decisions/) | ADRs — why the key technical choices were made. |
| [`docs/TESTING.md`](docs/TESTING.md) | How changes are verified. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How we work: spec-first, decision-recording, coding standards. |
| [`README.md`](README.md) | Overview, setup, and run instructions. |

_This draft is a living document — it is updated as decisions land. Significant
changes should be reflected here and, where they're architectural, recorded as an
ADR in [`docs/decisions/`](docs/decisions/)._
