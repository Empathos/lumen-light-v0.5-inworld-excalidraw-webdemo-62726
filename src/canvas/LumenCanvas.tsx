import { useCallback, useMemo, useRef } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI, AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'
import { loadScene, saveScene } from './persistence'
import '@excalidraw/excalidraw/index.css'

interface LumenCanvasProps {
  onReady: (api: ExcalidrawImperativeAPI) => void
}

/**
 * The main stage. Excalidraw is the canvas the assistant draws onto; the user
 * can also edit it directly. We grab the imperative API on mount so the
 * assistant loop can project diagrams into it, restore any saved scene, and
 * persist changes so a refresh/back-navigation doesn't wipe the canvas.
 */
export function LumenCanvas({ onReady }: LumenCanvasProps) {
  const initialData = useMemo(() => {
    const saved = loadScene()
    const appState = {
      // Dark theme applies an invert(0.93) filter to the canvas, so the
      // background must stay white here — the filter renders it ~#121212.
      theme: 'dark' as const,
      viewBackgroundColor: '#ffffff',
      ...(saved?.appState ?? {}),
    }
    return saved
      ? { elements: saved.elements, appState, files: saved.files }
      : { appState }
  }, [])

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveScene(elements, appState, files), 500)
    },
    [],
  )

  return (
    <div className="lumen-canvas">
      <Excalidraw
        excalidrawAPI={onReady}
        initialData={initialData}
        onChange={handleChange}
        // Allow the assistant's same-origin document/briefing window to render as
        // an embeddable. Returning undefined for other URLs keeps Excalidraw's
        // default provider validation (YouTube, Figma, …) intact.
        validateEmbeddable={(url) =>
          url.startsWith(window.location.origin) ? true : undefined
        }
      />
    </div>
  )
}
