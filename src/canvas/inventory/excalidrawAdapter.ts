import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { LumenImageMeta } from '../addImage'
import type { BoardInventory, BoardLink, BoardNode, Tags } from './schema'

/**
 * The Excalidraw adapter — the ONLY file that may import Excalidraw types
 * (ADR-0012). It derives a BoardInventory from scene elements (derived, not
 * stored — same principle as the grounding, so it can never drift from what
 * the user sees) and is the sole reader/writer of on-element tags.
 *
 * Tags live at customData.lumenTags so they persist with the scene through
 * lumen-scene-v1, undo, and copy/paste — no parallel store. The key is
 * deliberately NOT `customData.lumen`: that key is the boolean projection
 * marker excalidrawScene.ts owns (isLumenElement), and nesting tags under it
 * would destroy redraw tracking. `source.*` tags are system-owned: derived
 * fresh on every read, and stored `source.*` keys are dropped so persisted
 * data can't spoof provenance.
 */

/**
 * The generic closed shapes, type-locked to drawCanvas's GEO_SHAPES without a
 * value import (drawCanvas pulls Excalidraw runtime, which node tests can't
 * load). If GEO_SHAPES changes, the assertion below fails to compile.
 */
type GeoShape = (typeof import('../drawCanvas'))['GEO_SHAPES'][number]
const SHAPE_TYPES = ['rectangle', 'ellipse', 'diamond'] as const
const _shapesInLockstep: [GeoShape] extends [(typeof SHAPE_TYPES)[number]]
  ? (typeof SHAPE_TYPES)[number] extends GeoShape
    ? true
    : never
  : never = true
void _shapesInLockstep

/** The slices of Excalidraw's loosely-typed fields the adapter reads. */
type AdapterView = {
  id: string
  type: string
  x: number
  y: number
  width: number
  height: number
  isDeleted?: boolean
  text?: string
  link?: string | null
  containerId?: string | null
  startBinding?: { elementId: string } | null
  endBinding?: { elementId: string } | null
  version?: number
  customData?: {
    lumenImage?: LumenImageMeta
    lumenTags?: Tags
  } | null
}

/** The user's live focus: what is selected, and what the viewport shows. */
export interface FocusInfo {
  selectedIds: Set<string>
  /** Visible region in scene coordinates; null when unknown. */
  view: { x: number; y: number; w: number; h: number } | null
}

export interface BuildInventoryOptions {
  /** Live focus signals (IDEA-007); nodes gain selected/inView flags. */
  focus?: FocusInfo
  /**
   * Lazy reader for the open briefing document — only invoked (once) when the
   * scene actually contains the doc window, so boards without one never pay
   * the storage read.
   */
  doc?: () => { title?: string; words?: number }
  /**
   * Marker identifying the doc window among embeddables (an element whose
   * `link` contains this string). Without it, every embeddable is treated as
   * the document — pass it whenever foreign embeds are possible.
   */
  docLink?: string
  /** Board-level tags to attach. */
  boardTags?: Tags
}

/** Read the stored (user/model-written) tags off an element. */
export function readTags(element: ExcalidrawElement): Tags {
  const stored = (element as AdapterView).customData?.lumenTags
  return stored ? { ...stored } : {}
}

/**
 * Return a copy of the element with `tags` merged into customData.lumenTags.
 * Sibling customData (lumenImage, the `lumen` projection marker) is preserved
 * and the input is not mutated. The element's version/versionNonce/updated are
 * bumped so Excalidraw's reconciliation treats the copy as newer than the
 * original — without this, a restore/undo could silently keep the untagged
 * one. All tag writes must go through here so they land on the element and
 * persist.
 */
export function mergeTagsIntoElement(element: ExcalidrawElement, tags: Tags): ExcalidrawElement {
  const view = element as AdapterView
  const customData = {
    ...view.customData,
    lumenTags: { ...view.customData?.lumenTags, ...tags },
  }
  return {
    ...element,
    customData,
    version: (view.version ?? 0) + 1,
    versionNonce: Math.floor(Math.random() * 2 ** 31),
    updated: Date.now(),
  } as ExcalidrawElement
}

/** Stored tags minus the system-owned source.* namespace (anti-spoofing). */
function storedTags(view: AdapterView): Tags {
  const stored = view.customData?.lumenTags
  if (!stored) return {}
  const out: Tags = {}
  for (const [key, value] of Object.entries(stored)) {
    if (!key.startsWith('source.')) out[key] = value
  }
  return out
}

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function nodeOf(
  view: AdapterView,
  kind: BoardNode['kind'],
  label?: string,
  derived?: Tags,
  focus?: FocusInfo,
): BoardNode {
  const bounds = { x: view.x, y: view.y, w: view.width, h: view.height }
  return {
    id: view.id,
    kind,
    label,
    bounds,
    tags: { ...storedTags(view), ...derived },
    ...(focus
      ? {
          selected: focus.selectedIds.has(view.id),
          inView: focus.view ? overlaps(bounds, focus.view) : undefined,
        }
      : {}),
  }
}

/** Derive the inventory from scene elements. Pure; safe to call on every read. */
export function buildInventory(
  elements: readonly ExcalidrawElement[],
  options: BuildInventoryOptions = {},
): BoardInventory {
  const nodes: BoardNode[] = []
  const links: BoardLink[] = []
  const boundLabels = new Map<string, string>()
  let docInfo: { title?: string; words?: number } | undefined

  for (const element of elements as readonly AdapterView[]) {
    if (element.isDeleted) continue
    switch (element.type) {
      case 'rectangle':
      case 'ellipse':
      case 'diamond':
        nodes.push(nodeOf(element, 'shape', undefined, undefined, options.focus))
        break
      case 'text': {
        const text = typeof element.text === 'string' ? element.text : ''
        if (!text.trim()) break
        if (element.containerId) boundLabels.set(element.containerId, text.trim())
        nodes.push(
          nodeOf(
            element,
            'text',
            text,
            element.containerId ? { 'source.container': element.containerId } : undefined,
            options.focus,
          ),
        )
        break
      }
      case 'arrow':
        links.push({
          id: element.id,
          from: element.startBinding?.elementId,
          to: element.endBinding?.elementId,
          tags: storedTags(element),
        })
        break
      case 'image': {
        const meta = element.customData?.lumenImage
        if (meta?.kind === 'screenshot') {
          nodes.push(
            nodeOf(element, 'screenshot', meta.label, meta.label ? { 'source.url': meta.label } : undefined, options.focus),
          )
        } else if (meta?.kind === 'generated') {
          nodes.push(
            nodeOf(element, 'generated-image', meta.label, meta.label ? { 'source.prompt': meta.label } : undefined, options.focus),
          )
        } else {
          nodes.push(nodeOf(element, 'image', undefined, undefined, options.focus))
        }
        break
      }
      case 'embeddable': {
        const isDoc = !options.docLink || (element.link ?? '').includes(options.docLink)
        if (!isDoc) {
          nodes.push(nodeOf(element, 'unknown', undefined, undefined, options.focus))
          break
        }
        docInfo ??= options.doc?.() ?? {}
        nodes.push(
          nodeOf(
            element,
            'document',
            docInfo.title,
            docInfo.words ? { 'source.doc-words': docInfo.words } : undefined,
            options.focus,
          ),
        )
        break
      }
      default:
        // Everything else (freedraw, line, frame, …) stays addressable rather
        // than invisible: consumers can still navigate to or tag it.
        nodes.push(nodeOf(element, 'unknown', undefined, undefined, options.focus))
        break
    }
  }

  // Second pass: shapes and arrows learn their bound-text labels regardless of
  // element order. The bound text also remains its own node (it is what the
  // summary's label list renders from).
  for (const node of nodes) {
    if (node.kind === 'shape' && node.label === undefined) {
      const label = boundLabels.get(node.id)
      if (label) node.label = label
    }
  }
  for (const link of links) {
    const label = boundLabels.get(link.id)
    if (label) link.label = label
  }

  return { version: 1, nodes, links, tags: { ...options.boardTags } }
}

/** Read the user's live focus (selection + visible region) off the canvas. */
export function focusFromApi(api: ExcalidrawImperativeAPI): FocusInfo {
  const st = api.getAppState() as unknown as {
    selectedElementIds?: Record<string, boolean>
    scrollX?: number
    scrollY?: number
    zoom?: { value?: number }
    width?: number
    height?: number
  }
  const zoom = st.zoom?.value || 1
  const view =
    typeof st.scrollX === 'number' && typeof st.width === 'number'
      ? { x: -st.scrollX, y: -(st.scrollY ?? 0), w: (st.width ?? 0) / zoom, h: (st.height ?? 0) / zoom }
      : null
  return {
    selectedIds: new Set(Object.keys(st.selectedElementIds ?? {}).filter((k) => st.selectedElementIds?.[k])),
    view,
  }
}

/**
 * Inventory straight from the live canvas handle — consumers stay engine-free;
 * the api is an opaque token they never dereference. Focus flags (IDEA-007)
 * are derived from the live selection/viewport unless options supply them.
 */
export function inventoryFromApi(
  api: ExcalidrawImperativeAPI,
  options: BuildInventoryOptions = {},
): BoardInventory {
  return buildInventory(api.getSceneElements(), { focus: focusFromApi(api), ...options })
}
