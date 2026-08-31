<!-- release-v2-qa-report
{
  "packetId": "widgets-09",
  "status": "blocked",
  "caseStatuses": {
    "WG-009-RENDER-SIZE": "blocked",
    "WG-009-STATES-RECOVERY": "blocked",
    "WG-009-OPTIONS-PERSISTENCE": "blocked",
    "WG-009-ACCESS-READONLY": "blocked",
    "WG-009-EVIDENCE": "blocked"
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
    "persona": "Maya Media",
    "sessionId": "qa-v2-widgets-09",
    "timestamp": "2026-08-31T16:19:53.769Z",
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
        "WG-009-RENDER-SIZE",
        "WG-009-STATES-RECOVERY",
        "WG-009-OPTIONS-PERSISTENCE",
        "WG-009-ACCESS-READONLY",
        "WG-009-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-320x568-100.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-320x568-100.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-network-320x568-100.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-network-320x568-100.txt"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-320x568-100.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-console-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-errors-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-320x568-100.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-console-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-errors-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-network-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-network-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-snapshot-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-url-320x568-100.txt"
  ],
  "widgetChecks": [
    {
      "widgetKind": "calendar",
      "viewport": "mobile-320",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "calendar",
      "viewport": "mobile-375",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "calendar",
      "viewport": "boundary-767",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "calendar",
      "viewport": "boundary-768",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "calendar",
      "viewport": "tablet-1024",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "calendar",
      "viewport": "boundary-1279",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "calendar",
      "viewport": "desktop-1280",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "calendar",
      "viewport": "desktop-1440",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "calendar",
      "viewport": "desktop-1920",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaServer",
      "viewport": "mobile-320",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaServer",
      "viewport": "mobile-375",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaServer",
      "viewport": "boundary-767",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaServer",
      "viewport": "boundary-768",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaServer",
      "viewport": "tablet-1024",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaServer",
      "viewport": "boundary-1279",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaServer",
      "viewport": "desktop-1280",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaServer",
      "viewport": "desktop-1440",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaServer",
      "viewport": "desktop-1920",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestList",
      "viewport": "mobile-320",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestList",
      "viewport": "mobile-375",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestList",
      "viewport": "boundary-767",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestList",
      "viewport": "boundary-768",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestList",
      "viewport": "tablet-1024",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestList",
      "viewport": "boundary-1279",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestList",
      "viewport": "desktop-1280",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestList",
      "viewport": "desktop-1440",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestList",
      "viewport": "desktop-1920",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestStats",
      "viewport": "mobile-320",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestStats",
      "viewport": "mobile-375",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestStats",
      "viewport": "boundary-767",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestStats",
      "viewport": "boundary-768",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestStats",
      "viewport": "tablet-1024",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestStats",
      "viewport": "boundary-1279",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestStats",
      "viewport": "desktop-1280",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestStats",
      "viewport": "desktop-1440",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaRequests-requestStats",
      "viewport": "desktop-1920",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaMissing",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaMissing",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaMissing",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaMissing",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaMissing",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaMissing",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaMissing",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaMissing",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "mediaMissing",
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

# widgets-09: Media overview and requests

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | widgets |
| PR refs | #6502, #6555 |
| Personas | Maya Media |
| Boards | qa-widgets-09 |
| Profiles | main-writable, degraded |
| Chromium viewports | mobile-320, mobile-375, boundary-767, boundary-768, tablet-1024, boundary-1279, desktop-1280, desktop-1440, desktop-1920 |
| Zoom | 80%, 100%, 125% |
| Input | mouse, touch, keyboard |
| Widget kinds | calendar, mediaServer, mediaRequests-requestList, mediaRequests-requestStats, mediaMissing |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Maya Media |
| Browser session ID | qa-v2-widgets-09 |
| Timestamp | 2026-08-31T16:19:53.769Z |
| Executed viewport / input / zoom | mobile-320 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| WG-009-RENDER-SIZE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Render every assigned widget kind at every assigned viewport and exercise default, minimum, maximum, and compact sizes where supported. |
| WG-009-STATES-RECOVERY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify loading, populated, empty, error, stale, retry, and recovered states for every assigned widget kind. |
| WG-009-OPTIONS-PERSISTENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Mutate meaningful options, save, reload, reset, and confirm each assigned widget kind persists correctly. |
| WG-009-ACCESS-READONLY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify Owner, Editor, Viewer, missing-integration, permission-denied, and global read-only behavior for every assigned widget kind. |
| WG-009-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Capture screenshot, console, network, overflow, clipping, focus, and cleanup evidence for every kind and viewport row. |

## Widget kind × viewport checklist

| Widget kind | Viewport | Size | States | Permission/read-only | Options/persistence | Recovery | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| calendar | mobile-320 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| calendar | mobile-375 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| calendar | boundary-767 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| calendar | boundary-768 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| calendar | tablet-1024 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| calendar | boundary-1279 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| calendar | desktop-1280 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| calendar | desktop-1440 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| calendar | desktop-1920 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaServer | mobile-320 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaServer | mobile-375 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaServer | boundary-767 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaServer | boundary-768 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaServer | tablet-1024 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaServer | boundary-1279 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaServer | desktop-1280 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaServer | desktop-1440 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaServer | desktop-1920 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestList | mobile-320 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestList | mobile-375 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestList | boundary-767 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestList | boundary-768 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestList | tablet-1024 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestList | boundary-1279 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestList | desktop-1280 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestList | desktop-1440 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestList | desktop-1920 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestStats | mobile-320 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestStats | mobile-375 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestStats | boundary-767 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestStats | boundary-768 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestStats | tablet-1024 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestStats | boundary-1279 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestStats | desktop-1280 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestStats | desktop-1440 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaRequests-requestStats | desktop-1920 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaMissing | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaMissing | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaMissing | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaMissing | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaMissing | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaMissing | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaMissing | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaMissing | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |
| mediaMissing | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09) | blocked |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, mobile-320, 100% zoom, mouse, fresh named Chromium session qa-v2-widgets-09.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [redirect-320x568-100.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-320x568-100.png)
- [redirect-console-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-console-320x568-100.txt)
- [redirect-errors-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-errors-320x568-100.txt)
- [redirect-final-320x568-100.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-320x568-100.png)
- [redirect-final-console-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-console-320x568-100.txt)
- [redirect-final-errors-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-errors-320x568-100.txt)
- [redirect-final-network-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-final-network-320x568-100.txt)
- [redirect-network-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-network-320x568-100.txt)
- [redirect-snapshot-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-snapshot-320x568-100.txt)
- [redirect-url-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-09/redirect-url-320x568-100.txt)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
