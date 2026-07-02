import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { inventoryFromApi } from './inventory/excalidrawAdapter'
import type { BoardInventory } from './inventory/schema'
import { DOC_VIEWER_PATH, readDocInfo } from './docStorage'
import { truncate, hostOf } from '../lib/text'

/**
 * Textual description of what is on the canvas, rendered from the board
 * inventory (ADR-0012). Two consumers:
 *
 * - `summarizeScene` — re-grounding for resumed sessions (BUG-001): when a new
 *   realtime session connects on a non-empty board, the model gets this as
 *   automated context so its understanding and the canvas refer to the same thing.
 * - `describeScene` — the `read_canvas` tool: the same inventory, on demand,
 *   without the resume framing, so the model can re-check the board mid-session.
 *
 * Derived, not stored: we read the live scene on every call, so the summary can
 * never drift from what the user actually sees (unlike a saved transcript). For
 * exact layout the model can still call `capture_canvas`; this is the cheap,
 * always-on baseline.
 */

/** The live board inventory (ADR-0012) — the addressable model behind the text. */
export function sceneInventory(api: ExcalidrawImperativeAPI): BoardInventory {
  // The doc reader is lazy: it only runs if the scene contains the doc window.
  return inventoryFromApi(api, { doc: readDocInfo, docLink: DOC_VIEWER_PATH })
}

/**
 * Plain inventory of the current scene, or `null` if the canvas is empty / has
 * nothing worth describing. No session framing — this is what the `read_canvas`
 * tool returns, and what `summarizeScene` wraps for re-grounding.
 */
export function describeScene(api: ExcalidrawImperativeAPI | null): string | null {
  if (!api) return null
  const inv = sceneInventory(api)

  const shapes = inv.nodes.filter((n) => n.kind === 'shape').length
  const connectors = inv.links.length
  const screenshots = inv.nodes.filter((n) => n.kind === 'screenshot').map((n) => hostOf(n.label))
  const generated = inv.nodes
    .filter((n) => n.kind === 'generated-image')
    .map((n) => truncate(n.label ?? '', 50))
  const untaggedImages = inv.nodes.filter((n) => n.kind === 'image').length
  // Hand-drawn strokes, lines, frames, foreign embeds — everything outside
  // Lumen's own drawing vocabulary. Without this line, a board of only
  // user-drawn content reads as "empty" (BUG-004).
  const other = inv.nodes.filter((n) => n.kind === 'unknown').length
  const doc = inv.nodes.find((n) => n.kind === 'document')

  const parts: string[] = []
  if (shapes) parts.push(`${shapes} shape${shapes > 1 ? 's' : ''}/node${shapes > 1 ? 's' : ''}`)
  if (connectors) parts.push(`${connectors} connector${connectors > 1 ? 's' : ''} (arrows)`)
  if (screenshots.length) {
    const named = screenshots.filter(Boolean)
    parts.push(
      `${screenshots.length} website screenshot${screenshots.length > 1 ? 's' : ''}${
        named.length ? ` (${named.join(', ')})` : ''
      }`,
    )
  }
  if (generated.length) {
    const named = generated.filter(Boolean)
    parts.push(
      `${generated.length} generated image${generated.length > 1 ? 's' : ''}${
        named.length ? ` (${named.map((l) => `"${l}"`).join(', ')})` : ''
      }`,
    )
  }
  if (untaggedImages) parts.push(`${untaggedImages} image${untaggedImages > 1 ? 's' : ''}`)
  if (other) {
    parts.push(
      `${other} other element${other > 1 ? 's' : ''} (e.g. hand-drawn strokes or lines added by the user)`,
    )
  }

  if (doc) {
    const words = doc.tags['source.doc-words']
    parts.push(
      `an open briefing document${doc.label ? ` titled "${truncate(doc.label, 80)}"` : ''}${
        typeof words === 'number' && words ? ` (~${words} words)` : ''
      }`,
    )
  }

  // De-duplicate labels (bound shape labels + free text), cap count + length so
  // the description stays small even on a busy canvas.
  const uniqLabels = [
    ...new Set(
      inv.nodes.filter((n) => n.kind === 'text').map((n) => truncate(n.label ?? '', 60)),
    ),
  ]
    .filter(Boolean)
    .slice(0, 40)

  if (parts.length === 0 && uniqLabels.length === 0) return null

  const lines = [`On the canvas now: ${parts.join(', ') || 'various elements'}.`]
  if (uniqLabels.length) {
    lines.push(`Text and labels present: ${uniqLabels.map((l) => `"${l}"`).join(', ')}.`)
  }
  const hasImages = screenshots.length > 0 || generated.length > 0 || untaggedImages > 0
  lines.push(
    hasImages
      ? 'Some items are images (e.g. website snapshots or generated pictures) whose content you cannot read from this text — if the user asks what an image is or shows, call capture_canvas to actually see the board before answering.'
      : 'To see the exact layout, call capture_canvas.',
  )
  return lines.join('\n')
}

/**
 * Build the grounding message for the current scene, or `null` if the canvas is
 * empty / has nothing worth describing. The string is framed as automated
 * context (the model must not thank the user for it), mirroring the
 * `capture_canvas` convention.
 */
export function summarizeScene(api: ExcalidrawImperativeAPI | null): string | null {
  const description = describeScene(api)
  if (!description) return null
  return [
    '[AUTOMATED CONTEXT — not from the user] You are resuming an existing canvas: the user stopped a previous session and has come back to the same board. The following is already on the canvas. Do NOT thank the user for this or announce it — just use it so you can refer to and build on what is already there.',
    '',
    description,
    'If the user refers to "this", "the diagram", "what we made", etc., they mean the above.',
  ].join('\n')
}
