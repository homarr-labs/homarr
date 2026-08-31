<!-- release-v2-qa-report
{
  "packetId": "whole-product-05",
  "status": "blocked",
  "caseStatuses": {
    "WP-005-JOURNEY": "blocked",
    "WP-005-THRESHOLDS": "blocked",
    "WP-005-PERSISTENCE-ACCESS": "blocked",
    "WP-005-FAILURE-EVIDENCE": "blocked"
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
    "sessionId": "qa-v2-whole-product-05",
    "timestamp": "2026-08-31T17:45:01.935Z",
    "viewport": "mobile-320",
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
      "summary": "Chromium repeatedly requests the same entry route and ends on ERR_TOO_MANY_REDIRECTS, preventing the assigned browser flow.",
      "caseIds": [
        "WP-005-JOURNEY",
        "WP-005-THRESHOLDS",
        "WP-005-PERSISTENCE-ACCESS",
        "WP-005-FAILURE-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/entry-320x568-100-touch-annotated.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/network-scoped-redacted.txt"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/console-scoped-redacted.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/entry-320x568-100-touch-annotated.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/errors-scoped-redacted.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/network-scoped-redacted.txt"
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

# whole-product-05: Mobile journey

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | whole-product |
| PR refs | #6450, #6503, #6502 |
| Personas | Morgan Mobile |
| Boards | qa-layout-boundaries, qa-widgets-01 |
| Profiles | main-writable |
| Chromium viewports | mobile-320, mobile-375, boundary-767, boundary-768 |
| Zoom | 100%, 200% |
| Input | touch, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:37137 / 37137 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Morgan Mobile |
| Browser session ID | qa-v2-whole-product-05 |
| Timestamp | 2026-08-31T17:45:01.935Z |
| Executed viewport / input / zoom | mobile-320 / touch / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| WP-005-JOURNEY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Complete the persona journey across all assigned boards and profiles without bypassing product navigation. |
| WP-005-THRESHOLDS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Repeat critical steps across every assigned viewport, zoom, and input and inspect clipping, overflow, and focus. |
| WP-005-PERSISTENCE-ACCESS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify mutations persist and role, outsider, permission, and read-only boundaries remain intact. |
| WP-005-FAILURE-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise applicable cancellation, degraded, retry, cleanup, console, network, and timestamped artifact evidence. |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, mobile-320, 100% zoom, touch, fresh named Chromium session qa-v2-whole-product-05.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:37137 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [console-scoped-redacted.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/console-scoped-redacted.txt)
- [entry-320x568-100-touch-annotated.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/entry-320x568-100-touch-annotated.png)
- [errors-scoped-redacted.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/errors-scoped-redacted.txt)
- [network-scoped-redacted.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-05/network-scoped-redacted.txt)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
