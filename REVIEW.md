# PR #6502 widget-modernization ultra-review

## Executive result

**Merge recommendation: changes required.** No P0 was found, but the current branch still has five P1 issues: a pre-existing Custom API authorization/redirect weakness exposed by this subsystem review, an inaccessible manual advanced-focus interaction, a likely fixed-position/transform geometry defect, systemic false empty states for failed queries, and unvalidated integration-provided navigation URLs. Eight P2 issues cover raw error disclosure, unsafe runtime-ref interfaces, localization, responsive/theming drift, test coverage, and inaccurate PR copy.

Audit health (Impeccable rubric): accessibility 1/4, performance 2/4, responsive design 2/4, theming 2/4, anti-patterns 3/4; **10/20 (Acceptable, significant work required)**. The UI does not look generically AI-generated; its problem is inconsistent technical behavior beneath an otherwise coherent Mantine vocabulary.

## Reviewed revision and environment

| Item | Value |
| --- | --- |
| PR | #6502, `feat: modernize dashboard widgets` |
| Reviewed head | `96e92485a5fd45f3648cfac0453e614779c414ba` |
| Base branch / fetched base | `dev` / `d58a47b776a55d04dee2220f59d072b9af8bbed3` |
| Merge base | `d58a47b776a55d04dee2220f59d072b9af8bbed3` |
| Diff | 359 files, +15,721/-4,478 |
| PR state | open, non-draft, `BLOCKED`; no approval decision |
| Hosted checks at audit start | Fast gate, Container and E2E, CodeQL, JS/TS analysis, Actions analysis, title, auto-fix: green |
| Inline threads | 34 total, 7 unresolved; only 2 remain substantively valid |
| Mantine | repository lock: `@mantine/core`, hooks, charts and dates 9.4.1 |
| Local tools | Node 24.16.0 and pnpm 9.5.0; repository requires Node >=24.18.0 and pnpm >=11.15.1 |

The former red baseline `7b7045202d289b7d83946befcee5d2845ea4a706` had a green Fast gate and a failed Container/E2E run (`30748255760`, job `91498308523`). The latest head has a green Container/E2E job (`30756067198`, job `91519039504`). This proves the current suite passed once; it does not satisfy the requested three-run flake characterization.

## PR-description traceability

| Claim | Result | Evidence / correction |
| --- | --- | --- |
| “all 54 widget renderers with compact and advanced modes” | **Inaccurate** | 54 `WidgetKind` values exist. `displayMode="advanced"` reaches 53; `app` is deliberately excluded in `item-content.tsx:51` and documented as compact-only. Change copy to “53 widget renderers; app tiles remain compact,” or implement app advanced mode. |
| advanced focus: hover, keyboard, touch, geometry | **Partial** | Entry paths, Escape ownership, reduced motion, close focus, touch button and zero-dimension guards exist. WID-002/003 remain. |
| richer widget context actions | **Partial** | `Menu.ContextMenu` is a good Mantine choice and query scope is item-aware. Dispatch still crosses `any`; Custom API action authorization is not represented. |
| standardized query identity/cache/status | **Partial** | Query keys, matchers, runtime capture, recovery and tests exist. Thirty-nine of 53 renderer query calls do not read errors; runtime ref registration is render-time mutable state. |
| safe polling | **Mostly confirmed** | defaults are limited to `widget` namespace; Custom API resume immediately refetches; per-widget intervals exist. State/ref typing still needs redesign. |
| partial-failure rendering | **Partial** | settlement helper and several routers are strong; many renderer-level total failures still appear empty/disconnected. |
| bounded integration responses | **Mostly confirmed** | common bounded reader, Custom API 2 MiB, timetable 512 KiB, Traefik bounds and Beszel queue bounds exist. Custom action execution remains outside the hardened fetch path. |
| timetable hardening | **Confirmed** | board/item permission checks, saved-value comparison, public-address resolution, private ranges, per-request DNS re-resolution, pinned dispatcher, redirect rejection, timeouts, response bounds and schemas are present. |
| precise placement | **Mostly confirmed** | mouse, touch tolerance, keyboard, occupied-cell validation, dynamic bounds, nearest fit and immediate persistence exist. Failure/race/live responsive coverage remains insufficient. |
| widget catalog documentation | **Partial** | all kinds have pages and shared interactions; wording overclaims focus behavior and validation counts are stale. |
| validation: 40 files/162 tests, 6/6 E2E | **Stale** | current diff contains 57 changed unit-spec files (including three E2E specs); repository has 42 widget spec files and six E2E specs. Update from the exact final run. |
| independent reviews “pass” | **Not supported** | unresolved valid findings, current P1s, and unavailable live QA contradict an unqualified pass. |

## Mantine suitability ledger

Legend: **U** already used appropriately; **C** consolidation/replacement candidate; **R** relevant but current implementation can stay; **N** not relevant to widget runtime; **D** dependency/version addition. Exact 9.4.1 package archives were inspected in `/tmp`; live docs/Context7 include 9.5.0.

### Core catalog

- **U:** ActionIcon, Alert, Anchor, Avatar, Badge, Box, Button, Card, Center, Code, Divider, Flex, Grid, Group, Image, Loader, Menu (`Menu.ContextMenu`), Overlay, Paper, Popover, Portal, Progress, RingProgress, ScrollArea, SimpleGrid, Skeleton, Stack, Table, Tabs, Text, ThemeIcon, Title, Tooltip, UnstyledButton.
- **C:** Accordion (dense integration sections), DataList (semantic label/value stats), EmptyState (replace bespoke empty state), FocusTrap and Modal compound API (WID-002), LoadingOverlay (background refetch without deleting content), NumberFormatter, OverflowList/Scroller (responsive action and chip rows), Table.ScrollContainer, Timeline (activity/feed histories), VisuallyHidden and Kbd, CloseButton, Dialog/HoverCard/Notification where persistent errors/actions need semantics.
- **R:** Affix, AppShell, AspectRatio, BackgroundImage, Breadcrumbs, Burger, Checkbox, Chip, Collapse, ColorInput/ColorPicker/ColorSwatch/AlphaSlider/AngleSlider/HueSlider, Combobox/ComboboxPopover, Container, CopyButton, Drawer, Fieldset, FileButton/FileInput, FloatingIndicator/FloatingWindow, Highlight, Indicator, Input/JsonInput, List, Mark, Marquee, MaskInput, Menubar, MultiSelect/NativeSelect/NumberInput/PasswordInput/PillsInput/PinInput/Radio/RangeSlider/Rating/SegmentedControl/Select/Slider/Switch/TagsInput/Textarea/TextInput, Pagination, Pill, SemiCircleProgress, Space, Splitter, Spoiler, Stepper, Transition, Tree/TreeSelect, Typography. Use only where an existing widget requirement matches; do not churn working layouts.
- **N:** Alpha/color/angle primitives outside configuration forms, AppShell/navigation primitives, TableOfContents, CorePackage documentation.
- **D (9.5, not 9.4.1):** Cascader. **RollingNumber and Splitter are present in 9.4.1.**

### Hooks catalog

- **C:** `useFocusReturn`, `useFocusTrap`, `useReducedMotion`, `useRovingIndex`, `useLongPress`, `useScroller`, `useElementSize`, `useViewportSize`, `useHotkeys`, `useMediaQuery`, `useResizeObserver`.
- **U/R:** focus-within, hover, disclosure, click-outside, merged-ref, interval/timeout, local-storage, event/window listeners, throttled/debounced values and list/set/map/state helpers are available in 9.4.1 and should replace local mechanics only when behavior and tests improve.
- **N:** document title/favicon/hash/headroom/page-leave/OS/eye-dropper/fullscreen/network/orientation and other page-level utilities have no direct widget-remediation need. Every hook listed under `## Hooks` in `MANTINE.md` is covered by this rule; no hook requires 9.5 for the recommendations above.

### Form, dates, charts, schedule, extensions, theme and styles

- **Form:** existing `@homarr/form` should remain the abstraction over all cataloged form APIs. No widget-runtime replacement; use current validation/status APIs for widget editors (**R**).
- **Dates:** all catalog entries are in installed 9.4.1 dates. `Calendar`, `MiniCalendar`, and `TimeValue` are candidates; other picker/input entries are editor-only (**R**). Importing dates directly into `@homarr/widgets` requires adding that workspace dependency (**D**).
- **Charts:** 9.4.1 exports Area, Bar, BarsList, Bubble, Composite, Donut, Funnel, Heatmap, Line, Pie, Radar, RadialBar, Sankey, Scatter, Sparkline and Treemap (**C/R**). Prefer Sparkline for tiny trends, BarsList for ranked values, Heatmap for calendar/activity density, Composite for mixed analytics. **BulletChart and SunburstChart are 9.5-only (D)**. Replacement requires accessibility and bundle comparison, not blanket Recharts removal.
- **Schedule:** all `AgendaView`, day/week/month/year/resource views and Schedule pages require new `@mantine/schedule` dependency (**D**). AgendaView is the only plausible calendar-widget candidate; its weight and semantics must beat the existing grouped list before adoption.
- **Guides/FAQ/Other:** server components, portal testing, scroll lock, accessibility, nested popovers, zoom, responsive styling and version changelogs are relevant references (**R**); framework/setup/contribution/old migration entries are **N**. The 9.5 changelog is informational only.
- **Theming/styles:** Colors, ColorSchemes, DefaultProps, MantineProvider, ThemeObject, CSS variables, data attributes, CSS Modules, responsive/RTL/style props/Styles API/performance are **U/R**. WID-009 requires shared layer/color tokens. Emotion, Sass, Vanilla Extract and unrelated global setup are **N**.
- **Extensions:** existing modals, notifications, spotlight and rich-text abstractions are **U**; Carousel could consolidate Immich only after behavior parity; Dropzone/CodeHighlight/NProgress are **N** for this audit.

## Complete 54-widget coverage matrix

“Test” means a focused widget-local spec exists, not that all required states are covered. Every row still requires the common contract suite in WID-013.

| WidgetKind | Family | Advanced | Focused test | Principal audit gap |
| --- | --- | --- | --- | --- |
| clock | basic | yes | no | query error, locale-format options |
| weather | basic/feed | yes | yes | query error; dayjs locale/time patterns |
| app | basic/link | **no** | no | PR wording; URL contract |
| iframe | custom content | yes | yes | manual focus/iframe trapping; URL privacy thread now fixed |
| video | custom content | yes | no | media/focus/live behavior |
| notebook | notes | yes (inner) | yes | editor focus inside manual surface |
| anchorNote | notes | yes | no | query error, save/error regression |
| dnsHoleSummary | network | yes | no | total query error, hard-coded chart colors |
| dnsHoleControls | network/security | yes | no | total error and permission matrix |
| smartHome-entityState | smart home | yes | no | raw state in aria; action permissions |
| smartHome-executeAutomation | smart home | yes | no | mutation/permission/edit-mode E2E |
| stockPrice | analytics | yes | yes | total error |
| mediaServer | media | yes | no | total error and table a11y |
| calendar | calendar | yes | yes | total error; fixed HH:mm; schedule tradeoff |
| downloads | media | yes | yes | four-state/component coverage, arbitrary z-index |
| mediaRequests-requestList | media | yes | no | total error; external URLs/actions |
| mediaRequests-requestStats | media | yes | no | total error; links/colors |
| mediaTranscoding | media | yes | yes | total error and responsive table |
| mediaMissing | media | yes | yes | total error and external URL |
| minecraftServerStatus | infrastructure | yes | no | total error/malformed payload |
| networkControllerSummary | networking | yes | no | total error; WAN/unknown localization |
| networkControllerStatus | networking | yes | no | responsive rule duplication |
| rssFeed | feed | yes | yes | strong stale/partial state; locale relative time |
| bookmarks | basic/link | yes | yes | recomputation; URL contract |
| indexerManager | media | yes | no | total error; runtime action ref |
| healthMonitoring | infrastructure | yes | yes | integration query error |
| releases | infrastructure/feed | yes | yes | secret/item authorization needs E2E |
| mediaReleases | media | yes | no | total error; external URLs |
| dockerContainers | infrastructure | yes | yes | total error; z-index/table semantics |
| firewall | networking/security | yes | yes | partial-query matrix; loose router generics |
| notifications | infrastructure | yes | no | total error; untrusted href |
| systemResources | infrastructure | yes | yes | total error; previous network thread fixed |
| coolify | infrastructure | yes | yes | total error; URL validation |
| systemDisks | infrastructure | yes | yes | total error |
| timetable | calendar | yes | no | backend strong; component locale/live tests absent |
| immich-serverStats | media | yes | yes | two ignored query errors |
| immich-albumCarousel | media | yes | yes (query) | query error and nested overlay/focus E2E |
| paperlessNgx | analytics | yes | no | former error thread fixed, no regression spec |
| patchmon | infrastructure | yes | yes | total error |
| bazarr | media | yes | yes | total error |
| tracearr | analytics | yes | yes | total error |
| speedtestTracker | analytics | yes | yes | total error |
| uptimeKuma | infrastructure | yes | yes | total error |
| audioStats | media | yes | yes | good dual-error handling; partial-state tests needed |
| umami | analytics | yes | no | runtime query registration; chart a11y |
| vpn | networking/security | yes | no | total error; status/permission matrix |
| archiveTeamWarrior | infrastructure | yes | yes | suspense path; docs present |
| ups | infrastructure | yes | no | total error |
| beszelSystemTable | monitoring | yes | yes | nested chart/focus and live subscription |
| beszelSystemGrid | monitoring | yes | no | live/error UI; no focused renderer test |
| beszelAlerts | monitoring | yes | no | partial error and status semantics |
| beszelSystemStats | monitoring | yes | yes | runtime refs, locale tooltip |
| traefik | networking | yes | no | total error; bounded backend positive |
| customApi | custom content/security | yes | yes | WID-001/007/008; polling resume fixed |

## Severity-ranked findings

### WID-001 — P1 confirmed, pre-existing: Custom API actions lack resource authorization and hardened fetch policy

- **Location/claim:** `packages/api/src/router/custom-widget/custom-widget-router.ts:57-102,392-451`; “harden Custom API” and action-permission semantics.
- **Evidence/reproduction:** any authenticated account can call `customWidget.all`, learn every definition ID and URL, then call `customWidget.execute({definitionId})`. The mutation verifies neither board nor item nor an action permission. It decrypts administrator-provided secrets, uses `new URL()` only, and `redirect: "follow"`. The PR hardened `widget.customApi.getData`, but not this sibling execution path.
- **Impact/rule:** unauthorized side effects against internal services and authenticated redirect chains; broken object-level authorization. A view-only account can invoke administrator-created controls outside any board context.
- **Correction:** require `{boardId,itemId,definitionId}`; load the item and verify it is `customApi`, belongs to the board, references the definition, and the caller has an explicit execute policy. Until that policy exists, restrict to admin. Share `validateCustomApiUrl`, timeout, redirect rejection, bounded disposal and redacted errors with getData. Compatibility: old direct callers must send item/board context.
- **Tests:** procedure tests for anonymous, unrelated authenticated, view-only, modifier, admin, mismatched item/definition, disabled definition, redirects, credential URL, timeout and secret non-disclosure; E2E action button across roles.

### WID-002 — P1 confirmed, PR-introduced: manual advanced focus is not an accessible modal

- **Location:** `advanced-focus/context.tsx:194-209`, `items/item-content.tsx:113-189`.
- **Evidence:** manual mode renders an Overlay plus a `role="region"` Card. There is no FocusTrap, `aria-modal`, background inertness, scroll lock or backdrop dismissal. Only the close button is initially focused; Tab can leave the surface and activate dimmed board controls.
- **Impact/rule:** keyboard/screen-reader users lose the interaction boundary; WCAG 2.1.2, 2.4.3 and ARIA dialog pattern. Iframes/editors make escape especially likely.
- **Correction/Mantine:** render manual mode through `Modal.Root` compound parts (or ModalBase), using its portal, FocusTrap, scroll lock, Escape/return-focus and semantic content. Preserve preview mode as non-modal. Configure nested overlays and `removeScrollProps`; keep a 44px `Modal.CloseButton` and explicit title via VisuallyHidden if needed.
- **Tests:** RTL portal/focus-cycle/return tests; Playwright Tab/Shift+Tab, nested Menu/Select/Popover/editor/iframe, backdrop and every close path; reduced motion and 200% zoom.

### WID-003 — P1 probable, PR-introduced: fixed advanced surface remains under transformed Gridstack ancestry

- **Location:** `advanced-focus.module.css:35-42`; Card remains inside the Gridstack item while only the backdrop is portaled.
- **Evidence:** CSS fixed descendants establish their containing block at a transformed ancestor. Gridstack uses transforms for positioned items, so viewport-derived `left/top` can be interpreted relative to the item on affected layouts. A Portal wrapper exists only for Overlay.
- **Impact:** off-screen, clipped or incorrectly scaled focus surface across breakpoints/remounts.
- **Correction:** portal the focused surface itself (naturally achieved by WID-002) and calculate geometry in the same viewport coordinate system. Do not compensate with transform-specific offsets.
- **Tests:** real Gridstack at every layout/viewport, scrolled page, header, dynamic section and resize/remount; assert bounding rect within viewport and finite scale.

### WID-004 — P1 confirmed, regression-exposed/systemic: query failures still become valid empty/disconnected UI

- **Location:** 39 of 53 renderer query calls do not read `error`, including bookmarks, weather, calendar, media server, system resources, Coolify, DNS Hole, Tracearr, notifications, Immich, VPN and others listed in the matrix. Query defaults do not set `throwOnError` (`trpc.tsx:69-93`).
- **Evidence:** TanStack Query returns `data=undefined` on total failure. Components default to `[]`, `null`, or empty branches, so the board ErrorBoundary is never reached. Network Controller and Paperless were fixed, proving the pattern; it was not completed.
- **Impact:** operators are told “empty” or “disconnected” when monitoring failed, violating the product’s truthful-state requirement.
- **Correction/Mantine:** introduce a shared `WidgetQueryState` contract distinguishing initial Skeleton, background LoadingOverlay, stale Alert, partial warning, true EmptyState and terminal error. Either explicitly throw only when no usable cached data or render a shared error Alert. Preserve stale data.
- **Tests:** parameterized contract tests for every queried widget: initial, success-empty, total failure, stale+failure, partial failure, refetch, remount/persisted cache and sibling isolation.

### WID-005 — P1 confirmed, PR-introduced/systemic: integration-provided links bypass a shared URL policy

- **Location:** examples include `media-missing/component.tsx:291`, `notifications/component.tsx:77`, media requests list/stats, Coolify resource/server links, releases, bookmarks and iframe. Only RSS and custom JSX visibly use explicit protocol sanitizers.
- **Evidence:** dynamic strings are assigned directly to `href`/new-tab controls. Integration APIs and remote feeds are trust boundaries; no renderer-wide `http/https` guard is enforced.
- **Impact:** unsafe schemes, credential-bearing URLs, internal detail disclosure and inconsistent opener behavior.
- **Correction:** add one typed application URL helper returning a sanitized URL/undefined, with allowed schemes per use case, credential stripping/rejection, consistent `noopener noreferrer`, and disabled non-link presentation. Validate again server-side for action endpoints.
- **Tests:** `javascript:`, `data:`, malformed, credential, relative, http/https and missing URLs for each shared link primitive.

### WID-006 — P2 confirmed, PR-introduced: runtime query/action state mutates untyped refs during render

- **Location:** `definition.ts:121-162`; runtime registration calls in media missing/transcoding, audio, calendar, Umami, Beszel and Immich; `widget-context-menu.tsx:157-174`.
- **Evidence:** `setWidgetRuntimeQueries` mutates a shared object during render; concurrent/aborted renders can publish uncommitted query identity. Action dispatch casts the definition to `Record<string,unknown>` and `any`, then casts its result back.
- **Correction:** make definition generics preserve kind/options/action types end-to-end; replace stringly opaque ref slots with a typed per-item registration API updated in a committed effect (or use `useSyncExternalStore`). Separate query registration from imperative actions.
- **Tests:** StrictMode, interrupted/remount, options change and cleanup; compile-time `tsd`/type assertions rejecting wrong action props.

### WID-007 — P2 confirmed, regression-exposed: raw backend errors are exposed to users and assistive text

- **Location:** Custom API UI `component.tsx:561-576`; API `custom-api.ts:79-85`; several partial fallbacks use `error.message`.
- **Impact:** internal hostnames, request paths and implementation details can appear in tooltips/aria labels and logs.
- **Correction/Mantine:** return stable error codes plus redacted public messages; keep detailed causes server-side with correlation IDs. Render localized Alert/Notification details, never raw throwable text.
- **Tests:** errors containing credentials, query strings, private hosts and multiline backend bodies must not reach tRPC payload, DOM, accessibility tree or notifications.

### WID-008 — P2 confirmed, PR-introduced/regression-exposed: locale handling remains incomplete

- **Locations:** Beszel chart/tooltip dayjs formats, calendar event `HH:mm`, downloads `YYYY-MM-DD HH:mm`, timetable `HH:mm:ss`, weather day/month/time formats; `_inputs/widget-location-input.tsx:199` hardcodes `Intl.NumberFormat("en")`.
- **Also:** `beszel/_shared/disk-usage.tsx:41`, stats loading aria label, Network Controller `WAN`/`unknown` are English/raw accessible strings.
- **Correction:** centralize app-locale date/time/number/duration/status helpers; load canonical dayjs locale only at the boundary; use localized translation keys for aria/status. NumberFormatter is suitable for simple display but application helpers should own locale.
- **Tests:** at least `en-US`, `fr-FR`, `de-DE`, RTL locale, 12/24-hour preference and long translations, including accessibility names.

### WID-009 — P2 confirmed: layer and color tokens are inconsistent

- **Locations:** downloads z-index 1000 and rgba row colors; item title z-index 4; item menu/dynamic menu 10; media server white rgba; Indexer Manager hex colors; DNS Hole rgba palette; Umami hex tick colors.
- **Correction:** define shared semantic layer tokens relative to Mantine CSS z-index variables and semantic status/chart tokens respecting light/dark/forced colors. Do not replace intentional service branding.
- **Tests:** light/dark/forced-colors with nested overlays and tooltip ordering.

### WID-010 — P2 confirmed: responsive decisions are duplicated and under-tested

- **Location:** Network Controller Status `component.tsx:44,59-78` (open valid thread); Bookmark `component.tsx:94` recomputation (valid but low-impact thread); similar width/height literals across renderers.
- **Correction:** small typed breakpoint lookup helpers per family, memoized only for genuinely expensive layout. Prefer container-query Grid/SimpleGrid where structural. Do not cargo-cult `useMemo` for a cheap pure calculation; benchmark Bookmark before accepting the review suggestion.
- **Tests:** boundary tables for minimum/typical/wide/short/advanced sizes and 200% zoom.

### WID-011 — P2 confirmed: PR/docs overstate behavior and validation

- **Location:** PR body, board/getting-started copy “advanced preview in place,” validation numbers, and unqualified review pass.
- **Correction:** state 53 advanced renderers plus compact-only app; call manual focus an overlay only after WID-002/003; publish exact final-SHA check/test counts and disclose unsupported/live-untested states.

### WID-012 — P2 confirmed: focused automated coverage is far below the 54-widget/data-state claim

- **Evidence:** 42 widget-local spec files are helper-heavy; 20+ renderers have no focused spec. Six E2E files exist, but only board interactions and Custom JSX directly exercise this modernization. The earlier Custom JSX login wait failed once and current exact-route wait remains.
- **Correction:** add shared renderer contract harness plus family E2Es. Replace Custom JSX’s exact post-submit URL race with a shared login helper that waits for authenticated session/stable destination, then run it three times in CI.

### WID-013 — P2 confirmed: open review-thread state no longer matches code

| Thread | Classification |
| --- | --- |
| iframe complete URL | already fixed/false positive at current line: only host is rendered |
| system resources network gate | already fixed, outdated |
| RSS total error | already fixed: no-data error throws; stale data retained |
| bookmarks memoization | valid P3/P2-low; benchmark first |
| network-controller total error | already fixed, outdated |
| network-controller breakpoint consolidation | valid P2 maintainability |
| Paperless total error | already fixed, outdated |

Resolve the five stale threads with evidence; address or explicitly disposition the two live suggestions. Re-run review because CodeRabbit was paused during active development.

## Systemic remediation roadmap

1. **Security/authorization:** WID-001 and WID-005; add negative-role/protocol tests before merge.
2. **Interaction accessibility:** replace manual focus with portaled Mantine modal semantics (WID-002/003), then test nested widget content.
3. **Truthful data state:** build the shared query-state contract and migrate all 39 ambiguous sites; keep valid stale data and partial results.
4. **Typed interfaces:** replace `widgetStateRef` slot mutation and `any` context dispatch with committed typed registrations.
5. **Widget families:** media/downloads, infrastructure, networking/security, smart-home, analytics/calendar/feed, then Beszel; apply URL, state, locale, responsive and a11y contracts in that order.
6. **Design-system cleanup:** semantic layers/colors and restrained Mantine consolidation. Do not add Schedule or upgrade to 9.5 without a separate dependency/bundle decision.
7. **Docs/PR:** correct renderer count, behavior and exact validation evidence.
8. **Final proof:** frozen install on supported Node/pnpm; format, lint, full typecheck, affected and full unit tests, production and docs builds; Custom JSX three times; complete production-container E2E; desktop/tablet/mobile keyboard/touch/light/dark/reduced-motion/zoom/a11y-tree QA. Push nothing until all refer to one unchanged SHA; close every review thread and obtain required approval.

## Positive findings

- Timetable is the strongest security work in the PR: saved resource authorization, private-range rejection, DNS rebinding resistance through pinned lookup, redirect rejection, bounds and schemas are coherently tested.
- Bounded response helpers, Beszel bounded queue/cancellation, and partial-integration settlement materially reduce failure blast radius.
- RSS preserves stale data and distinguishes partial feed failure; Network Controller and Paperless now correctly escalate total failures.
- Item-scoped query matchers and tests address sibling-widget refresh isolation; global polling defaults are restricted to the widget namespace.
- Touch long-press has movement tolerance; focus scale guards prevent Infinity/NaN; reduced-motion and remount cleanup are present.
- Existing Homarr theme, Mantine components and shared UI vocabulary are generally preserved. Most proposed Mantine work is consolidation, not redesign.

## Validation evidence and uncertainty

- `MANTINE.md` was fetched from `https://mantine.dev/llms.txt` and passed byte-for-byte `cmp`; `llms-full.txt` stayed in `/tmp`.
- Context7 current Mantine docs were queried for overlay/focus, responsive/data-state/accessibility, charts and Schedule. Static 9.4.1 archives verified exact exports; Cascader, BulletChart and SunburstChart are 9.5-only.
- Local frozen install could not start because host Node/pnpm are below repository engine requirements. No dependencies, source files or machine toolchain were changed.
- Docker API access is denied, so production-container E2E could not be rerun locally. Hosted exact-head Fast gate and Container/E2E are green.
- `agent-browser` is not installed. Temporary `npx` execution was rejected by the environment’s security reviewer, so live exploratory QA/a11y-tree inspection was not performed.
- External integrations were not available; malformed/partial/permission combinations are static-analysis conclusions unless a focused test already exists.
- This review intentionally changes no production code and makes no commit, push, thread resolution or PR edit.

Finalization must re-query the PR head/checks/threads. If the head differs from the reviewed SHA, this report is a snapshot and the delta requires review before merge.

**Final refresh (2026-08-03):** head remained `96e92485a5fd45f3648cfac0453e614779c414ba`; all reported hosted checks remained successful; merge state remained `BLOCKED` with no approval decision; unresolved threads remained 7 of 34. The branch did not change during the audit.
