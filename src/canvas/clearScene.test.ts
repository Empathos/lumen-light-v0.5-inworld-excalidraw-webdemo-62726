import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import {
  DOC_UNDO_KEY,
  SCENE_UNDO_KEY,
  restoreLastClear,
  snapshotBeforeClear,
} from './clearScene'
import { DOC_STORAGE_KEY } from './docStorage'

vi.mock('@excalidraw/excalidraw', () => ({
  serializeAsJSON: (
    elements: readonly ExcalidrawElement[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>,
  ) => JSON.stringify({ type: 'excalidraw', elements, appState, files }),
}))

function installLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  })
}

function element(partial: Record<string, unknown>): ExcalidrawElement {
  return {
    id: 'el-' + Math.random().toString(36).slice(2, 8),
    isDeleted: false,
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    ...partial,
  } as unknown as ExcalidrawElement
}

function apiWith(elements: ExcalidrawElement[]): ExcalidrawImperativeAPI & {
  addedFiles: unknown[]
  sceneUpdates: unknown[]
} {
  let currentElements = elements
  let currentFiles: Record<string, unknown> = {}
  let currentAppState: Record<string, unknown> = { theme: 'light' }
  const api = {
    addedFiles: [] as unknown[],
    sceneUpdates: [] as unknown[],
    getSceneElements: vi.fn(() => currentElements),
    getAppState: vi.fn(() => currentAppState),
    getFiles: vi.fn(() => currentFiles),
    addFiles: vi.fn((files: unknown[]) => {
      api.addedFiles.push(...files)
      currentFiles = Object.fromEntries(
        files.map((file, index) => [`file-${index}`, file]),
      )
    }),
    updateScene: vi.fn((update: { elements?: ExcalidrawElement[]; appState?: Record<string, unknown> }) => {
      api.sceneUpdates.push(update)
      if (update.elements) currentElements = update.elements
      if (update.appState) currentAppState = update.appState
    }),
  }
  return api as unknown as ExcalidrawImperativeAPI & {
    addedFiles: unknown[]
    sceneUpdates: unknown[]
  }
}

describe('clear scene undo snapshot', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    installLocalStorage()
  })

  it('reports no snapshot without mutating the scene', () => {
    const api = apiWith([element({ id: 'kept' })])

    expect(restoreLastClear(api)).toEqual({
      ok: false,
      error: 'nothing to restore — no snapshot from a previous clear',
    })
    expect(api.updateScene).not.toHaveBeenCalled()
  })

  it('restores elements, files, document payload, and the normal persisted scene', () => {
    const api = apiWith([])
    localStorage.setItem(
      SCENE_UNDO_KEY,
      JSON.stringify({
        elements: [element({ id: 'restored' })],
        appState: { viewBackgroundColor: '#fff8dc' },
        files: { imageA: { id: 'imageA', mimeType: 'image/png' } },
      }),
    )
    localStorage.setItem(DOC_UNDO_KEY, JSON.stringify({ title: 'Brief', markdown: '# Brief' }))

    expect(restoreLastClear(api)).toEqual({ ok: true, restored: 1 })
    expect(api.addedFiles).toEqual([{ id: 'imageA', mimeType: 'image/png' }])
    expect(api.sceneUpdates[0]).toMatchObject({
      elements: [expect.objectContaining({ id: 'restored' })],
      appState: { viewBackgroundColor: '#fff8dc' },
    })
    expect(localStorage.getItem(DOC_STORAGE_KEY)).toBe(JSON.stringify({ title: 'Brief', markdown: '# Brief' }))
    expect(JSON.parse(localStorage.getItem('lumen-scene-v1') ?? '{}')).toMatchObject({
      elements: [expect.objectContaining({ id: 'restored' })],
      appState: { viewBackgroundColor: '#fff8dc' },
      files: { 'file-0': { id: 'imageA', mimeType: 'image/png' } },
    })
  })

  it('clears any newer document payload when restoring a no-document snapshot', () => {
    const api = apiWith([])
    localStorage.setItem(
      SCENE_UNDO_KEY,
      JSON.stringify({ elements: [element({ id: 'restored' })], files: {} }),
    )
    localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify({ title: 'Newer', markdown: 'newer doc' }))

    expect(restoreLastClear(api)).toEqual({ ok: true, restored: 1 })
    expect(localStorage.getItem(DOC_STORAGE_KEY)).toBeNull()
  })

  it('overwrites the one-slot undo snapshot on each clear snapshot', () => {
    const first = apiWith([element({ id: 'first' })])
    const second = apiWith([element({ id: 'second' })])
    localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify({ title: 'First', markdown: 'one' }))
    expect(snapshotBeforeClear(first)).toBe(true)

    localStorage.setItem(DOC_STORAGE_KEY, JSON.stringify({ title: 'Second', markdown: 'two' }))
    expect(snapshotBeforeClear(second)).toBe(true)

    const snapshot = JSON.parse(localStorage.getItem(SCENE_UNDO_KEY) ?? '{}')
    expect(snapshot.elements).toEqual([expect.objectContaining({ id: 'second' })])
    expect(localStorage.getItem(DOC_UNDO_KEY)).toBe(JSON.stringify({ title: 'Second', markdown: 'two' }))
  })
})
