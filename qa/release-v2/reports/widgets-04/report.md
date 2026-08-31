<!-- release-v2-qa-report
{
  "packetId": "widgets-04",
  "status": "blocked",
  "caseStatuses": {
    "WG-004-RENDER-SIZE": "blocked",
    "WG-004-STATES-RECOVERY": "blocked",
    "WG-004-OPTIONS-PERSISTENCE": "blocked",
    "WG-004-ACCESS-READONLY": "blocked",
    "WG-004-EVIDENCE": "blocked"
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
    "sessionId": "qa-v2-widgets-04",
    "timestamp": "2026-08-31T16:05:32.566Z",
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
      "summary": "A fresh Chromium session repeatedly requests the same entry route and ends on ERR_TOO_MANY_REDIRECTS; a fresh-context retry does the same.",
      "caseIds": [
        "WG-004-RENDER-SIZE",
        "WG-004-STATES-RECOVERY",
        "WG-004-OPTIONS-PERSISTENCE",
        "WG-004-ACCESS-READONLY",
        "WG-004-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-fresh-retry-320x568-100-network.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-initial-320x568-100-network.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/screenshots/redirect-fresh-retry-320x568-100-before.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/screenshots/redirect-fresh-retry-320x568-100-result.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/videos/redirect-fresh-retry-320x568-100.webm",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/videos/redirect-initial-320x568-100.webm"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-fresh-retry-320x568-100-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-fresh-retry-320x568-100-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-fresh-retry-320x568-100-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-initial-320x568-100-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-initial-320x568-100-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-initial-320x568-100-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/screenshots/redirect-fresh-retry-320x568-100-before.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/screenshots/redirect-fresh-retry-320x568-100-result.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/videos/redirect-fresh-retry-320x568-100.webm",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/videos/redirect-initial-320x568-100.webm"
  ],
  "widgetChecks": [
    {
      "widgetKind": "downloads",
      "viewport": "mobile-320",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "downloads",
      "viewport": "mobile-375",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "downloads",
      "viewport": "boundary-767",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "downloads",
      "viewport": "boundary-768",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "downloads",
      "viewport": "tablet-1024",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "downloads",
      "viewport": "boundary-1279",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "downloads",
      "viewport": "desktop-1280",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "downloads",
      "viewport": "desktop-1440",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "downloads",
      "viewport": "desktop-1920",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "dockerContainers",
      "viewport": "mobile-320",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "dockerContainers",
      "viewport": "mobile-375",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "dockerContainers",
      "viewport": "boundary-767",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "dockerContainers",
      "viewport": "boundary-768",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "dockerContainers",
      "viewport": "tablet-1024",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "dockerContainers",
      "viewport": "boundary-1279",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "dockerContainers",
      "viewport": "desktop-1280",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "dockerContainers",
      "viewport": "desktop-1440",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "dockerContainers",
      "viewport": "desktop-1920",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "indexerManager",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "indexerManager",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "indexerManager",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "indexerManager",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "indexerManager",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "indexerManager",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "indexerManager",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "indexerManager",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "indexerManager",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleSummary",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleSummary",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleSummary",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleSummary",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleSummary",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleSummary",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleSummary",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleSummary",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleSummary",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleControls",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleControls",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleControls",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleControls",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleControls",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleControls",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleControls",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleControls",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "dnsHoleControls",
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
      "The finding was retried in a fresh Chromium context; console output was empty while document requests repeated until Chromium stopped the loop."
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

# widgets-04: Downloads, containers, indexers, and DNS

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | widgets |
| PR refs | #6502, #6555 |
| Personas | Ingrid Infra |
| Boards | qa-widgets-04 |
| Profiles | main-writable, degraded |
| Chromium viewports | mobile-320, mobile-375, boundary-767, boundary-768, tablet-1024, boundary-1279, desktop-1280, desktop-1440, desktop-1920 |
| Zoom | 100%, 125% |
| Input | mouse, touch, keyboard |
| Widget kinds | downloads, dockerContainers, indexerManager, dnsHoleSummary, dnsHoleControls |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Ingrid Infra |
| Browser session ID | qa-v2-widgets-04 |
| Timestamp | 2026-08-31T16:05:32.566Z |
| Executed viewport / input / zoom | mobile-320 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| WG-004-RENDER-SIZE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Render every assigned widget kind at every assigned viewport and exercise default, minimum, maximum, and compact sizes where supported. |
| WG-004-STATES-RECOVERY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify loading, populated, empty, error, stale, retry, and recovered states for every assigned widget kind. |
| WG-004-OPTIONS-PERSISTENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Mutate meaningful options, save, reload, reset, and confirm each assigned widget kind persists correctly. |
| WG-004-ACCESS-READONLY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify Owner, Editor, Viewer, missing-integration, permission-denied, and global read-only behavior for every assigned widget kind. |
| WG-004-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Capture screenshot, console, network, overflow, clipping, focus, and cleanup evidence for every kind and viewport row. |

## Widget kind × viewport checklist

| Widget kind | Viewport | Size | States | Permission/read-only | Options/persistence | Recovery | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| downloads | mobile-320 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| downloads | mobile-375 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| downloads | boundary-767 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| downloads | boundary-768 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| downloads | tablet-1024 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| downloads | boundary-1279 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| downloads | desktop-1280 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| downloads | desktop-1440 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| downloads | desktop-1920 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dockerContainers | mobile-320 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dockerContainers | mobile-375 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dockerContainers | boundary-767 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dockerContainers | boundary-768 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dockerContainers | tablet-1024 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dockerContainers | boundary-1279 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dockerContainers | desktop-1280 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dockerContainers | desktop-1440 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dockerContainers | desktop-1920 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| indexerManager | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| indexerManager | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| indexerManager | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| indexerManager | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| indexerManager | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| indexerManager | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| indexerManager | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| indexerManager | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| indexerManager | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleSummary | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleSummary | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleSummary | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleSummary | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleSummary | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleSummary | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleSummary | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleSummary | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleSummary | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleControls | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleControls | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleControls | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleControls | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleControls | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleControls | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleControls | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleControls | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |
| dnsHoleControls | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04) | blocked |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, mobile-320, 100% zoom, mouse, fresh named Chromium session qa-v2-widgets-04.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Close the context, retry in a fresh context, and observe the same result.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced on retry and independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [redirect-fresh-retry-320x568-100-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-fresh-retry-320x568-100-console.txt)
- [redirect-fresh-retry-320x568-100-errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-fresh-retry-320x568-100-errors.txt)
- [redirect-fresh-retry-320x568-100-network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-fresh-retry-320x568-100-network.txt)
- [redirect-initial-320x568-100-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-initial-320x568-100-console.txt)
- [redirect-initial-320x568-100-errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-initial-320x568-100-errors.txt)
- [redirect-initial-320x568-100-network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/logs/redirect-initial-320x568-100-network.txt)
- [redirect-fresh-retry-320x568-100-before.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/screenshots/redirect-fresh-retry-320x568-100-before.png)
- [redirect-fresh-retry-320x568-100-result.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/screenshots/redirect-fresh-retry-320x568-100-result.png)
- [redirect-fresh-retry-320x568-100.webm](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/videos/redirect-fresh-retry-320x568-100.webm)
- [redirect-initial-320x568-100.webm](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-04/videos/redirect-initial-320x568-100.webm)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
