import type { ConversationEntry } from './assistant/types'
import type { BoardInventory, BoardNode } from './canvas/inventory/schema'

export interface SessionExportInput {
  generatedAt?: Date
  inventory: BoardInventory
  transcript: ConversationEntry[]
}

export interface SessionExport {
  filename: string
  markdown: string
}

const MAX_TRANSCRIPT_TURNS = 24
const MAX_TEXT_LABELS = 40

export function buildSessionExport({
  generatedAt = new Date(),
  inventory,
  transcript,
}: SessionExportInput): SessionExport {
  const date = generatedAt.toISOString()
  const title = `Lumen Light Session - ${date.slice(0, 10)}`
  const nodes = inventory.nodes
  const links = inventory.links
  const sources = sourceLines(nodes)
  const labels = textLabels(nodes)
  const clean = cleanTranscript(transcript)
  const recent = clean.slice(-MAX_TRANSCRIPT_TURNS)
  const omitted = Math.max(0, clean.length - recent.length)

  const sections = [
    `# ${title}`,
    `Generated: ${date}`,
    '## Canvas Inventory',
    canvasSummary(nodes, links),
    labels.length ? ['## Canvas Text', ...labels.map((label) => `- ${label}`)].join('\n') : '',
    sources.length ? ['## Sources And Visual Assets', ...sources].join('\n') : '',
    recent.length
      ? [
          '## Transcript Recap',
          omitted ? `Earlier turns omitted: ${omitted}` : '',
          ...recent.map((entry) => `- ${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.text}`),
        ]
          .filter(Boolean)
          .join('\n')
      : '',
  ].filter(Boolean)

  return {
    filename: `lumen-session-${date.slice(0, 10)}.md`,
    markdown: sections.join('\n\n') + '\n',
  }
}

export function downloadMarkdownExport(session: SessionExport): void {
  const blob = new Blob([session.markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = session.filename
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function canvasSummary(nodes: BoardNode[], links: BoardInventory['links']): string {
  if (nodes.length === 0 && links.length === 0) return 'The canvas is empty.'

  const kinds = new Map<string, number>()
  for (const node of nodes) kinds.set(node.kind, (kinds.get(node.kind) ?? 0) + 1)
  const counts = [...kinds.entries()].map(([kind, count]) => `- ${titleCase(kind)}: ${count}`)
  if (links.length) counts.push(`- Connectors: ${links.length}`)
  return counts.join('\n')
}

function textLabels(nodes: BoardNode[]): string[] {
  return [
    ...new Set(
      nodes
        .filter((node) => node.kind === 'text' || node.kind === 'shape' || node.kind === 'document')
        .map((node) => node.label?.trim())
        .filter((label): label is string => !!label),
    ),
  ].slice(0, MAX_TEXT_LABELS)
}

function sourceLines(nodes: BoardNode[]): string[] {
  const lines: string[] = []
  const seen = new Set<string>()
  for (const node of nodes) {
    const url = stringTag(node, 'source.url')
    if (url && !seen.has(`url:${url}`)) {
      seen.add(`url:${url}`)
      lines.push(`- Website screenshot: ${url}`)
    }
    const prompt = stringTag(node, 'source.prompt')
    if (prompt && !seen.has(`prompt:${prompt}`)) {
      seen.add(`prompt:${prompt}`)
      lines.push(`- Generated image prompt: ${prompt}`)
    }
    if (node.kind === 'document') {
      const words = typeof node.tags['source.doc-words'] === 'number' ? node.tags['source.doc-words'] : undefined
      const label = node.label ? ` "${node.label}"` : ''
      lines.push(`- Briefing document${label}${words ? ` (${words} words)` : ''}`)
    }
  }
  return lines
}

function cleanTranscript(transcript: ConversationEntry[]): ConversationEntry[] {
  return transcript
    .map((entry) => ({ ...entry, text: entry.text.trim().replace(/\s+/g, ' ') }))
    .filter((entry) => entry.text && !entry.text.startsWith('['))
}

function stringTag(node: BoardNode, key: string): string | undefined {
  const value = node.tags[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function titleCase(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
