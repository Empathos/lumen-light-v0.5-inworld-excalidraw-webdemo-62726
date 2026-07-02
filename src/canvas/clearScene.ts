import { serializeAsJSON } from '@excalidraw/excalidraw'
import type { BinaryFiles, ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { DOC_STORAGE_KEY as DOC_KEY } from './docStorage'

/**
 * Full-board clear for the `clear_canvas` tool (BUG-003), with an undo
 * snapshot. Clearing is destructive on a persisted scene (there is no scene
 * undo across a wipe), so before wiping we stash the whole board — elements,
 * binary files, and the briefing document — to dedicated localStorage keys the
 * tool can restore from. One slot, overwritten by each clear: this is a safety
 * net, not a history. The Excalidraw-Library save-before-clear (user-visible
 * stash) is the deferred Tier-3 upgrade.
 */

const SCENE_UNDO_KEY = 'lumen-scene-undo-v1'
const DOC_UNDO_KEY = 'lumen-doc-undo-v1'

/** Stash the current scene + document to the undo keys. Best-effort. */
export function snapshotBeforeClear(api: ExcalidrawImperativeAPI): boolean {
  try {
    const elements = api.getSceneElements()
    localStorage.setItem(
      SCENE_UNDO_KEY,
      serializeAsJSON(elements, api.getAppState(), api.getFiles(), 'local'),
    )
    const doc = localStorage.getItem(DOC_KEY)
    if (doc) localStorage.setItem(DOC_UNDO_KEY, doc)
    else localStorage.removeItem(DOC_UNDO_KEY)
    return true
  } catch {
    return false
  }
}

/** Remove every element from the board. Returns how many were removed. */
export function wipeBoard(api: ExcalidrawImperativeAPI): number {
  const count = api.getSceneElements().filter((e) => !e.isDeleted).length
  api.updateScene({ elements: [] })
  return count
}

/**
 * Bring back the board stashed by the last clear. Restores elements + files to
 * the live scene and the document payload to its normal persistence key (the
 * caller rehydrates the doc window). Returns what was restored.
 */
export function restoreLastClear(
  api: ExcalidrawImperativeAPI,
): { ok: true; restored: number } | { ok: false; error: string } {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(SCENE_UNDO_KEY)
  } catch {
    /* fall through to the no-snapshot error */
  }
  if (!raw) return { ok: false, error: 'nothing to restore — no snapshot from a previous clear' }
  try {
    const parsed = JSON.parse(raw) as { elements?: ExcalidrawElement[]; files?: BinaryFiles }
    const elements = Array.isArray(parsed.elements) ? parsed.elements : []
    const files = parsed.files ?? {}
    const fileList = Object.values(files)
    if (fileList.length) api.addFiles(fileList)
    api.updateScene({ elements })
    const doc = localStorage.getItem(DOC_UNDO_KEY)
    if (doc) localStorage.setItem(DOC_KEY, doc)
    return { ok: true, restored: elements.filter((e) => !e.isDeleted).length }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
