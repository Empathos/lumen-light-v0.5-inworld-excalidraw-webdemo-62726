import { describe, it, expect } from 'vitest'
import { buildInventory, readTags, mergeTagsIntoElement } from './excalidrawAdapter'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

/**
 * The adapter is a pure function over Excalidraw-shaped data, so tests use
 * plain objects. Only the fields the adapter reads are provided; the cast at
 * the boundary mirrors how loosely Excalidraw itself types customData.
 */
function el(partial: Record<string, unknown>): ExcalidrawElement {
  return {
    id: 'id-' + Math.random().toString(36).slice(2, 8),
    x: 0,
    y: 0,
    width: 100,
    height: 80,
    isDeleted: false,
    ...partial,
  } as unknown as ExcalidrawElement
}

describe('buildInventory', () => {
  it('returns an empty versioned inventory for an empty scene', () => {
    const inv = buildInventory([])
    expect(inv.version).toBe(1)
    expect(inv.nodes).toEqual([])
    expect(inv.links).toEqual([])
    expect(inv.tags).toEqual({})
  })

  it('skips deleted elements', () => {
    const inv = buildInventory([el({ type: 'rectangle', isDeleted: true })])
    expect(inv.nodes).toEqual([])
  })

  it('maps closed shapes to shape nodes with bounds', () => {
    const inv = buildInventory([
      el({ id: 'r1', type: 'rectangle', x: 10, y: 20, width: 30, height: 40 }),
      el({ type: 'ellipse' }),
      el({ type: 'diamond' }),
    ])
    expect(inv.nodes.map((n) => n.kind)).toEqual(['shape', 'shape', 'shape'])
    expect(inv.nodes[0]).toMatchObject({
      id: 'r1',
      bounds: { x: 10, y: 20, w: 30, h: 40 },
    })
  })

  it('gives shapes their bound-text label (either element order)', () => {
    for (const order of [0, 1]) {
      const shape = el({ id: 'r1', type: 'rectangle' })
      const label = el({ type: 'text', text: 'Auth Service', containerId: 'r1' })
      const inv = buildInventory(order === 0 ? [shape, label] : [label, shape])
      const node = inv.nodes.find((n) => n.id === 'r1')
      expect(node?.label).toBe('Auth Service')
    }
  })

  it('maps non-empty text to text nodes and skips blank text', () => {
    const inv = buildInventory([
      el({ type: 'text', text: '  Plan A  ' }),
      el({ type: 'text', text: '   ' }),
    ])
    expect(inv.nodes).toHaveLength(1)
    expect(inv.nodes[0]).toMatchObject({ kind: 'text', label: '  Plan A  ' })
  })

  it('records the container of bound text as a source tag', () => {
    const inv = buildInventory([el({ type: 'text', text: 'label', containerId: 'r1' })])
    expect(inv.nodes[0].tags['source.container']).toBe('r1')
  })

  it('maps arrows to first-class links with endpoints and label', () => {
    const inv = buildInventory([
      el({
        id: 'a1',
        type: 'arrow',
        startBinding: { elementId: 'r1' },
        endBinding: { elementId: 'r2' },
      }),
      el({ type: 'text', text: 'depends on', containerId: 'a1' }),
    ])
    expect(inv.links).toHaveLength(1)
    expect(inv.links[0]).toMatchObject({ id: 'a1', from: 'r1', to: 'r2', label: 'depends on' })
  })

  it('keeps unbound arrows as links with undefined endpoints', () => {
    const inv = buildInventory([el({ id: 'a2', type: 'arrow' })])
    expect(inv.links[0]).toMatchObject({ id: 'a2', from: undefined, to: undefined })
  })

  it('keeps unrecognized element types addressable as unknown nodes', () => {
    const inv = buildInventory([el({ id: 'f1', type: 'freedraw' }), el({ type: 'line' })])
    expect(inv.nodes.map((n) => n.kind)).toEqual(['unknown', 'unknown'])
    expect(inv.nodes[0].id).toBe('f1')
  })

  it('maps lumenImage metadata to screenshot / generated-image nodes with source tags', () => {
    const inv = buildInventory([
      el({
        type: 'image',
        customData: { lumenImage: { kind: 'screenshot', label: 'https://www.cnn.com/article' } },
      }),
      el({
        type: 'image',
        customData: { lumenImage: { kind: 'generated', label: 'a fox mascot' } },
      }),
      el({ type: 'image' }),
    ])
    expect(inv.nodes.map((n) => n.kind)).toEqual(['screenshot', 'generated-image', 'image'])
    expect(inv.nodes[0].label).toBe('https://www.cnn.com/article')
    expect(inv.nodes[0].tags['source.url']).toBe('https://www.cnn.com/article')
    expect(inv.nodes[1].label).toBe('a fox mascot')
    expect(inv.nodes[1].tags['source.prompt']).toBe('a fox mascot')
  })

  it('emits no empty-string source tag for an unlabeled screenshot', () => {
    const inv = buildInventory([
      el({ type: 'image', customData: { lumenImage: { kind: 'screenshot' } } }),
    ])
    expect(inv.nodes[0].kind).toBe('screenshot')
    expect('source.url' in inv.nodes[0].tags).toBe(false)
  })

  it('resolves the doc reader lazily and only for the doc-window embeddable', () => {
    let reads = 0
    const doc = () => {
      reads++
      return { title: 'Q3 Brief', words: 420 }
    }
    // No embeddable → the reader must never run.
    buildInventory([el({ type: 'rectangle' })], { doc, docLink: '/embed/doc.html' })
    expect(reads).toBe(0)
    // Doc window + a foreign embed → one read; only the doc window is 'document'.
    const inv = buildInventory(
      [
        el({ id: 'e1', type: 'embeddable', link: 'https://site.example/embed/doc.html' }),
        el({ id: 'yt', type: 'embeddable', link: 'https://youtube.com/watch?v=x' }),
      ],
      { doc, docLink: '/embed/doc.html' },
    )
    expect(reads).toBe(1)
    expect(inv.nodes.find((n) => n.id === 'e1')).toMatchObject({ kind: 'document', label: 'Q3 Brief' })
    expect(inv.nodes.find((n) => n.id === 'e1')?.tags['source.doc-words']).toBe(420)
    expect(inv.nodes.find((n) => n.id === 'yt')?.kind).toBe('unknown')
  })

  it('preserves tags it does not understand from customData.lumenTags', () => {
    const inv = buildInventory([
      el({
        type: 'rectangle',
        customData: {
          lumenTags: { 'user.pinned': true, 'future.unknown-namespace': 'kept' },
        },
      }),
    ])
    expect(inv.nodes[0].tags['user.pinned']).toBe(true)
    expect(inv.nodes[0].tags['future.unknown-namespace']).toBe('kept')
  })

  it('drops stored source.* tags — that namespace is derived-only', () => {
    const inv = buildInventory([
      el({
        type: 'image',
        customData: {
          lumenImage: { kind: 'screenshot', label: 'https://real.example' },
          lumenTags: { 'source.url': 'https://spoofed.example', 'source.doc-words': 999999 },
        },
      }),
      el({
        type: 'embeddable',
        customData: { lumenTags: { 'source.doc-words': 999999 } },
      }),
    ])
    expect(inv.nodes[0].tags['source.url']).toBe('https://real.example')
    expect('source.doc-words' in inv.nodes[0].tags).toBe(false)
    // With no doc info derived, the spoofed word count must not leak through.
    expect('source.doc-words' in inv.nodes[1].tags).toBe(false)
  })

  it('coexists with the boolean customData.lumen projection marker', () => {
    const inv = buildInventory([
      el({ type: 'rectangle', customData: { lumen: true, lumenTags: { 'ai.topic': 'auth' } } }),
    ])
    expect(inv.nodes[0].tags).toEqual({ 'ai.topic': 'auth' })
  })
})

describe('focus flags (IDEA-007)', () => {
  it('marks selected and in-view nodes from focus info', () => {
    const inv = buildInventory(
      [
        el({ id: 'near', type: 'rectangle', x: 10, y: 10 }),
        el({ id: 'far', type: 'rectangle', x: 9000, y: 9000 }),
      ],
      { focus: { selectedIds: new Set(['near']), view: { x: 0, y: 0, w: 1000, h: 800 } } },
    )
    const near = inv.nodes.find((n) => n.id === 'near')
    const far = inv.nodes.find((n) => n.id === 'far')
    expect(near).toMatchObject({ selected: true, inView: true })
    expect(far).toMatchObject({ selected: false, inView: false })
  })

  it('leaves flags undefined when no focus info is supplied', () => {
    const inv = buildInventory([el({ type: 'rectangle' })])
    expect('selected' in inv.nodes[0]).toBe(false)
  })
})

describe('tag round-trip', () => {
  it('mergeTagsIntoElement merges new tags over old and readTags reads them back', () => {
    const original = el({
      type: 'rectangle',
      version: 7,
      versionNonce: 123,
      customData: { lumen: true, lumenTags: { 'ai.topic': 'old', 'user.pinned': true } },
    })
    const updated = mergeTagsIntoElement(original, { 'ai.topic': 'pricing', 'ai.confidence': 0.9 })
    expect(readTags(updated)).toEqual({ 'ai.topic': 'pricing', 'user.pinned': true, 'ai.confidence': 0.9 })
    // sibling customData survives — including the boolean projection marker
    expect((updated as { customData?: { lumen?: unknown } }).customData?.lumen).toBe(true)
    // the write is visible to Excalidraw reconciliation as a newer element
    expect((updated as { version?: number }).version).toBe(8)
    expect((updated as { versionNonce?: number }).versionNonce).not.toBe(123)
    // original is not mutated
    expect(readTags(original)['ai.topic']).toBe('old')
  })
})
