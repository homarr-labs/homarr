# Focused reproduction notes

All instances were disposable demo databases. No original user export or external service credentials were reused. Browser: headless Chromium on Linux. Initial runtime source: `681c1dd15a5d4753c04a84f7cb92a60e47a2c360`; latest notebook smoke: `439b208283c2e80dd399fcb2a83e1661bb0c099f`.

## #962: nested container menu collision

1. Create a public board with Base and Mobile layouts.
2. Add three nested Containers. Set their titles to Outer, Inner and Deep; disable visible labels and enable collapse controls.
3. Place children at the origin of each parent. Enter board edit mode at1280×900.
4. Measure each Settings button and hit-test its center. In the captured fixture, Deep overlaps Inner by18.484375×18.75px, and Deep's center targets Inner.

Fixture/state: [creation script](ui/create-nested-fixture.js), [saved payload](ui/nested-fixture-result.json), [measurement script](ui/measure-handles.js), [geometry](ui/nested-handles.json), [hit targets](ui/nested-handle-hit-targets.json), [screenshot](ui/nested-handles.png).

## #2911: consecutive app drags

From the same nested board, place two App widgets in Deep. Drag the first to the root, then immediately drag the second to the root without refreshing or restarting edit mode. Save and reload. Both Base-layout section IDs must equal the root; the outer container must retain its original position. This passed. Mobile membership intentionally remained independently persisted; it is not proof of automatic Base-to-Mobile propagation.

[Fixture script](ui/create-app-drag-fixture.js), [drag labels](ui/repeated-app-drags-labels.json), [saved state](ui/after-repeated-app-drags.json).

## #3140 / #3805 / #4738: persistence

Edit notebook content and bookmark title through widget controls. Await completed save, navigate to board settings and back, then reload. Repeat a public read in a separate anonymous browser. Add a custom layout, change columns and breakpoint, save and reload. The fresh fixture retained both content and layout state. It does not recreate Helm/OIDC or the original problematic migrated board.

[Layout readback](ui/custom-layout-after-reload.json), [content screenshot](ui/bookmark-notebook-persistence.png), [anonymous read](ui/public-board-reload.png), [latest notebook saved state](ui/latest-notebook-saved.json).

Automation caveats: this browser CLI's `fill` prepended into Tiptap rather than replacing text; number input replacement required explicit selection/clearing. A notification could cover the settings Save control. Save/reload checks must await actual mutation completion; immediately navigating after a click is not completion evidence. The report uses persisted readback, not the attempted input alone.

## API and synthetic-service checks

- [MCP check script](auth/mcp-check.sh): requires a disposable API key supplied via environment; no real key is embedded.
- [Integration source contracts and mock server](integrations/check-integrations.mjs), [runtime smoke](integrations/runtime-smoke.mjs), [synthetic payloads](integrations/fixtures.mjs).
- [Platform checks and logs](platform/platform.json): separate ready-state versus migration-phase shutdown; direct UID:GID startup and outbound-disabled weather.

These scripts modify only disposable fixture state when run against the recorded local test URLs. Running them against another instance requires deliberately selecting that instance and suitable test data; source/mock success is not live-service acceptance.
