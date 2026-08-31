<!-- release-v2-qa-report
{
  "packetId": "board-05",
  "status": "blocked",
  "caseStatuses": {
    "BD-005-THRESHOLDS": "blocked",
    "BD-005-MUTATION": "blocked",
    "BD-005-PERSISTENCE": "blocked",
    "BD-005-ACCESS-RECOVERY": "blocked"
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
    "persona": "Morgan Mobile",
    "sessionId": "qa-v2-board-05",
    "timestamp": "2026-08-31T15:39:34.555Z",
    "viewport": "boundary-767",
    "input": "touch",
    "zoom": 100
  },
  "findings": [
    {
      "id": "RV2-P1-001",
      "fingerprint": "release-v2-auth-locale-redirect-loop",
      "severity": "P1",
      "area": "routing/authentication",
      "title": "Locale rewrite causes an infinite browser redirect before the application renders",
      "summary": "A fresh Chromium session repeatedly requests the same entry route and ends on ERR_TOO_MANY_REDIRECTS, preventing the assigned browser flow.",
      "caseIds": [
        "BD-005-THRESHOLDS",
        "BD-005-MUTATION",
        "BD-005-PERSISTENCE",
        "BD-005-ACCESS-RECOVERY"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-network.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-redirect.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial.webm",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-network.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-redirect.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry.webm"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-redirect.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-snapshot.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-url.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial.webm",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-redirect.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-snapshot.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-url.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry.webm"
  ],
  "widgetChecks": [],
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

# board-05: Responsive layout boundaries

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | board |
| PR refs | #6450 |
| Personas | Morgan Mobile |
| Boards | qa-layout-boundaries |
| Profiles | main-writable |
| Chromium viewports | boundary-767, boundary-768, boundary-1279, desktop-1280 |
| Zoom | 100% |
| Input | touch, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Morgan Mobile |
| Browser session ID | qa-v2-board-05 |
| Timestamp | 2026-08-31T15:39:34.555Z |
| Executed viewport / input / zoom | boundary-767 / touch / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| BD-005-THRESHOLDS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise every assigned viewport, zoom, and input, including breakpoint and dense-layout stress. |
| BD-005-MUTATION | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise create, move, resize, reorder, collapse, and delete paths that apply to this packet. |
| BD-005-PERSISTENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Reload, switch layouts or sessions, and verify saved and reset state remains correct. |
| BD-005-ACCESS-RECOVERY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify Owner, Editor, Viewer, outsider, read-only, keyboard, cancellation, error, and recovery behavior that applies. |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, boundary-767, 100% zoom, touch, fresh named Chromium session qa-v2-board-05.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Close the context, retry in a fresh context, and observe the same result.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced on retry and independently by another Luna Max preflight agent. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [BD-005-initial-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-console.txt)
- [BD-005-initial-errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-errors.txt)
- [BD-005-initial-network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-network.txt)
- [BD-005-initial-redirect.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-redirect.png)
- [BD-005-initial-snapshot.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-snapshot.txt)
- [BD-005-initial-url.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial-url.txt)
- [BD-005-initial.webm](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-initial.webm)
- [BD-005-retry-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-console.txt)
- [BD-005-retry-errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-errors.txt)
- [BD-005-retry-network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-network.txt)
- [BD-005-retry-redirect.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-redirect.png)
- [BD-005-retry-snapshot.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-snapshot.txt)
- [BD-005-retry-url.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry-url.txt)
- [BD-005-retry.webm](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-retry.webm)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
