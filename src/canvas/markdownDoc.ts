/**
 * Minimal, dependency-free Markdown → HTML renderer for the briefing document
 * window. It intentionally supports a restricted grammar (headings, paragraphs,
 * lists, blockquotes, fenced code, and inline bold/italic/code/links) and emits
 * only our own tags from escaped text, so the output is safe to inject into the
 * (sandboxed, same-origin) viewer iframe without a sanitizer.
 *
 * Every top-level block is tagged with a stable `data-block-id` so the assistant
 * can highlight it; headings additionally get a `data-section` slug and are
 * returned in the outline so the model can address sections by name/id.
 */

export interface DocSection {
  id: string
  level: number
  text: string
}

export interface RenderedDoc {
  html: string
  sections: DocSection[]
  blockCount: number
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48)
}

function sanitizeHref(href: string): string | null {
  const h = href.trim()
  if (/^(https?:|mailto:)/i.test(h)) return h
  return null
}

/** Inline formatting. Input is already HTML-escaped, so markers are literal. */
function inline(text: string): string {
  let out = text
  // inline code first so we don't format inside it
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
  // links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_full, label, url) => {
    const safe = sanitizeHref(url)
    if (!safe) return label
    return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  out = out.replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>')
  return out
}

export function renderMarkdownDoc(markdown: string): RenderedDoc {
  const lines = (markdown ?? '').replace(/\r\n?/g, '\n').split('\n')
  const sections: DocSection[] = []
  const parts: string[] = []
  let blockId = 0
  const nextId = () => `b${blockId++}`

  let i = 0
  while (i < lines.length) {
    let line = lines[i]

    // blank
    if (!line.trim()) {
      i++
      continue
    }

    // fenced code
    if (/^```/.test(line.trim())) {
      const buf: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        buf.push(lines[i])
        i++
      }
      i++ // closing fence
      parts.push(`<pre data-block-id="${nextId()}"><code>${escapeHtml(buf.join('\n'))}</code></pre>`)
      continue
    }

    // heading
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const level = h[1].length
      const raw = h[2].trim()
      const id = nextId()
      const slug = slugify(raw) || id
      sections.push({ id, level, text: raw })
      parts.push(
        `<h${level} data-block-id="${id}" data-section="${slug}">${inline(escapeHtml(raw))}</h${level}>`,
      )
      i++
      continue
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const buf: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      parts.push(`<blockquote data-block-id="${nextId()}">${inline(escapeHtml(buf.join(' ')))}</blockquote>`)
      continue
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li>${inline(escapeHtml(lines[i].replace(/^\s*[-*]\s+/, '')))}</li>`)
        i++
      }
      parts.push(`<ul data-block-id="${nextId()}">${items.join('')}</ul>`)
      continue
    }

    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(`<li>${inline(escapeHtml(lines[i].replace(/^\s*\d+\.\s+/, '')))}</li>`)
        i++
      }
      parts.push(`<ol data-block-id="${nextId()}">${items.join('')}</ol>`)
      continue
    }

    // paragraph: gather consecutive plain lines
    const buf: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}\s|>\s?|\s*[-*]\s+|\s*\d+\.\s+|```)/.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    line = ''
    parts.push(`<p data-block-id="${nextId()}">${inline(escapeHtml(buf.join(' ')))}</p>`)
  }

  return { html: parts.join('\n'), sections, blockCount: blockId }
}
