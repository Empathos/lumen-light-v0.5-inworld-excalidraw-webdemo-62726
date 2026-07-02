import { describe, it, expect } from 'vitest'
import { describeScene } from './summarizeScene'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

/** Fake just the slice of the API the summarizer touches. */
function apiWith(elements: Record<string, unknown>[]): ExcalidrawImperativeAPI {
  const withDefaults = elements.map((e, i) => ({
    id: `el-${i}`,
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    isDeleted: false,
    ...e,
  }))
  return { getSceneElements: () => withDefaults } as unknown as ExcalidrawImperativeAPI
}

describe('describeScene', () => {
  it('returns null for an empty board', () => {
    expect(describeScene(apiWith([]))).toBeNull()
    expect(describeScene(null)).toBeNull()
  })

  it('renders counts, screenshot hosts, and labels from the inventory', () => {
    const text = describeScene(
      apiWith([
        { type: 'rectangle' },
        { type: 'rectangle' },
        { type: 'arrow' },
        { type: 'text', text: 'Plan A' },
        {
          type: 'image',
          customData: { lumenImage: { kind: 'screenshot', label: 'https://www.cnn.com/a' } },
        },
      ]),
    )
    expect(text).toContain('2 shapes/nodes')
    expect(text).toContain('1 connector (arrows)')
    expect(text).toContain('1 website screenshot (cnn.com)')
    expect(text).toContain('"Plan A"')
    expect(text).toContain('call capture_canvas')
  })

  it('mentions layout (not image content) when the board has no images', () => {
    const text = describeScene(apiWith([{ type: 'rectangle' }]))
    expect(text).toContain('To see the exact layout, call capture_canvas.')
  })
})
