<!-- release-v2-qa-report
{
  "packetId": "widgets-11",
  "status": "blocked",
  "caseStatuses": {
    "WG-011-RENDER-SIZE": "blocked",
    "WG-011-STATES-RECOVERY": "blocked",
    "WG-011-OPTIONS-PERSISTENCE": "blocked",
    "WG-011-ACCESS-READONLY": "blocked",
    "WG-011-EVIDENCE": "blocked"
  },
  "execution": {
    "candidateSha": "f57a660088d6777c86aca22977354fa8b810e2be",
    "url": "http://127.0.0.1:37137",
    "actualPort": 37137,
    "runtimeProfile": "main-writable",
    "runtimeFlags": [
      "DEMO_MODE=true",
      "DEMO_READ_ONLY=false",
      "UNSAFE_ENABLE_MOCK_INTEGRATION=true"
    ],
    "persona": "Ingrid Infra",
    "sessionId": "qa-v2-widgets-11",
    "timestamp": "2026-08-31T16:25:06.485Z",
    "viewport": "mobile-320",
    "input": "mouse",
    "zoom": 100
  },
  "findings": [
    {
      "id": "RV2-P1-001",
      "fingerprint": "release-v2-auth-locale-redirect-loop",
      "severity": "P1",
      "area": "routing/authentication",
      "title": "Locale rewrite causes an infinite browser redirect before the application renders",
      "summary": "Chromium repeatedly requests the same entry route and ends on ERR_TOO_MANY_REDIRECTS, preventing the assigned browser flow.",
      "caseIds": [
        "WG-011-RENDER-SIZE",
        "WG-011-STATES-RECOVERY",
        "WG-011-OPTIONS-PERSISTENCE",
        "WG-011-ACCESS-READONLY",
        "WG-011-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11/redirect-320x568-100.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11/redirect-network-320x568-100.txt"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11/redirect-320x568-100.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11/redirect-console-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11/redirect-network-320x568-100.txt"
  ],
  "widgetChecks": [
    {
      "widgetKind": "paperlessNgx",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "paperlessNgx",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "paperlessNgx",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "paperlessNgx",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "paperlessNgx",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "paperlessNgx",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "paperlessNgx",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "paperlessNgx",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "paperlessNgx",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "patchmon",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "patchmon",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "patchmon",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "patchmon",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "patchmon",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "patchmon",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "patchmon",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "patchmon",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "patchmon",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "bazarr",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "bazarr",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "bazarr",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "bazarr",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "bazarr",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "bazarr",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "bazarr",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "bazarr",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "bazarr",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "tracearr",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "tracearr",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "tracearr",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "tracearr",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "tracearr",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "tracearr",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "tracearr",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "tracearr",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "tracearr",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "releases",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "releases",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "releases",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "releases",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "releases",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "releases",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "releases",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "releases",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "releases",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    }
  ],
  "performance": {
    "measurements": [],
    "limitations": [
      "The application never rendered, so assigned feature, mutation, persistence, permission, viewport, and performance checks were blocked.",
      "No credentials were submitted and no product state was mutated.",
      "The packet's retry did not produce a separate artifact; the same finding has independent reproductions in the preflight reports."
    ]
  },
  "independentReproductions": [
    {
      "findingFingerprint": "release-v2-auth-locale-redirect-loop",
      "agentId": "qa-v2-preflight-01",
      "outcome": "reproduced",
      "evidence": [],
      "notes": "See preflight-01 for an independent Luna Max reproduction."
    }
  ],
  "notes": "Report-only black-box run. No defect was fixed and no secret was recorded."
}
-->

# widgets-11: Documents, patching, media services, and releases

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | widgets |
| PR refs | #6502, #6555 |
| Personas | Ingrid Infra |
| Boards | qa-widgets-11 |
| Profiles | main-writable, degraded |
| Chromium viewports | mobile-320, mobile-375, boundary-767, boundary-768, tablet-1024, boundary-1279, desktop-1280, desktop-1440, desktop-1920 |
| Zoom | 100%, 200% |
| Input | mouse, touch, keyboard |
| Widget kinds | paperlessNgx, patchmon, bazarr, tracearr, releases |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Ingrid Infra |
| Browser session ID | qa-v2-widgets-11 |
| Timestamp | 2026-08-31T16:25:06.485Z |
| Executed viewport / input / zoom | mobile-320 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| WG-011-RENDER-SIZE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Render every assigned widget kind at every assigned viewport and exercise default, minimum, maximum, and compact sizes where supported. |
| WG-011-STATES-RECOVERY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify loading, populated, empty, error, stale, retry, and recovered states for every assigned widget kind. |
| WG-011-OPTIONS-PERSISTENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Mutate meaningful options, save, reload, reset, and confirm each assigned widget kind persists correctly. |
| WG-011-ACCESS-READONLY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify Owner, Editor, Viewer, missing-integration, permission-denied, and global read-only behavior for every assigned widget kind. |
| WG-011-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Capture screenshot, console, network, overflow, clipping, focus, and cleanup evidence for every kind and viewport row. |

## Widget kind × viewport checklist

| Widget kind | Viewport | Size | States | Permission/read-only | Options/persistence | Recovery | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| paperlessNgx | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| paperlessNgx | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| paperlessNgx | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| paperlessNgx | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| paperlessNgx | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| paperlessNgx | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| paperlessNgx | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| paperlessNgx | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| paperlessNgx | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| patchmon | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| patchmon | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| patchmon | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| patchmon | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| patchmon | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| patchmon | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| patchmon | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| patchmon | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| patchmon | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| bazarr | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| bazarr | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| bazarr | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| bazarr | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| bazarr | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| bazarr | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| bazarr | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| bazarr | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| bazarr | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| tracearr | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| tracearr | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| tracearr | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| tracearr | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| tracearr | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| tracearr | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| tracearr | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| tracearr | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| tracearr | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| releases | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| releases | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| releases | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| releases | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| releases | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| releases | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| releases | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| releases | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |
| releases | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11) | blocked |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, mobile-320, 100% zoom, mouse, fresh named Chromium session qa-v2-widgets-11.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [redirect-320x568-100.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11/redirect-320x568-100.png)
- [redirect-console-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11/redirect-console-320x568-100.txt)
- [redirect-network-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-11/redirect-network-320x568-100.txt)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
