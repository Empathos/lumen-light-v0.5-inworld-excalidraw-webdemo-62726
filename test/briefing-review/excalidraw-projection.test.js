'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createReviewState } = require('../../src/briefing-review/state.js');
const {
  projectArtifacts,
  projectArtifact,
  LAYOUT,
} = require('../../src/briefing-review/excalidraw-projection.js');

const FIXTURE_PATH = path.join(__dirname, '../../examples/briefing-session.example.json');

function loadState() {
  return createReviewState(JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')));
}

test('projects one Excalidraw rectangle per artifact, preserving order', () => {
  const state = loadState();
  const { elements, cards } = projectArtifacts(state.list());
  assert.equal(elements.length, 3);
  assert.equal(cards.length, 3);
  for (const el of elements) {
    assert.equal(el.type, 'rectangle');
    assert.ok(el.label && typeof el.label.text === 'string');
  }
  assert.deepEqual(
    cards.map((c) => c.artifact_id),
    ['artifact_001', 'artifact_002', 'artifact_003']
  );
});

test('element ids are derived deterministically from artifact ids', () => {
  const state = loadState();
  const { elements } = projectArtifacts(state.list());
  assert.deepEqual(
    elements.map((e) => e.id),
    ['proj-artifact_001', 'proj-artifact_002', 'proj-artifact_003']
  );
});

test('projection is deterministic for identical input', () => {
  const a = projectArtifacts(loadState().list());
  const b = projectArtifacts(loadState().list());
  assert.deepEqual(a, b);
});

test('cards are laid out in a single non-overlapping vertical lane', () => {
  const state = loadState();
  const { elements } = projectArtifacts(state.list());
  for (let i = 0; i < elements.length; i++) {
    assert.equal(elements[i].x, LAYOUT.laneX);
    const expectedY = LAYOUT.top + i * (LAYOUT.cardHeight + LAYOUT.gap);
    assert.equal(elements[i].y, expectedY);
    if (i > 0) {
      assert.ok(elements[i].y >= elements[i - 1].y + elements[i - 1].height);
    }
  }
});

test('rejected artifacts are excluded from the default projection', () => {
  const state = loadState();
  state.reject('artifact_002');
  const { cards } = projectArtifacts(state.list());
  const ids = cards.map((c) => c.artifact_id);
  assert.ok(!ids.includes('artifact_002'));
  assert.deepEqual(ids, ['artifact_001', 'artifact_003']);
});

test('debug projection includes rejected artifacts', () => {
  const state = loadState();
  state.reject('artifact_002');
  const { cards, debug } = projectArtifacts(state.list(), { debug: true });
  assert.equal(debug, true);
  assert.ok(cards.map((c) => c.artifact_id).includes('artifact_002'));
  assert.equal(cards.length, 3);
});

test('accepting an artifact updates its projected card state and color', () => {
  const state = loadState();
  state.accept('artifact_001');
  const { elements, cards } = projectArtifacts(state.list());
  const card = cards.find((c) => c.artifact_id === 'artifact_001');
  const element = elements.find((e) => e.id === 'proj-artifact_001');
  assert.equal(card.state, 'accepted');
  assert.equal(element.strokeColor, '#16a34a');
});

test('editing an artifact updates the projected card text', () => {
  const state = loadState();
  state.edit('artifact_003', 'Reworded by the reviewer.');
  const { elements, cards } = projectArtifacts(state.list());
  const card = cards.find((c) => c.artifact_id === 'artifact_003');
  const element = elements.find((e) => e.id === 'proj-artifact_003');
  assert.equal(card.text, 'Reworded by the reviewer.');
  assert.equal(card.state, 'edited');
  assert.equal(element.label.text, 'Reworded by the reviewer.');
});

test('activeArtifactId focuses exactly one card with a thicker stroke', () => {
  const state = loadState();
  const { elements, cards } = projectArtifacts(state.list(), {
    activeArtifactId: 'artifact_002',
  });
  const focused = cards.filter((c) => c.focused);
  assert.equal(focused.length, 1);
  assert.equal(focused[0].artifact_id, 'artifact_002');
  const element = elements.find((e) => e.id === 'proj-artifact_002');
  assert.equal(element.strokeWidth, 2);
  const other = elements.find((e) => e.id === 'proj-artifact_001');
  assert.equal(other.strokeWidth, 1);
});

test('projecting an empty list yields an empty scene', () => {
  const { elements, cards } = projectArtifacts([]);
  assert.deepEqual(elements, []);
  assert.deepEqual(cards, []);
});

test('projectArtifact produces a labeled rectangle skeleton element', () => {
  const element = projectArtifact(
    { artifact_id: 'artifact_x', kind: 'claim', state: 'staged', text: 'Hello' },
    0,
    false
  );
  assert.equal(element.type, 'rectangle');
  assert.equal(element.id, 'proj-artifact_x');
  assert.equal(element.label.text, 'Hello');
  assert.equal(element.strokeWidth, 1);
});
