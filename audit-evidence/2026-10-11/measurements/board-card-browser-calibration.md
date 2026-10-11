# BoardCard collapsed-form calibration

## Result

The collapsed `DuplicateBoardForm` does **not** make hidden `board.exists` requests in this fixture. At initial render, request count is zero for baseline and candidate at 1, 25, and 100 cards, both with and without board-create permission. The baseline does create one unobserved TanStack query-cache entry per board; React Activity keeps the form tree in the DOM but pauses its effects. The eager-network-request claim is rejected.

The candidate (`Collapse keepMounted={false}`) removes the hidden form subtree until expansion. This produced a clear collapsed client-side footprint reduction, growing with card count:

| Cards | Permission | Baseline DOM / after-GC heap / query entries | Candidate DOM / after-GC heap / query entries | DOM saved | Heap saved |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | create | 66 / 36,311,576 B / 1 | 47 / 36,002,256 B / 0 | 19 | 309,320 B |
| 1 | none | 66 / 36,302,896 B / 1 | 47 / 36,011,820 B / 0 | 19 | 291,076 B |
| 25 | create | 1,122 / 43,427,980 B / 25 | 647 / 40,676,912 B / 0 | 475 | 2,751,068 B |
| 25 | none | 1,122 / 43,401,856 B / 25 | 647 / 40,644,176 B / 0 | 475 | 2,757,680 B |
| 100 | create | 4,422 / 58,215,352 B / 100 | 2,522 / 52,077,896 B / 0 | 1,900 | 6,137,456 B |
| 100 | none | 4,422 / 58,226,272 B / 100 | 2,522 / 52,046,336 B / 0 | 1,900 | 6,179,936 B |

These are per-run CDP `HeapProfiler.collectGarbage` then `Runtime.getHeapUsage` values from one baseline/candidate calibration pair for each size/permission combination. They are comparative fixture heap values, not production memory estimates. The result artifact contains all intermediate open/close/navigation snapshots and per-run details.

## Behavior and timing

Form behavior matched in the calibration: existing-name validation, available-name feedback, submit enabled state, exactly one duplicate mutation, cancel, and edited-draft cancel/reopen reset to the original board name. This draft reset is already enforced by the baseline `BoardCard` incrementing `duplicateFormKey` on every open.

Baseline and candidate had identical captured collapsed/open inline Collapse styles. On first open both used `height: 214px` and `transition: height 200ms, opacity 200ms`; transition event counts were similar (3–4 during first open). At 100 cards, menu-item-to-visible-input times were 88–151 ms baseline and 98–140 ms candidate across five cycles. This is one calibration run, so it supports no material latency regression but is not a statistical performance guarantee.

## Scope and evidence limits

- The fixture renders the frozen `BoardCard` snapshot with live `DuplicateBoardForm`, `useBoardNameStatus`, `BoardNameAvailability`, `useZodForm`, validation schemas, installed Mantine 9.6.0, React 19.2.7, and TanStack Query 5.101.2. Unrelated router, menu body, translation, thumbnail/avatar, notifications, and API client are mocked. There is no Homarr server or database.
- Request transport is synthetic plain JSON intercepted by Playwright. Raw body bytes are recorded; gzip sizes are calculated estimates only, not measured compressed transfer. No real tRPC payload, bundle size, network transfer, or server RAM was measured.
- The baseline and candidate each ran in a fresh headless Chromium process and Playwright context with `--renderer-process-limit=2`. Node was v24.18.0, Chromium 149.0.7827.55, and source/runtime metadata is in `board-card-browser-results.json`.
- The first attempt was denied local port binding (`EPERM`); the authorized retry used port 4179. Vite then exposed two fixture issues (repository-root mapping and named `BoardCard` export), which were corrected only in the harness. A later form locator was scoped to the active card because collapsed baseline forms remain in the DOM.
- The project-scoped Mantine MCP lookup for Collapse returned 404 for both documentation and props. The installed Mantine 9.6.0 `Collapse.mjs` source was inspected; it defaults `keepMounted` to true and wraps retained collapsed content in React Activity. The current official Collapse page was used as a secondary transition-contract reference, with installed source treated as authoritative for this version.

## Formal nine-pair comparison

The retained artifact `board-card-browser-pairs-9.json` contains 108 complete variant runs: nine alternating baseline/candidate pairs for each of the 1/25/100-card and create/no-create scenarios. Every variant ran in a fresh Chromium process and browser context. Node was v24.18.0 and Chromium was 149.0.7827.55. It records the frozen baseline and live BoardCard SHA-256 values. The earlier formal attempt was stopped before it wrote an artifact because the mock omitted hook-level mutation callbacks; the retained run forwarded those callbacks and validated one mutation on submit.

At initial collapsed render, the median after-GC heap and fixed DOM deltas were:

| Cards | Permission | Baseline heap → candidate heap (median) | Paired heap delta median [range] | Baseline → candidate DOM | Query entries (baseline → candidate) |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | create | 36,314,036 → 36,006,892 B | -305,160 [-797,784, -291,020] B | 66 → 47 | 1 → 0 |
| 1 | none | 36,313,744 → 36,003,704 B | -311,376 [-313,716, -298,072] B | 66 → 47 | 1 → 0 |
| 25 | create | 43,415,240 → 40,665,032 B | -2,748,088 [-2,757,384, -2,259,948] B | 1,122 → 647 | 25 → 0 |
| 25 | none | 43,409,280 → 40,646,356 B | -2,762,252 [-2,768,004, -2,735,684] B | 1,122 → 647 | 25 → 0 |
| 100 | create | 58,231,628 → 52,082,400 B | -6,152,976 [-9,157,192, -6,128,264] B | 4,422 → 2,522 | 100 → 0 |
| 100 | none | 58,181,380 → 52,036,864 B | -6,143,732 [-9,148,628, -6,126,128] B | 4,422 → 2,522 | 100 → 0 |

All baseline initial query entries were pending with zero observers. Initial and total request counts were identical between variants in every pair: zero hidden requests; with create permission, total requests were 2 at one card and 6 at 25/100 cards; without permission they were zero. This confirms the resource finding is retained hidden form/query state, not network traffic. These heap numbers are totals for the rendered fixture at each scenario size; they are not per-card costs.

After five open/cancel/navigation cycles, query counts were consistent across all nine runs at each scenario: 27 baseline vs 7 candidate for 25-card/create, 25 vs 0 for 25-card/no-create, 102 vs 7 for 100-card/create, and 100 vs 0 for 100-card/no-create. Counts increase as distinct valid names are checked; TanStack `gcTime` is five minutes and the full run stays within that interval, so candidate entries for forms actually opened remain cached during this bounded experiment. This does not establish indefinite accumulation behavior. Paired after-cycle-five heap deltas still favored the candidate: at 25 cards, median -2,493,596 B [range -3,179,836 to -1,888,652] with create and -2,724,988 B [-3,973,456 to -1,519,012] without; at 100 cards, -4,849,392 B [-6,267,056 to -1,102,160] with create and -9,137,492 B [-11,139,520 to -4,408,580] without.

Post-cycle DOM readings need a timing caveat. The runner snapshots 50 ms after the first card remounts, while React Activity renders hidden children at background priority. At 100 cards, baseline DOM readings after the fifth navigation ranged from 2,522 to 4,442 nodes; at earlier cycles they gradually grew from 2,522 as hidden subtrees rendered. Thus those immediate post-navigation values do not show a stable baseline plateau. The stabilized initial-render DOM counts above are reliable, and the candidate remained at 2,522 nodes in every 100-card post-cycle sample. Query counts are stable at each cycle. After-cycle heap values are lower in candidate paired medians, though ranges show meaningful runtime noise.

Open-to-visible-input latency did not show a consistent paired penalty. Median first-open times (baseline → candidate) were 100.7 → 108.3 ms at one card, 98.5 → 101.6 ms at 25, and 120.9 → 148.3 ms at 100. The paired candidate-minus-baseline medians/ranges were +8.8 ms [-30.4, +40.1], +1.5 ms [-17.0, +10.1], and -1.9 ms [-64.6, +56.0], respectively. The 100-card unpaired median difference (+27.4 ms) is not reflected in paired deltas and is within the broad run-to-run range; treat it as inconclusive, not a measured regression or guarantee.

All 108 runs had exact equality for visible validation, available-name result, submit state, mutation count, cancel, and draft-reset semantics. First-open transitions used the same `height 200ms, opacity 200ms` timing in all pairs, with 3–4 transition events captured. Some sampled expanded height targets differed by 2 px (214 vs 216 px) at the snapshot instant; these were timing samples during animation, not a stable end-height comparison. The installed Mantine Collapse code keeps the same transition path while `keepMounted={false}` waits for exit before unmounting. The result supports the narrow BoardCard prop change for hidden DOM/heap reduction, not an eager-network optimization.

Synthetic request bodies were plain JSON. Raw body bytes were recorded and gzip sizes remain estimates; compressed transfer bytes are unmeasured. No bundle bytes, live tRPC traffic, server RAM, or database cost was measured. The production diff is only `keepMounted={false}` on BoardCard's existing Collapse.
