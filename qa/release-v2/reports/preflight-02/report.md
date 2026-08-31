<!-- release-v2-qa-report
{
  "packetId": "preflight-02",
  "status": "failed",
  "caseStatuses": {
    "PF-002-ENVIRONMENT": "failed",
    "PF-002-ACCESS": "failed",
    "PF-002-EVIDENCE": "passed"
  },
  "execution": {
    "candidateSha": "f57a660088d6777c86aca22977354fa8b810e2be",
    "url": "http://127.0.0.1:34401",
    "actualPort": 34401,
    "runtimeProfile": "main-writable",
    "runtimeFlags": [
      "DEMO_MODE=true",
      "DEMO_READ_ONLY=false",
      "UNSAFE_ENABLE_MOCK_INTEGRATION=true"
    ],
    "persona": "Avery Admin",
    "sessionId": "p02-rerun-main-avery-r2",
    "timestamp": "2026-08-31T20:58:30.000Z",
    "viewport": "desktop-1440",
    "input": "mouse, keyboard",
    "zoom": 100
  },
  "findings": [
    {
      "id": "RV2-P1-001",
      "fingerprint": "release-v2-readonly-edit-affordance",
      "severity": "P1",
      "area": "authorization/read-only",
      "title": "Main-readonly privileged sessions expose board and item mutation UI",
      "summary": "Fresh main-readonly Avery and Rowan sessions show Edit board on the private shared board. Avery opened Edit item, Move / resize item, Duplicate item, and Remove item actions; the Edit item dialog had an enabled Save changes control. An unchanged save was submitted and reload retained 24 items; no changed value was submitted.",
      "caseIds": [
        "PF-002-ACCESS"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-1-view.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-2-edit-mode.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-3-item-menu.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-4-edit-dialog.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-grid-edit-menu.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-edit-dialog.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-edit-mode.png"
      ]
    },
    {
      "id": "RV2-P2-002",
      "fingerprint": "release-v2-static-chunk-404",
      "severity": "P2",
      "area": "runtime/network",
      "title": "Authenticated readonly page requests a missing Next.js static chunk",
      "summary": "After clearing and reloading a fresh authenticated readonly session, the browser reported GET /_next/static/chunks/_1wsmiab._.js [Script] 404 while the board still rendered. Request bodies, headers, cookies, tokens, and query strings were not inspected.",
      "caseIds": [
        "PF-002-ENVIRONMENT"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-network-status.txt"
      ]
    },
    {
      "id": "RV2-P2-003",
      "fingerprint": "release-v2-posthog-duplicate-init-warning",
      "severity": "P2",
      "area": "runtime/console",
      "title": "Authenticated pages emit a duplicate PostHog initialization warning",
      "summary": "Fresh reload baselines for readonly Rowan and main-writable Vivian both emitted the PostHog duplicate-initialization warning. React DevTools and HMR messages were also present; neither session captured a page error.",
      "caseIds": [
        "PF-002-ENVIRONMENT"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-console.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-console.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-errors.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-errors.txt"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-auth-summary.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-avery-main-authenticated-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-avery-main-grid-24.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-avery-main-grid-edit.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-avery-main-permissions-public.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-main-grid-24.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-main-permissions-public.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-grid-24.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-permissions-public.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-nolan-main-grid-24-denied.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-nolan-main-permissions-public.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-grid-edit-menu.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-edit-dialog.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-permissions-public.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-1-view.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-2-edit-mode.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-3-item-menu.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-4-edit-dialog.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-grid-24.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-permissions-public.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-edit-mode.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-readonly-grid-24.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-readonly-permissions-public.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-nolan-readonly-grid-24-denied.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-nolan-readonly-permissions-public.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-network-status.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-network-status.txt"
  ],
  "widgetChecks": [],
  "performance": {
    "measurements": [],
    "limitations": [
      "This was a focused black-box preflight rerun; no widget or performance measurement was in scope.",
      "The readonly guard was exercised without changing a field or submitting a changed board value; reload retained 24 private-board items.",
      "The interactive video recorder stop hung and produced an unusable zero-byte rerun-readonly-edit-affordance.webm; annotated step screenshots are the relied-upon evidence.",
      "Main-writable Vivian's fresh reload did not capture a matching _1wsmiab chunk request; the 404 finding is based on the direct readonly Rowan observation."
    ]
  },
  "independentReproductions": [
    {
      "findingFingerprint": "release-v2-readonly-edit-affordance",
      "agentId": "p02-rerun-ro-avery",
      "outcome": "reproduced",
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-grid-edit-menu.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-edit-dialog.png"
      ],
      "notes": "Rowan readonly independently entered edit mode; no changed value was submitted."
    },
    {
      "findingFingerprint": "release-v2-static-chunk-404",
      "agentId": "p02-rerun-ro-rowan",
      "outcome": "observed",
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-network-status.txt"
      ],
      "notes": "Fresh reload captured the missing static chunk status while the board rendered."
    }
  ],
  "notes": "Report-only black-box rerun for candidate f57a660088d6777c86aca22977354fa8b810e2be. The former stale-port redirect-blocked result is replaced by this run. No secret values were recorded, no changed fixture value was submitted, and the shared report aggregator/ledger was not run."
}
-->

# preflight-02: fixture and persona access

| Metadata | Value |
| --- | --- |
| Status | failed |
| Wave | preflight |
| PR refs | #6545 |
| Personas | Avery Admin, Rowan Owner, Vivian Viewer, Nolan Outsider |
| Boards | qa-grid-24, qa-permissions-public |
| Profiles | main-writable, main-readonly |
| Chromium viewports | desktop-1440 |
| Zoom | 100% |
| Input | mouse, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual ports | http://127.0.0.1:34401 / 34401; http://127.0.0.1:41589 / 41589 |
| Runtime profiles / flags | main-writable and main-readonly; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed personas | Avery Admin, Rowan Owner, Vivian Viewer, Nolan Outsider |
| Browser session IDs | p02-rerun-main-avery-r2, p02-rerun-main-rowan, p02-rerun-main-vivian, p02-rerun-main-nolan, p02-rerun-ro-avery, p02-rerun-ro-rowan, p02-rerun-ro-vivian, p02-rerun-ro-nolan |
| Timestamp | 2026-08-31T22:58:30+02:00 |
| Executed viewport / input / zoom | desktop-1440 / mouse, keyboard / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| PF-002-ENVIRONMENT | failed | [runtime artifacts](#artifacts) | Both local profiles rendered the app and assigned boards. The readonly Rowan baseline captured a missing static chunk (404) and both sampled profiles emitted a duplicate PostHog initialization warning; page-error buffers were empty. | Verify candidate identity, Chromium session, runtime health, fixture reachability, and clean console/network baselines. |
| PF-002-ACCESS | failed | [access matrix](#access-matrix), [readonly steps](#findings) | Authentication and direct board access worked for all personas. Shared-board role boundaries held, but privileged users in main-readonly could enter edit mode and reach enabled item-save UI. | Verify assigned profiles, personas, boards, permissions, and readonly boundaries before mutations. |
| PF-002-EVIDENCE | passed | [artifacts](#artifacts) | Fresh named Chromium sessions covered both profiles, all four personas, both boards, reload persistence, and a retry of the readonly interactive path. No secret values were recorded. | Capture timestamped viewport/input/zoom evidence and confirm artifacts contain no secrets. |

## Access matrix

Observed UI on the private shared board (`qa-grid-24`) and public board (`qa-permissions-public`):

| Profile | Persona | Private shared board | Public board |
| --- | --- | --- | --- |
| main-writable | Avery Admin | Edit board and Board settings; 24 items | Edit board and Board settings; 2 items |
| main-writable | Rowan Owner | Edit board and Board settings; 24 items | Edit board and Board settings; 2 items |
| main-writable | Vivian Viewer | View only; 24 items | View only; 2 items |
| main-writable | Nolan Outsider | Denied with Board not found | View only; 2 items |
| main-readonly | Avery Admin | Edit board and item mutation UI; 24 items | Edit board; 2 items |
| main-readonly | Rowan Owner | Edit board and edit mode; 24 items | Edit board; 2 items |
| main-readonly | Vivian Viewer | View only; 24 items | View only; 2 items |
| main-readonly | Nolan Outsider | Denied with Board not found | View only; 2 items |

Public-board behavior is recorded from the browser, not inferred from the fixture manifest. The main-readonly profile did not show Board settings in the privileged public-board views, but it still showed Edit board.

## Runtime baseline

- Authentication completed for all eight persona/profile combinations. Avery and Nolan required a hydration retry in their respective sessions; only the non-secret username was re-filled.
- No page errors were captured in the fresh reload baselines for Rowan readonly or Vivian main-writable.
- Rowan readonly captured `GET /_next/static/chunks/_1wsmiab._.js [Script] 404` after reload. The matching main-writable Vivian filter captured no request.
- Rowan readonly and Vivian main-writable both emitted the duplicate PostHog initialization warning. React DevTools and HMR messages were also present as development-runtime messages.

## Findings

### RV2-P1-001 — P1: main-readonly privileged sessions expose mutation UI

Preconditions: candidate `f57a660088d6777c86aca22977354fa8b810e2be`, main-readonly at `http://127.0.0.1:41589`, desktop-1440, 100% zoom, fresh named sessions.

1. Authenticate as Avery Admin in `p02-rerun-ro-avery` and open `/boards/qa-grid-24`.
2. Observe `Edit board`, enter edit mode, open an item settings menu, and observe Edit item, Move / resize item, Duplicate item, and Remove item.
3. Open Edit item and observe the enabled Save changes control.
4. Submit Save changes without changing a value, leave edit mode, reload, and verify the private board still has 24 items.
5. Repeat the board/edit-mode path as Rowan Owner in `p02-rerun-ro-rowan`.

Expected: main-readonly prevents board and item mutation affordances and save submission. Actual: Avery and Rowan can enter edit mode; Avery can reach the item mutation menu and enabled save control. The unchanged save did not alter fixture content, so this rerun does not claim a changed-value write. Reproducibility: reproduced across Avery and Rowan readonly sessions.

Evidence: [step 1](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-1-view.png), [step 2](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-2-edit-mode.png), [step 3](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-3-item-menu.png), [step 4](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-4-edit-dialog.png), [Avery menu](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-grid-edit-menu.png), [Avery dialog](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-edit-dialog.png), [Rowan edit mode](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-edit-mode.png).

### RV2-P2-002 — P2: authenticated readonly page requests a missing static chunk

Preconditions: candidate `f57a660088d6777c86aca22977354fa8b810e2be`, authenticated Rowan readonly session, fresh reload.

After clearing the request log and reloading `qa-grid-24`, the browser reported `GET /_next/static/chunks/_1wsmiab._.js [Script] 404` while the board rendered. Request bodies, headers, cookies, tokens, and query strings were not inspected. The sanitized status capture is [rerun-rowan-readonly-network-status.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-network-status.txt).

### RV2-P2-003 — P2: authenticated pages emit duplicate PostHog initialization warning

Fresh reload console baselines for Rowan readonly and Vivian main-writable both emitted `[warning] [PostHog.js] You have already initialized PostHog! Re-initializing is a no-op`. No page errors were captured in either paired errors baseline. See [Rowan console](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-console.txt), [Vivian console](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-console.txt), and the corresponding [Rowan errors](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-errors.txt) and [Vivian errors](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-errors.txt) captures.

## Persistence and mutation

- Avery main-writable entered edit mode, performed an unchanged Save board action, reloaded, and retained the private-board title and 24 items.
- Avery main-readonly opened the item edit dialog and submitted Save changes without changing a value; reload retained 24 items. This confirms no changed fixture value was introduced while demonstrating that the readonly save path is enabled.
- Rowan main-readonly entered and exited edit mode without a mutation.
- No other mutation was attempted because the packet’s purpose was permission and readonly-guard coverage.

## Limitations and hygiene

- This was a focused black-box browser rerun. No source files, network bodies, response bodies, headers, cookies, tokens, or password values were inspected or recorded.
- The interactive recorder stop hung and left `rerun-readonly-edit-affordance.webm` at zero bytes; the annotated step screenshots are the relied-upon retry evidence.
- Main-writable Vivian's matching chunk filter had no request after reload; the 404 finding is based on the direct Rowan readonly observation.
- No widget or performance measurements were in scope.
- The shared report aggregator and ledger were not run.

## Artifacts

- [rerun-auth-summary.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-auth-summary.txt)
- [rerun-avery-main-authenticated-home.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-avery-main-authenticated-home.png)
- [rerun-avery-main-grid-24.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-avery-main-grid-24.png)
- [rerun-avery-main-grid-edit.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-avery-main-grid-edit.png)
- [rerun-avery-main-permissions-public.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-avery-main-permissions-public.png)
- [rerun-rowan-main-grid-24.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-main-grid-24.png)
- [rerun-rowan-main-permissions-public.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-main-permissions-public.png)
- [rerun-vivian-main-grid-24.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-grid-24.png)
- [rerun-vivian-main-permissions-public.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-permissions-public.png)
- [rerun-nolan-main-grid-24-denied.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-nolan-main-grid-24-denied.png)
- [rerun-nolan-main-permissions-public.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-nolan-main-permissions-public.png)
- [rerun-readonly-step-1-view.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-1-view.png)
- [rerun-readonly-step-2-edit-mode.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-2-edit-mode.png)
- [rerun-readonly-step-3-item-menu.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-3-item-menu.png)
- [rerun-readonly-step-4-edit-dialog.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-step-4-edit-dialog.png)
- [rerun-readonly-avery-grid-edit-menu.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-grid-edit-menu.png)
- [rerun-readonly-avery-edit-dialog.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-edit-dialog.png)
- [rerun-readonly-avery-permissions-public.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-readonly-avery-permissions-public.png)
- [rerun-rowan-readonly-grid-24.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-grid-24.png)
- [rerun-rowan-readonly-edit-mode.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-edit-mode.png)
- [rerun-rowan-readonly-permissions-public.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-permissions-public.png)
- [rerun-vivian-readonly-grid-24.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-readonly-grid-24.png)
- [rerun-vivian-readonly-permissions-public.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-readonly-permissions-public.png)
- [rerun-nolan-readonly-grid-24-denied.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-nolan-readonly-grid-24-denied.png)
- [rerun-nolan-readonly-permissions-public.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-nolan-readonly-permissions-public.png)
- [rerun-rowan-readonly-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-console.txt)
- [rerun-rowan-readonly-errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-errors.txt)
- [rerun-rowan-readonly-network-status.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-rowan-readonly-network-status.txt)
- [rerun-vivian-main-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-console.txt)
- [rerun-vivian-main-errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-errors.txt)
- [rerun-vivian-main-network-status.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-02/rerun-vivian-main-network-status.txt)

## Cleanup

All rerun sessions were targeted for closure after evidence capture. The zero-byte recorder artifact was retained as produced; no browser secrets or product fixture values were written to the workspace.
