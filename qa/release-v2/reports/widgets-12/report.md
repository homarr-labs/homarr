<!-- release-v2-qa-report
{
  "packetId": "widgets-12",
  "status": "blocked",
  "caseStatuses": {
    "WG-012-RENDER-SIZE": "blocked",
    "WG-012-STATES-RECOVERY": "blocked",
    "WG-012-OPTIONS-PERSISTENCE": "blocked",
    "WG-012-ACCESS-READONLY": "blocked",
    "WG-012-EVIDENCE": "blocked"
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
    "persona": "Ash Assistant",
    "sessionId": "qa-v2-widgets-12",
    "timestamp": "2026-08-31T16:33:58.002Z",
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
        "WG-012-RENDER-SIZE",
        "WG-012-STATES-RECOVERY",
        "WG-012-OPTIONS-PERSISTENCE",
        "WG-012-ACCESS-READONLY",
        "WG-012-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12/redirect-320x568-100.network.md",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12/redirect-320x568-100.png"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12/redirect-320x568-100.console.md",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12/redirect-320x568-100.network.md",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12/redirect-320x568-100.png"
  ],
  "widgetChecks": [
    {
      "widgetKind": "coolify",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "coolify",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "coolify",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "coolify",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "coolify",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "coolify",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "coolify",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "coolify",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "coolify",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "archiveTeamWarrior",
      "viewport": "mobile-320",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "archiveTeamWarrior",
      "viewport": "mobile-375",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "archiveTeamWarrior",
      "viewport": "boundary-767",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "archiveTeamWarrior",
      "viewport": "boundary-768",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "archiveTeamWarrior",
      "viewport": "tablet-1024",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "archiveTeamWarrior",
      "viewport": "boundary-1279",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "archiveTeamWarrior",
      "viewport": "desktop-1280",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "archiveTeamWarrior",
      "viewport": "desktop-1440",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "archiveTeamWarrior",
      "viewport": "desktop-1920",
      "sizeRequirement": "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds",
      "status": "blocked"
    },
    {
      "widgetKind": "customApi",
      "viewport": "mobile-320",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "customApi",
      "viewport": "mobile-375",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "customApi",
      "viewport": "boundary-767",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "customApi",
      "viewport": "boundary-768",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "customApi",
      "viewport": "tablet-1024",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "customApi",
      "viewport": "boundary-1279",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "customApi",
      "viewport": "desktop-1280",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "customApi",
      "viewport": "desktop-1440",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "customApi",
      "viewport": "desktop-1920",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "assistant",
      "viewport": "mobile-320",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "assistant",
      "viewport": "mobile-375",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "assistant",
      "viewport": "boundary-767",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "assistant",
      "viewport": "boundary-768",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "assistant",
      "viewport": "tablet-1024",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "assistant",
      "viewport": "boundary-1279",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "assistant",
      "viewport": "desktop-1280",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "assistant",
      "viewport": "desktop-1440",
      "sizeRequirement": "every width 1-24 × every height 1-6",
      "status": "blocked"
    },
    {
      "widgetKind": "assistant",
      "viewport": "desktop-1920",
      "sizeRequirement": "every width 1-24 × every height 1-6",
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

# widgets-12: Coolify, ArchiveTeam, Custom API, and Assistant

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | widgets |
| PR refs | #6502, #6482, #6555 |
| Personas | Ash Assistant, Cora Creator |
| Boards | qa-widgets-12, qa-custom-widget-assistant |
| Profiles | main-writable, degraded |
| Chromium viewports | mobile-320, mobile-375, boundary-767, boundary-768, tablet-1024, boundary-1279, desktop-1280, desktop-1440, desktop-1920 |
| Zoom | 80%, 100%, 125%, 200% |
| Input | mouse, touch, keyboard |
| Widget kinds | coolify, archiveTeamWarrior, customApi, assistant |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Ash Assistant |
| Browser session ID | qa-v2-widgets-12 |
| Timestamp | 2026-08-31T16:33:58.002Z |
| Executed viewport / input / zoom | mobile-320 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| WG-012-RENDER-SIZE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Render every assigned widget kind at every assigned viewport and exercise default, minimum, maximum, and compact sizes where supported. |
| WG-012-STATES-RECOVERY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify loading, populated, empty, error, stale, retry, and recovered states for every assigned widget kind. |
| WG-012-OPTIONS-PERSISTENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Mutate meaningful options, save, reload, reset, and confirm each assigned widget kind persists correctly. |
| WG-012-ACCESS-READONLY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify Owner, Editor, Viewer, missing-integration, permission-denied, and global read-only behavior for every assigned widget kind. |
| WG-012-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Capture screenshot, console, network, overflow, clipping, focus, and cleanup evidence for every kind and viewport row. |

## Widget kind × viewport checklist

| Widget kind | Viewport | Size | States | Permission/read-only | Options/persistence | Recovery | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coolify | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| coolify | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| coolify | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| coolify | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| coolify | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| coolify | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| coolify | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| coolify | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| coolify | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| archiveTeamWarrior | mobile-320 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| archiveTeamWarrior | mobile-375 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| archiveTeamWarrior | boundary-767 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| archiveTeamWarrior | boundary-768 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| archiveTeamWarrior | tablet-1024 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| archiveTeamWarrior | boundary-1279 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| archiveTeamWarrior | desktop-1280 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| archiveTeamWarrior | desktop-1440 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| archiveTeamWarrior | desktop-1920 | minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| customApi | mobile-320 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| customApi | mobile-375 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| customApi | boundary-767 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| customApi | boundary-768 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| customApi | tablet-1024 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| customApi | boundary-1279 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| customApi | desktop-1280 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| customApi | desktop-1440 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| customApi | desktop-1920 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| assistant | mobile-320 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| assistant | mobile-375 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| assistant | boundary-767 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| assistant | boundary-768 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| assistant | tablet-1024 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| assistant | boundary-1279 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| assistant | desktop-1280 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| assistant | desktop-1440 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |
| assistant | desktop-1920 | every width 1-24 × every height 1-6 | blocked before render | blocked before authentication | not reached | redirect retry reproduced | [artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12) | blocked |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, mobile-320, 100% zoom, mouse, fresh named Chromium session qa-v2-widgets-12.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [redirect-320x568-100.console.md](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12/redirect-320x568-100.console.md)
- [redirect-320x568-100.network.md](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12/redirect-320x568-100.network.md)
- [redirect-320x568-100.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/widgets-12/redirect-320x568-100.png)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
