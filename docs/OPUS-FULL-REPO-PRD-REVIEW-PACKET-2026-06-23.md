# Opus Full Repo PRD Review Packet

Prepared: 2026-06-23

Purpose: ask Claude Code Opus 4.8 to review the entire Lumen Light repository
after the PRD was updated to combine the product framing, PM evaluation, and
OpenAI Realtime/WebRTC research.

## What Changed

The PRD now combines four previously separate threads:

1. Lumen Light is a provenance-preserving artifact system.
2. Lumen Light is also a multimodal human-agent interaction surface.
3. The agent should act as a briefer/presenter who explains, points,
   highlights, stages artifacts, and eventually speaks.
4. OpenAI Realtime 2 supports the intended speech-to-speech briefer path, but
   the local repo currently implements only the transcription slice.

The updated user-facing PRD is:

- `docs/PRD.md`

The supporting evidence is:

- `docs/PRD-REFINEMENT-ANALYSIS-2026-06-22.md`
- `docs/OPUS-PRD-SECOND-PASS-BRIEF-2026-06-22.md`
- `docs/PM-PRODUCT-EVALUATION-2026-06-22.md`
- `docs/OPENAI-REALTIME-WEBRTC-RESEARCH-2026-06-23.md`
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

The durable output is an evidence-linked export packet, not raw transcript,
canvas JSON, or a screenshot.

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

## Questions For Opus

Please perform a high-effort product and repo review. Read the entire repo,
not only the PRD.

Assess:

1. Is the updated `docs/PRD.md` now clear enough as a user-facing PRD?
2. Does it answer who opens this on Monday, to do what, instead of what?
3. Does it preserve the artifact/provenance moat while properly emphasizing
   the multimodal interaction surface?
4. Does it handle OpenAI Realtime voice correctly, given the official docs and
   the local repo gap?
5. Is the build sequence right: owned grounded text loop, then realtime voice
   briefer, then productized visual surface, then live capture?
6. What features are now mandatory for the MVP?
7. What should remain explicitly not-now?
8. What parts of the repo contradict or obscure the updated PRD?
9. What docs, schemas, examples, tests, or code should change next?
10. What would you write as the clearest next-build plan?

## Desired Output

Return a product-manager-grade review with:

- concise verdict
- strongest product POV
- PRD critique
- MVP feature list
- not-now list
- repo reality check
- OpenAI Realtime/WebRTC integration assessment
- next build sequence
- concrete file-level recommendations
- any disagreement with the current framing

Be direct. If the PRD is still too broad, say exactly where. If the voice path
should move earlier or later, explain why. If the artifact contract should
remain the front door, explain how to do that without losing the briefer
experience.
