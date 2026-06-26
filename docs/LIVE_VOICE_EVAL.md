# Live Voice Eval Scorecard

Branch: `v0.5-inworld-62426-excalidraw`

Purpose: run one short, honest Inworld/Lumen Light voice check before adding more
provider abstraction or orchestration. The goal is to learn whether this path
actually lowers conversational latency and makes ideas visible in real time.

## Setup

```bash
npm run build
npm run dev
```

Open the printed local URL, click **Start voice session**, and allow microphone
access. Use the live Inworld route, not the offline parser.

Test phrase:

```text
Alice, make this idea visible.
```

Then describe one messy idea for 2-3 minutes. Prefer a real current thought over
a canned demo.

## Scorecard

Use 0-2 for each item.

| Item | 0 | 1 | 2 |
|------|---|---|---|
| Voice feel | robotic, grating, or wrong identity | usable but not yet Alice-like | natural enough to keep talking |
| Turn-taking | interrupts, stalls, or misses turns | occasional awkwardness | smooth enough for back-and-forth |
| Comprehension | misses the core idea | gets parts but needs correction | tracks the actual point |
| Canvas usefulness | drawing distracts or misleads | rough structure appears | diagram makes the idea clearer |
| Tool reliability | no useful tool call or canvas failure | partial draw/capture success | draw/capture loop works cleanly |
| Latency | breaks the conversation | tolerable but noticeable | fast enough to feel collaborative |
| Mitchell load | adds management burden | neutral | reduces explanation/repetition load |

Pass threshold for this branch: at least 10/14 overall, no zero in tool
reliability, and no zero in voice feel.

## Capture

Record:

- date/time
- router id
- voice id
- one-sentence idea tested
- score total and any zeroes
- one thing that felt promising
- one thing that must change before the next run

## Stop Rule

If the voice feels wrong or the canvas fails twice in the same run, stop and
capture the failure. Do not keep tuning live while Mitchell is trying to think.
