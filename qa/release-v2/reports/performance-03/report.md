<!-- release-v2-qa-report
{
  "packetId": "performance-03",
  "status": "blocked",
  "caseStatuses": {
    "PE-003-BASELINE": "blocked",
    "PE-003-THRESHOLD": "blocked",
    "PE-003-STRESS": "blocked",
    "PE-003-RECOVERY-EVIDENCE": "blocked"
  },
  "execution": {
    "candidateSha": "f57a660088d6777c86aca22977354fa8b810e2be",
    "url": "http://127.0.0.1:46777",
    "actualPort": 46777,
    "runtimeProfile": "degraded",
    "runtimeFlags": [
      "DEMO_MODE=true",
      "DEMO_READ_ONLY=false",
      "UNSAFE_ENABLE_MOCK_INTEGRATION=true"
    ],
    "persona": "Ingrid Infra",
    "sessionId": "qa-v2-performance-03",
    "timestamp": "2026-08-31T18:30:29.480Z",
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
        "PE-003-BASELINE",
        "PE-003-THRESHOLD",
        "PE-003-STRESS",
        "PE-003-RECOVERY-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/network-mouse-entry.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/network.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/performance-03-320x568-100-mouse-entry.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/performance-03-320x568-100-mouse.png"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/close-mouse-entry.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/close.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/console-mouse-entry.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/errors-mouse-entry.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/network-mouse-entry.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/open.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/performance-03-320x568-100-mouse-entry.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/performance-03-320x568-100-mouse.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/screenshot.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/setup.txt"
  ],
  "widgetChecks": [],
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

# performance-03: Widget network and render budget

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | performance |
| PR refs | #6502, #6555 |
| Personas | Ingrid Infra, Maya Media |
| Boards | qa-widgets-04, qa-widgets-07, qa-widgets-12 |
| Profiles | main-writable, degraded |
| Chromium viewports | mobile-320, desktop-1440 |
| Zoom | 100% |
| Input | mouse, touch |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:46777 / 46777 |
| Runtime profile / flags | degraded; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Ingrid Infra |
| Browser session ID | qa-v2-performance-03 |
| Timestamp | 2026-08-31T18:30:29.480Z |
| Executed viewport / input / zoom | mobile-320 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| PE-003-BASELINE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Capture repeatable cold and warm timing, request, render, memory, and console baselines with candidate metadata. |
| PE-003-THRESHOLD | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Measure the packet at every assigned viewport, zoom, input, board, and profile against the documented threshold. |
| PE-003-STRESS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise dense data, repeated interaction, long-session, latency, and failure stress that applies. |
| PE-003-RECOVERY-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify recovery after stress and link trace, screenshot, network, memory, and cleanup artifacts. |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, degraded, mobile-320, 100% zoom, mouse, fresh named Chromium session qa-v2-performance-03.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:46777 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [close-mouse-entry.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/close-mouse-entry.txt)
- [close.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/close.txt)
- [console-mouse-entry.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/console-mouse-entry.txt)
- [console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/console.txt)
- [errors-mouse-entry.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/errors-mouse-entry.txt)
- [errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/errors.txt)
- [network-mouse-entry.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/network-mouse-entry.txt)
- [network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/network.txt)
- [open.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/open.txt)
- [performance-03-320x568-100-mouse-entry.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/performance-03-320x568-100-mouse-entry.png)
- [performance-03-320x568-100-mouse.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/performance-03-320x568-100-mouse.png)
- [screenshot.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/screenshot.txt)
- [setup.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/setup.txt)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
