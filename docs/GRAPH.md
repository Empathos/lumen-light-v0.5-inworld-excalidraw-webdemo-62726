# Lineage Graph — Lumen Light (LL-)

Derived by Graphify from `REGISTER.md` — do not edit; regenerate with:
`node validate/graphify.mjs docs/REGISTER.md > docs/GRAPH.md`

```mermaid
flowchart LR
  LL_001["LL-001<br/>Session re-grounding from canvas"]
  LL_002["LL-002<br/>Conversation transcript persists locally"]
  LL_003["LL-003<br/>Read canvas text inventory"]
  LL_004["LL-004<br/>Clear canvas, confirmed, undoable"]
  LL_005["LL-005<br/>Board inventory, extensible tagging"]
  LL_006["LL-006<br/>Hand-drawn content never invisible"]
  LL_007["LL-007<br/>Model recognizes freehand drawings"]
  RISK_001{{"RISK-001<br/>Big payloads kill voice channel"}}
  RISK_002{{"RISK-002<br/>Storage quota silently stops persistence"}}
  GAP_002["GAP-002<br/>Surface and survive storage-quota failures"]
  GAP_001["GAP-001<br/>Verify Inworld accepts remote image_url"]
  IDEA_001(["IDEA-001<br/>Full-res vision by URL reference"])
  IDEA_002(["IDEA-002<br/>Cheap fixed-size whole-board overview"])
  IDEA_003(["IDEA-003<br/>Per-asset zoom by node id"])
  IDEA_004(["IDEA-004<br/>Take-me-to board navigation"])
  IDEA_005(["IDEA-005<br/>Model annotates items with tags"])
  IDEA_006(["IDEA-006<br/>Save board to Excalidraw library"])
  IDEA_008(["IDEA-008<br/>Host canvas images on GCS"])
  IDEA_009(["IDEA-009<br/>Non-Google router model for vision"])
  IDEA_007(["IDEA-007<br/>Selection and viewport as focus"])
  LL_001 --> LL_002
  LL_001 --> LL_003
  LL_003 --> LL_006
  LL_006 --> LL_007
  RISK_002 --> GAP_002
  RISK_001 --> GAP_001
  RISK_001 --> IDEA_001
  RISK_001 --> IDEA_002
  IDEA_001 --> IDEA_003
  LL_005 --> IDEA_004
  LL_005 --> IDEA_005
  LL_004 --> IDEA_006
  GAP_001 --> IDEA_008
  GAP_001 --> IDEA_009
  LL_005 --> IDEA_007
  style LL_001 fill:#d3f2d3,stroke:#2e7d32
  style LL_002 fill:#d3f2d3,stroke:#2e7d32
  style LL_003 fill:#d3f2d3,stroke:#2e7d32
  style LL_004 fill:#d3f2d3,stroke:#2e7d32
  style LL_005 fill:#d3f2d3,stroke:#2e7d32
  style LL_006 fill:#d3f2d3,stroke:#2e7d32
  style LL_007 fill:#d3f2d3,stroke:#2e7d32
  style RISK_001 fill:#fff3cd,stroke:#b58900
  style RISK_002 fill:#fff3cd,stroke:#b58900
  style GAP_002 fill:#d3f2d3,stroke:#2e7d32
  style GAP_001 fill:#d3f2d3,stroke:#2e7d32
  style IDEA_001 fill:#eef,stroke:#667,stroke-dasharray:4
  style IDEA_002 fill:#eef,stroke:#667,stroke-dasharray:4
  style IDEA_003 fill:#eef,stroke:#667,stroke-dasharray:4
  style IDEA_004 fill:#eef,stroke:#667,stroke-dasharray:4
  style IDEA_005 fill:#eef,stroke:#667,stroke-dasharray:4
  style IDEA_006 fill:#eef,stroke:#667,stroke-dasharray:4
  style IDEA_008 fill:#eef,stroke:#667,stroke-dasharray:4
  style IDEA_009 fill:#eef,stroke:#667,stroke-dasharray:4
  style IDEA_007 fill:#eef,stroke:#667,stroke-dasharray:4
```

Legend: rectangles = registered items, hexagons = risks, stadiums = ideas; green = built/supported, amber = concept/spec, dashed = idea, grey = deferred/superseded.
