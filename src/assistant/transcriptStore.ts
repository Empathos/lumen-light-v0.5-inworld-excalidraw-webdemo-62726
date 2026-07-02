import type { ConversationEntry } from './types'
import { truncate } from '../lib/text'

/**
 * localStorage persistence + recap for the conversation transcript (BUG-001,
 * gap #2). The canvas grounds the model in *what is on the board*
 * ([summarizeScene](../canvas/summarizeScene.ts)); this grounds it in *what was
 * said*. Unlike the canvas there is no live artifact to re-derive the dialogue
 * from, so the transcript must be stored — see
 * [ADR-0010](../../docs/decisions/ADR-0010-persist-conversation-transcript.md).
 */

const TRANSCRIPT_KEY = 'lumen-transcript-v1'
// Cap what we keep so storage can't grow unbounded across long-lived canvases.
const MAX_STORED = 200
// How many recent turns to replay into a resumed session, and per-line length.
const RECAP_TURNS = 12
const MAX_LINE = 240

export function loadTranscript(): ConversationEntry[] {
  try {
    const raw = localStorage.getItem(TRANSCRIPT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is ConversationEntry =>
        !!e &&
        typeof e === 'object' &&
        ((e as ConversationEntry).role === 'user' || (e as ConversationEntry).role === 'assistant') &&
        typeof (e as ConversationEntry).text === 'string',
    )
  } catch {
    return []
  }
}

export function saveTranscript(entries: ConversationEntry[]): void {
  try {
    localStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(entries.slice(-MAX_STORED)))
  } catch {
    /* quota exceeded / storage disabled — non-fatal, continuity just won't persist */
  }
}

/**
 * A compact recap of recent dialogue to inject as silent context on session
 * start, or `null` if there is nothing worth replaying. Bracketed system/error
 * lines (e.g. `[error] ...`) are dropped so only real conversation is recapped.
 */
export function summarizeTranscript(entries: ConversationEntry[]): string | null {
  const real = entries.filter((e) => e.text.trim() && !e.text.trim().startsWith('['))
  if (real.length === 0) return null
  const recent = real.slice(-RECAP_TURNS)
  const omitted = real.length - recent.length
  const lines = recent.map(
    (e) => `${e.role === 'user' ? 'User' : 'You'}: ${truncate(e.text, MAX_LINE)}`,
  )
  const header =
    '[AUTOMATED CONTEXT — not from the user] Recap of your earlier conversation on this canvas (most recent last)' +
    (omitted > 0 ? `, ${omitted} earlier turn(s) omitted` : '') +
    '. Continue naturally — do not re-greet the user or read this back.'
  return [header, '', ...lines].join('\n')
}
