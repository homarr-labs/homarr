# Test audit: API, auth, Custom Widgets, validation

Baseline: `origin/release/v2` at `ea9e2183275f21f7af98f0d58f84414a33e97d87`; worktree branch `audit/testing-prune-v2`. Static review only; no tests were run. Inventory contains 99 `.spec` suites: API 61, auth 15, Custom Widgets 19, validation 4. There are also two support files under test directories: `packages/api/src/router/test/helper.ts` and `packages/custom-widgets/src/test/fixtures/reference-widgets.ts`. No Go or standalone test scripts were found in these package trees.

## Highest-confidence dispositions

- **False positive repaired in the owned diff:** `packages/auth/test/security.spec.ts` had compared hashes of different plaintexts, which said nothing about salting. That case was removed; the same-password/different-salt assertion remains.
- **High-confidence redundant case removed in the owned diff:** `packages/api/src/test/open-api.spec.ts` formerly asserted only that document generation did not throw; the remaining test generates the same document and checks version and required routes.
- **Retain, high signal:** `packages/api/src/test/integration-request.spec.ts` combines a real local HTTP server, DB fixture, and TRPC caller. It checks method/path confinement, stored auth, ownership permissions, redirect/size/compression handling and credential redaction over observable requests. This is integration behavior, not merely a mocked fetch assertion.
- **Retain, high signal:** `packages/custom-widgets/src/test/server-policy.spec.ts` exercises address classification, configured scope and live local HTTP execution; `packages/api/src/router/test/custom-widget/request-executor.spec.ts` covers executor error normalization and redirect/body behavior with local servers. These test our request policy and transport, not upstream services.
- **Retain, high signal:** `packages/api/src/router/board/test/custom-widget-placement-access.spec.ts` covers admin/non-admin add and reconfigure denial, presentation-only edits, removal, duplication and stored defaults.
- **Retain, high signal:** `packages/api/src/router/test/custom-widget/workshop-error-privacy.spec.ts` mocks the Workshop boundary intentionally, injects token-bearing transport errors, and asserts caller output, cause and logs do not expose the token.
- **Retain, high signal:** `packages/auth/permissions/test/{board-permissions,integration-permissions,integration-query-permissions}.spec.ts` exercise permission derivation and database-backed access combinations. Despite some redundant setup, these assertions check grant/deny outcomes.
- **Retain:** `packages/api/src/test/mcp.spec.ts` has subset checks for required catalog content, but separately compares the entire actual MCP inventory to an explicit allowlist and asserts exact diagnostics for malformed/duplicate tools. The broad matcher use does not make its tool exposure contract permissive.
- **Improve:** `packages/api/src/router/test/board-add-item.spec.ts` and selected assertions in `packages/api/src/router/test/onboard.spec.ts` use `arrayContaining`; retain the required-item checks but assert exact counts/sets where they describe the complete created item or placement collection.
- **Improve:** `packages/api/src/test/schema-merger.spec.ts` checks object type and presence of two fields, but not that the merged field schemas validate expected values.
- **Improve:** `packages/api/src/router/test/widgets/app.spec.ts` checks URL and result discriminant only; exact safe result shape would catch missing or malformed result fields.
- **Improve:** `packages/auth/test/session.spec.ts` checks that generated tokens contain lowercase hex and differ, but does not check the documented 96-character token length. Production generates 48 random bytes encoded as hex.
- **Improve:** `packages/custom-widgets/src/test/authoring-resources.spec.ts` uses a broad catalog size minimum (`>100`) with selected required entries. It catches large shrinkage but not smaller catalog omissions; exact membership is appropriate only if that is a stable contract.
- **Mock-only (intentional unit boundaries):** `packages/api/src/router/test/widgets/partial-integration-failures.spec.ts`, `widgets/{rssFeed,calendar,patchmon}.spec.ts`, and `packages/auth/providers/test/ldap-authorization.spec.ts` replace upstream handlers/providers. They validate our mapping, partial failure, and authorization behavior, not external service compatibility.
- **Mock-only (intentional):** assistant provider/generation, telemetry, and MCP suites mock selected providers or infrastructure. Assertions cover our routing, access gating, and output shaping; they do not prove provider network behavior.

Mocked provider/transport tests validate Homarr's behavior at those boundaries; they are not evidence of external service compatibility. Matcher scans were interpreted in context: for example, MCP catalog subset checks coexist with an exact full tool allowlist, so they are not a permissive exposure check.

## File-level dispositions

All 99 suites received a static file-level classification: **91 retain, 8 improve, 0 remove as whole files**. The redundant case in `open-api.spec.ts` and false-positive case in `security.spec.ts` are both removed in the owned diff. “Retain” means the suite has at least one assertion with plausible regression signal; it does not claim every assertion in that file is strong or independently verified against every production branch.

**Improve (8 files):** `packages/api/src/router/test/board-add-item.spec.ts` and `onboard.spec.ts` have subset checks where collection completeness matters; `packages/api/src/test/open-api.spec.ts` contains the redundant no-throw case; `packages/api/src/test/schema-merger.spec.ts` checks field presence without merged-value validation; `packages/api/src/router/test/widgets/app.spec.ts` checks result discriminants rather than complete shapes; `packages/auth/test/security.spec.ts` had the false-positive comparison removed; `packages/auth/test/session.spec.ts` does not assert token length; `packages/custom-widgets/src/test/authoring-resources.spec.ts` uses a broad catalog minimum.

**High-signal retain examples:** `packages/api/src/test/integration-request.spec.ts` uses a local HTTP server, DB fixture and TRPC caller to check confinement, permission, redirect, size and secret-redaction behavior. `packages/custom-widgets/src/test/server-policy.spec.ts` and `packages/api/src/router/test/custom-widget/request-executor.spec.ts` exercise address policy and transport with local servers. `custom-widget-placement-access.spec.ts`, the three auth permission suites, and `workshop-error-privacy.spec.ts` cover meaningful grant/deny or secret-handling contracts.

All 99 suites match configured Vitest discovery: `packages/api/**/*.spec.ts` maps to `api-node`; `packages/custom-widgets/src/**/*.spec.{ts,tsx}` maps to `custom-widgets-node`; auth and validation `.spec.ts` files match the `dom` project's `**/*.spec.{ts,tsx}` and are not excluded there. Root `pnpm test` excludes the `integration`, E2E, and docs-screenshots projects; none of these 99 suite paths is selected into the integration project. The helper and fixture are support files, not standalone suites.

### API (61)

The API package contains 61 of the retained/improve suites; the shared fixture helper is outside that suite count.

### Auth (15)

The auth package contains 15 suites: 13 retain and 2 improve.

### Custom Widgets (19)

The Custom Widgets package contains 19 suites: 18 retain and 1 improve. Its reference fixture is outside the suite count.

### Validation (4)

The validation package contains 4 suites, all classified retain.

## Scope limits

This is a static file-level audit, not line-by-line proof for every assertion. Review prioritized permissions, request confinement, secret handling, weak matchers and mocked IO; mocked upstreams validate Homarr behavior only. No tests, Docker builds, or E2E suites were run.
