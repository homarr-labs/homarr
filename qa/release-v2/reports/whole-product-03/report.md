<!-- release-v2-qa-report
{
  "packetId": "whole-product-03",
  "status": "blocked",
  "caseStatuses": {
    "WP-003-JOURNEY": "blocked",
    "WP-003-THRESHOLDS": "blocked",
    "WP-003-PERSISTENCE-ACCESS": "blocked",
    "WP-003-FAILURE-EVIDENCE": "blocked"
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
    "persona": "Eden Editor",
    "sessionId": "qa-v2-whole-product-03",
    "timestamp": "2026-08-31T17:34:20.573Z",
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
      "summary": "A fresh Chromium session repeatedly requests the same entry route and ends on ERR_TOO_MANY_REDIRECTS; a fresh-context retry does the same.",
      "caseIds": [
        "WP-003-JOURNEY",
        "WP-003-THRESHOLDS",
        "WP-003-PERSISTENCE-ACCESS",
        "WP-003-FAILURE-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/entry-1024x768-mouse-retry.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/network-retry.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/network.txt"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/console-retry.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/entry-1024x768-mouse-retry.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/entry-blocked.md",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/errors-retry.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/network-retry.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/retry-summary.md"
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

# whole-product-03: Editor daily journey

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | whole-product |
| PR refs | #6503, #6502, #6450 |
| Personas | Eden Editor |
| Boards | qa-scroll-lab, qa-layout-boundaries |
| Profiles | main-writable |
| Chromium viewports | tablet-1024, desktop-1280 |
| Zoom | 100% |
| Input | mouse, touch, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Eden Editor |
| Browser session ID | qa-v2-whole-product-03 |
| Timestamp | 2026-08-31T17:34:20.573Z |
| Executed viewport / input / zoom | tablet-1024 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| WP-003-JOURNEY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Complete the persona journey across all assigned boards and profiles without bypassing product navigation. |
| WP-003-THRESHOLDS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Repeat critical steps across every assigned viewport, zoom, and input and inspect clipping, overflow, and focus. |
| WP-003-PERSISTENCE-ACCESS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify mutations persist and role, outsider, permission, and read-only boundaries remain intact. |
| WP-003-FAILURE-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise applicable cancellation, degraded, retry, cleanup, console, network, and timestamped artifact evidence. |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, tablet-1024, 100% zoom, mouse, fresh named Chromium session qa-v2-whole-product-03.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Close the context, retry in a fresh context, and observe the same result.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced on retry and independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [console-retry.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/console-retry.txt)
- [console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/console.txt)
- [entry-1024x768-mouse-retry.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/entry-1024x768-mouse-retry.png)
- [entry-blocked.md](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/entry-blocked.md)
- [errors-retry.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/errors-retry.txt)
- [errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/errors.txt)
- [network-retry.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/network-retry.txt)
- [network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/network.txt)
- [retry-summary.md](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/retry-summary.md)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
