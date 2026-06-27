import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

/**
 * Re-grounding for resumed sessions (BUG-001). The canvas is the durable artifact
 * that ties a session together; when a new realtime session connects on a
 * non-empty board, we hand the model a compact textual description of what is
 * already on it so its understanding and the canvas refer to the same thing.
 *
 * Derived, not stored: we read the live scene every connect, so the summary can
 * never drift from what the user actually sees (unlike a saved transcript). For
 * exact layout the model can still call `capture_canvas`; this is the cheap,
 * always-on baseline.
 */

const DOC_KEY = 'lumen-doc-v1'

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, ' ').trim()
  return clean.length > n ? `${clean.slice(0, n - 1)}…` : clean
}

/**
 * Build the grounding message for the current scene, or `null` if the canvas is
 * empty / has nothing worth describing. The string is framed as automated
 * context (the model must not thank the user for it), mirroring the
 * `capture_canvas` convention.
 */
export function summarizeScene(api: ExcalidrawImperativeAPI | null): string | null {
  if (!api) return null
  const els = api.getSceneElements().filter((e) => !e.isDeleted)
  if (els.length === 0) return null

  const labels: string[] = []
  let shapes = 0
  let connectors = 0
  let images = 0
  let hasDoc = false

  for (const e of els as Array<{ type: string; text?: string }>) {
    switch (e.type) {
      case 'text':
        if (typeof e.text === 'string' && e.text.trim()) labels.push(e.text)
        break
      case 'rectangle':
      case 'ellipse':
      case 'diamond':
        shapes++
        break
      case 'arrow':
        connectors++
        break
      case 'image':
        images++
        break
      case 'embeddable':
        hasDoc = true
        break
      default:
        break
    }
  }

  const parts: string[] = []
  if (shapes) parts.push(`${shapes} shape${shapes > 1 ? 's' : ''}/node${shapes > 1 ? 's' : ''}`)
  if (connectors) parts.push(`${connectors} connector${connectors > 1 ? 's' : ''} (arrows)`)
  if (images) parts.push(`${images} generated image${images > 1 ? 's' : ''}`)

  if (hasDoc) {
    let title = ''
    let words = 0
    try {
      const raw = localStorage.getItem(DOC_KEY)
      if (raw) {
        const d = JSON.parse(raw) as { title?: string; markdown?: string }
        title = (d.title ?? '').trim()
        words = d.markdown ? d.markdown.trim().split(/\s+/).filter(Boolean).length : 0
      }
    } catch {
      /* doc summary is best-effort */
    }
    parts.push(
      `an open briefing document${title ? ` titled "${truncate(title, 80)}"` : ''}${
        words ? ` (~${words} words)` : ''
      }`,
    )
  }

  // De-duplicate labels (bound shape labels + free text), cap count + length so
  // the grounding stays small even on a busy canvas.
  const uniqLabels = [...new Set(labels.map((l) => truncate(l, 60)))].filter(Boolean).slice(0, 40)

  if (parts.length === 0 && uniqLabels.length === 0) return null

  const lines = [
    '[AUTOMATED CONTEXT — not from the user] You are resuming an existing canvas: the user stopped a previous session and has come back to the same board. The following is already on the canvas. Do NOT thank the user for this or announce it — just use it so you can refer to and build on what is already there.',
    '',
    `On the canvas now: ${parts.join(', ') || 'various elements'}.`,
  ]
  if (uniqLabels.length) {
    lines.push(`Text and labels present: ${uniqLabels.map((l) => `"${l}"`).join(', ')}.`)
  }
  lines.push(
    'If the user refers to "this", "the diagram", "what we made", etc., they mean the above. To see the exact layout, call capture_canvas.',
  )
  return lines.join('\n')
}
