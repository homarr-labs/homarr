# Rich widget: running-app proof

## Outcome

The complete assisted import → fresh Preview → Create workflow succeeded with the exact generated response, without template repairs. Persistence used **`customWidget.createFromPreview` only**. This is not a perfect-quality widget: the actual Empty fixture exposes blank/NaN values, affected-service IDs are not resolved to friendly names, and importing the response produced one React controlled/uncontrolled-input console error.

No repository edits, commits, PR uploads, server changes, or additional agents. Candidate app only; baseline and fixture servers remained parent-owned and running.

## Actual resources

- Browser session: `cw-rich-widget-app` (isolated; closed after completion).
- App: `http://localhost:3102`.
- Start: `http://localhost:3102/manage/custom-widgets/new?mode=assisted`.
- Source: `http://127.0.0.1:3904`, auth `none`, request `/v1/overview`.
- Created definition: `o7ub3xslxcxjm4zmvcwohm34`.
- Persisted edit page: `http://localhost:3102/manage/custom-widgets/edit/o7ub3xslxcxjm4zmvcwohm34`.
- Setup preview session: `rjagr9v7szs40rp9d3k4supq`.
- Final pre-create preview session: `b8i31eqb12no84q34f31p9qo`.
- Post-create edit preview session: `a0840nns4oyomrwwdh7mwgcv`.
- Authentication used the `cw-local-fixture` vault entry; password was never read.

## Assisted workflow and persistence

1. Entered source URL, left auth `none`, entered `/v1/overview`, and clicked **Test API request**. The data request succeeded, but **Create remained disabled** (`01-setup-tested-create-disabled.png`).
2. Left the optional widget-description/request-documentation inputs blank. **Paste AI response** opened the manual **AI response** modal. Filled it with the entire `../candidate-final/reply.md` as-is, including JSON fence and trailing prose, then clicked **Load response**. No parsed-definition shortcut or manual edits were used.
3. The definition loaded with normalized source `http://127.0.0.1:3904/`. **Create remained disabled**, and Data returned to “Requests have not been tested” (`02-response-loaded-create-disabled.png`).
4. Clicked **Test and preview**. Network request `7285.1538` posted the exact-template definition to `/api/trpc/customWidget.previewCreate`; `7285.1539` performed the real GET `/api/trpc/customWidget.previewQuery`, with `requestId: overview` and final preview session `b8i31eqb12no84q34f31p9qo`. Both returned HTTP 200; the rendered response showed the expected summary/capacity, and Create became enabled.
5. Clicked **Create**. Network request `7285.1540` was POST `/api/trpc/customWidget.createFromPreview` with only `{ previewSessionId: "b8i31eqb12no84q34f31p9qo" }`. It returned 200 and navigated to the new edit URL. No direct `/api/trpc/customWidget.create` request occurred.
6. Read the newly loaded edit-page CodeMirror state, without changing it. The full template was **6,380 characters**, exactly equal to the original. The persisted raw manifest was also read through its actual UI and saved as `persisted-definition.json`.

Template SHA-256, original and persisted:

`229ddb6a6d6ca0813a4136f2087b44f9af82ff90b12621999e2a97c0e20d2e1f`

`hashes.json` contains the raw-response/definition-file hashes and exact-match evidence. `request-summary.json` contains sanitized custom-widget network metadata and relevant inputs, without auth headers or secret values. `mutating-request-paths.json` contains every captured non-auth/non-secret POST path, including the Next.js development stack-frame request caused by the console error.

## Refresh really refetched

The original analyzer warning was preserved exactly:

`UNKNOWN_MANTINE_PROP: 'request' on RefreshButton will be passed through` (line 4).

On the edit-page live preview, clicked the generated **Refresh** button unchanged. It issued POST `/api/trpc/customWidget.previewRefresh` (`7285.1735`), followed by a fresh GET `/api/trpc/customWidget.previewQuery` (`7285.1736`) for `overview`, both HTTP 200. Query count rose from 3 to 4. The actual UI's redacted journal shows two separate GET `/v1/overview` executions with `simulated: false`, HTTP 200, and durations 2 ms then 1 ms. See `refresh-before.json`, `refresh-after.json`, and `request-journal-real-refetch.json`.

## Content validation

All four tabs were selected through the UI. `content-validation.json` and `mobile-measurements.json` contain the extracted rows and comparison results.

- **Capacity:** CPU 43.2%; memory 12.0 / 32.0 GiB; disk 2048.0 / 8192.0 GiB; active sessions 17. Summary shows 6 services, 5 healthy, 1 degraded, 184 ms latency, 1 open incident, 99.95% uptime, 183294 total requests, and raw error rate 0.014.
- **Services:** all six names, statuses, latency, uptime, and version values exactly match the fixture, including the final “Reverse proxy” row. Desktop renders all fields; mobile uses the table's working horizontal/vertical scrolling to reach uptime/version and remaining rows.
- **Incidents:** title “Photo indexing is delayed”, warning, investigating, start `2026-10-24T23:30:00Z UTC` all render. **Failure:** affected services display raw `photos`, not friendly “Family photos”. No repair was made.
- **Traffic:** all 12 hourly rows, requests, errors, and latency values exactly match the fixture. Latest summary is 22:00, 11300 requests, 14 errors. The actual chart is a Recharts SVG, 694 × 220 px on wide desktop, with nonempty request/error area and curve paths—not a placeholder. Both series share one scale, so errors are visually compressed near zero.
- Presentation limitations preserved: raw error rate `0.014` is not formatted as a percentage; timestamp text redundantly appends `UTC` to an ISO `Z` value; disk remains large GiB values rather than TiB. No generated output was reformatted.

## Actual preview fixtures

These were selected using the running application's **Live / Loading / Empty / Error** controls, not SSR-only checks.

| State | Observed result | Evidence |
| --- | --- | --- |
| Live | Expected fixture summary and all four tabs render | 03–07 |
| Loading | Loader and “Loading infrastructure overview…” render | 08 |
| Empty | **Bad state:** retained shape renders blank summary fields, `Checked at UTC`, `%`/`ms` without values, and memory/disk `NaN GiB / NaN GiB` | 09 |
| Error | “Overview unavailable” and refresh guidance render | 10 |

In Empty, Services (0), Incidents (0), and Traffic (0) each show their correct collection-empty message. The widget's top-level “No overview data was returned.” branch does **not** appear for the application's Empty fixture. A wait for it timed out; the blank/NaN result above is the actual captured behavior. This differs from `../candidate-final/render-states.json`, whose empty SSR input exercised the top-level no-data branch.

## Viewports and overflow

Captures are real running-app screenshots, in dark theme, at **1920 × 1080** and **390 × 844**. After resize, waited for the AppShell main-padding transition to settle: desktop `310px`, mobile `10px`.

- Desktop Wide canvas: 694 × 334 px; Capacity has no overflow. Compact canvas: 294 × 334 px, with 429 px content height; expected internal scrolling.
- Mobile canvas is clamped to 254 × 334 px, even with Wide selected. Document `scrollWidth === clientWidth === 390`: **no page-level horizontal overflow**.
- Tables deliberately scroll inside their ScrollAreas; mobile Services is 407 px wide inside a 254 px viewport, with functional access to right-hand fields. Traffic table is 280 px wide. Mobile chart/canvas measured 6 px internal horizontal overflow (260 vs 254 px); it is contained in the preview canvas rather than spilling the page.
- The preview canvas intentionally scrolls vertically. Separate Traffic captures show the top summary and the actual chart/table after scrolling; initial desktop/mobile frames do not pretend the whole widget fits in one 334 px-high canvas.

## Console/runtime findings

- Browser uncaught runtime/page errors: **none**, across the workflow, tab changes, viewport changes, and fixture controls (`runtime-errors.json`).
- Console: one **error** on response import: “A component is changing a controlled input to be uncontrolled. This is likely caused by the value changing from a defined to undefined…” (`console.json`). The captured development stack-frame request names `CustomWidgetSourceField`; it is not evidence that the generated widget crashed.
- Analyzer: one preserved RefreshButton `request` warning, as above. No claim of a completely clean console or perfect output.

## Screenshot index

All paths below are under `screenshots/`.

| Files | Content |
| --- | --- |
| `01-setup-tested-create-disabled.png` | Setup API test succeeded; cannot Create |
| `02-response-loaded-create-disabled.png` | Exact reply loaded; fresh Preview still required |
| `03-desktop-overview-wide.png` | Wide desktop overview/Capacity |
| `04-desktop-services-wide.png` | Desktop Services |
| `05-desktop-incidents-raw-service-id.png` | Incident tab before canvas scroll |
| `06-desktop-traffic-wide.png` | Traffic summary/top of chart |
| `07-desktop-traffic-chart-scrolled.png` | Actual SVG request/error chart and table |
| `08-loading-fixture.png` | Actual Loading control |
| `09-empty-fixture-NaN-capacity.png` | Actual broken Empty capacity |
| `10-error-fixture.png` | Actual Error control |
| `11-desktop-compact-overview.png` | Compact desktop canvas |
| `12-mobile-compact-overview.png` | Settled mobile overview |
| `13-mobile-compact-capacity-scrolled.png` | Mobile Capacity after canvas scroll |
| `14-mobile-services.png`, `15-mobile-services-scrolled.png` | Mobile Services/table scrolling |
| `16-mobile-services-uptime-version.png` | Mobile table scrolled right to uptime/version |
| `17-mobile-traffic.png` | Mobile Traffic summary |
| `18-mobile-traffic-chart-scrolled.png` | Mobile chart with live tooltip |
| `19-mobile-traffic-chart-clean.png` | Mobile chart after moving pointer away |
| `20-desktop-services-all-six.png` | All six complete service rows after canvas scroll |
| `21-desktop-incident-details.png` | Complete incident row, including unresolved `photos` |
| `22-desktop-traffic-complete-svg.png` | Full request/error SVG chart after aligning canvas scroll |

Parent-owned stale-sample timing and credential-origin rejection proofs were not duplicated. No lint/typecheck or broad test suite was run because this task made no code changes.
