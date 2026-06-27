# Live Voice Eval Scorecard

Branch: `v0.5-inworld-62426`

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
| Voice feel 2 | robotic, grating, or wrong identity 0 | usable but not yet Alice-like 0 | natural enough to keep talking 2 |
| Turn-taking 2 | interrupts, stalls, or misses turns 2 | occasional awkwardness 1 | smooth enough for back-and-forth 2|
| Comprehension 2 | misses the core idea 0 | gets parts but needs correction 1 | tracks the actual point 1 |
| Canvas usefulness 2 | drawing distracts or misleads 0 | rough structure appears 1 | diagram makes the idea clearer 2 |
| Tool reliability | no useful tool call or canvas failure 0 | partial draw/capture success 0| draw/capture loop works cleanly 2 |
| Latency 1 | breaks the conversation 1 | tolerable but noticeable 1 | fast enough to feel collaborative 2|
| Mitchell load | adds management burden 1 | neutral 0 | reduces explanation/repetition load 1 |

Pass threshold for this branch: at least 10/14 overall, no zero in tool
reliability, and no zero in voice feel.

## Capture

Record:
( I want to get Alice direct api access to inworld; for monitoring)
- date/time 62626
- router id
- voice id
- one-sentence idea tested
- score total and any zeroes
- one thing that felt promising
- one thing that must change before the next run

## Stop Rule

If the voice feels wrong or the canvas fails twice in the same run, stop and
capture the failure. Do not keep tuning live while Mitchell is trying to think.
