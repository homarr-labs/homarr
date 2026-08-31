<!-- release-v2-qa-report
{
  "packetId": "performance-04",
  "status": "blocked",
  "caseStatuses": {
    "PE-004-BASELINE": "blocked",
    "PE-004-THRESHOLD": "blocked",
    "PE-004-STRESS": "blocked",
    "PE-004-RECOVERY-EVIDENCE": "blocked"
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
    "persona": "Casey Chaos",
    "sessionId": "qa-v2-performance-04",
    "timestamp": "2026-08-31T18:37:28.172Z",
    "viewport": "mobile-375",
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
        "PE-004-BASELINE",
        "PE-004-THRESHOLD",
        "PE-004-STRESS",
        "PE-004-RECOVERY-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/entry-375x812-100-mouse-annotated.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/entry-375x812-100-mouse-fresh-annotated.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/network-375x812-100-mouse.txt"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/console-375x812-100-mouse.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/entry-375x812-100-mouse-annotated.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/entry-375x812-100-mouse-fresh-annotated.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/errors-375x812-100-mouse.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/network-375x812-100-mouse.txt"
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

# performance-04: Long-session stability

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | performance |
| PR refs | #6356, #6503, #6502, #6482, #6555, #6545 |
| Personas | Casey Chaos |
| Boards | qa-grid-24, qa-custom-widget-assistant, qa-widgets-12 |
| Profiles | main-writable, degraded |
| Chromium viewports | mobile-375, desktop-1920 |
| Zoom | 100%, 125% |
| Input | mouse, touch, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:46777 / 46777 |
| Runtime profile / flags | degraded; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Casey Chaos |
| Browser session ID | qa-v2-performance-04 |
| Timestamp | 2026-08-31T18:37:28.172Z |
| Executed viewport / input / zoom | mobile-375 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| PE-004-BASELINE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Capture repeatable cold and warm timing, request, render, memory, and console baselines with candidate metadata. |
| PE-004-THRESHOLD | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Measure the packet at every assigned viewport, zoom, input, board, and profile against the documented threshold. |
| PE-004-STRESS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise dense data, repeated interaction, long-session, latency, and failure stress that applies. |
| PE-004-RECOVERY-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify recovery after stress and link trace, screenshot, network, memory, and cleanup artifacts. |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, degraded, mobile-375, 100% zoom, mouse, fresh named Chromium session qa-v2-performance-04.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:46777 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Close the context, retry in a fresh context, and observe the same result.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced on retry and independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [console-375x812-100-mouse.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/console-375x812-100-mouse.txt)
- [entry-375x812-100-mouse-annotated.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/entry-375x812-100-mouse-annotated.png)
- [entry-375x812-100-mouse-fresh-annotated.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/entry-375x812-100-mouse-fresh-annotated.png)
- [errors-375x812-100-mouse.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/errors-375x812-100-mouse.txt)
- [network-375x812-100-mouse.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-04/network-375x812-100-mouse.txt)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
