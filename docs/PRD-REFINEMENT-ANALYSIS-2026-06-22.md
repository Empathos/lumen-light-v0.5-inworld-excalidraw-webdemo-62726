# Lumen Light PRD Refinement Analysis

Prepared: 2026-06-22

Source: Claude Code on `burrow`, model `opus`, high effort, read/search-only pass over this repository.

## Executive POV

The repository contains three things at very different maturities:

1. A small, real, shipped highlighter.
2. A large, borrowed, not-yet-owned realtime whiteboard prototype.
3. A crisp, abstract artifact/provenance contract sitting between them.

The defensible core of Lumen Light is the provenance-preserving artifact
contract, not the whiteboard. The whiteboard proves that realtime speech can
become canvas objects, but the stronger product claim is that the visible
surface is a disposable projection while the durable output is evidence-linked
normalized items that a memory system can enrich.

The current PRD reads more like an architecture manifesto than a user-facing
product document. It explains a pipeline, but it does not yet answer clearly:
who opens this on Monday, to do what, instead of what?

Recommended reframing: make the first shippable product loop a static shared
briefing and review surface, and make provenance plus inspectability a
user-facing trust feature. Defer the realtime whiteboard until the artifact
contract is already load-bearing.

## Finished-State Product Narrative

Inference: A facilitator runs a planning, coaching, design, or research
conversation. As people talk, or as they read a shared document together, Lumen
Light keeps a live, readable thinking surface. The transcript stays plain and
recoverable, while meaningful moments receive light: highlights, cards,
decisions, questions, and actions.

The user, or an explicit policy, reviews agent-proposed structure in a staging
lane before it becomes live. Nothing transient becomes durable without review.

At the end of the session, Lumen Light does not hand off a screenshot. It emits
an export packet: accepted artifacts, each linked back to source turns and text
spans, with confidence and memory-enrichment hints. Downstream systems can
ingest the packet and later return enriched context. The canvas can be reset,
rearranged, or discarded; the evidence trail and normalized items survive.

Finished-state feel: a thinking surface you can trust and audit, not simply
another AI whiteboard.

Signature properties:

- Plain text is always recoverable.
- Every durable artifact carries provenance.
- Agent edits are visible, staged, and reversible.
- The artifact contract outlives the UI.

## Primary Users And Jobs To Be Done

### Primary: Facilitator Or Sense-Maker

Job: While I run this conversation, help me see what is being decided and asked,
then walk away with a clean, sourced summary I can defend.

Likely contexts:

- planning sessions
- design reviews
- coaching conversations
- research interviews
- strategy discussions

### Secondary: Memory Or Insight Integrator

Job: Give me conversation-derived artifacts with provenance so my memory system
can enrich them, rather than forcing me to consume raw transcripts or canvas
dumps.

### Secondary: Developer Building Provenance-Aware Integrations

Job: Give me a stable, inspectable schema and fixtures so I can build adapters
without private data.

Inference: The facilitator is the only audience with a clear Monday-morning
workflow today. Integrators and developers are consumers of the contract. The
PRD should commit to the facilitator as the v0 design target.

## Core Workflows

### Review Surface Loop

This is the natural v0 because the repository already has the static
highlighter baseline.

Flow:

1. Load a static document or transcript.
2. Highlight manually or through a partner/API-created highlight.
3. Persist and re-anchor highlights on reload.
4. Export highlight records.
5. Map records to artifacts.
6. Review accepted decisions, questions, and actions.

Missing glue:

- artifact mapping from highlights
- review page
- accepted-item summary

### Staging To Live Promotion

Flow:

1. Capture evidence.
2. Propose an item.
3. Place it in staged state.
4. User accepts or rejects.
5. Accepted items become live while evidence references remain durable.

The schema supports the states. The public UI does not yet exist.

### Realtime Conversation Surface

Flow:

1. Voice or text input enters a turn queue.
2. Turns become normalized items.
3. A surface planner proposes cards or diagrams.
4. Proposed objects remain staged.
5. Accepted objects become live.
6. The session exports artifacts.

This exists only in the prototype path and is not yet componentized.

### Export And Enrichment Round Trip

Outbound contract:

- accepted artifacts
- source turn IDs
- source spans
- surface projection metadata
- confidence
- memory-enrichment hints

Product gap: the repository asserts that memory systems can return context,
suggestions, or related prior material, but the inbound enrichment path is not
modeled yet.

## Feature Map Critique

The feature map is thorough, but it is an engineering build plan more than a
product prioritization document.

Key critiques:

- Twelve feature areas and eight phases create scope gravity. A PRD needs clear
  not-now boundaries.
- The canvas is overweighted because the prototype contains a lot of code, but
  the canvas is not the product moat.
- The artifact contract is under-merchandised. It should be the organizing
  spine, not one area among many.
- The memory-enrichment return path is missing.
- Cross-origin highlighting could become a deep technical rabbit hole. v0/v1
  should prefer Lumen-owned internal panes.
- Policy approval is mentioned but not defined. Auto-accept behavior is
  trust-critical and should be cut or specified.
- Success criteria are engineering-centric. User-facing success metrics are
  missing.

What the feature map gets right:

- projection versus durable artifact distinction
- public/private boundary
- provider adapter boundary
- minimal static highlighter baseline
- staged surface model

## PRD Refinement Recommendations

1. Add a who/what/instead-of opening.

   Example shape: Lumen Light helps facilitators turn live conversations and
   shared documents into auditable, evidence-linked artifacts instead of raw
   transcripts, screenshots, or unsourced AI summaries.

2. Name the magic moment.

   At session end, the user gets a sourced summary where every decision links
   back to the exact words or text span that produced it.

3. Promote provenance and inspectability to user values.

   These are not just architecture rules. They are trust features.

4. Lead with the review-surface loop.

   v0 should describe a user-completable task, not just schema deliverables.

5. Add user-facing success metrics.

   Suggested metrics:

   - percentage of accepted artifacts with valid evidence references
   - time from session end to usable sourced summary
   - highlight reload/re-anchor success rate
   - acceptance rate of agent proposals
   - percentage of summaries usable without major rewriting

6. Specify or defer the enrichment return path.

   Do not leave a promised round trip undefined.

7. State the data/privacy posture in user terms.

   The public/private repo boundary is clear, but the user-facing PRD should say
   what happens to user transcripts, documents, and artifacts.

8. Keep provider and model specifics out of the user-facing PRD.

   Provider details belong in adapter or operational documentation, not product
   promise.

## Recommended Version Boundaries

### v0: The Loop That Proves The Thesis

Single user. No realtime requirement. No canvas requirement.

Capabilities:

- load a static document or transcript
- highlight manually or through partner/API-created highlights
- re-anchor highlights on reload
- export artifact records
- import previous records
- review accepted decisions, questions, and actions
- validate artifact schema and fixtures

This is the smallest product that is useful and distinctively Lumen.

### v1: Live, Staged, Multi-Pane

Capabilities:

- turn queue ingestion
- model-proposed staged cards and decisions
- accept/reject workflow preserving evidence
- pane and nested-window highlighting with surface, pane, and document identity
- fast projection loop
- slower synthesis loop
- provider adapters behind stable boundaries

Still no need to ship the full spatial whiteboard.

### v2: Spatial Canvas, Rich Objects, And Memory Round Trip

Capabilities:

- componentized whiteboard
- cards, arrows, groups, freehand marks
- layout guard checks
- generated-object slots
- accept/revise/pin/discard workflow
- memory enrichment return path
- NotebookLM-style briefing packets
- plugin/MCP boundaries

## Open Questions

1. What is the first vertical: design critique, user-research synthesis,
   coaching, meeting facilitation, or another use case?
2. Is the intended product local-first, hosted, or bring-your-own-backend?
3. What exactly does a memory system send back into Lumen Light?
4. What is policy approval, and is auto-accept ever allowed?
5. Is v0 single-facilitator or multi-participant?
6. Is OpenReflect the canonical backend or one of several possible consumers?
7. Is the AutoPreso-derived whiteboard a long-term componentization source or a
   study artifact to replace?
8. Who sets confidence, and what should users do with it?

## Suggested User-Facing PRD Outline

1. One-liner and magic moment
2. Problem and target user
3. Product principles
4. Core v0 review-surface loop
5. Artifact and export packet model
6. Trust, privacy, and data posture
7. Roadmap by user capability
8. User-facing success metrics
9. Non-goals
10. Public appendix: contract and architecture
11. Private appendix: runtime/provider/deployment specifics

Keep out of the public PRD:

- specific model IDs
- provider-specific runtime details
- prototype internals
- private transcripts or deployment IDs
- engineering-only acceptance criteria presented as product requirements

## Bottom Line

Lumen Light is a conversation thinking surface whose durable output is
auditable, evidence-linked artifacts.

The PRD should be rebuilt around that promise and a concrete first loop: the
static review surface. The contract is the moat. The canvas is the demo.
