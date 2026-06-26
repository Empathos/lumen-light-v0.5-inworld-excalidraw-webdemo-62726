import { useCallback, useEffect, useRef, useState } from 'react'
import { exportToBlob } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { LumenCanvas } from './canvas/LumenCanvas'
import { drawFlowDiagram } from './canvas/drawFlow'
import { normalizeFlowDiagram } from './canvas/normalizeFlow'
import { drawCanvasElements, normalizeCanvasElements } from './canvas/drawCanvas'
import { addImageToCanvas } from './canvas/addImage'
import {
  openDocument,
  highlightPassage,
  getDocument,
  briefFromCanvas,
  initDocWindow,
} from './canvas/docWindow'
import { ConversationPanel } from './ui/ConversationPanel'
import { MockAssistantProvider } from './assistant/mockProvider'
import { RealtimeClient, type RealtimeStatus } from './realtime/RealtimeClient'
import type { ConversationEntry } from './assistant/types'

export function App() {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null)
  const mockRef = useRef(new MockAssistantProvider())
  const clientRef = useRef<RealtimeClient | null>(null)

  const [messages, setMessages] = useState<ConversationEntry[]>([])
  const [status, setStatus] = useState<RealtimeStatus>('idle')
  const [micOn, setMicOn] = useState(false)
  const [busy, setBusy] = useState(false)

  const addMessage = useCallback((entry: ConversationEntry) => {
    setMessages((prev) => [...prev, entry])
  }, [])

  const handleReady = useCallback((api: ExcalidrawImperativeAPI) => {
    apiRef.current = api
    // Re-bind/repopulate a persisted briefing window after reload or back-nav.
    initDocWindow(api)
  }, [])

  const drawFlowFromArgs = useCallback((args: unknown) => {
    if (!apiRef.current) return { ok: false, error: 'canvas not ready' }
    const diagram = normalizeFlowDiagram(args)
    if (diagram.nodes.length === 0) return { ok: false, error: 'no nodes' }
    drawFlowDiagram(apiRef.current, diagram)
    return { ok: true, nodes: diagram.nodes.length, edges: diagram.edges.length }
  }, [])

  const drawCanvasFromArgs = useCallback((args: unknown) => {
    if (!apiRef.current) return { ok: false, error: 'canvas not ready' }
    const elements = normalizeCanvasElements(args)
    if (elements.length === 0) return { ok: false, error: 'no elements' }
    drawCanvasElements(apiRef.current, elements)
    return { ok: true, elements: elements.length }
  }, [])

  const generateImageFromArgs = useCallback(async (args: unknown) => {
    const api = apiRef.current
    if (!api) return { ok: false, error: 'canvas not ready' }
    const a = (args ?? {}) as Record<string, unknown>
    const prompt = typeof a.prompt === 'string' ? a.prompt.trim() : ''
    if (!prompt) return { ok: false, error: 'missing prompt' }
    const aspect = typeof a.aspect === 'string' ? a.aspect : undefined
    try {
      const resp = await fetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspect }),
      })
      const data = (await resp.json()) as { dataURL?: string; error?: string }
      if (!resp.ok || !data.dataURL) {
        return { ok: false, error: data.error || 'image generation failed' }
      }
      const dims = await addImageToCanvas(api, data.dataURL, {
        x: typeof a.x === 'number' ? a.x : undefined,
        y: typeof a.y === 'number' ? a.y : undefined,
      })
      return { ok: true, placed: true, ...dims }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }, [])

  const openDocumentFromArgs = useCallback((args: unknown) => {
    const api = apiRef.current
    if (!api) return { ok: false, error: 'canvas not ready' }
    const a = (args ?? {}) as Record<string, unknown>
    const markdown =
      typeof a.markdown === 'string'
        ? a.markdown
        : typeof a.content === 'string'
          ? a.content
          : ''
    if (!markdown.trim()) return { ok: false, error: 'missing markdown' }
    const title = typeof a.title === 'string' ? a.title : undefined
    return openDocument(api, { title, markdown })
  }, [])

  const highlightFromArgs = useCallback((args: unknown) => {
    const a = (args ?? {}) as Record<string, unknown>
    return highlightPassage({
      section: typeof a.section === 'string' ? a.section : undefined,
      text: typeof a.text === 'string' ? a.text : undefined,
      clear: a.clear === true,
    })
  }, [])

  const readDocument = useCallback(() => getDocument(), [])

  const webSearchFromArgs = useCallback(async (args: unknown) => {
    const a = (args ?? {}) as Record<string, unknown>
    const query = typeof a.query === 'string' ? a.query.trim() : ''
    if (!query) return { ok: false, error: 'missing query' }
    try {
      const resp = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = (await resp.json()) as {
        query?: string
        answer?: string
        results?: { title: string; url: string; snippet: string }[]
        error?: string
      }
      if (!resp.ok) return { ok: false, error: data.error || 'search failed' }
      return { ok: true, query: data.query, answer: data.answer, results: data.results ?? [] }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }, [])

  const briefFromCanvasFromArgs = useCallback((args: unknown) => {
    const api = apiRef.current
    if (!api) return { ok: false, error: 'canvas not ready' }
    const a = (args ?? {}) as Record<string, unknown>
    return briefFromCanvas(api, { title: typeof a.title === 'string' ? a.title : undefined })
  }, [])

  const captureCanvas = useCallback(async () => {
    const api = apiRef.current
    if (!api) return { ok: false, error: 'canvas not ready' }
    const elements = api.getSceneElements()
    if (elements.length === 0) return { ok: true, empty: true, note: 'canvas is empty' }
    try {
      const blob = await exportToBlob({
        elements,
        appState: {
          ...api.getAppState(),
          // Force a light render for the AI screenshot regardless of the live UI
          // theme, so the self-correction loop sees clean, legible colors.
          theme: 'light',
          exportBackground: true,
          viewBackgroundColor: '#ffffff',
        },
        files: api.getFiles(),
        mimeType: 'image/png',
        exportPadding: 32,
      })
      const image = await blobToDataUrl(blob)
      return { ok: true, image }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }, [])

  // Dev-only hook so the rich canvas tool can be exercised without a live
  // (paid, mic-gated) realtime session. Mirrors what the model's draw_canvas
  // tool call does. Available as window.__lumenDrawCanvas(elements) in dev.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as Record<string, unknown>
    w.__lumenDrawCanvas = (elements: unknown) => drawCanvasFromArgs({ elements })
    w.__lumenCapture = () => captureCanvas()
    w.__lumenGenerateImage = (prompt: string, aspect?: string) =>
      generateImageFromArgs({ prompt, aspect })
    // Place a local data URL directly (no API call) for testing image rendering.
    w.__lumenAddImage = (dataURL: string) =>
      apiRef.current ? addImageToCanvas(apiRef.current, dataURL) : undefined
    w.__lumenOpenDoc = (markdown: string, title?: string) =>
      openDocumentFromArgs({ markdown, title })
    w.__lumenHighlight = (section?: string, text?: string) =>
      highlightFromArgs({ section, text })
    w.__lumenReadDoc = () => readDocument()
    w.__lumenBriefFromCanvas = (title?: string) => briefFromCanvasFromArgs({ title })
    w.__lumenSceneInfo = () =>
      (apiRef.current?.getSceneElements() ?? [])
        .filter((e) => !e.isDeleted)
        .map((e) => ({ type: e.type, id: e.id }))
    w.__lumenWebSearch = (query: string) => webSearchFromArgs({ query })
  }, [
    drawCanvasFromArgs,
    captureCanvas,
    generateImageFromArgs,
    openDocumentFromArgs,
    highlightFromArgs,
    readDocument,
    briefFromCanvasFromArgs,
    webSearchFromArgs,
  ])

  const connect = useCallback(() => {
    if (clientRef.current) return
    const client = new RealtimeClient({
      onStatus: (s) => setStatus(s),
      onMic: (enabled) => setMicOn(enabled),
      onUserTranscript: (text) => addMessage({ role: 'user', text }),
      onAssistantTranscript: (text) => addMessage({ role: 'assistant', text }),
      onError: (message) => addMessage({ role: 'assistant', text: `[error] ${message}` }),
      onToolCall: (name, args) => {
        if (name === 'draw_canvas') return drawCanvasFromArgs(args)
        if (name === 'draw_flow') return drawFlowFromArgs(args)
        if (name === 'capture_canvas') return captureCanvas()
        if (name === 'generate_image') return generateImageFromArgs(args)
        if (name === 'open_document') return openDocumentFromArgs(args)
        if (name === 'highlight_passage') return highlightFromArgs(args)
        if (name === 'read_document') return readDocument()
        if (name === 'brief_from_canvas') return briefFromCanvasFromArgs(args)
        if (name === 'web_search') return webSearchFromArgs(args)
        return { ok: false, error: `unknown tool: ${name}` }
      },
    })
    clientRef.current = client
    void client.connect()
  }, [
    addMessage,
    captureCanvas,
    drawCanvasFromArgs,
    drawFlowFromArgs,
    generateImageFromArgs,
    openDocumentFromArgs,
    highlightFromArgs,
    readDocument,
    briefFromCanvasFromArgs,
    webSearchFromArgs,
  ])

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect()
    clientRef.current = null
    setMicOn(false)
    setStatus('closed')
  }, [])

  const toggleSession = useCallback(() => {
    if (clientRef.current) disconnect()
    else connect()
  }, [connect, disconnect])

  // Text input routes through the live session when connected. Outside a
  // session, the local mock only exercises the canvas loop during development.
  const handleSend = useCallback(
    async (text: string) => {
      addMessage({ role: 'user', text })

      const client = clientRef.current
      if (client && client.state === 'connected') {
        client.sendText(text)
        return
      }

      setBusy(true)
      try {
        const actions = await mockRef.current.respond({ userText: text, history: messages })
        for (const action of actions) {
          if (action.type === 'message') {
            addMessage({ role: 'assistant', text: action.text })
          } else if (action.type === 'draw_flow') {
            drawFlowFromArgs(action.diagram)
          }
        }
      } finally {
        setBusy(false)
      }
    },
    [addMessage, drawFlowFromArgs, messages],
  )

  return (
    <div className="app">
      <main className="canvas-wrap">
        <LumenCanvas onReady={handleReady} />
      </main>
      <ConversationPanel
        messages={messages}
        busy={busy}
        status={status}
        micOn={micOn}
        onToggleSession={toggleSession}
        onSend={handleSend}
      />
    </div>
  )
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}
