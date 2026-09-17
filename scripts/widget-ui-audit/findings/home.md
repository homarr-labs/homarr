# Home and automation

## Capture completeness

- Board: `widget-ui-audit-home` at `http://localhost:3001/boards/widget-ui-audit-home`.
- Authenticated demo capture covers ten sizes each for `smartHome-entityState`, `smartHome-executeAutomation`, `anchorNote`, and `assistant` on the 12-column layout (40 widgets per viewport).
- `desktop-1080p`, `desktop-1440p`, and `macbook-pro` each captured 40/40 ready widgets, with 0 widget errors and 0 layout overlaps. The manifest contains 123 PNGs: 40 widget crops plus one full-board image for each viewport.
- The MacBook viewport is configured at DPR 2; its 1x1 crop is 246x246 and the captured larger crops preserve their intended card geometry.

## UI observations

- The 1x1 smart-home state card remains legible, showing `Demo environment` and `On online`. The 5x5 assistant surface shows the single-conversation constraint (`Assistant active in another widget`) with its explanatory text and expand control rather than a conversation transcript.
- Automation cards expose `Run demo routine`; no automation was activated. Anchor notes retain their runbook title and body across sizes.

## Data limitations

- Smart-home and automation values are demo fixtures and do not prove a live home integration or safe execution against a real device. The assistant cards are constrained to one active conversation surface, so the captured permutations show the inactive-state treatment rather than provider response quality; no assistant provider was configured for this audit.
