# Family declarations — scoped before evidence

Declaration-only lease from FAMILY-CLOSURE-WAVE.md:5–13 and ROSTER.md:48–52. Both INTEGRATION-CLIENT-CLOSURE.md and WIDGET-RENDERER-CLOSURE.md were read as frozen planning evidence. No previous COMPOSITION source lease resumes; server-public-ports.md is not repeated or edited.

## Before capture

Captured through dedicated file reads before any declaration edits; no shell, Git, hash, compiler, formatter, install or runtime command. This is exact scoped field evidence, not a recomputed whole-file/HEAD identity certificate. Current HEAD is deliberately unqueried. Preserve every preexisting field, including pending declarations and experiment lock records; never reconstruct a manifest/lock from an earlier task's patch.

All proposed added keys below are absent in the captured manifest scopes. All proposed dependency additions are also absent in the corresponding captured lock workspace scopes. No exports are stored in those lock workspace objects.

### Existing manifest anchors preserved

- Common exports already include `.`, `types`, `object`, `url`, `id`, `grid-algorithm`, `error`, `request`, `number`, `date`, `server`, `client`, `env`; direct Query Core `5.101.2` and all existing dependencies unchanged. Its existing `/request` still has the previously recorded Next runtime boundary.
- Core's last existing HTTP exports are `./infrastructure/http` → `./src/infrastructure/http/index.ts` and `./infrastructure/http/timeout` → `./src/infrastructure/http/timeout.ts`; all existing DB/certificate/log/Redis/environment declarations preserved. Direct `undici: catalog:` already exists.
- Request-handler exports object is exactly `{ "./*": "./src/*.ts" }` before this lease. Preserve that preexisting wildcard; add no new wildcard. Common/Core/Integration/Redis/Day.js/Undici dependencies already exist.
- Widgets' exports end at `./server-prefetch` → `./src/server-prefetch.ts`; existing catalog/manifest/definition/custom-api/assistant/inputs/refetch/shell exports preserved. Its existing `@mantine/hooks`, `@tabler/icons-react`, `@tiptap/react`, `@tiptap/extension-link`, `next`, React and translation dependencies remain unchanged.
- Integrations' exports end at `./stats` → `./src/stats/index.ts`; all SDKs/factory/runtime/response/type/test fields preserved. Existing dependencies have adjacent `axios: catalog:` and `ical.js: catalog:` with no `dayjs` field. No Integration native-client/binding export is added.
- API exports already contain `.`, `nitro`, context/contribution, user/group/invite/api-keys/app/search-engine/server-settings/onboard/home, identity/apps-search/setup-read resources, preferences/settings helpers and all legacy client/server/backup/Custom Widget fields. Preserve every one; no root/assembly runtime export is added. API already declares oRPC beta.43 and all relevant workspace dependencies.

### Nitro exact dependency objects before

These objects also match the captured `bun.lock` `workspaces["apps/nitro"]` fields; trailing commas differ only by the lock's existing syntax.

```json
{
  "dependencies": {
    "@mantine/core": "9.6.0",
    "@mantine/hooks": "9.6.0",
    "@orpc/client": "2.0.0-beta.43",
    "@orpc/server": "2.0.0-beta.43",
    "@tanstack/react-query": "5.101.2",
    "@tanstack/react-router": "1.168.8",
    "nitro": "3.0.260903-beta",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "zod": "4.6.5"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "@tanstack/router-plugin": "1.167.7",
    "@types/bun": "1.3.10",
    "@types/node": "24.13.3",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.3",
    "oxfmt": "0.58.0",
    "oxlint": "1.73.0",
    "typescript": "7.0.2",
    "vite": "8.1.4"
  }
}
```

Scripts, version/private/type, all existing exact pins and every other Nitro field are outside the delta. Nitro's Zod `4.6.5` is not normalized to the root catalog `4.4.3`; both existing lock nodes remain intact.

## Frozen after inventory — exact minimal field delta

The following JSON is an **add-only delta**, not replacement manifests. Every listed key was absent before and now has the exact value below. All other fields retain the working bytes read before this lease. Widgets' former last export receives only the comma necessary to append the two Weather keys; no target is replaced.

```json
{
  "packages/integrations/package.json": {
    "dependencies": { "dayjs": "catalog:" }
  },
  "packages/widgets/package.json": {
    "exports": {
      "./weather/compact": "./src/weather/compact.tsx",
      "./weather/advanced": "./src/weather/advanced.tsx"
    },
    "dependencies": {
      "@mantine/tiptap": "catalog:",
      "@tanstack/react-query": "catalog:",
      "next-intl": "catalog:"
    }
  },
  "packages/common/package.json": {
    "exports": {
      "./response-error": "./src/errors/http/response-error.ts",
      "./bounded-response": "./src/bounded-response.ts"
    }
  },
  "packages/core/package.json": {
    "exports": {
      "./infrastructure/http/transport-agent": "./src/infrastructure/http/transport-agent.ts"
    }
  },
  "packages/request-handler/package.json": {
    "exports": {
      "./nitro-bindings": "./src/nitro-bindings/index.ts"
    }
  },
  "packages/api/package.json": {
    "exports": {
      "./nitro/assembly/client": "./src/nitro/assembly/client.ts",
      "./nitro/routers/widgets": "./src/nitro/routers/widgets.ts",
      "./nitro/routers/integration": "./src/nitro/routers/integration.ts",
      "./nitro/routers/integration-operations": "./src/nitro/routers/integration-operations.ts",
      "./nitro/routers/custom-widget": "./src/nitro/routers/custom-widget.ts",
      "./nitro/routers/board": "./src/nitro/routers/board.ts",
      "./nitro/routers/board-mutations": "./src/nitro/routers/board-mutations.ts",
      "./nitro/routers/user-establishment": "./src/nitro/routers/user-establishment.ts",
      "./nitro/routers/group-mutations": "./src/nitro/routers/group-mutations.ts",
      "./nitro/routers/cron-jobs": "./src/nitro/routers/cron-jobs.ts",
      "./nitro/routers/log": "./src/nitro/routers/log.ts",
      "./nitro/routers/certificates": "./src/nitro/routers/certificates.ts",
      "./nitro/routers/media": "./src/nitro/routers/media.ts",
      "./nitro/routers/kubernetes": "./src/nitro/routers/kubernetes.ts",
      "./nitro/routers/assistant": "./src/nitro/routers/assistant.ts",
      "./nitro/routers/bangs-search": "./src/nitro/routers/bangs-search.ts"
    }
  },
  "apps/nitro/package.json": {
    "dependencies": {
      "@homarr/api": "workspace:^0.1.0",
      "@homarr/common": "workspace:^0.1.0",
      "@homarr/core": "workspace:^0.1.0",
      "@homarr/custom-widgets": "workspace:^0.1.0",
      "@homarr/definitions": "workspace:^0.1.0",
      "@homarr/docker": "workspace:^0.1.0",
      "@homarr/translation": "workspace:^0.1.0",
      "@homarr/ui": "workspace:^0.1.0",
      "@homarr/validation": "workspace:^0.1.0",
      "@homarr/widgets": "workspace:^0.1.0",
      "@tabler/icons-react": "catalog:",
      "@xterm/addon-fit": "catalog:",
      "@xterm/xterm": "catalog:",
      "mantine-react-table": "catalog:"
    },
    "devDependencies": { "sass": "catalog:" }
  }
}
```

**22 export fields and 19 dependency fields** added to the seven manifests. In `bun.lock`, only **19 corresponding workspace dependency fields** are added: Integration `dayjs`; Widgets Tiptap/Query/next-intl; Nitro's fourteen runtime and one development fields above. Common/Core/request-handler/API lock workspace objects need no edits because exports are not represented there and their dependencies already exist. No fields removed, no catalog edits, no package/resolved-node/patch/integrity changes, no version changes or lock replacement. Export-only manifest additions do not authorize a new dependency graph.

After evidence is the exact field inventory above and retained dedicated file reads of the resulting declarations. No automated structural/preservation check or whole-file hash equality is claimed. The patch operations are deliberately local additions; independent review must verify that exact bounded delta before consumption. No source-free fixture or install proof was requested/created in this lease.

## Actual frozen import / source-target evidence

Paths and lines below refer to the source bytes read, not executed. No new source files or future targets are exported.

### Source package dependencies

- Integration `src/unraid/unraid-integration.ts:1` and `src/truenas/truenas-integration.ts:1` import Day.js directly. Root catalog and existing vendor node agree on `1.11.21`; adding only `dayjs: catalog:` resolves declared ownership, not the ambient legacy-client transport graph.
- Widgets `src/notebook/notebook.tsx:22,67` imports Mantine Tiptap and its styles; `src/definition.ts:2–3` imports Query types and runtime `hashKey`; `src/beszel/_shared/use-live-stats.ts:4` imports `skipToken`; `src/releases/component.tsx:29` imports next-intl formatter/clock. These are real source imports, not speculative view dependencies.

### Common/Core/request-handler leaves

- `common/src/errors/http/response-error.ts` contains the actual `ResponseError` class with no imports. Frozen request-handler `nitro-bindings/weather.ts:7`, `air-quality.ts:6`, `timetable.ts:5` already name the missing public `/response-error` path.
- `common/src/bounded-response.ts` contains actual `readBoundedJsonResponseAsync`, no imports; `request-handler/src/nitro-bindings/timetable.ts:4` already names `/bounded-response`. No claim is made here about physical reader/body cleanup: source semantics remain unchanged.
- `core/src/infrastructure/http/transport-agent.ts:1–2` type-imports Undici Dispatcher and runtime-imports `EnvHttpProxyAgent` from `undici/index.js`. Core already directly declares Undici. `request-handler/src/nitro-bindings/http.ts:6` names this exact missing public leaf. This remains a **server transport leaf**, not browser-safe, and no agent is constructed.
- `request-handler/src/nitro-bindings/index.ts` is an existing explicit factory entry, exposing genuine Widget HTTP, requests, statistics and shutdown definitions. This is not a pure-view/type-only leaf; it statically imports source weather/air quality/other request modules. Its `resources.ts` retains Integration/Redis state type edges and real operation/physical-resource obligations. Preserve all previous request/Stats/HTTP guards and physical holds. No factory was invoked; declaration does not attest a clean full runtime prefix.

### API native declarations and type-client assembly

All fifteen added router targets exist and define their genuine named factories. Dedicated source reads confirmed actual source-owned definitions/dependencies; these are **not** body generation, new routes or runtime assembly. Existing frozen Nitro consumers use these targets through local source TYPE imports:

| Added router suffix                     | Frozen consumer evidence under `apps/nitro/src/features/`                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `widgets`                               | `widgets-runtime/transport.ts:5` public TYPE import, `widgets-editor/contracts.ts:5` source TYPE import |
| `integration`, `integration-operations` | `integrations/client.ts:5–6`, `search/native-types.ts:1–2`                                              |
| `custom-widget`                         | `widgets-editor/contracts.ts:6`, `workshop/client.ts:4`                                                 |
| `board`, `board-mutations`              | `boards/contracts.ts:5–6`, `identity/client.ts:10`, `widgets-editor/contracts.ts:7`                     |
| `user-establishment`, `group-mutations` | `identity/client.ts:5,7`                                                                                |
| `cron-jobs`, `log`                      | `operations/client.ts:5–6`                                                                              |
| `certificates`                          | `certificates/client.ts:5`, `integrations/client.ts:7`                                                  |
| `media`                                 | `media/contracts.ts:4`                                                                                  |
| `kubernetes`                            | `kubernetes/contracts.ts:4`                                                                             |
| `assistant`                             | `assistant/client.ts:4`                                                                                 |
| `bangs-search`                          | `search/client.ts:6`                                                                                    |

`api/src/nitro/assembly/client.ts` consists solely of TYPE imports from oRPC and the existing assembly factory, exporting `ExpansionApiAssemblyClient`. Its **compiler** graph reaches the factory's Integration/Widgets/Custom Widget source dependencies. This does not certify those as runtime-safe or eliminate source/type errors. No export for the eager assembly `index.ts`, API wildcard, full aggregate or new registry is added. The source-local TYPE consumers remain unchanged; converting them to public edges is a separately allocated producer obligation.

Router source graph holds remain explicit: Widgets still runtime-imports `@homarr/common/server` and Custom Widgets/server; user establishment still imports Auth/security; Integration operations still depends on real policy/Custom Widgets/server; Media still depends on policy and unconditional execution holds; Assistant retains its source services. A declared leaf is not a safe runtime entry or authority proof. Consumers must not evaluate these routers merely because a TYPE consumer exists.

No new native Docker export is selected: the frozen Docker client still uses legacy API-root types, and the plan holds its separately typed native client join. Existing root exports are preserved, not promoted. Likewise no Integration `native-clients` or Widget `rendering/*` entries are added: their proposed files/seams are future producer work.

### Weather views

`widgets/src/weather/compact.tsx:25` exports real `CompactWeather`; `advanced.tsx` defines real `AdvancedWeather` with charts, icons, formatters/details and existing styles. Frozen `apps/nitro/src/features/widgets-runtime/views/weather.tsx:5–6` already runtime-imports both public paths. Their source imports include translation/client, UI root, local details/icons/CSS, React/Mantine and type-only Widget definition; all are existing source dependencies. These exports expose the genuine views, not simplified replacements. **Full browser/theme/culture/CSS/type closure remains held**; none was bundled/rendered/evaluated here.

### Nitro direct edges only

- API: native Widget transport TYPE import plus actual `widgets-runtime/hooks.ts` query-cache import; existing source API TYPE contracts are not full runtime assembly approval.
- Common: `apps/management.tsx:21`, `integrations/connection-error.tsx:19–20` actual URL/ID leaves.
- Core: `operations/logs-panel.tsx:4–5` actual constants plus LogLevel TYPE.
- Custom Widgets: `widgets-editor/contracts.ts:16–23`, `custom-widget-configuration.tsx:22`, `workshop/client.ts:7–9` existing source TYPE edges only; **not** browser/runtime approval.
- Definitions: `widgets-runtime/host.tsx:8–9`, `apps/context.tsx:6–7` actual named TYPE/runtime imports.
- Docker: `docker/columns.tsx:6` actual public `/shared` helper import.
- Translation: `operations/tasks-panel.tsx:4` actual standalone formatter/i18n import; retained Widget translation/client graph remains separately held.
- UI: `integrations/catalog.tsx:8–9` actual widget-icon/integration-selection imports.
- Validation: `auth/login-form.tsx:5`, `apps/app-form.tsx:9` actual source schemas.
- Widgets: `widgets-runtime/host.tsx:12–21` genuine definition/error/manifest/shell imports, plus Weather runtime paths above.
- Tabler: `integrations/list-page.tsx:18` and Docker action/reconciliation components import icons directly.
- Mantine React Table: `docker/inventory.tsx:3` actual runtime table/hook import; columns/binding also use TYPE shapes. Keep the existing alias pin, not a new table choice.
- Xterm/addon-fit: `docker/logs.tsx:3–4` TYPE imports **and :121,123 runtime dynamic imports**. These are not type-only runtime-safety evidence. Terminal construction/lifetime/native wire graph remains unvalidated.
- Sass development dependency: real `widgets/src/rssFeed/component.tsx:17` imports `component.module.scss`, and that existing stylesheet uses nested selectors. This is the stylesheet requirement selected by the frozen renderer plan, not a fabricated future `.scss`. No Vite configuration/stylesheet/build output was changed or compiled.

No new Next/tRPC/Redis dependency is added to Nitro to mask legacy contexts. No hypothetical direct Day.js/chart/editor dependency is added to Nitro absent a frozen direct import; those stay with the existing source package until a reviewed consumer actually needs them.

## Existing catalog / resolved-node evidence

Dedicated reads of root `package.json` catalog and `bun.lock` catalog/package records establish the following identical existing pins. Resolved records and their integrity metadata were read-only, not regenerated or freshly fetched.

| New catalog declaration         | Existing catalog and vendor identity                                    |
| ------------------------------- | ----------------------------------------------------------------------- |
| Integration `dayjs`             | `1.11.21` / `dayjs@1.11.21`                                             |
| Widgets `@mantine/tiptap`       | `9.6.0` / `@mantine/tiptap@9.6.0`                                       |
| Widgets `@tanstack/react-query` | `5.101.2` / `@tanstack/react-query@5.101.2`                             |
| Widgets `next-intl`             | `4.13.1` / `next-intl@4.13.1`                                           |
| Nitro `@tabler/icons-react`     | `3.44.0` / `@tabler/icons-react@3.44.0`                                 |
| Nitro `@xterm/addon-fit`        | `0.11.0` / `@xterm/addon-fit@0.11.0`                                    |
| Nitro `@xterm/xterm`            | `6.0.0` / `@xterm/xterm@6.0.0`                                          |
| Nitro `mantine-react-table`     | `npm:mantine-react-table-open@9.0.3` / `mantine-react-table-open@9.0.3` |
| Nitro dev `sass`                | `1.101.0` / `sass@1.101.0`                                              |

All ten new Nitro workspace dependencies have existing resolved workspace records pointing to their exact `packages/<name>` directories. `workspace:^0.1.0` follows the existing repo declarations; no workspace version changes.

Read recorded peer ranges rather than guessing: Tiptap Mantine core/hooks require exactly `9.6.0`, React/DOM `^19.2.0`, Tiptap react/link `>=3.3.0`; recorded nodes are Mantine `9.6.0`, React/DOM `19.2.7`, Tiptap react/link `3.31.3`. Query accepts React `^18 || ^19`. next-intl accepts recorded Next `16.3.6` under `^16.0.0` and React `^19.0.0`; this is relevant to **Widgets**, not permission to add Next to Nitro. Table's recorded Mantine `^9.0.0`/React `>=19.2` ranges agree with existing nodes; other peer/physical/render behavior is not verified. Vite's recorded Sass peer is `^1.70.0`, consistent with `1.101.0`.

This is textual pin/record evidence, **not** installed resolution, engine detection, a semver-tool run, an install-closure certificate or runtime compatibility proof. Node/Bun engine/runtime behavior remains deferred; no current environment was read. A missing/incompatible pin/node must remain a hold in later reviews, never a fetched replacement under this lease.

## Unresolved edges and refusal boundaries

1. **Xterm Canvas incompatibility:** frozen Docker `logs.tsx:122` dynamically imports `@xterm/addon-canvas`. Existing catalog/node is `0.7.0`, whose recorded peer requires `@xterm/xterm: ^5.0.0`; existing Xterm is `6.0.0`. No Canvas direct field, node replacement or downgrade is added. Canvas/native Docker log graph remains held for a separately reviewed compatible source/dependency choice.
2. **Cookie agents:** UniFi `unifi-controller-integration.ts:3` imports `http-cookie-agent/http`. An existing transitive `http-cookie-agent@6.0.8` node is present, but no root catalog/direct Integration pin is established. Recorded optional Undici peer is `^5.11.0 || ^6.0.0`, not the root Undici `7.29.1`; HTTP-only compatibility must not be inferred from an optional-peer conflict alone or assumed as proven. Genuine cookie/agent/SDK ownership remains held; no guessed cookie-agent field or upgrade.
3. **DAV node-fetch:** Nextcloud `nextcloud.integration.ts:6` TYPE-imports `RequestInit` from `node-fetch` and documents its cross-fetch bridge. Existing transitive `node-fetch@2.7.0` is not an approved direct dependency/type/agent seam; no catalog pin establishes the bridge's compatible shape. TYPE usage is not runtime safety. No node-fetch declaration, type shim, cast or new SDK.
4. **Frozen client/type compatibility:** source-local factory types, original nominal Integration classes, legacy API root TYPE tails and foreign-client joins remain exactly as frozen. Public fields do not repair missing/wrong factory names, legacy Next/environment tails or source errors. No source/type-client substitution happened here.
5. **Producer gaps:** five future Integration directories and six Widget producer sets remain undispatched by this lane. No future native-client/rendering/barrel export, duplication, permissive validator, controller replacement or fake source resource.
6. **Full graphs and production:** B/C/D/runtime/browser/physical trust/admission/lifecycle/COMMIT/reset/restore/private auth/SQL/SSR/Stats/stream/image/cookie/socket/Q16/Q17/Q18 holds remain. Declaration availability neither mounts routers nor raises any acceptance count. Earlier frozen guarded failures remain historical evidence and are not refreshed/reopened here.

## Independent review gate and final validation

**Return frozen for independent scoped declaration review BEFORE the eleven source producers consume these edges.** This lane does not dispatch producers, authorize overlapping source writes, modify plans/roster or wait/poll for another owner. Review this exact 41-field manifest / 19-field lock workspace delta against the scoped before/after evidence; preserved source algorithms and prior pending fields remain outside the delta.

Final lint and typecheck are **required after convergence and deferred, not passed**. Install/frozen-lock, resolver/compiler/runtime/browser/native/lifecycle validation also remain unperformed in this lease. File reads are evidence collection, not executable checks. No SHA/HEAD/index/source-graph/hash refresh is claimed, no tests were added, and no prior completed install/graph task was repeated.

Only seven allocated manifests, the three named lock workspace scopes and this exact handoff were patched. No source/root catalog/resolved node/registry/routes/provider/configuration/compiled output/current data/environment/credentials/service/listener changes. No command, lint/type/build/install/format, runtime import/evaluation, SQL/network/provider/browser/Git or nested-agent operation. The cancelled start notification was not retried; no listeners/shared services were touched. No subprocess or graph/hash capture remains active from this lane.
