# Board-03 DnD replay: `board-grid-dense-pointer-dnd-does-not-commit`

- Outcome: **reproduced**
- Candidate: `358d6469cf50ae9513cbce0f9238cd6c03aa4182`
- Target: `http://127.0.0.1:41035/boards/qa-dense-collisions`
- Session: `r03dnd-358d` (closed)
- Viewport: 1440x900, native scale 1
- Scope: reversible physical pointer DnD/resize plus exposed keyboard move/resize/cancel; no save

## Result

The rendered board exposed draggable groups and resize handles. Hit-testing confirmed the selected small item and the blank/collision targets before each pointer trial. Human-paced left-button gestures to a blank gap, to an occupied collision target, and from the resize handle toward a neighbor produced no grid-coordinate, size, box, or reflow change. The fresh gap retry used new measured coordinates and also produced no change. This reproduces the no-commit fingerprint at the rendered interaction surface.

The board's rendered keyboard guidance said: “Press Enter or Space to start keyboard editing. Use arrow keys to move, Shift plus arrow keys to resize, and Escape to stop.” Enter set `data-keyboard-editing=true`; `ArrowRight` and `Shift+ArrowRight` then left the flag false without changing geometry. Escape left the focused item at its baseline geometry.

After reload (without saving), the route was read-only and every item returned to the baseline coordinates/sizes. No permanent mutation was made.

## Measured geometry and hit targets

Full before/trial/final JSON is in [geometry.json](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/geometry.json).

- Selected small item: `qa-v2-item-dense-collisions-collision-7`, baseline grid `(x=0,y=0,w=2,h=2)`, box `(16,76)-(248.15625,308.15625)`.
- Gap target: `(820,160)` / retry `(800,145)`, `elementFromPoint` returned the grid container (no item).
- Collision target: `(350,145)`, `elementFromPoint` returned `qa-v2-item-dense-collisions-collision-9`.
- Resize handle: `(240,300)`, `elementFromPoint` returned `.board-grid-resize-handle` for `collision-7`; the neighbor-directed target was `(470,300)`.
- Source hit-tests `(60,120)`, `(60,145)`, and `(90,145)` returned `collision-7` with `cursor: grab` and `pointer-events: auto`.

## Repro steps and evidence

1. Log in through the agent-browser vault as the supplied QA user and open the target board. Baseline: [baseline.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/baseline.png).
2. Enter edit mode, collapse the setup checklist, and record the editable baseline: [edit-baseline.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/edit-baseline.png).
3. From `(90,145)`, perform a real left-button drag toward `(820,160)` (blank gap). Before/after: [drag-gap-before.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/drag-gap-before.png), [drag-gap-after.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/drag-gap-after.png).
4. Retry once with measured coordinates, from `(60,120)` to `(800,145)`. Before/after: [drag-gap-retry-before.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/drag-gap-retry-before.png), [drag-gap-retry-after.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/drag-gap-retry-after.png).
5. Drag from `(60,120)` to occupied `(350,145)`. Before/after: [drag-collision-before.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/drag-collision-before.png), [drag-collision-after.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/drag-collision-after.png).
6. Start another drag toward `(800,145)`, press Escape while held, then release. Before/after: [drag-escape-before.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/drag-escape-before.png), [drag-escape-after.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/drag-escape-after.png).
7. Drag the measured bottom-right handle `(240,300)` toward `(470,300)`. Before/after: [resize-neighbor-before.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/resize-neighbor-before.png), [resize-neighbor-after.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/resize-neighbor-after.png).
8. Focus the exposed group, press Enter, then `ArrowRight`; no geometry changed. Keyboard baseline: [keyboard-before.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/keyboard-before.png); keyboard resize result: [keyboard-resize-after.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/keyboard-resize-after.png).
9. Re-enter keyboard mode and press Escape. Before/after: [keyboard-cancel-before.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/keyboard-cancel-before.png), [keyboard-cancel-after.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/keyboard-cancel-after.png).
10. Reload without saving and verify read-only baseline: [final-restored.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/final-restored.png).

## Diagnostics and limitations

- `agent-browser errors` and `agent-browser console` were empty after the trials.
- The first gap attempt unexpectedly returned to read-only mode without mutation; the one permitted fresh retry stayed in edit mode but remained unchanged. Both used measured rendered hit targets; this is noted as a targeting/automation variance, not treated as a separate product finding.
- The recorder was started before the gesture sequence, but the CLI produced a zero-byte [physical-gestures.webm](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-dnd-358d/physical-gestures.webm); screenshots and geometry JSON are the usable evidence. No source, database, manifest, original report, or reproducer report was inspected.
