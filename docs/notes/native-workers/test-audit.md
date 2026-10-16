# Native worker validation failure attribution

Original source: `dc2662d9f2eaabf9b7ba14693f8ddda8a56aeeff`. Backend checkpoint: `ffd6565d4`.

Baseline source extracted to `/tmp/homarr-original-audit-23k4kpp9` (64.86 MiB tracked tree). Installed external dependencies were symlinked; baseline workspace packages resolve to baseline source. No install, Docker build, full-suite run, or original checkout edits were performed. This is original-source verification using the current pinned dependency installation, not recreation of an old installation.

## Existing original-source failures reproduced

| File                                                                                 | Failing tests | Original-source result                                                            |
| ------------------------------------------------------------------------------------ | ------------: | --------------------------------------------------------------------------------- |
| packages/custom-widgets/src/test/ai-evaluation.spec.ts                               |             1 | Missing dispatcharr bundled example                                               |
| packages/custom-widgets/src/test/ai-prompt.spec.ts                                   |             1 | Test expects obsolete Load required references phrase                             |
| packages/custom-widgets/src/test/ai-assistant-evaluation.spec.ts                     |            10 | Missing presets (9 cases), old research phase expectations (1)                    |
| packages/custom-widgets/src/test/authoring-resources.spec.ts                         |             1 | Bundled runtime reference differs from .agents skill runtime text                 |
| packages/custom-widgets/src/test/reference-widgets.spec.ts                           |            11 | Five bundled widgets present; test expects 15 and eight extra integration presets |
| packages/widgets/src/custom-api/custom-jsx-display.spec.ts                           |             8 | Eight integration presets absent                                                  |
| apps/nextjs/src/app/api/assistant/chat/custom-widget-authoring-context.spec.ts       |             1 | ntfy-inbox bundled example absent                                                 |
| apps/nextjs/src/components/board/sections/grid/test/fixed-grid-item.spec.ts          |             1 | Expected raw px versus calc(px * board-grid-row-scale)                            |
| apps/nextjs/src/components/board/sections/grid/test/grid-preview-geometry.spec.ts    |             2 | Same calc geometry expectation mismatch                                           |
| apps/nextjs/src/components/board/sections/grid/test/grid-resize-outline.spec.ts      |             1 | Same calc geometry expectation mismatch                                           |
| packages/widgets/src/manifest.spec.ts                                                |             1 | Polling manifest missing immich.getAlbumPreview                                   |
| packages/widgets/src/test/translation.spec.ts                                        |             1 | rssFeed descriptionMaxLength description translation                              |
| apps/nextjs/src/components/board/items/board-recipe-recommendations.spec.ts          |             1 | Recommendations fixture differs                                                   |
| packages/integrations/src/unifi-controller/test/unifi-controller-integration.spec.ts |             6 | Existing @homarr/redis mock omits getIntegrationSessionStoreKey                   |
| apps/nextjs/src/app/api/assistant/chat/assistant-execution-policy.spec.ts            |             1 | Existing 240000 actual versus 90000 expected                                      |
| test/renovate.spec.ts                                                                |             1 | better-sqlite3 trusted dependency lacks automerge-disable rule                    |

**48 original-source failing tests reproduced in 16 files.**

## Migration failures

| File                                                                    | Original-source proof | Attribution                                                                                                                                    |
| ----------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| apps/nextjs/src/app/api/mcp/_protocol.spec.ts                           | 17/17 pass            | Checkpoint changed native procedure/error representation; source and tests unchanged after checkpoint. Assigned global_mcp_explore.            |
| apps/nextjs/src/app/api/[...trpc]/route.spec.ts                         | 6/6 pass              | Checkpoint router migration now calls createApiContext; mock still provides createTRPCContext. Assigned global_mcp_explore.                    |
| apps/nextjs/src/instrumentation.spec.ts                                 | 6/6 pass              | Checkpoint deliberately removed embedded services from Next; tests still expect embedded tasks/WebSocket services. Assigned native_manage.     |
| packages/widgets/src/prefetch.spec.ts                                   | 1/1 pass              | Checkpoint switched direct DB prefetch to remote API requests; test still mocks DB and has no request headers context. Assigned native_manage. |
| packages/widgets/src/_inputs/widget-custom-widget-select-input.spec.tsx | 2/2 pass              | New post-checkpoint ResourceAvatar import; @homarr/ui mock exports only Link. Assigned native_resources.                                       |
| packages/api/src/router/test/docker/docker-router.spec.ts               | Not rerun here        | Root assigned worker_capabilities; kept out of this audit.                                                                                     |

## Source equality evidence

| Path                                                                                 | Original = checkpoint | Original = current | SHA256 prefix    |
| ------------------------------------------------------------------------------------ | --------------------- | ------------------ | ---------------- |
| packages/custom-widgets/src/core/bundled-widgets.ts                                  | True                  | True               | 17eb10557ddaee59 |
| packages/custom-widgets/src/core/ai-prompt.ts                                        | True                  | True               | ac3451866257f410 |
| packages/custom-widgets/src/core/assistant-authoring-phase.ts                        | True                  | True               | e31120ea1904d73e |
| packages/custom-widgets/src/core/authoring-resources.ts                              | True                  | True               | 4a329be49aa09190 |
| .agents/skills/homarr-custom-widget/references/runtime.md                            | True                  | True               | 3cba8f3f2952227c |
| packages/custom-widgets/scripts/ai-evaluation.ts                                     | True                  | True               | 72d91be78200ba93 |
| packages/custom-widgets/scripts/ai-assistant-evaluation.ts                           | True                  | True               | bc3c9cf30531d700 |
| packages/custom-widgets/src/test/ai-prompt.spec.ts                                   | True                  | True               | 1cc6b230919ccd15 |
| packages/custom-widgets/src/test/authoring-resources.spec.ts                         | True                  | True               | a090dd0db88bcd48 |
| packages/widgets/src/manifest.spec.ts                                                | True                  | True               | 700fca469ada5fd2 |
| packages/widgets/src/manifest.ts                                                     | True                  | True               | c73a5ba5dbfbf4e9 |
| packages/integrations/src/unifi-controller/unifi-controller-integration.ts           | True                  | True               | 0ca12f8dd64eb5fc |
| packages/integrations/src/unifi-controller/test/unifi-controller-integration.spec.ts | True                  | True               | 4322f65004ad1179 |

## Evidence logs

- `/tmp/homarr-original-customwidget-audit.log`: five selected files, 24 failed / 70 passed.
- `/tmp/homarr-original-dom-audit.log`: eleven selected files, 17 failed / 974 passed; first UniFi attempt failed collection until external @homarr/node-unifi link was added.
- `/tmp/homarr-original-migrated-audit.log`: six selected files, 7 failed / 33 passed (UniFi six, existing execution policy one; migrated MCP/REST/instrumentation/prefetch pass).
- `/tmp/homarr-current-widget-select-audit.log`: focused current picker mock failure.

Current root full-suite log started unexpected e2e projects despite CLI negative-project arguments. E2E failures were not reproduced or classified in this source audit; root was alerted.
