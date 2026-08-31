<!-- release-v2-qa-report
{
  "packetId": "core-v2-03",
  "status": "blocked",
  "caseStatuses": {
    "CV-003-HAPPY-PATH": "blocked",
    "CV-003-MUTATION-PERSISTENCE": "blocked",
    "CV-003-ACCESSIBILITY-ACCESS": "blocked",
    "CV-003-DEGRADED-RECOVERY": "blocked"
  },
  "execution": {
    "candidateSha": "f57a660088d6777c86aca22977354fa8b810e2be",
    "url": "http://127.0.0.1:35901",
    "actualPort": 35901,
    "runtimeProfile": "onboarding-fresh",
    "runtimeFlags": [
      "DEMO_MODE=false",
      "DEMO_READ_ONLY=false",
      "UNSAFE_ENABLE_MOCK_INTEGRATION=true"
    ],
    "persona": "Nora Newcomer",
    "sessionId": "qa-v2-core-v2-03",
    "timestamp": "2026-08-31T16:48:07.733Z",
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
        "CV-003-HAPPY-PATH",
        "CV-003-MUTATION-PERSISTENCE",
        "CV-003-ACCESSIBILITY-ACCESS",
        "CV-003-DEGRADED-RECOVERY"
      ],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03/init-mobile-320.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03/init-mobile-network.json"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03/init-mobile-320.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03/init-mobile-console.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03/init-mobile-network.json"
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

# core-v2-03: Onboarding happy path

| Metadata | Value |
| --- | --- |
| Status | blocked |
| Wave | core-v2 |
| PR refs | #6569 |
| Personas | Nora Newcomer |
| Boards | None |
| Profiles | onboarding-fresh |
| Chromium viewports | mobile-320, desktop-1440 |
| Zoom | 100% |
| Input | mouse, touch, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:35901 / 35901 |
| Runtime profile / flags | onboarding-fresh; DEMO_MODE=false, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Nora Newcomer |
| Browser session ID | qa-v2-core-v2-03 |
| Timestamp | 2026-08-31T16:48:07.733Z |
| Executed viewport / input / zoom | mobile-320 / mouse / 100% |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| CV-003-HAPPY-PATH | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Complete the primary flow using every assigned viewport, zoom, input, persona, profile, and board that applies. |
| CV-003-MUTATION-PERSISTENCE | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Exercise applicable create, edit, save, reload, reset, cancel, and destructive actions. |
| CV-003-ACCESSIBILITY-ACCESS | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify keyboard/focus behavior, labels, permissions, outsider boundaries, and read-only enforcement. |
| CV-003-DEGRADED-RECOVERY | blocked | [browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03) | The application entry repeated redirects until Chromium stopped navigation; the assigned flow was not reachable. | Verify empty, loading, failure, retry, recovery, console, network, evidence, and cleanup behavior. |

## Performance measurements and limitations

No valid feature timing could be recorded because no application document rendered. Cold/warm, polling, rendering, memory, and recovery measurements remain blocked.

## Independent reproductions

The common routing failure was independently reproduced by qa-v2-preflight-01; the corresponding tracked packet contains its own browser evidence.

## Findings

### RV2-P1-001 — P1: locale rewrite causes an infinite browser redirect

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, onboarding-fresh, mobile-320, 100% zoom, mouse, fresh named Chromium session qa-v2-core-v2-03.

1. Launch a fresh Chromium context with the Chromium argument --no-sandbox.
2. Set the assigned viewport and open http://127.0.0.1:35901 or its authentication entry.
3. Observe repeated document requests to the same route.
4. Wait until Chromium displays ERR_TOO_MANY_REDIRECTS or chrome-error://chromewebdata/.
5. Compare the result with the independently reproduced preflight evidence.

Expected: the application renders the assigned entry, permitting authentication and the packet flow. Actual: the redirect loop prevents the application from rendering. Reproducibility: reproduced independently by the preflight agents. Console output was empty; network and visual evidence are linked below.

## Artifacts

- [init-mobile-320.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03/init-mobile-320.png)
- [init-mobile-console.json](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03/init-mobile-console.json)
- [init-mobile-network.json](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-03/init-mobile-network.json)

## Mutations and persistence

No credentials were submitted and no product mutation occurred. Reload and fresh-session retries reproduced the routing failure, so application persistence was not reachable.

## Blockers and gaps

Every non-evidence case listed as blocked remains untested beyond the routing entry. No blocked cell is treated as passed.

## Cleanup

The named browser session was closed by the browser agent. Artifacts remain under the untracked packet directory; no secret values were captured.
