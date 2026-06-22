# Opus Full Repo Implementation Review Packet

Prepared: 2026-06-23

Purpose: ask Claude Code Opus 4.8 to review the entire Lumen Light repository
as an implementation planner. The desired output is a codeable build sequence,
not another philosophical product critique.

## Review Mode

This review must stay actionable.

Do not re-center the analysis on whether provenance is the moat. Treat source
linkage, provenance, and approval state as implementation requirements inside
the data model. The product experience being built is a multimodal
human-agent briefing surface: source pane, agent chat/briefing, synchronized
highlights, staged review artifacts, optional whiteboard projection, and later
OpenAI Realtime voice.

The reviewer should answer:

- What should be coded first?
- Which files should change?
- What tests prove the slice works?
- What should be deferred?
- What is the first PR?

## What Changed

The PRD now combines four previously separate threads:

1. Lumen Light is a multimodal human-agent interaction surface.
2. The agent should act as a briefer/presenter who explains, points,
   highlights, stages artifacts, and eventually speaks.
3. Source linkage and human approval are required trust mechanics underneath
   the experience.
4. OpenAI Realtime 2 supports the intended speech-to-speech briefer path, but
   the local repo currently implements only the transcription slice.

The updated user-facing PRD is:

- `docs/PRD.md`

The supporting evidence is:

- `docs/PRD-REFINEMENT-ANALYSIS-2026-06-22.md`
- `docs/OPUS-PRD-SECOND-PASS-BRIEF-2026-06-22.md`
- `docs/PM-PRODUCT-EVALUATION-2026-06-22.md`
- `docs/OPENAI-REALTIME-WEBRTC-RESEARCH-2026-06-23.md`
- `docs/IMPLEMENTATION-BUILD-PLAN-2026-06-23.md`
- `docs/FEATURE-MAP.md`
- `docs/CONVERSATION-SURFACE-MODEL.md`
- `ROADMAP.md`
- `README.md`

## Current Product POV

Lumen Light is a grounded briefing surface where a human and an AI agent work
through source material together. The agent discusses the material, highlights
the source passages it is referring to, proposes structured artifacts, and
uses a visual surface when helpful. The human can inspect, correct, accept,
reject, or edit proposed artifacts before they become durable.

The product's trust mechanism is tri-state visibility:

1. what the source literally says
2. what the agent is inferring or explaining
3. what the human has accepted as durable

The durable output is an evidence-linked export packet, but that should be
treated as the output of the user experience, not as the front-door story.

## OpenAI Realtime Correction

The previous PM evaluation was directionally right about the repo but too easy
to misread as skepticism about OpenAI Realtime voice capability.

Corrected view:

- Official OpenAI docs support browser WebRTC sessions with `gpt-realtime-2`,
  voice output, ephemeral client credentials, realtime tools, and
  interruption/barge-in behavior.
- The current local prototype uses OpenAI Realtime for transcription only.
- The target voice-briefer path is a `gpt-realtime-2` WebRTC session that can
  speak and call Lumen tools for highlighting, staging, and visual projection.
- Voice should be part of the core product direction, but it should connect to
  a provenance/staging loop that is stable enough to receive tool calls.

## Implementation Questions For Opus

Please perform a high-effort implementation review. Read the entire repo, not
only the PRD. Stay in coding-planner mode.

Assess:

1. Is `docs/IMPLEMENTATION-BUILD-PLAN-2026-06-23.md` the right first build
   sequence?
2. What is the smallest first PR that makes Lumen Light testable locally?
3. Which existing files should that PR modify or add?
4. What exact tests should be written for that PR?
5. Which current code can be reused from `src/static-highlighter/`?
6. Which current code can be reused from the Excalidraw prototype, and which
   parts should stay out of the critical path?
7. What schema changes are necessary for the first testable slice, without
   turning the work into schema-first architecture drift?
8. Where should the agent-briefing adapter live?
9. What should be deferred until after the first local browser demo works?
10. What would you implement first if you were coding this repo tomorrow?

## Desired Output

Return an engineering/product build memo with:

- concise verdict
- first PR recommendation
- ordered implementation checklist
- file-level change list
- test plan
- MVP slice definition
- not-now list
- repo reality check
- OpenAI Realtime/WebRTC sequencing
- risks that would block a local test
- any disagreement with the implementation plan

Be direct. Do not produce another abstract thesis review. End with a concrete
"next 10 commits" plan.
