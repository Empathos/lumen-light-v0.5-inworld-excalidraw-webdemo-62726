import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { saveScene } from './persistence'

vi.mock('@excalidraw/excalidraw', () => ({
  serializeAsJSON: (
    elements: readonly ExcalidrawElement[],
    appState: Record<string, unknown>,
    files: Record<string, unknown>,
  ) => JSON.stringify({ type: 'excalidraw', elements, appState, files }),
}))

function installLocalStorage(failFirst = false, failAll = false) {
  const store = new Map<string, string>()
  let writes = 0
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      writes += 1
      if (failAll || (failFirst && writes === 1)) {
        throw new Error('quota exceeded')
      }
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  })
}

function element(partial: Record<string, unknown> = {}): ExcalidrawElement {
  return {
    id: 'el-1',
    isDeleted: false,
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    ...partial,
  } as unknown as ExcalidrawElement
}

describe('canvas persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reports a normal save', () => {
    installLocalStorage()

    expect(saveScene([element()], { theme: 'dark' } as never, {})).toMatchObject({
      ok: true,
      slimmed: false,
      storedBytes: expect.any(Number),
    })
  })

  it('falls back to a slim scene when file payloads exceed storage', () => {
    installLocalStorage(true)

    const result = saveScene(
      [element({ fileId: 'image-1' })],
      { theme: 'dark' } as never,
      { 'image-1': { dataURL: 'data:image/png;base64,' + 'x'.repeat(32) } } as never,
    )

    expect(result).toMatchObject({
      ok: true,
      slimmed: true,
      error: 'quota exceeded',
    })
    expect(result.storedBytes).toBeLessThan(result.attemptedBytes)
    expect(localStorage.setItem).toHaveBeenCalledTimes(2)
  })

  it('reports a failed save if the slim fallback also fails', () => {
    installLocalStorage(false, true)

    expect(saveScene([element()], { theme: 'dark' } as never, {})).toMatchObject({
      ok: false,
      slimmed: false,
      storedBytes: 0,
      error: 'quota exceeded',
    })
  })
})
