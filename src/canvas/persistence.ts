import { serializeAsJSON } from '@excalidraw/excalidraw'
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types'
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types'

/**
 * Lightweight localStorage persistence for the canvas. Without this the whole
 * scene (drawings, images, and the briefing window) lives only in memory and
 * vanishes on refresh / back-navigation. We serialize with Excalidraw's own
 * helper so element/appState shapes stay valid across versions.
 */

const SCENE_KEY = 'lumen-scene-v1'

export interface RestoredScene {
  elements: ExcalidrawElement[]
  appState: Partial<AppState>
  files: BinaryFiles
}

export interface SaveSceneResult {
  ok: boolean
  slimmed: boolean
  attemptedBytes: number
  storedBytes: number
  error?: string
}

export function loadScene(): RestoredScene | null {
  try {
    const raw = localStorage.getItem(SCENE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RestoredScene> & { elements?: unknown }
    if (!parsed || !Array.isArray(parsed.elements)) return null
    return {
      elements: parsed.elements as ExcalidrawElement[],
      appState: (parsed.appState as Partial<AppState>) ?? {},
      files: (parsed.files as BinaryFiles) ?? {},
    }
  } catch {
    return null
  }
}

export function saveScene(
  elements: readonly ExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
): SaveSceneResult {
  const fullScene = serializeAsJSON(elements, appState, files, 'local')
  try {
    localStorage.setItem(SCENE_KEY, fullScene)
    return {
      ok: true,
      slimmed: false,
      attemptedBytes: fullScene.length,
      storedBytes: fullScene.length,
    }
  } catch (err) {
    const slimScene = serializeAsJSON(elements, appState, {}, 'local')
    try {
      localStorage.setItem(SCENE_KEY, slimScene)
      return {
        ok: true,
        slimmed: true,
        attemptedBytes: fullScene.length,
        storedBytes: slimScene.length,
        error: errorMessage(err),
      }
    } catch (slimErr) {
      return {
        ok: false,
        slimmed: false,
        attemptedBytes: fullScene.length,
        storedBytes: 0,
        error: errorMessage(slimErr),
      }
    }
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'storage quota or localStorage failure'
}
