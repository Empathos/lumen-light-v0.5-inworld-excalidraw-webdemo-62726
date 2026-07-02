import { convertToExcalidrawElements, getCommonBounds } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { renderMarkdownDoc, type DocSection } from './markdownDoc'
import { DOC_STORAGE_KEY as DOC_KEY, DOC_VIEWER_PATH as VIEWER_PATH } from './docStorage'

/**
 * The "document briefing" window: a same-origin viewer (`/embed/doc.html`)
 * rendered inside an Excalidraw embeddable, which the assistant can populate and
 * highlight through while it talks.
 *
 * The original Lumen drove an external page over CDP to highlight it. Because we
 * render the document ourselves, we own the DOM and can highlight with plain
 * postMessage — no CDP/extension/proxy needed. The window is a durable canvas
 * object (NOT tagged as the assistant's redraw projection), so draw_canvas /
 * draw_flow won't erase it.
 */

const CH = 'lumen-doc'
const DOC_W = 440
const DOC_H = 600

type Outbound =
  | { type: 'set'; title?: string; html: string; markdown: string }
  | { type: 'highlight'; blockId?: string; text?: string }
  | { type: 'clear' }

let viewerWin: Window | null = null
let pendingDoc: { title?: string; html: string; markdown: string } | null = null
let highlightQueue: Outbound[] = []
let embeddableId: string | null = null
let listening = false

// Canonical document state lives here (parent owns the Markdown renderer). The
// viewer can be edited/pasted into; on edit it sends Markdown back and we
// re-render + restore this so the assistant can read the latest via read_document.
let latestTitle: string | undefined
let latestMarkdown = ''
let latestSections: DocSection[] = []
let latestBlockCount = 0
let hydrated = false

function send(win: Window, msg: Outbound) {
  win.postMessage({ source: CH, ...msg }, '*')
}

function persist() {
  try {
    if (latestMarkdown.trim()) {
      localStorage.setItem(DOC_KEY, JSON.stringify({ title: latestTitle, markdown: latestMarkdown }))
    } else {
      localStorage.removeItem(DOC_KEY)
    }
  } catch {
    // non-fatal
  }
}

function applyMarkdown(markdown: string, title: string | undefined) {
  const { html, sections, blockCount } = renderMarkdownDoc(markdown)
  latestTitle = title
  latestMarkdown = markdown
  latestSections = sections
  latestBlockCount = blockCount
  pendingDoc = { title, html, markdown }
  persist()
  return { html, sections, blockCount }
}

/** Restore persisted doc content (markdown/title) into memory + pendingDoc. */
function hydrateFromStorage() {
  if (hydrated) return
  hydrated = true
  try {
    const raw = localStorage.getItem(DOC_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { title?: string; markdown?: string }
    if (parsed && typeof parsed.markdown === 'string' && parsed.markdown.trim()) {
      const { html, sections, blockCount } = renderMarkdownDoc(parsed.markdown)
      latestTitle = parsed.title
      latestMarkdown = parsed.markdown
      latestSections = sections
      latestBlockCount = blockCount
      pendingDoc = { title: parsed.title, html, markdown: parsed.markdown }
    }
  } catch {
    // non-fatal
  }
}

/**
 * Called once the canvas is ready. Re-binds to a restored embeddable window (if
 * the scene was persisted) and rehydrates its content, so a refresh/back keeps
 * the briefing window populated. The viewer re-announces `ready` until it gets
 * its content, so timing between iframe load and this call doesn't matter.
 */
export function initDocWindow(api: ExcalidrawImperativeAPI): void {
  ensureListener()
  hydrateFromStorage()
  const url = viewerUrl()
  const found = api
    .getSceneElements()
    .find(
      (el) =>
        !el.isDeleted &&
        (el as { type?: string }).type === 'embeddable' &&
        (el as { link?: string | null }).link === url,
    )
  if (found) {
    embeddableId = found.id
    // Excalidraw only mounts an embeddable's iframe when it's in the viewport.
    // After a restore the saved scroll may not include it, so nudge it into
    // view to guarantee the window remounts and repopulates.
    try {
      api.scrollToContent([found], { fitToContent: true, animate: false })
    } catch {
      // non-fatal
    }
  }
}

/**
 * Wipe the document state — memory, persistence, and the viewer if mounted.
 * Used by clear_canvas (the embeddable element itself is removed with the
 * scene; this clears the content that would otherwise rehydrate into it).
 */
export function clearDocument(): void {
  latestTitle = undefined
  latestMarkdown = ''
  latestSections = []
  latestBlockCount = 0
  pendingDoc = null
  embeddableId = null
  try {
    localStorage.removeItem(DOC_KEY)
  } catch {
    // non-fatal
  }
  if (viewerWin) send(viewerWin, { type: 'clear' })
}

/**
 * Re-read persisted doc content after an external restore (undo of a clear)
 * put a payload back under DOC_KEY, and re-bind to the restored embeddable.
 */
export function rehydrateDocument(api: ExcalidrawImperativeAPI): void {
  hydrated = false
  initDocWindow(api)
}

function ensureListener() {
  if (listening) return
  listening = true
  window.addEventListener('message', (e: MessageEvent) => {
    const d = e.data as { source?: string; type?: string; markdown?: string; title?: string } | null
    if (!d || d.source !== CH) return
    if (d.type === 'ready') {
      viewerWin = e.source as Window | null
      if (!viewerWin) return
      if (pendingDoc) send(viewerWin, { type: 'set', ...pendingDoc })
      else send(viewerWin, { type: 'set', title: latestTitle, html: '', markdown: '' })
      for (const q of highlightQueue) send(viewerWin, q)
      highlightQueue = []
    } else if (d.type === 'edit') {
      // The user edited/pasted in the window — re-render and echo back.
      const { html } = applyMarkdown(d.markdown ?? '', d.title ?? latestTitle)
      const target = (e.source as Window | null) ?? viewerWin
      if (target) send(target, { type: 'set', title: latestTitle, html, markdown: latestMarkdown })
    }
  })
}

function viewerUrl(): string {
  return new URL(VIEWER_PATH, window.location.origin).href
}

function createEmbeddable(api: ExcalidrawImperativeAPI): string {
  const existing = api.getSceneElements()
  let x = 120
  let y = 120
  if (existing.length) {
    const [, minY, maxX] = getCommonBounds(existing)
    x = maxX + 60
    y = minY
  }

  // Embeddables aren't default-filled by convertToExcalidrawElements, so build a
  // fully-formed rectangle and re-tag it as an embeddable pointing at the viewer.
  const [base] = convertToExcalidrawElements([
    { type: 'rectangle', x, y, width: DOC_W, height: DOC_H },
  ])
  const el = { ...base, type: 'embeddable', link: viewerUrl() } as unknown as ExcalidrawElement

  api.updateScene({ elements: [...existing, el] })
  api.scrollToContent([el], { fitToContent: true, animate: true, duration: 250 })
  return el.id
}

function embeddableAlive(api: ExcalidrawImperativeAPI): boolean {
  if (!embeddableId) return false
  return api
    .getSceneElements()
    .some((el) => el.id === embeddableId && !el.isDeleted)
}

export interface OpenDocResult {
  ok: true
  title?: string
  blockCount: number
  sections: DocSection[]
}

export function openDocument(
  api: ExcalidrawImperativeAPI,
  args: { title?: string; markdown: string },
): OpenDocResult {
  ensureListener()
  const { sections, blockCount } = applyMarkdown(args.markdown, args.title)

  if (!embeddableAlive(api)) {
    embeddableId = createEmbeddable(api)
    // viewer will request content via its `ready` message once it loads
  } else if (viewerWin && pendingDoc) {
    send(viewerWin, { type: 'set', ...pendingDoc })
  }

  return { ok: true, title: args.title, blockCount, sections }
}

/**
 * Turn a text object the user pasted/typed on the canvas into the briefing
 * document. Prefers the current selection; otherwise falls back to the largest
 * standalone text block (the most likely "pasted document"). Diagram labels
 * (text bound to a container) are ignored.
 */
export function briefFromCanvas(
  api: ExcalidrawImperativeAPI,
  args?: { title?: string },
): OpenDocResult | { ok: false; error: string } {
  type TextEl = { id: string; y: number; text: string; containerId?: string | null }
  const texts = (api.getSceneElements() as unknown as Array<ExcalidrawElement & TextEl>).filter(
    (e) =>
      !e.isDeleted &&
      e.type === 'text' &&
      !e.containerId &&
      typeof e.text === 'string' &&
      e.text.trim().length > 0,
  )

  if (texts.length === 0) {
    return { ok: false, error: 'no pasted text found on the canvas — paste or type some text first' }
  }

  const selected = api.getAppState().selectedElementIds ?? {}
  let chosen = texts.filter((e) => selected[e.id])
  if (chosen.length === 0) {
    chosen = [texts.reduce((a, b) => (b.text.length > a.text.length ? b : a))]
  }
  chosen = [...chosen].sort((a, b) => a.y - b.y)

  const markdown = chosen
    .map((e) => e.text)
    .join('\n\n')
    .trim()
  if (!markdown) return { ok: false, error: 'the selected text is empty' }

  return openDocument(api, { title: args?.title, markdown })
}

export function getDocument(): {
  ok: boolean
  title?: string
  markdown: string
  sections: DocSection[]
  blockCount: number
  error?: string
} {
  if (!latestMarkdown.trim()) {
    return { ok: false, markdown: '', sections: [], blockCount: 0, error: 'no document open' }
  }
  return {
    ok: true,
    title: latestTitle,
    markdown: latestMarkdown,
    sections: latestSections,
    blockCount: latestBlockCount,
  }
}

export function highlightPassage(args: {
  section?: string
  text?: string
  clear?: boolean
}): { ok: boolean; error?: string } {
  ensureListener()
  const msg: Outbound = args.clear
    ? { type: 'clear' }
    : { type: 'highlight', blockId: args.section, text: args.text }

  if (!args.clear && !args.section && !args.text) {
    return { ok: false, error: 'provide section, text, or clear' }
  }

  if (viewerWin) send(viewerWin, msg)
  else highlightQueue.push(msg)
  return { ok: true }
}
