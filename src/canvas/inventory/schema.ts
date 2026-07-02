/**
 * The board inventory — Lumen's canvas-agnostic model of "what is on this
 * board" (ADR-0012). This schema is the durable layer: perception, navigation,
 * and future annotation/retrieval features all address the board through it.
 * Nothing in this file may import from any canvas engine; engines plug in via
 * adapters (see excalidrawAdapter.ts), and an engine swap must not touch this
 * file's consumers.
 */

/**
 * Open, extensible tagging. Keys are namespaced by convention, and the
 * namespace carries provenance:
 *
 *   source.*  — derived by the system (e.g. source.url, source.prompt)
 *   ai.*      — asserted by the model (e.g. ai.topic)
 *   user.*    — asserted by the user (e.g. user.pinned)
 *
 * Adapters MUST preserve tags they do not understand: unknown namespaces are
 * future capabilities riding today's schema, not errors.
 */
export type TagValue = string | number | boolean | string[]
export type Tags = Record<string, TagValue>

export type NodeKind =
  | 'shape'
  | 'note'
  | 'text'
  | 'image'
  | 'screenshot'
  | 'generated-image'
  | 'document'
  | 'unknown'

export interface BoardBounds {
  x: number
  y: number
  w: number
  h: number
}

/** Anything addressable on the board. `id` is stable across reads. */
export interface BoardNode {
  id: string
  kind: NodeKind
  /** Human name: text content, screenshot source URL, image prompt, doc title. */
  label?: string
  bounds: BoardBounds
  tags: Tags
}

/** A first-class relationship (today: a connector arrow between elements). */
export interface BoardLink {
  id: string
  from?: string
  to?: string
  label?: string
  tags: Tags
}

export interface BoardInventory {
  version: 1
  nodes: BoardNode[]
  links: BoardLink[]
  /** Board-level tags (project, session, …). */
  tags: Tags
}
