<!-- release-v2-qa-report
{
  "packetId": "whole-product-01",
  "status": "blocked",
  "caseStatuses": {
    "WP-001-JOURNEY": "blocked",
    "WP-001-THRESHOLDS": "blocked",
    "WP-001-PERSISTENCE-ACCESS": "blocked",
    "WP-001-FAILURE-EVIDENCE": "blocked"
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
    "persona": "Avery Admin",
    "sessionId": "qa-v2-whole-product-01",
    "timestamp": "2026-08-31T17:20:15.819Z",
    "viewport": "desktop-1440",
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
        "WP-001-JOURNEY",
        "WP-001-THRESHOLDS",
        "WP-001-PERSISTENCE-ACCESS",
        "WP-001-FAILURE-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt-network.txt",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt.png"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt-url.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt.png"
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

# whole-product-01: Admin day-one journey

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | whole-product |
| PR refs | #6545, #6569 |
| Personas | Avery Admin, Nora Newcomer |
| Boards | qa-grid-24 |
| Profiles | onboarding-fresh, main-writable |
| Chromium viewports | desktop-1440 |
| Zoom | 100% |
| Input | mouse, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Avery Admin |
| Browser session ID | qa-v2-whole-product-01 |
| Timestamp | 2026-08-31T17:20:15.819Z |
| Executed viewport / input / zoom | desktop-1440 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| WP-001-JOURNEY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Complete the persona journey across all assigned boards and profiles without bypassing product navigation. |
| WP-001-THRESHOLDS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Repeat critical steps across every assigned viewport, zoom, and input and inspect clipping, overflow, and focus. |
| WP-001-PERSISTENCE-ACCESS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify mutations persist and role, outsider, permission, and read-only boundaries remain intact. |
| WP-001-FAILURE-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise applicable cancellation, degraded, retry, cleanup, console, network, and timestamped artifact evidence. |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, desktop-1440, 100% zoom, mouse, fresh named Chromium session qa-v2-whole-product-01.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [entry-attempt-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt-console.txt)
- [entry-attempt-errors.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt-errors.txt)
- [entry-attempt-network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt-network.txt)
- [entry-attempt-url.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt-url.txt)
- [entry-attempt.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-01/entry-attempt.png)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
