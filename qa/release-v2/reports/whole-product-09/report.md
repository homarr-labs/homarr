<!-- release-v2-qa-report
{
  "packetId": "whole-product-09",
  "status": "blocked",
  "caseStatuses": {
    "WP-009-JOURNEY": "blocked",
    "WP-009-THRESHOLDS": "blocked",
    "WP-009-PERSISTENCE-ACCESS": "blocked",
    "WP-009-FAILURE-EVIDENCE": "blocked"
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
    "persona": "Kira Keyboard",
    "sessionId": "qa-v2-whole-product-09",
    "timestamp": "2026-08-31T18:05:08.871Z",
    "viewport": "mobile-320",
    "input": "keyboard",
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
        "WP-009-JOURNEY",
        "WP-009-THRESHOLDS",
        "WP-009-PERSISTENCE-ACCESS",
        "WP-009-FAILURE-EVIDENCE"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/entry-320x568-100-keyboard.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/network-320x568-100-scoped.txt"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/console-320x568-100-scoped.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/entry-320x568-100-keyboard.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/errors-320x568-100-scoped.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/network-320x568-100-scoped.txt"
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

# whole-product-09: Accessibility and destructive-action pass

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | whole-product |
| PR refs | #6356, #6503, #6502, #6450, #6482, #6569, #6545 |
| Personas | Kira Keyboard, Casey Chaos |
| Boards | qa-grid-24, qa-download-upload, qa-custom-widget-assistant |
| Profiles | main-writable, main-readonly, degraded |
| Chromium viewports | mobile-320, desktop-1440 |
| Zoom | 100%, 200% |
| Input | keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:46777 / 46777 |
| Runtime profile / flags | degraded; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Kira Keyboard |
| Browser session ID | qa-v2-whole-product-09 |
| Timestamp | 2026-08-31T18:05:08.871Z |
| Executed viewport / input / zoom | mobile-320 / keyboard / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| WP-009-JOURNEY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Complete the persona journey across all assigned boards and profiles without bypassing product navigation. |
| WP-009-THRESHOLDS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Repeat critical steps across every assigned viewport, zoom, and input and inspect clipping, overflow, and focus. |
| WP-009-PERSISTENCE-ACCESS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify mutations persist and role, outsider, permission, and read-only boundaries remain intact. |
| WP-009-FAILURE-EVIDENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise applicable cancellation, degraded, retry, cleanup, console, network, and timestamped artifact evidence. |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, degraded, mobile-320, 100% zoom, keyboard, fresh named Chromium session qa-v2-whole-product-09.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:46777 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [console-320x568-100-scoped.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/console-320x568-100-scoped.txt)
- [entry-320x568-100-keyboard.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/entry-320x568-100-keyboard.png)
- [errors-320x568-100-scoped.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/errors-320x568-100-scoped.txt)
- [network-320x568-100-scoped.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-09/network-320x568-100-scoped.txt)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
