# BoardCard hidden-form browser measurement

## Purpose

Compare the frozen `BoardCard` baseline snapshot with an instrumentation-only variant that adds `keepMounted={false}` to its existing Mantine `Collapse`. The harness measures whether hidden `DuplicateBoardForm` instances actually subscribe/fetch under Mantine 9.6.0's React 19 `Activity` behavior, and what remains cached or in the DOM after opening, closing, and navigating away/back.

This is a browser measurement fixture, not a Homarr production route. It imports `BoardCard` from `baseline-source` and imports the live `DuplicateBoardForm`, `useBoardNameStatus`, `BoardNameAvailability`, `useZodForm`, board schemas, Mantine Collapse, React, and TanStack Query. A Vite transform applies the one-prop candidate delta without editing production files. The menu/dropdown, avatars, thumbnails, router, notifications, i18n, and API transport are isolated mocks. The API mock uses the real installed TanStack Query cache and issues synthetic HTTP requests intercepted by Playwright; it is not the generated tRPC hook or a live database/API.

The output separates raw request/response body bytes and calculated gzip size estimates, query count and observers, retained query data JSON bytes, DOM element count, and CDP heap usage after explicit garbage collection. The synthetic HTTP response uses ordinary JSON so the browser's actual query parsing is exercised; gzip values are estimates and are not measured compressed transfer bytes. It also records the exact open/close interaction labels and validation result, submit mutation count, Collapse inline transitions, transition events, and menu-item-to-visible-input time.

## Scenarios

The runner executes baseline and candidate at 1, 25, and 100 cards, with and without `board-create`, using a 1440×1000 Chromium viewport. Each run waits for initial collapsed queries, takes an after-GC snapshot, then performs five open/close/navigation cycles while retaining the page's query client. With permission, the first cycle verifies the existing-name error, edits to a unique valid name, verifies availability, and submits once. The second cycle edits an unsubmitted draft, cancels, reopens, and asserts the input resets to the original board name before cancelling again. This checks the baseline `duplicateFormKey` remount contract directly. Later cycles cancel. Without permission, the duplicate action stays hidden while the run checks for hidden availability calls, including synthetic 403 responses. The runner asserts that baseline and candidate form, validation, submit, cancel, and draft-reset outputs match.

TanStack Query defaults match Homarr's installed client defaults for this path: 30-second stale time and five-minute garbage collection. These five cycles finish within the stale window, so navigation remounts should reuse cached query results. The harness records actual cache observers and entries rather than assuming React `Activity` keeps observers active.

## Run after the coordinator authorizes measurement

From the repository root, with the installed Chromium browser available to Playwright:

```sh
mise exec -- node --import tsx audit-evidence/2026-10-11/measurements/board-card-browser-harness/run.mts
```

Use the repository-pinned Node 24 runtime (`mise exec -- node --version` currently reports v24.18.0).

For a paired follow-up after a promising first comparison, use `--pairs=9`. Within each board-count/permission scenario, baseline/candidate order alternates per pair and every variant receives a fresh headless Chromium process and Playwright `BrowserContext`. Chromium is capped at two renderer processes. The output includes `pairIndex`, and form semantics are compared within every pair. Each run records Node/Chromium versions, git revision, frozen baseline source SHA-256, and menu-item-to-visible-input latency per open cycle.

The script starts a Vite server on `127.0.0.1:4179`, launches headless Chromium, writes `measurements/board-card-browser-results.json`, and prints the same JSON. Do not compare absolute development-server heap values to production. Use paired baseline/candidate deltas and keep the permission and board-count scenarios separate. If the browser fixture fails to compile, fix only harness code and report that no measurement was obtained; do not alter production to make the fixture pass.

## Evidence and limits

- Installed implementation inspected: `node_modules/@mantine/core/esm/components/Collapse/Collapse.mjs` (9.6.0). Default `keepMounted` is true; the collapsed children are wrapped with React's `Activity` in hidden mode. `keepMounted={false}` omits content after the Collapse exit state while retaining the same `useCollapse` transition path.
- Installed versions read from workspace manifests: React 19.2.7 and TanStack Query 5.101.2.
- The frozen `BoardCard` source is `baseline-source/apps/nextjs/src/app/[locale]/manage/boards/_components/board-card.tsx`.
- Synthetic board names cause `board.exists` to return true; an edited `Fresh-0` name returns false. No real user data, board records, external apps, media, or network service is contacted.
- Request sizes omit real tRPC batching, serialization wrappers, headers, cookies, and server response framing. The server's `noBoardWithSimilarNameAsync` database query cost is not measured here; it requires a separate API/server benchmark if browser evidence confirms eager calls.
- Heap deltas include React, Mantine, TanStack, and Vite development runtime overhead. They are comparative fixture evidence only.

## Current state

Harness is prepared and has not been run. No production file, test file, dependency, or build output was changed or generated.
