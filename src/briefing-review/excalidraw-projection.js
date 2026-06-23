/**
 * Lumen Light: deterministic artifact -> Excalidraw projection mapping.
 *
 * This module turns Lumen's authoritative artifact/review state into
 * Excalidraw-style visual objects (the same skeleton-element JSON shape the
 * whiteboard prototype feeds to `convertToExcalidrawElements`). It is pure and
 * DOM-free so it runs under the Node test runner and inside the browser demo
 * controller alike.
 *
 * Product rules encoded here (see the overnight build spec):
 *   - Lumen artifact/review state is the source of truth; the Excalidraw element
 *     JSON produced here is a projection only and is never made durable.
 *   - The projection is deterministic: same artifacts + options -> same elements,
 *     same ids, same coordinates (no Date/random).
 *   - Rejected artifacts are excluded from the default projection and only appear
 *     when `debug` is set.
 *   - Each card reflects the artifact's *current* text, so an edit updates the
 *     projected card automatically.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LumenExcalidrawProjection = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Single-lane vertical layout. Coordinates are Excalidraw scene units.
  const LAYOUT = {
    laneX: 40,
    top: 40,
    cardWidth: 280,
    cardHeight: 104,
    gap: 24,
    fontSize: 16,
  };

  // State -> Excalidraw colors. Mirrors the review-card styling in the demo so
  // the board reads the same as the staging pane.
  const STATE_STYLE = {
    staged: { backgroundColor: '#fbfbfd', strokeColor: '#6b7280' },
    accepted: { backgroundColor: '#f0fdf4', strokeColor: '#16a34a' },
    rejected: { backgroundColor: '#fef2f2', strokeColor: '#dc2626' },
    edited: { backgroundColor: '#fffbeb', strokeColor: '#d97706' },
  };

  const ID_PREFIX = 'proj-';

  function styleFor(state) {
    return STATE_STYLE[state] || STATE_STYLE.staged;
  }

  /**
   * Project a single artifact into one Excalidraw skeleton rectangle element.
   * `index` fixes the deterministic vertical position; `focused` thickens the
   * stroke so the active briefing turn's card stands out.
   */
  function projectArtifact(artifact, index, focused) {
    const style = styleFor(artifact.state);
    const y = LAYOUT.top + index * (LAYOUT.cardHeight + LAYOUT.gap);
    return {
      type: 'rectangle',
      id: ID_PREFIX + artifact.artifact_id,
      x: LAYOUT.laneX,
      y: y,
      width: LAYOUT.cardWidth,
      height: LAYOUT.cardHeight,
      backgroundColor: style.backgroundColor,
      strokeColor: style.strokeColor,
      fillStyle: 'solid',
      strokeWidth: focused ? 2 : 1,
      roundness: { type: 3 },
      label: {
        text: artifact.text,
        fontSize: LAYOUT.fontSize,
        strokeColor: '#1f2330',
      },
    };
  }

  /**
   * Project a list of artifacts into a deterministic Excalidraw scene.
   *
   * options:
   *   - debug: include rejected artifacts (default false -> rejected excluded)
   *   - activeArtifactId: mark one card as focused
   *
   * Returns:
   *   - elements: Excalidraw skeleton elements (one rectangle per visible card)
   *   - cards: a parallel index ({ artifact_id, element_id, kind, state, text,
   *     focused, x, y, width, height }) for DOM renderers and assertions
   *   - debug: the resolved debug flag
   */
  function projectArtifacts(artifacts, options) {
    const opts = options || {};
    const debug = Boolean(opts.debug);
    const activeId = opts.activeArtifactId || null;

    const visible = (artifacts || []).filter(function (a) {
      return debug || a.state !== 'rejected';
    });

    const elements = [];
    const cards = [];
    visible.forEach(function (artifact, index) {
      const focused = Boolean(activeId) && artifact.artifact_id === activeId;
      const element = projectArtifact(artifact, index, focused);
      elements.push(element);
      cards.push({
        artifact_id: artifact.artifact_id,
        element_id: element.id,
        kind: artifact.kind,
        state: artifact.state,
        text: artifact.text,
        focused: focused,
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      });
    });

    return { elements: elements, cards: cards, debug: debug };
  }

  return {
    LAYOUT: LAYOUT,
    STATE_STYLE: STATE_STYLE,
    projectArtifact: projectArtifact,
    projectArtifacts: projectArtifacts,
  };
}));
