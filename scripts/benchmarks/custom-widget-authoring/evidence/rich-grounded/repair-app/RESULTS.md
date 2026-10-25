# Model repair 1: running-app proof

## Result

The exact new model response passes the actual parser/schema/analyzers and the complete assisted creation flow. It persists unchanged, refreshes the real source, renders all six services and all 12 history rows, resolves the incident to **Family photos**, formats the error rate as **1.4%**, and handles the application's actual Empty array without NaN or unit-only values. Console warnings/errors and uncaught page errors were empty.

This is **interaction evidence on a concurrently changing, uncommitted app**, not a source-stable benchmark or a performance comparison. Original `../app/` proof and both candidate-response directories were left untouched. All new artifacts are in this directory. No source edits, manual response repairs, commits, dependency changes, remote account writes, or additional agents.

## Source provenance

Source snapshots bracket browser interaction: `source-before.json` (2026-10-24 23:35:20 UTC) and `source-after.json` (23:39:02 UTC), with per-file hashes and git status. `source-comparison.json` records the comparison.

- HEAD before and after: `0a7067f4fcf316925432cf2d44f0c087f38a1e05`.
- Working source-tree hash before: `ddb2f0711cdba7c97f0c31e5af55b54defb20d30a4633aa50bc8b52a04ccdca5`.
- Working source-tree hash after: `03326e1bc634a4208e3b0be256f26ff1da475bcbb9b80d7cdb6f9f4827da72fa`.
- Tracked diff hash before: `7e9e7b58fad87af4412b92c1a96672f7b2c86fbaeb057e2ebbd687894808e648`.
- Tracked diff hash after: `4a8052e2f2d307ed22d4b90274a0cec9e8d944fd71d9bb497aeb371083e1237a`.
- Changed source-file hashes during the window: `apps/workshop/pb_hooks/workshop.pb.js`, `packages/custom-widgets/src/core/ai-prompt.ts`, `packages/custom-widgets/src/core/authoring-resources.ts`, and `packages/widgets/src/_inputs/widget-custom-widget-configuration-input.tsx`. Git status also captures concurrent non-source-file work; the source aggregate covers 3,691 code/config/style files, not Markdown documentation.
- HMR/compiling indicators occurred during captures. No other agent/session was inspected or coordinated with.

## Exact input and persistence

Before opening the UI, passed the **full** `../candidate-repair-1/reply.md` to `parseCustomWidgetAiResponse`, then `customWidgetDefinitionSchema`, `validateCustomJsxTemplate`, and the workbench `analyzeJsxTemplate`. All succeeded, with **zero issues, warnings, or diagnostics** (`validation.json`). `RefreshButton requestId='overview'` is correct; the original unknown-`request` warning is absent.

- Raw reply SHA-256: `819f7f968e9e8f3d61ed8a6af9484986526bd2ae688250a0e5a2f8d636a2453b`.
- Template: **7,885 characters**.
- Raw model template, actual-parser template, newly loaded edit-page editor, and persisted raw manifest all match exactly:
  `793e602dc5f5e3d4028be52710067b46b05b5850a73ad26e7192f34e7a86cfc9`.
- New definition ID: **`r9aoa3wo3dvow6zre7ak1857`**.
- Edit URL: `http://localhost:3102/manage/custom-widgets/edit/r9aoa3wo3dvow6zre7ak1857`.
- Initial post-create URL included `?created=1`; the optional Workshop sharing nudge was captured, then dismissed with **Not now**. No publish/share action was taken.

`parsed-definition.json` is the actual parser output, not an edited candidate. `persisted-definition.json` was read from the running edit page's raw-manifest UI. `hashes.json` includes all equality checks and persisted source/request configuration.

## Assisted workflow and native query evidence

Used isolated browser `cw-rich-repair`, auth vault `cw-local-fixture`, app `http://localhost:3102`, and parent-owned fixture `http://127.0.0.1:3904`. Password was never read. Optional description/documentation inputs remained blank.

1. Opened `/manage/custom-widgets/new?mode=assisted`, entered source URL without trailing slash, auth `none`, path `/v1/overview`, and clicked **Test API request**. Setup query succeeded; **Create stayed disabled**.
2. **Paste AI response** opened the manual response modal. Filled the entire raw reply as-is, including its fence and trailing prose; clicked **Load response**. Source normalized to `http://127.0.0.1:3904/`. **Create stayed disabled** until a fresh preview.
3. Clicked **Test and preview**. POST `/api/trpc/customWidget.previewCreate` (`57232.1551`) submitted the exact template; GET `/api/trpc/customWidget.previewQuery` (`57232.1552`) executed `overview` in preview session `o9o139vulqqzbgbux6n72va8`. Both returned HTTP 200; actual data rendered and Create enabled.
4. Clicked **Create**. The only persistence request was POST `/api/trpc/customWidget.createFromPreview` (`57232.1553`), HTTP 200, with only `{ "previewSessionId": "o9o139vulqqzbgbux6n72va8" }`. **No direct `customWidget.create` occurred.**
5. On the new edit page, preview session `vjibxinphibj6nvcc46st5aw` performed another real overview load. Clicking the single unchanged widget **Refresh** issued POST `/api/trpc/customWidget.previewRefresh` (`57232.1754`), then GET `/api/trpc/customWidget.previewQuery` (`57232.1755`), HTTP 200. Query count increased from 3 to 4.

The actual Diagnostics UI's redacted journal records two distinct GET `/v1/overview` executions, HTTP 200, **`simulated: false`**, each reporting 3 ms. These are journal observations, not latency benchmarks. See `request-journal.json`, `refresh-check.json`, `request-summary.json`, `mutation-paths.json`, and `all-non-auth-post-paths.json`; saved network artifacts omit auth headers/secrets.

## Full widget coverage

All four tabs were selected on desktop and mobile. `live-tabs.json`, `content-checks.json`, and `mobile-tabs.json` contain full extracted data and comparison evidence, not just headline assertions.

| Area | Actual result |
| --- | --- |
| Summary | All eight metrics render: 6 services, 5 healthy, 1 degraded, 184 ms, 1 open incident, 99.95% uptime, 183294 requests, **1.4%** error rate. Overall degraded status and checked timestamp render. |
| Capacity | CPU 43.2%, memory 12.0 / 32.0 GiB, disk **2.0 / 8.0 TiB**, 17 active sessions. |
| Services | **All six rows and every name/status/latency/uptime/version match** the fixture, including Reverse proxy. Mobile table scrolling reaches right-hand fields and the last row. |
| Incidents | “Photo indexing is delayed”, warning, investigating, `2026-10-24T23:30:00Z`, affected **Family photos**, not raw `photos`. |
| Traffic | **All 12 history rows and every hour/request/error/latency value match**. Latest summary: 22:00, 11300 requests, 14 errors. Actual 694 × 220 px desktop Recharts SVG has nonempty request/error area/curve paths. |
| Refresh | Exactly one generated refresh button in each tested state; real refetch proved above. |

Timestamps no longer redundantly append `UTC` to ISO `Z`. The chart still shares a request/error scale, visually compressing errors near zero; this was not redesigned or claimed perfect.

## Actual fixture controls

Read the real `createPreviewDisplayData` source at `apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-preview-data.ts:26`: Empty uses **`data.overview = []`, not null**. Invoking that same function confirms the array contract (`empty-fixture-contract.json`). No replacement null fixture, mocked network response, or manual runtime repair was used.

Both desktop and mobile actual **Live / Loading / Empty / Error** controls were exercised (`ui-states.json`, `mobile-states.json`):

- **Live:** complete summary, capacity, services, incidents, history, and real chart as above.
- **Loading:** loader and “Loading infrastructure overview…” render.
- **Empty:** “No overview data” / “No complete overview data is available. Use refresh to try again.” No NaN, blank summary, or unit-only `%`/`ms`/GiB/TiB values. The summary and collection tabs are replaced by this useful fallback.
- **Error:** “Overview unavailable” and refresh guidance render.

No malformed-scalar rendering failure occurred with these actual app inputs. This is not a claim that arbitrary remote malformed payloads were exhaustively tested.

## Viewports, errors, and limitations

- Dark desktop **1920 × 1080** and mobile **390 × 844**. Waited for AppShell padding transitions to settle: desktop `310px`, mobile `10px`.
- Desktop Wide canvas 694 × 334 px; Compact 294 × 334 px. Compact content intentionally scrolls vertically.
- Mobile canvas is clamped to 254 × 334 px for Compact and Wide. All measured mobile states/tabs keep document `scrollWidth === clientWidth === 390`—**no page-level horizontal overflow**.
- Mobile Services uses a 407 px table in a 254 px ScrollArea; working horizontal and vertical scrolling exposes all fields/rows. Incidents table is 452 px; Traffic table 280 px. Traffic canvas/chart retains **6 px contained internal horizontal overflow** (260 vs 254 px). Preview canvas scrolling is intentional and not presented as page overflow.
- Browser page errors: **none** (`runtime-errors.json`). Console warnings/errors: **none**, including no source-field controlled/uncontrolled-input warning (`console.json`). HMR informational logs remain captured.
- No source changes were made by this proof task, so no broad lint/typecheck/test suite was run. Parent-owned stage-guard/source tests were not duplicated. Baseline/fixture servers were not stopped.

## Screenshots

All files are under `screenshots/`; 17 captures cover distinct evidence rather than repeating the original 22-shot run.

| Files | Evidence |
| --- | --- |
| `01-setup-tested-create-disabled.png`, `02-reply-imported-create-disabled.png` | Setup and imported-definition Create gating |
| `03-created-workshop-nudge.png` | Newly created widget's optional Workshop nudge |
| `04-desktop-live-wide.png` | Desktop full summary/Capacity, 1.4%, TiB units |
| `05-loading.png`, `06-empty-no-NaN.png`, `07-error.png` | Actual fixture states |
| `08-desktop-services-all-six.png` | All six full service rows |
| `09-desktop-incidents-friendly.png` | Complete incident and Family photos |
| `10-desktop-traffic-svg.png` | Actual full chart/table after canvas scroll |
| `11-desktop-compact.png` | Narrow preview |
| `12-mobile-overview.png`, `13-mobile-capacity.png` | Settled mobile summary and Capacity |
| `14-mobile-services.png`, `15-mobile-services-version-uptime.png` | Mobile table and right/bottom field reachability |
| `16-mobile-traffic-svg.png` | Mobile real request/error chart |
| `17-mobile-empty-clean.png` | Actual mobile Empty fallback |

Own browser session `cw-rich-repair` was closed at completion. Original proof, responses, source, parent browsers, and servers were left untouched.
