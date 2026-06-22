# Overnight Briefing Review Build Spec

Prepared: 2026-06-23

Purpose: define the first testable Lumen Light build in concrete product and
engineering terms. This is the spec for starting implementation tonight.

## One-Sentence Build Target

Build a local text-controlled agent briefing surface where the agent walks a
user through source material, highlights the source spans it is discussing,
creates staged review artifacts, lets the user accept/reject/edit them, and
projects those artifacts into Excalidraw, then exports the accepted packet.

Voice is not required for this build. The agent controls the surface directly
through structured UI actions. OpenAI Realtime voice becomes another input and
output modality after this control loop works.

## Control Model For This Build

This version is assistant/operator-controlled.

That means the first build does not need to prove live autonomous voice,
Realtime WebRTC, or open-ended model planning. A human or assistant operator
can drive the demo by selecting scripted briefing turns and triggering the same
structured actions that a future realtime briefer will call:

- activate a briefing turn
- highlight a source span
- reveal or focus a staged artifact
- accept, reject, or edit the artifact
- export the accepted packet

The important thing to prove tonight is the product control loop, not the
provider modality. If the assistant/operator can control the surface directly
and the UI behaves correctly, the later voice agent has a clear set of product
actions to call.

Excalidraw is part of this version from the beginning because the product is
intended to be a shared visual briefing surface, not only a source-plus-list
review tool. The control model is still Lumen-owned: assistant/operator actions
create and update staged artifacts, and Excalidraw renders those artifacts as a
projection. Excalidraw element JSON is not the durable source of truth.

## Who Opens It

The first user is a sense-maker: founder, researcher, product lead, strategist,
coach, analyst, facilitator, reviewer, or builder who needs to understand and
extract usable structure from a complex source.

They open Lumen Light when they have:

- a document
- a transcript
- meeting notes
- research notes
- a planning discussion
- a dense project brief

They use it instead of:

- reading the source alone
- asking a chatbot detached from the source view
- accepting a generic AI summary
- manually copying insights into notes
- creating a whiteboard that loses evidence
- dumping raw transcript into memory without review

## What It Does

The build must prove this loop:

```text
load source
  -> agent briefing turn appears
  -> referenced source span highlights
  -> staged artifact appears
  -> Excalidraw projection updates
  -> human accepts, rejects, or edits
  -> accepted artifacts export as JSON
```

The visible product surfaces are:

1. Source pane
2. Agent briefing pane
3. Staging/review pane
4. Excalidraw projection pane
5. Export pane or export control

The product must make three layers visually distinct:

1. source text: what the material literally says
2. agent briefing: what the agent is saying about the material
3. reviewed artifact: what the human accepted as durable

## How It Does It

The first build uses a deterministic fixture-backed agent. There is no model
call in the first slice.

The fixture contains:

- source document metadata
- source document text
- source span anchors
- scripted agent briefing turns
- proposed staged artifacts

When the user clicks a briefing turn or presses the next-turn control:

1. The active briefing turn is selected.
2. The source pane highlights the referenced source span.
3. The staged artifact linked to that turn appears or receives focus.
4. The Excalidraw pane creates or focuses the visual projection for that
   staged artifact.
5. The review pane shows accept, reject, and edit controls.

When the user accepts an artifact:

1. Its state changes from `staged` to `accepted`.
2. It becomes eligible for default export.
3. Its evidence reference remains attached.

When the user rejects an artifact:

1. Its state changes from `staged` to `rejected`.
2. It is excluded from default export.
3. It can remain visible in the review pane as rejected context.

When the user edits an artifact:

1. The edited text is stored.
2. The artifact state becomes `edited`.
3. The artifact remains eligible for accept/reject.
4. The original agent-proposed text remains recoverable.

When the user exports:

1. Default export includes accepted artifacts only.
2. Debug export may include rejected and staged artifacts.
3. Every exported accepted artifact includes an evidence reference.

## When It Does It

The first build is not a live meeting product yet. It runs after a source has
been loaded into the page.

Initial sequence:

1. User opens the demo page locally.
2. Page loads `examples/briefing-session.example.json`.
3. Source pane renders the source text.
4. Briefing pane renders scripted agent turns.
5. Staging pane is empty or shows pending proposals in staged state.
6. User steps through the briefing turns.
7. Each turn activates a highlight and proposed artifact.
8. User reviews artifacts.
9. User exports accepted packet.

The product should be testable in under five minutes with synthetic data.

## Required Data Shapes

### Briefing Session

```json
{
  "session_id": "briefing_session_001",
  "title": "Synthetic strategy review",
  "source": {
    "document_id": "doc_001",
    "title": "Strategy excerpt",
    "text": "Plain source text..."
  },
  "spans": [],
  "briefing_turns": [],
  "artifacts": []
}
```

### Source Span

```json
{
  "span_id": "span_001",
  "document_id": "doc_001",
  "exact": "The exact quoted source text.",
  "prefix": "Text before the exact span.",
  "suffix": "Text after the exact span.",
  "kind": "evidence"
}
```

Rules:

- `exact` is required.
- `prefix` and `suffix` are used to disambiguate repeated text.
- Failed anchoring must report a skipped span instead of highlighting the
  wrong text.

### Briefing Turn

```json
{
  "turn_id": "turn_001",
  "speaker": "agent",
  "text": "This section is really about onboarding risk.",
  "source_span_refs": ["span_001"],
  "proposed_artifact_ids": ["artifact_001"]
}
```

Rules:

- Every briefing turn must have text.
- A turn may reference one or more source spans.
- A turn may reference one or more proposed artifacts.
- In the first build, turns are scripted; later they can come from a model or
  OpenAI Realtime spoken briefer.

### Artifact

```json
{
  "artifact_id": "artifact_001",
  "kind": "risk",
  "state": "staged",
  "text": "Enterprise onboarding friction may block expansion.",
  "source_span_refs": ["span_001"],
  "created_from_turn_id": "turn_001",
  "agent_interpretation": "The agent inferred risk from the source passage.",
  "original_text": "Enterprise onboarding friction may block expansion."
}
```

Allowed `kind` values for this build:

- `claim`
- `decision`
- `question`
- `risk`
- `action`
- `insight`

Allowed `state` values for this build:

- `staged`
- `accepted`
- `rejected`
- `edited`

Rules:

- Agent-created artifacts start as `staged`.
- The agent cannot create `accepted` artifacts.
- Only user action can produce accepted artifacts.
- Every accepted artifact must have at least one `source_span_refs` value.
- Edited artifacts preserve `original_text`.

### Export Packet

```json
{
  "packet_id": "packet_001",
  "session_id": "briefing_session_001",
  "exported_at": "2026-06-23T00:00:00.000Z",
  "source": {
    "document_id": "doc_001",
    "title": "Strategy excerpt"
  },
  "artifacts": []
}
```

Rules:

- Default packet includes accepted artifacts only.
- Packet generation is deterministic for the same reviewed state except for
  `exported_at`.
- The packet must not include private credentials, local paths, or real
  transcripts.

## Required UI Behavior

### Source Pane

- Renders the synthetic source as readable text.
- Marks source spans with stable `data-span-id` attributes.
- Supports active highlight state.
- Scrolls or focuses the active source span when a turn is activated.
- Reports unanchored spans visibly or in debug output.

### Briefing Pane

- Lists scripted agent turns in order.
- Supports clicking a turn.
- Supports next/previous controls.
- Shows active turn state.
- Does not require voice, microphone, or model connectivity.

### Staging Pane

- Shows proposed artifacts linked to active or visited turns.
- Shows artifact kind, current state, text, and evidence link.
- Provides accept, reject, and edit controls.
- Keeps rejected artifacts distinct from accepted artifacts.

### Export Control

- Exports accepted artifacts as JSON.
- Provides a visible preview or downloadable blob.
- Includes source document identity and artifact evidence references.

### Excalidraw Projection Pane

- Is present in the first integrated product surface.
- Renders staged and accepted artifacts as visual cards or nodes.
- Focuses the visual object associated with the active briefing turn.
- Updates visual state when an artifact is accepted, rejected, or edited.
- Does not create accepted artifacts by itself.
- Does not become the durable source of truth; Lumen artifact/review state
  remains authoritative.

## Implementation Files

Add:

- `package.json`
- `src/briefing-review/source-pane.js`
- `src/briefing-review/state.js`
- `src/briefing-review/excalidraw-projection.js`
- `src/briefing-review/demo.js`
- `examples/briefing-session.example.json`
- `examples/briefing-review-demo.html`
- `test/briefing-review/anchor.test.js`
- `test/briefing-review/state.test.js`
- `test/briefing-review/excalidraw-projection.test.js`

Modify:

- `README.md`

Do not modify in the first build:

- `src/static-highlighter/lumen-light.js`
- `schemas/conversation-artifact.schema.json`

Use, but do not make durable:

- `prototypes/lumen-light-whiteboard-prototype/`
- Excalidraw element JSON

## Acceptance Criteria

The build is done when:

- `npm test` passes at repo root.
- `python3 -m unittest discover -s test` still passes.
- `python3 -m http.server` can serve the repo locally.
- Opening `examples/briefing-review-demo.html` shows source, briefing, staging,
  Excalidraw projection, and export surfaces.
- Activating a briefing turn highlights the expected source span.
- Activating a briefing turn creates or focuses the corresponding Excalidraw
  projection object.
- Accepting an artifact changes its state to `accepted`.
- Accepting an artifact updates its Excalidraw projection state.
- Rejecting an artifact changes its state to `rejected`.
- Rejecting an artifact removes or visibly marks its Excalidraw projection
  without deleting the reviewed artifact state.
- Editing an artifact preserves original text and stores edited text.
- Editing an artifact updates the projected Excalidraw card text.
- Default export includes accepted artifacts only.
- Every accepted exported artifact has a source span reference.
- Missing or stale spans do not create false highlights.

## Out Of Scope For Tonight

- OpenAI Realtime WebRTC voice
- model-backed agent generation
- schema reconciliation
- import/reload reconstruction
- multi-user collaboration
- live meeting capture
- memory-system writeback
- public deployment

## Build Order

1. Add root Node test harness.
2. Add scoped source span anchoring.
3. Add artifact state machine.
4. Add deterministic artifact-to-Excalidraw projection mapping.
5. Add synthetic briefing session fixture.
6. Add demo page with source, briefing, review, Excalidraw projection, and
   export panes.
7. Add demo controller.
8. Add README run instructions.
9. Run tests.
10. Open the local demo and manually verify the loop.

## First Manual Test Script

1. Start local server:

```bash
python3 -m http.server 8787
```

2. Open:

```text
http://localhost:8787/examples/briefing-review-demo.html
```

3. Click the first agent briefing turn.
4. Confirm the referenced source span highlights.
5. Confirm the corresponding Excalidraw projection card appears or receives
   focus.
6. Accept the proposed artifact.
7. Confirm the Excalidraw projection reflects accepted state.
8. Click the second turn.
9. Reject or edit its artifact.
10. Confirm the Excalidraw projection reflects rejected or edited state.
11. Export accepted JSON.
12. Confirm rejected artifacts are excluded from default export.

## Design Guardrails

- The first demo should feel like a product surface, not a schema explorer.
- The agent should be framed as a briefer: it points, explains, and proposes.
- The user should never need to understand provenance terminology to test the
  product.
- Evidence references are required underneath, but the UI should speak in
  simple terms: source, briefing, review, export.
- Excalidraw is integrated from the beginning as the shared visual surface.
- Do not let voice or schema work block the first usable loop.
- Do not let Excalidraw own the product state; it is a projection controlled by
  Lumen's artifact/review state.
