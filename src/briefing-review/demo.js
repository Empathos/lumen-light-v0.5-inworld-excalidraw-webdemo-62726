/**
 * Lumen Light: briefing-review demo controller (browser only).
 *
 * Wires the deterministic fixture to four product surfaces — source, briefing,
 * staging/review, and export — and exposes the same structured actions a future
 * voice/Realtime briefer would call:
 *
 *   activateTurn(turnId) -> highlight source span + focus staged artifact
 *   acceptArtifact / rejectArtifact / editArtifact
 *   exportPacket({ debug })
 *
 * This is the assistant/operator control loop. No model call, no voice.
 */
(function () {
  'use strict';

  const SourcePane = window.LumenSourcePane;
  const State = window.LumenBriefingState;
  const Projection = window.LumenExcalidrawProjection;

  function startBriefingReview(options) {
    const opts = options || {};
    const session = opts.session;
    const els = opts.elements;
    const state = State.createReviewState(session);

    const sourceText = session.source.text;
    const turnById = new Map((session.briefing_turns || []).map((t) => [t.turn_id, t]));
    const turnOrder = (session.briefing_turns || []).map((t) => t.turn_id);
    const visitedTurns = new Set();
    let activeTurnId = null;
    let projectionDebug = false;

    // --- Source pane ---------------------------------------------------------
    const report = SourcePane.renderSource(els.source, sourceText, session.spans);
    if (els.skipped) {
      els.skipped.textContent = report.skipped.length
        ? 'Unanchored spans skipped: ' + report.skipped.map((s) => s.span_id + ' (' + s.reason + ')').join(', ')
        : 'All source spans anchored.';
    }

    // --- Briefing pane -------------------------------------------------------
    renderBriefing();

    function renderBriefing() {
      els.briefing.textContent = '';
      for (const turnId of turnOrder) {
        const turn = turnById.get(turnId);
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'turn' + (turnId === activeTurnId ? ' turn-active' : '');
        item.dataset.turnId = turnId;
        item.textContent = turn.text;
        item.addEventListener('click', () => activateTurn(turnId));
        els.briefing.appendChild(item);
      }
    }

    function activateTurn(turnId) {
      const turn = turnById.get(turnId);
      if (!turn) return;
      activeTurnId = turnId;
      visitedTurns.add(turnId);

      const spanId = (turn.source_span_refs || [])[0] || null;
      SourcePane.setActiveSpan(els.source, spanId);

      renderBriefing();
      renderReview();
    }

    function activeArtifactId() {
      if (!activeTurnId) return null;
      const turn = turnById.get(activeTurnId);
      return (turn && (turn.proposed_artifact_ids || [])[0]) || null;
    }

    // Re-render the staging pane and its Excalidraw projection together so they
    // always reflect the same authoritative artifact state.
    function renderReview() {
      renderStaging();
      renderProjection();
    }

    function stepTurn(delta) {
      const idx = activeTurnId ? turnOrder.indexOf(activeTurnId) : -1;
      const next = Math.max(0, Math.min(turnOrder.length - 1, idx + delta));
      if (turnOrder[next]) activateTurn(turnOrder[next]);
    }

    // --- Staging / review pane ----------------------------------------------
    function visibleArtifactIds() {
      const ids = [];
      for (const turnId of turnOrder) {
        if (!visitedTurns.has(turnId)) continue;
        for (const artifactId of turnById.get(turnId).proposed_artifact_ids || []) {
          if (!ids.includes(artifactId)) ids.push(artifactId);
        }
      }
      return ids;
    }

    function renderStaging() {
      els.staging.textContent = '';
      const ids = visibleArtifactIds();
      if (!ids.length) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = 'Step through a briefing turn to see proposed artifacts.';
        els.staging.appendChild(empty);
        return;
      }
      for (const artifactId of ids) {
        els.staging.appendChild(renderCard(state.get(artifactId)));
      }
    }

    function renderCard(artifact) {
      const card = document.createElement('div');
      card.className = 'card card-' + artifact.state;
      card.dataset.artifactId = artifact.artifact_id;

      const meta = document.createElement('div');
      meta.className = 'card-meta';
      meta.textContent = artifact.kind + ' · ' + artifact.state +
        ' · evidence: ' + (artifact.source_span_refs || []).join(', ');
      card.appendChild(meta);

      const text = document.createElement('p');
      text.className = 'card-text';
      text.textContent = artifact.text;
      card.appendChild(text);

      const actions = document.createElement('div');
      actions.className = 'card-actions';
      actions.appendChild(button('Accept', () => { state.accept(artifact.artifact_id); renderReview(); }));
      actions.appendChild(button('Reject', () => { state.reject(artifact.artifact_id); renderReview(); }));
      actions.appendChild(button('Edit', () => {
        const next = window.prompt('Edit artifact text:', artifact.text);
        if (next && next.trim()) { state.edit(artifact.artifact_id, next.trim()); renderReview(); }
      }));
      card.appendChild(actions);
      return card;
    }

    function button(label, onClick) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', onClick);
      return b;
    }

    // --- Excalidraw projection ----------------------------------------------
    // The board is a *projection* of Lumen artifact state, not a source of
    // truth: it is recomputed deterministically from the current artifacts on
    // every change. Rejected cards are hidden unless projection debug is on.
    function renderProjection() {
      if (!els.projection) return;
      const board = els.projection;
      board.textContent = '';

      const artifacts = visibleArtifactIds().map((id) => state.get(id));
      const projection = Projection.projectArtifacts(artifacts, {
        debug: projectionDebug,
        activeArtifactId: activeArtifactId(),
      });

      if (els.projectionMeta) {
        els.projectionMeta.textContent = projection.cards.length
          ? projection.cards.length + ' card(s) projected' +
            (projectionDebug ? ' · debug: rejected shown' : '')
          : '';
      }

      if (!projection.cards.length) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.textContent = 'Accepted and staged artifacts will appear here as a board.';
        board.appendChild(empty);
        return;
      }

      const { LAYOUT } = Projection;
      let boardHeight = LAYOUT.top;
      let focusedNode = null;

      projection.elements.forEach((element, i) => {
        const card = projection.cards[i];
        const node = document.createElement('div');
        node.className = 'xd-card xd-card-' + card.state + (card.focused ? ' xd-card-focus' : '');
        node.dataset.elementId = element.id;
        node.dataset.artifactId = card.artifact_id;
        node.style.left = element.x + 'px';
        node.style.top = element.y + 'px';
        node.style.width = element.width + 'px';
        node.style.minHeight = element.height + 'px';
        node.style.backgroundColor = element.backgroundColor;
        node.style.borderColor = element.strokeColor;
        node.style.borderWidth = element.strokeWidth + 'px';

        const badge = document.createElement('span');
        badge.className = 'xd-badge';
        badge.textContent = card.kind + ' · ' + card.state;
        node.appendChild(badge);

        const label = document.createElement('div');
        label.className = 'xd-label';
        label.textContent = element.label.text;
        node.appendChild(label);

        board.appendChild(node);
        boardHeight = Math.max(boardHeight, element.y + element.height + LAYOUT.gap);
        if (card.focused) focusedNode = node;
      });

      board.style.minHeight = boardHeight + 'px';
      if (focusedNode && typeof focusedNode.scrollIntoView === 'function') {
        focusedNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // --- Export --------------------------------------------------------------
    function exportPacket(exportOptions) {
      const debug = Boolean(exportOptions && exportOptions.debug);
      const packet = state.buildPacket({ debug, exportedAt: new Date().toISOString() });
      if (els.export) els.export.textContent = JSON.stringify(packet, null, 2);
      return packet;
    }

    // --- Operator controls ---------------------------------------------------
    if (els.next) els.next.addEventListener('click', () => stepTurn(1));
    if (els.prev) els.prev.addEventListener('click', () => stepTurn(-1));
    if (els.exportBtn) els.exportBtn.addEventListener('click', () => exportPacket({ debug: false }));
    if (els.debugExportBtn) els.debugExportBtn.addEventListener('click', () => exportPacket({ debug: true }));
    if (els.projectionDebug) {
      els.projectionDebug.addEventListener('change', (e) => {
        projectionDebug = Boolean(e.target.checked);
        renderProjection();
      });
    }

    renderReview();

    return { activateTurn, stepTurn, exportPacket, renderProjection, state };
  }

  window.LumenBriefingDemo = { startBriefingReview };
}());
