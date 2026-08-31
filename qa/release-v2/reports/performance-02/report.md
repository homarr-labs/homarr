<!-- release-v2-qa-report
{
  "packetId": "performance-02",
  "status": "blocked",
  "caseStatuses": {
    "PE-002-BASELINE": "blocked",
    "PE-002-THRESHOLD": "blocked",
    "PE-002-STRESS": "blocked",
    "PE-002-RECOVERY-EVIDENCE": "blocked"
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
    "persona": "Rowan Owner",
    "sessionId": "qa-v2-performance-02",
    "timestamp": "2026-08-31T18:25:01.713Z",
    "viewport": "tablet-1024",
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
        "PE-002-BASELINE",
        "PE-002-THRESHOLD",
        "PE-002-STRESS",
        "PE-002-RECOVERY-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-1024x768-100-mouse-entry-annotated.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-1024x768-100-mouse-entry-attempt-annotated.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-network.txt"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-1024x768-100-mouse-entry-annotated.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-1024x768-100-mouse-entry-attempt-annotated.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-network.txt"
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

# performance-02: Grid interaction responsiveness

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | performance |
| PR refs | #6503, #6555 |
| Personas | Rowan Owner |
| Boards | qa-dense-collisions, qa-nested-containers |
| Profiles | main-writable |
| Chromium viewports | tablet-1024, desktop-1920 |
| Zoom | 80%, 100%, 125% |
| Input | mouse, touch, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Rowan Owner |
| Browser session ID | qa-v2-performance-02 |
| Timestamp | 2026-08-31T18:25:01.713Z |
| Executed viewport / input / zoom | tablet-1024 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| PE-002-BASELINE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Capture repeatable cold and warm timing, request, render, memory, and console baselines with candidate metadata. |
| PE-002-THRESHOLD | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Measure the packet at every assigned viewport, zoom, input, board, and profile against the documented threshold. |
| PE-002-STRESS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise dense data, repeated interaction, long-session, latency, and failure stress that applies. |
| PE-002-RECOVERY-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify recovery after stress and link trace, screenshot, network, memory, and cleanup artifacts. |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, tablet-1024, 100% zoom, mouse, fresh named Chromium session qa-v2-performance-02.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [performance-02-1024x768-100-mouse-entry-annotated.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-1024x768-100-mouse-entry-annotated.png)
- [performance-02-1024x768-100-mouse-entry-attempt-annotated.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-1024x768-100-mouse-entry-attempt-annotated.png)
- [performance-02-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-console.txt)
- [performance-02-errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-errors.txt)
- [performance-02-network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-02/performance-02-network.txt)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
