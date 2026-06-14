# Lumen Light Architecture

## Runtime loop

```text
input stream
  -> turn queue
  -> semantic pass
  -> surface planner
  -> staged canvas update
  -> user or policy approval
  -> live canvas state
  -> artifact emission
```

## Modules

- `browser highlighter`: lets a reader select text in static HTML and preserve reversible visual emphasis.
- `turn queue`: buffers speech or text turns into meaningful chunks.
- `text light`: assigns optional state metadata to transcript spans.
- `surface planner`: proposes cards, diagrams, and whiteboard changes.
- `staging layer`: keeps proposed changes inspectable before they become live state.
- `artifact emitter`: writes structured records for memory enrichment.

## Static HTML highlighter

The public browser runtime lives at `src/lumen-light.js`.

It is intentionally small:

- no dependencies
- manual gold highlights from selected text
- purple partner highlights through `window.lumen.highlight(text)`
- local persistence with `localStorage`
- export through `window.lumen.export()`
- page-local clear through `window.lumen.clear()`

The highlighter stores exact selected text plus a short prefix and suffix. On reload, it uses that context to re-anchor highlights into the current DOM. If the source document changes too much, a highlight may be skipped rather than forced into the wrong place.

## Memory integration boundary

Lumen Light sends structured artifacts outward. It does not need to own durable recall, provenance, or long-term insight. OpenReflect or other memory systems can enrich artifacts and return context, suggestions, or related prior material.

## Public artifact contract

Each artifact should include:

- stable artifact ID
- source turn IDs
- artifact kind
- human-readable text
- optional surface object metadata
- memory-enrichment hints
- provenance and confidence fields
