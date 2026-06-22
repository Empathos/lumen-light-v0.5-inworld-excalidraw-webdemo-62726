# Lumen Light PRD

## Product Thesis

Lumen Light is a grounded briefing surface where a human and an AI agent work
through complex source material together.

The user brings a document, transcript, meeting record, or live conversation.
The agent briefs the user through what matters, highlights the exact source
passages it is discussing, and builds a parallel review surface of claims,
decisions, questions, risks, actions, and insights. The human can inspect,
correct, accept, reject, or edit what the agent proposes before anything
becomes durable.

The product breaks the agent out of a scrolling chat window. The agent can
explain, point, highlight, arrange, and eventually speak while the user sees
the source material, the agent interpretation, and the accepted artifacts as
separate inspectable layers.

The durable promise is not a screenshot, raw transcript, or unsourced summary.
It is an export packet where every accepted artifact preserves its evidence
trail.

## Who Opens This On Monday

The v0 user is a sense-maker: a founder, researcher, strategist, product lead,
coach, analyst, facilitator, or reviewer who needs to extract defensible
meaning from complex material.

They open Lumen Light to answer:

> What matters here, what evidence supports it, and what should survive as a
> decision, question, risk, action, claim, or insight?

They use it instead of:

- reading a long source alone
- pasting the material into a detached chatbot
- trusting an unsourced AI summary
- manually copying notes into a whiteboard
- keeping only a raw transcript nobody reopens
- saving a canvas screenshot with no evidence trail
- dumping conversation data into memory without review

## Magic Moment

The agent says or writes an interpretive briefing point, the relevant source
span lights up, a proposed artifact appears in the review surface, and the user
can immediately see the difference between:

1. what the source literally says
2. what the agent is inferring or explaining
3. what the human has accepted as durable

That tri-state visibility is the core trust experience.

## Core Experience

The user opens a Lumen session with source material. The interface provides:

- a source pane where the document, transcript, or notes remain inspectable
- a chat/briefing pane where the agent discusses the material
- a highlight layer that shows what evidence the agent or user is pointing at
- a review/staging surface where proposed artifacts wait for human approval
- a visual surface or whiteboard where ideas can be arranged spatially
- an export packet containing accepted artifacts and evidence references

The agent does not merely quote the source. It can interpret it. For example,
the source may describe a pricing discussion, while the agent says, "This is
really a risk about enterprise onboarding friction." The UI must show the
source passage being interpreted and the artifact produced from that
interpretation.

The human stays in control of durability. Agent suggestions can be useful,
visible, and fast, but they do not become accepted records without review.

## Agent As Briefer

The agent's role is closer to a live briefer or presenter than a passive
summarizer.

The briefer:

- guides attention through the material
- names the point being made
- highlights the evidence being discussed
- distinguishes source text from interpretation
- proposes artifacts for review
- updates the shared visual surface when useful
- pauses for correction, approval, or redirection
- preserves provenance as the briefing unfolds

In the finished product, this role should work across text, chat, source
highlighting, whiteboarding, and low-latency audio. The agent should feel
present in the shared surface, not trapped in a detached message thread.

## OpenAI Realtime And Voice

Low-latency spoken briefing is part of the product direction.

Official OpenAI Realtime documentation supports the intended voice-agent path:
browser WebRTC sessions, `gpt-realtime-2`, voice output configuration,
ephemeral browser credentials, realtime tools, and interruption/barge-in
behavior. This means Lumen Light should treat speech-to-speech briefing as a
real implementation path, not speculative future magic.

The current local prototype does not yet implement the full spoken briefer. It
uses the OpenAI Realtime transcription slice: browser microphone audio is sent
through the app server to realtime transcription, then the resulting text feeds
a separate text agent that drives the Excalidraw prototype.

The build gap is therefore specific:

```text
current prototype:
browser mic -> app WebSocket -> OpenAI realtime transcription
  -> transcript queue -> text agent -> Excalidraw operations

target voice briefer:
browser mic/speaker over WebRTC -> OpenAI Realtime voice session
  -> spoken agent response -> Lumen function/tool calls
  -> source highlight, staged artifact, whiteboard projection
  -> provenance capture and human approval
```

Voice should be integrated as soon as the provenance loop is stable enough for
the voice agent to control meaningful Lumen tools. The product should not wait
until a far-future AV generation to explore the spoken briefer, but voice also
should not bypass source grounding, staging, and human approval.

## Product Principles

### Grounded, Not Untethered

Every durable artifact needs evidence. Agent interpretation is allowed and
valuable, but it must remain visibly connected to source material.

### Tri-State Visibility

The UI must separate source, agent interpretation, and human-approved artifact.
This is the product's primary trust mechanism.

### Review Before Durability

Agent-generated artifacts should be staged before they become accepted records.
The user can accept, reject, or edit.

### Surface As Projection

The whiteboard, cards, and visual layouts are projections over Lumen's artifact
model. The durable record is the evidence-linked artifact contract, not the
canvas engine's native JSON.

### Provider Adapters, Product-Owned Contract

OpenAI Realtime is the preferred path for the spoken briefer exploration, but
the core product contract should stay Lumen-owned: source spans, briefing turns,
normalized items, staged artifacts, accepted artifacts, and export packets.

### Public-Safe By Default

The public repo should contain framework code, schemas, synthetic fixtures, and
generic examples. Private transcripts, credentials, deployment IDs, and
operational logs belong outside the public repo.

## MVP Scope

The MVP should prove the grounded briefing loop in owned product code.

Required:

- load a document or transcript into a Lumen-owned source pane
- register source identity: `surface_id`, `pane_id`, and `document_id`
- create and re-anchor source highlights
- show agent briefing turns in text/chat with source-span references
- activate source highlights from agent briefing turns
- propose staged artifacts from agent interpretation
- support artifact kinds: claim, decision, question, risk, action, and insight
- accept, reject, or edit staged artifacts
- visibly distinguish source text, agent interpretation, and accepted artifact
- export accepted artifacts with evidence references
- import an export packet and reconstruct review state
- validate public-safe fixtures deterministically

The MVP may use a simple DOM-based review surface before the spatial canvas is
fully productized. The existing Excalidraw prototype should remain available as
a working visual prototype, but the MVP contract should not depend on
Excalidraw as the durable model.

## Not Now

These should not block the MVP:

- general-purpose whiteboard replacement
- cross-origin iframe highlighting as the primary path
- multi-user live meeting facilitation
- auto-accepted agent artifacts
- full memory-enrichment return path
- generated videos or AV recaps
- provider-specific product promises in user-facing copy
- direct canvas-engine JSON as the source of truth

## Feature Map

### Source Pane

Purpose: keep the material inspectable.

Features:

- document/transcript rendering
- source span anchoring
- repeated-text disambiguation
- stale-highlight reporting
- surface, pane, and document identity
- local highlight rendering

### Briefing Pane

Purpose: let the agent talk through the material.

Features:

- agent briefing turns
- user questions and corrections
- source-span references
- links to staged artifacts
- distinction between literal source and agent interpretation
- eventual spoken-turn transcript capture

### Highlight Layer

Purpose: make pointing visible.

Features:

- manual highlights
- agent-proposed highlights
- active highlight synchronized with agent explanation
- highlight-to-artifact links
- re-anchoring after reload/import

### Staging And Review

Purpose: turn transient model output into reviewed artifacts.

Features:

- staged artifact queue
- accept/reject/edit controls
- evidence preview
- confidence/uncertainty notes
- accepted live artifact state
- rejected items retained as non-durable evidence when useful

### Artifact Contract

Purpose: preserve what should survive the session.

Artifact kinds:

- claim
- decision
- question
- risk
- action
- insight
- diagram node
- diagram edge
- highlight

Core fields:

- stable artifact ID
- artifact kind
- artifact text
- source span or turn references
- agent interpretation reference when applicable
- human approval state
- confidence or uncertainty
- optional visual projection metadata

### Whiteboard / Visual Surface

Purpose: provide shared spatial communication.

Features:

- embedded Excalidraw prototype for current exploration
- cards, arrows, groups, diagrams, and emphasis
- viewport focus around the current briefing point
- visual projection from normalized items
- user edits and rearrangement

Rule: the whiteboard is a renderer and communication modality. It is not the
durable system of record.

### Realtime Voice Briefer

Purpose: make the agent feel present as a live briefer.

Features:

- WebRTC realtime voice session
- spoken agent response
- interruption/barge-in
- tool calls for source highlighting and staged artifact creation
- transcript/provenance capture
- no silent writes to accepted artifacts

### Export Packet

Purpose: let the user leave with defensible output.

Features:

- accepted artifacts
- source evidence references
- agent interpretation references
- human approval metadata
- visual projection metadata when useful
- memory-enrichment hints
- import/review reconstruction

## Build Sequence

### Phase 1: Owned Grounded Text Loop

Build the source-pane, highlight, agent-text-briefing, staging, artifact, and
export/import loop in Lumen-owned code.

Success: one user can load a source, receive grounded briefing turns, review
staged artifacts, accept the useful ones, and export a packet with valid
evidence references.

### Phase 2: Realtime Voice Briefer

Add OpenAI Realtime voice on top of the working loop.

Success: the agent speaks through the material, highlights source spans as it
talks, calls Lumen tools to create staged artifacts, supports interruption, and
preserves provenance.

### Phase 3: Productized Visual Surface

Componentize the Excalidraw prototype into a renderer over normalized Lumen
items, or replace it later if another canvas better serves the product.

Success: the canvas supports the briefing, but accepted artifacts still live in
the Lumen artifact contract.

### Phase 4: Live Capture And Collaboration

Extend from pre-existing documents/transcripts to live meetings,
multi-participant sessions, richer memory integration, and future AV
generation.

## Success Metrics

- 100% of accepted artifacts include a valid evidence reference.
- Highlight re-anchor success is greater than 95% on unedited documents.
- A user can create a usable sourced packet in less than 30 seconds after a
  session ends or after the agent briefing completes.
- The user can identify source, agent inference, and accepted artifact without
  explanation.
- Agent-proposed artifacts have a measurable accept/edit/reject distribution.
- Export packets validate deterministically against public fixtures.

## Current Repo Reality

What exists:

- dependency-free static highlighter in `src/static-highlighter/`
- conversation artifact schema and fixture validation
- feature map and conversation surface model
- Excalidraw-based whiteboard prototype
- OpenAI Realtime transcription path in the prototype
- text agent provider path that can drive whiteboard operations

What does not exist yet:

- full user-facing grounded briefing page
- agent-statement-to-source-span binding as a product contract
- packet-level export/import schema
- full spoken `gpt-realtime-2` voice briefer
- Realtime tool bindings for highlight/artifact/whiteboard actions
- productized canvas renderer over normalized items

## References

Official OpenAI docs:

- Realtime API with WebRTC:
  https://developers.openai.com/api/docs/guides/realtime-webrtc
- Voice agents:
  https://developers.openai.com/api/docs/guides/voice-agents
- Realtime with tools:
  https://developers.openai.com/api/docs/guides/realtime-mcp
- Realtime and audio overview:
  https://developers.openai.com/api/docs/guides/realtime

Local supporting docs:

- `docs/FEATURE-MAP.md`
- `docs/CONVERSATION-SURFACE-MODEL.md`
- `docs/PRD-REFINEMENT-ANALYSIS-2026-06-22.md`
- `docs/OPUS-PRD-SECOND-PASS-BRIEF-2026-06-22.md`
- `docs/PM-PRODUCT-EVALUATION-2026-06-22.md`
- `docs/OPENAI-REALTIME-WEBRTC-RESEARCH-2026-06-23.md`
