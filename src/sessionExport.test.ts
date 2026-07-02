import { describe, expect, it } from 'vitest'
import { buildSessionExport } from './sessionExport'
import type { BoardInventory } from './canvas/inventory/schema'

const inventory: BoardInventory = {
  version: 1,
  tags: {},
  nodes: [
    {
      id: 'n1',
      kind: 'shape',
      label: 'Plan',
      bounds: { x: 0, y: 0, w: 100, h: 80 },
      tags: {},
    },
    {
      id: 'n2',
      kind: 'screenshot',
      label: 'https://example.com/brief',
      bounds: { x: 120, y: 0, w: 100, h: 80 },
      tags: { 'source.url': 'https://example.com/brief' },
    },
    {
      id: 'n3',
      kind: 'generated-image',
      label: 'warm dashboard sketch',
      bounds: { x: 240, y: 0, w: 100, h: 80 },
      tags: { 'source.prompt': 'warm dashboard sketch' },
    },
    {
      id: 'doc',
      kind: 'document',
      label: 'Launch Notes',
      bounds: { x: 0, y: 100, w: 200, h: 200 },
      tags: { 'source.doc-words': 320 },
    },
  ],
  links: [{ id: 'l1', from: 'n1', to: 'n2', tags: {} }],
}

describe('buildSessionExport', () => {
  it('builds a public-safe markdown artifact from inventory and recent transcript', () => {
    const session = buildSessionExport({
      generatedAt: new Date('2026-07-02T09:00:00.000Z'),
      inventory,
      transcript: [
        { role: 'user', text: '  map the launch  ' },
        { role: 'assistant', text: '[error] ignored' },
        { role: 'assistant', text: 'Here is the first pass.' },
      ],
    })

    expect(session.filename).toBe('lumen-session-2026-07-02.md')
    expect(session.markdown).toContain('# Lumen Light Session - 2026-07-02')
    expect(session.markdown).toContain('- Shape: 1')
    expect(session.markdown).toContain('- Connectors: 1')
    expect(session.markdown).toContain('- Plan')
    expect(session.markdown).toContain('- Website screenshot: https://example.com/brief')
    expect(session.markdown).toContain('- Generated image prompt: warm dashboard sketch')
    expect(session.markdown).toContain('- Briefing document "Launch Notes" (320 words)')
    expect(session.markdown).toContain('- User: map the launch')
    expect(session.markdown).toContain('- Assistant: Here is the first pass.')
    expect(session.markdown).not.toContain('[error]')
  })

  it('reports an empty canvas without inventing sections', () => {
    const session = buildSessionExport({
      generatedAt: new Date('2026-07-02T09:00:00.000Z'),
      inventory: { version: 1, tags: {}, nodes: [], links: [] },
      transcript: [],
    })

    expect(session.markdown).toContain('The canvas is empty.')
    expect(session.markdown).not.toContain('## Sources And Visual Assets')
    expect(session.markdown).not.toContain('## Transcript Recap')
  })
})
