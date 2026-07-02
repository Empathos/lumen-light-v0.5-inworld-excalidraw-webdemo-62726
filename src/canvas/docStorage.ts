/**
 * Shared constants + reader for the briefing document's persistence. Kept
 * dependency-free so the inventory/summarizer side can use them without
 * pulling docWindow's Excalidraw runtime imports (which would break node-side
 * unit tests and widen the module graph).
 */

export const DOC_STORAGE_KEY = 'lumen-doc-v1'

/** The doc viewer's path — an embeddable whose link contains this IS the doc window. */
export const DOC_VIEWER_PATH = '/embed/doc.html'

export interface DocInfo {
  title?: string
  words?: number
}

/** Read the persisted briefing document's title + word count, if any. Best-effort. */
export function readDocInfo(): DocInfo {
  try {
    const raw = localStorage.getItem(DOC_STORAGE_KEY)
    if (!raw) return {}
    const d = JSON.parse(raw) as { title?: string; markdown?: string }
    return {
      title: (d.title ?? '').trim() || undefined,
      words: d.markdown ? d.markdown.trim().split(/\s+/).filter(Boolean).length : undefined,
    }
  } catch {
    return {}
  }
}
