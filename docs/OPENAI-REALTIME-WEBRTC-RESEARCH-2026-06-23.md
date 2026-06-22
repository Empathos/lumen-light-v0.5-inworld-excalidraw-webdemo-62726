# OpenAI Realtime WebRTC Research

Prepared: 2026-06-23

Purpose: verify whether OpenAI Realtime 2 supports the voice-briefer product
direction for Lumen Light, and distinguish official API capability from what
the local prototype currently implements.

## Short Answer

Yes. OpenAI Realtime 2 supports direct speech-to-speech voice-agent sessions.
The official docs describe `gpt-realtime-2`, WebRTC browser connections,
ephemeral client secrets, live audio input/output, interruption/barge-in,
realtime tools, and voice output configuration.

This means the Lumen Light product thesis is correct to treat voice as a real
part of the OpenAI Realtime path, not merely as separate speech-to-text plus
text-to-speech plumbing.

However, the current local whiteboard prototype does not yet implement that
full speech-to-speech briefer path. It uses OpenAI Realtime in transcription
mode over WebSocket, turns user microphone audio into text, then sends that text
to a separate text agent that drives Excalidraw. The prototype proves a useful
piece of the loop, but not the final live spoken briefer.

## Official OpenAI Findings

### 1. Realtime WebRTC Is The Recommended Browser Transport

The OpenAI Realtime WebRTC guide says the Realtime API supports connecting to
realtime models through a WebRTC peer connection, and recommends WebRTC over
WebSockets when connecting from a browser or mobile client for more consistent
performance.

Source:
https://developers.openai.com/api/docs/guides/realtime-webrtc

Relevant official points:

- WebRTC is the lower-level browser transport for realtime model connections.
- Browser-based speech-to-speech applications are directed toward the Voice
  agents guide as the higher-level starting point.
- The WebRTC flow can use either a unified server-mediated interface or
  ephemeral client secrets minted by the developer's server.

Product implication for Lumen Light:

- Browser-based spoken briefing should use WebRTC, not a server-relayed
  microphone WebSocket, when we want the final low-latency voice experience.
- The server still needs a small trusted endpoint to create the session or mint
  ephemeral credentials. The browser should not hold a standard OpenAI API key.

### 2. Realtime 2 Supports Voice Output

The WebRTC guide's ephemeral token example configures a realtime session using
`model: "gpt-realtime-2"` and an `audio.output.voice` value. That is direct
evidence that the Realtime 2 path supports voice output as part of the session
configuration.

Source:
https://developers.openai.com/api/docs/guides/realtime-webrtc

Relevant official shape:

```json
{
  "session": {
    "type": "realtime",
    "model": "gpt-realtime-2",
    "audio": {
      "output": {
        "voice": "marin"
      }
    }
  }
}
```

Product implication for Lumen Light:

- "The agent speaks" is not speculative. The current OpenAI Realtime 2 API path
  supports spoken model output.
- The briefer role can be implemented as a live audio session, not only as text
  chat plus later text-to-speech.

### 3. Voice Agents Can Be Speech-To-Speech Or Chained Pipelines

The OpenAI Voice agents guide describes two architectures:

- speech-to-speech sessions, where the model handles live audio input and
  output directly
- chained voice pipelines, where the app explicitly manages speech-to-text,
  text reasoning, and text-to-speech

For TypeScript browser voice assistants, the docs identify `RealtimeAgent` and
`RealtimeSession` as the fastest path. The browser flow is: server creates an
ephemeral client secret, frontend creates a realtime session, the session
connects over WebRTC or WebSocket, and the agent handles audio turns, tools,
interruptions, and handoffs inside the session.

Source:
https://developers.openai.com/api/docs/guides/voice-agents

Product implication for Lumen Light:

- The final Lumen Light briefer should likely be modeled as a realtime voice
  agent, not just as a transcription service feeding a text model.
- The docs also preserve a second legitimate architecture: a chained pipeline.
  That may still be useful for deterministic approval-heavy flows, but it is
  not the only available path.

### 4. Realtime Voice Agents Can Use Tools

The Realtime tools guide says realtime voice agents can call function tools,
remote MCP servers, and connectors during live conversation. Function tools are
the default when the application owns business logic, approval checks, or
private system access. Tool configuration can be attached at the session level
or for a single response, and the same event surface works through a WebRTC data
channel or WebSocket.

Source:
https://developers.openai.com/api/docs/guides/realtime-mcp

Product implication for Lumen Light:

- A realtime briefer can call Lumen-owned tools such as:
  - `highlight_source_span`
  - `focus_source_span`
  - `create_staged_artifact`
  - `update_whiteboard_projection`
  - `request_human_approval`
  - `export_packet_preview`
- Lumen should use function tools for the core product loop, because the app
  needs to own provenance, approval checks, and artifact writes.
- This strengthens the "agent points while speaking" product idea. The agent's
  speech, source highlighting, and staged artifact creation can be coordinated
  through Realtime session events and function tools.

## Local Repo Findings

### 1. The Prototype Uses OpenAI Realtime Transcription, Not Speech-To-Speech

Current file:
`prototypes/lumen-light-whiteboard-prototype/src/openai-transcription.js`

The prototype connects to:

```text
wss://api.openai.com/v1/realtime?intent=transcription
```

It creates a transcription session with audio input settings and a
transcription model, appends microphone audio with `input_audio_buffer.append`,
and handles transcript delta/completion events:

- `conversation.item.input_audio_transcription.delta`
- `conversation.item.input_audio_transcription.completed`

This is a realtime transcription path. It is not the full voice-agent path where
`gpt-realtime-2` receives live audio and returns live spoken audio.

### 2. The Browser Captures Microphone Audio And Sends It To The Server

Current file:
`prototypes/lumen-light-whiteboard-prototype/public/app.js`

The browser calls `navigator.mediaDevices.getUserMedia({ audio: ... })`, creates
an audio streamer, and sends base64 audio frames over the app's own WebSocket:

```text
{ type: "audio", sessionId, audio }
```

The server then forwards frames to the active transcription provider.

Current file:
`prototypes/lumen-light-whiteboard-prototype/src/server.js`

Relevant behavior:

- `audio:start` sets the active audio session.
- `audio` messages are forwarded to `transcription.sendAudio(...)` while the
  app is in live mode.
- `stop` calls `transcription.stop()`.

This is different from the official browser WebRTC shape, where the browser
establishes a WebRTC peer connection with the Realtime API using an ephemeral
credential.

### 3. The Whiteboard Agent Is A Separate Text Agent

Current file:
`prototypes/lumen-light-whiteboard-prototype/src/agent-provider.js`

The whiteboard agent provider uses the OpenAI-compatible text model path through
`@ai-sdk/openai`. It defaults to `gpt-5.5` for the agent provider. That is
separate from the realtime transcription model.

So the current prototype loop is:

```text
browser microphone
  -> app WebSocket
  -> OpenAI Realtime transcription
  -> transcript queue
  -> text whiteboard agent
  -> Excalidraw operations
```

The target voice-briefer loop is closer to:

```text
browser microphone/speaker over WebRTC
  -> OpenAI Realtime voice session using gpt-realtime-2
  -> spoken agent response
  -> realtime function/tool calls into Lumen
  -> source highlight, artifact staging, whiteboard projection
  -> transcript/provenance capture
```

## Correction To The PM Evaluation

The PM evaluation was right about the local prototype: it does not currently
implement a speaking briefer. It uses realtime transcription plus a separate
text agent.

But the PM evaluation should be read narrowly. It should not imply that OpenAI
Realtime itself lacks the voice capability. Official OpenAI docs show that
Realtime 2 supports the voice-agent architecture Lumen wants.

Corrected interpretation:

- The API supports the briefer vision.
- The repo has a partial Realtime integration, but it is the transcription path.
- The build gap is not "invent voice"; it is "replace or augment the current
  transcription-only path with a realtime voice-agent session and Lumen tool
  bindings."

## Product Implications

OpenAI Realtime voice should remain part of the core product direction. The
question is sequencing, not feasibility.

The grounded text loop is still important because Lumen's moat is provenance:
source spans, agent interpretation, human approval, staged artifacts, accepted
artifacts, and export packets. But the Realtime voice path can now be framed
more confidently:

- MVP/prototype should prove the same artifact/provenance loop in text first if
  speed and inspectability matter.
- The first major modality upgrade should be a `gpt-realtime-2` voice-agent
  session over WebRTC.
- The voice agent should use Lumen function tools rather than directly mutating
  canvas state.
- Tool calls should create structured, reviewable events:
  - active source highlight
  - source-span focus
  - proposed artifact
  - proposed visual projection
  - approval request
- Spoken turns and tool calls should be captured as provenance so the export
  packet can distinguish:
  - what the source says
  - what the agent said or inferred
  - what the human accepted

## Recommended Build Adjustment

Keep the PM evaluation's sequencing discipline, but update the wording:

Old risk framing:

> Voice is the most compelling part of the vision and the least built part of
> the repo. It earns its place on top of a working loop, not underneath an empty
> one.

Refined framing:

> OpenAI Realtime 2 already provides the speech-to-speech voice-agent substrate.
> The local repo currently uses only the transcription slice of that substrate.
> Lumen should build the provenance loop first enough that voice has something
> durable to control, then integrate `gpt-realtime-2` as a briefer that speaks
> and calls Lumen tools for highlighting, staging, and whiteboard projection.

## Suggested Next Architecture Spike

Add a focused spike after the text/provenance loop is stable enough to receive
tool calls:

1. Add a server endpoint that creates a `gpt-realtime-2` session or ephemeral
   client secret using a standard OpenAI API key on the server.
2. Add a browser WebRTC client that connects with an ephemeral credential.
3. Configure audio output voice for the briefer.
4. Attach function tools for:
   - source span focus/highlight
   - staged artifact creation
   - whiteboard projection proposal
5. Capture realtime events into the same provenance/event model used by the
   text loop.
6. Verify barge-in/interruption behavior.
7. Verify that tool calls are reviewable and cannot silently write accepted
   artifacts without human approval.

## Sources

Official OpenAI docs:

- Realtime API with WebRTC:
  https://developers.openai.com/api/docs/guides/realtime-webrtc
- Voice agents:
  https://developers.openai.com/api/docs/guides/voice-agents
- Realtime with tools:
  https://developers.openai.com/api/docs/guides/realtime-mcp
- Realtime and audio overview:
  https://developers.openai.com/api/docs/guides/realtime

Local repo evidence:

- `prototypes/lumen-light-whiteboard-prototype/src/openai-transcription.js`
- `prototypes/lumen-light-whiteboard-prototype/public/app.js`
- `prototypes/lumen-light-whiteboard-prototype/src/server.js`
- `prototypes/lumen-light-whiteboard-prototype/src/agent-provider.js`
- `prototypes/lumen-light-whiteboard-prototype/README.md`
