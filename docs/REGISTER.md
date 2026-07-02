# Product Register — Lumen Light (LL-)

QTrellis register. Rules: `~/.claude/skills/qtrellis/SKILL.md`
Stable = UCXM has no − and no ?. Scores are lazy and must carry reasons.
Backfilled 2026-07-02 from the sessions of 2026-06-27 → 2026-07-02.

## Register

| ID | Item (≤5 words) | From | Status | UCXM | Proof | Note |
|----|-----------------|------|--------|------|-------|------|
| LL-001 | Session re-grounding from canvas | — | built | | [ADR-0009](decisions/ADR-0009-session-regrounding-from-canvas.md) | resolved BUG-001 gap 1 |
| LL-002 | Conversation transcript persists locally | LL-001 | built | | [ADR-0010](decisions/ADR-0010-persist-conversation-transcript.md) | resolved BUG-001 gap 2 |
| LL-003 | Read canvas text inventory | LL-001 | built | ++++ | [SPEC](SPEC.md) | U: fixes blindness; C: 30min reuse; X: tiny text; M: no-arg tool |
| LL-004 | Clear canvas, confirmed, undoable | — | built | ++0+ | [SPEC](SPEC.md) | U: restores lost capability; C: small; M: tool enforces confirm, not memory |
| LL-005 | Board inventory, extensible tagging | — | built | ++0+ | [ADR-0012](decisions/ADR-0012-canvas-agnostic-inventory.md) | U: unlocks addressing; C: one tested module; M: closed schema |
| LL-006 | Hand-drawn content never invisible | LL-003 | built | | [KNOWN_ISSUES](KNOWN_ISSUES.md) | resolved BUG-004 |
| LL-007 | Model recognizes freehand drawings | LL-006 | built | | [KNOWN_ISSUES](KNOWN_ISSUES.md) | verified live: "house with sun" |
| RISK-001 | Big payloads kill voice channel | — | concept | | [ADR-0011](decisions/ADR-0011-visual-grounding-on-resume.md) | X player defects ≥ ~256KB per message |
| RISK-002 | Storage quota silently stops persistence | — | concept | | [ADR-0012](decisions/ADR-0012-canvas-agnostic-inventory.md) | screenshot images are megabytes; quota ~5MB; saveScene swallows failure |
| GAP-002 | Surface and survive storage-quota failures | RISK-002 | concept | ++0+ | [ADR-0012](decisions/ADR-0012-canvas-agnostic-inventory.md) | U: prevents silent board loss; C: warn on save failure + slim scene; M: deterministic |
| GAP-001 | Verify Inworld accepts remote image_url | RISK-001 | concept | ++?0 | [KNOWN_ISSUES](KNOWN_ISSUES.md) | U: unlocks vision tier; C: one-session spike; X: the unknown itself; gates IDEA-001/003 |

## Ideas

| ID | Item (≤5 words) | From | Status | UCXM | Proof | Note |
|----|-----------------|------|--------|------|-------|------|
| IDEA-001 | Full-res vision by URL reference | RISK-001 | idea | | | pixels over HTTP, not data channel |
| IDEA-002 | Cheap fixed-size whole-board overview | RISK-001 | idea | ++0? | | U: Waldo queries; C: export scaling exists; M: legibility at 768px unverified |
| IDEA-003 | Per-asset zoom by node id | IDEA-001 | idea | | | look at one thing full-res |
| IDEA-004 | Take-me-to board navigation | LL-005 | idea | +++0 | | U: conversational navigation; C: one scrollToContent call; X: bytes; M: label matching may miss |
| IDEA-005 | Model annotates items with tags | LL-005 | idea | 0+0? | | C: write path exists; U: unclear until retrieval consumes tags; M: tagging quality unknown |
| IDEA-006 | Save board to Excalidraw library | LL-004 | idea | | | visible stash before clear; binary round-trip unverified |
| IDEA-007 | Selection and viewport as focus | LL-005 | idea | ++++ | | U: fixes "this one"; C: appState read; X: bytes; M: deterministic signal |
