<!-- release-v2-qa-report
{
  "packetId": "widgets-07",
  "status": "blocked",
  "caseStatuses": {
    "WG-007-RENDER-SIZE": "blocked",
    "WG-007-STATES-RECOVERY": "blocked",
    "WG-007-OPTIONS-PERSISTENCE": "blocked",
    "WG-007-ACCESS-READONLY": "blocked",
    "WG-007-EVIDENCE": "blocked"
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
    "sessionId": "qa-v2-widgets-07",
    "timestamp": "2026-08-31T16:12:58.557Z",
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
        "WG-007-RENDER-SIZE",
        "WG-007-STATES-RECOVERY",
        "WG-007-OPTIONS-PERSISTENCE",
        "WG-007-ACCESS-READONLY",
        "WG-007-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-320x568-100.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-network-320x568-100.txt"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-320x568-100.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-console-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-errors-320x568-100.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-network-320x568-100.txt"
  ],
  "widgetChecks": [
    {
      "widgetKind": "beszelSystemTable",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemTable",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemTable",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemTable",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemTable",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemTable",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemTable",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemTable",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemTable",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemGrid",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemGrid",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemGrid",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemGrid",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemGrid",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemGrid",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemGrid",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemGrid",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemGrid",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelAlerts",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelAlerts",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelAlerts",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelAlerts",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelAlerts",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelAlerts",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelAlerts",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelAlerts",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelAlerts",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemStats",
      "viewport": "mobile-320",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemStats",
      "viewport": "mobile-375",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemStats",
      "viewport": "boundary-767",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemStats",
      "viewport": "boundary-768",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemStats",
      "viewport": "tablet-1024",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemStats",
      "viewport": "boundary-1279",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemStats",
      "viewport": "desktop-1280",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemStats",
      "viewport": "desktop-1440",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "beszelSystemStats",
      "viewport": "desktop-1920",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "wud",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "wud",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "wud",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "wud",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "wud",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "wud",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "wud",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "wud",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "wud",
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

# widgets-07: Beszel and update monitoring

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | widgets |
| PR refs | #6502, #6555 |
| Personas | Ingrid Infra |
| Boards | qa-widgets-07 |
| Profiles | main-writable, degraded |
| Chromium viewports | mobile-320, mobile-375, boundary-767, boundary-768, tablet-1024, boundary-1279, desktop-1280, desktop-1440, desktop-1920 |
| Zoom | 100%, 125% |
| Input | mouse, touch, keyboard |
| Widget kinds | beszelSystemTable, beszelSystemGrid, beszelAlerts, beszelSystemStats, wud |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Ingrid Infra |
| Browser session ID | qa-v2-widgets-07 |
| Timestamp | 2026-08-31T16:12:58.557Z |
| Executed viewport / input / zoom | mobile-320 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| WG-007-RENDER-SIZE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Render every assigned widget kind at every assigned viewport and exercise default, minimum, maximum, and compact sizes where supported. |
| WG-007-STATES-RECOVERY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify loading, populated, empty, error, stale, retry, and recovered states for every assigned widget kind. |
| WG-007-OPTIONS-PERSISTENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Mutate meaningful options, save, reload, reset, and confirm each assigned widget kind persists correctly. |
| WG-007-ACCESS-READONLY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify Owner, Editor, Viewer, missing-integration, permission-denied, and global read-only behavior for every assigned widget kind. |
| WG-007-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Capture screenshot, console, network, overflow, clipping, focus, and cleanup evidence for every kind and viewport row. |

## Widget kind × viewport checklist

| Widget kind | Viewport | Size | States | Permission/read-only | Options/persistence | Recovery | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| beszelSystemTable | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemTable | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemTable | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemTable | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemTable | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemTable | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemTable | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemTable | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemTable | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemGrid | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemGrid | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemGrid | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemGrid | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemGrid | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemGrid | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemGrid | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemGrid | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemGrid | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelAlerts | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelAlerts | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelAlerts | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelAlerts | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelAlerts | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelAlerts | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelAlerts | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelAlerts | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelAlerts | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemStats | mobile-320 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemStats | mobile-375 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemStats | boundary-767 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemStats | boundary-768 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemStats | tablet-1024 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemStats | boundary-1279 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemStats | desktop-1280 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemStats | desktop-1440 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| beszelSystemStats | desktop-1920 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| wud | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| wud | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| wud | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| wud | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| wud | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| wud | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| wud | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| wud | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |
| wud | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07) | blocked |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, mobile-320, 100% zoom, mouse, fresh named Chromium session qa-v2-widgets-07.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [redirect-320x568-100.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-320x568-100.png)
- [redirect-console-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-console-320x568-100.txt)
- [redirect-errors-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-errors-320x568-100.txt)
- [redirect-network-320x568-100.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-07/redirect-network-320x568-100.txt)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
