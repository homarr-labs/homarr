<!-- release-v2-qa-report
{
  "packetId": "preflight-01",
  "status": "passed",
  "caseStatuses": {
    "PF-001-ENVIRONMENT": "passed",
    "PF-001-ACCESS": "passed",
    "PF-001-EVIDENCE": "passed"
  },
  "execution": {
    "url": "http://127.0.0.1:34401",
    "actualPort": 34401,
    "runtimeProfile": "main-writable",
    "runtimeFlags": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
    "fixtureUrl": "http://127.0.0.1:37273",
    "fixtureHealthUrl": "http://127.0.0.1:37273/health",
    "candidateSha": "f57a660088d6777c86aca22977354fa8b810e2be",
    "persona": "Avery Admin",
    "sessionId": "qa-v2-preflight-01-rerun-writable-1440",
    "timestamp": "2026-08-31T22:57:16+02:00",
    "completedAt": "2026-08-31T22:57:16+02:00",
    "viewport": "desktop-1440",
    "viewportPx": "1440x900",
    "input": "mouse",
    "inputs": ["mouse", "keyboard"],
    "zoom": 100,
    "profiles": [
      {
        "runtimeProfile": "main-writable",
        "appUrl": "http://127.0.0.1:34401",
        "fixtureUrl": "http://127.0.0.1:37273",
        "fixtureHealthUrl": "http://127.0.0.1:37273/health",
        "flags": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
        "sessionId": "qa-v2-preflight-01-rerun-writable-1440",
        "viewport": "desktop-1440",
        "viewportPx": "1440x900",
        "input": ["mouse", "keyboard"],
        "zoom": 100,
        "result": "passed",
        "caseCoverage": {
          "PF-001-ENVIRONMENT": "passed",
          "PF-001-ACCESS": "passed",
          "PF-001-EVIDENCE": "passed"
        }
      },
      {
        "runtimeProfile": "main-readonly",
        "appUrl": "http://127.0.0.1:41589",
        "fixtureUrl": "http://127.0.0.1:44267",
        "fixtureHealthUrl": "http://127.0.0.1:44267/health",
        "flags": ["DEMO_MODE=true", "DEMO_READ_ONLY=true", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
        "sessionId": "qa-v2-preflight-01-rerun-readonly-1440",
        "viewport": "desktop-1440",
        "viewportPx": "1440x900",
        "input": ["mouse", "keyboard"],
        "zoom": 100,
        "result": "passed",
        "visibleBoundaryNote": "Edit board and Add board content remained visible; the save/mutation boundary was not exercised in this preflight run.",
        "caseCoverage": {
          "PF-001-ENVIRONMENT": "passed",
          "PF-001-ACCESS": "passed",
          "PF-001-EVIDENCE": "passed"
        }
      },
      {
        "runtimeProfile": "onboarding-fresh",
        "appUrl": "http://127.0.0.1:41775",
        "fixtureUrl": "http://127.0.0.1:33549",
        "fixtureHealthUrl": "http://127.0.0.1:33549/health",
        "flags": ["DEMO_MODE=false", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
        "sessionId": "qa-v2-preflight-01-rerun-onboarding-1440",
        "newSessionId": "qa-v2-preflight-01-rerun-onboarding-new-1440",
        "viewport": "desktop-1440",
        "viewportPx": "1440x900",
        "input": ["mouse", "keyboard"],
        "zoom": 100,
        "result": "passed",
        "visibleBoundaryNote": "The fresh slot rendered the first-board onboarding landing at /init and a normal empty login form at /auth/login. No user or QA board was visible; onboarding completion and user creation were intentionally not attempted.",
        "caseCoverage": {
          "PF-001-ENVIRONMENT": "passed",
          "PF-001-ACCESS": "passed",
          "PF-001-EVIDENCE": "passed"
        }
      },
      {
        "runtimeProfile": "degraded",
        "appUrl": "http://127.0.0.1:43903",
        "fixtureUrl": "http://127.0.0.1:39181",
        "fixtureHealthUrl": "http://127.0.0.1:39181/health",
        "flags": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
        "sessionId": "qa-v2-preflight-01-rerun-degraded-1440",
        "viewport": "desktop-1440",
        "viewportPx": "1440x900",
        "input": ["mouse", "keyboard"],
        "zoom": 100,
        "result": "passed",
        "caseCoverage": {
          "PF-001-ENVIRONMENT": "passed",
          "PF-001-ACCESS": "passed",
          "PF-001-EVIDENCE": "passed"
        }
      }
    ],
    "onboardingFresh": {
      "status": "passed",
      "appUrl": "http://127.0.0.1:41775",
      "fixtureUrl": "http://127.0.0.1:33549",
      "fixtureHealthUrl": "http://127.0.0.1:33549/health",
      "flags": ["DEMO_MODE=false", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
      "sessionIds": ["qa-v2-preflight-01-rerun-onboarding-1440", "qa-v2-preflight-01-rerun-onboarding-new-1440"],
      "viewport": "desktop-1440",
      "viewportPx": "1440x900",
      "routes": ["/ -> /init", "/auth/login -> /auth/login"],
      "fixtureHealth": "{\"status\":\"ok\",\"fixture\":\"release-v2-qa\"}",
      "noSeededUserOrQABoardObserved": true,
      "completionAttempted": false,
      "reason": "The fresh slot has no seeded user or QA board; reaching the first-board onboarding boundary is the expected PF-001 access result. Onboarding completion and user creation are covered by later onboarding packets and were intentionally not attempted here."
    }
  },
  "profileCoverage": {
    "main-writable": "passed",
    "main-readonly": "passed",
    "onboarding-fresh": "passed",
    "degraded": "passed"
  },
  "findings": [],
  "independentReproductions": [],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-auth-login.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-auth-login-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-auth-login-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-auth-login-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home-reload.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home-reload-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home-reload-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home-reload-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-fixture-health.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-fixture-health-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-fixture-health-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-fixture-health-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-auth-login.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-auth-login-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-auth-login-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-auth-login-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home-reload.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home-reload-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home-reload-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home-reload-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-edit-boundary.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-add-widget-boundary.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-fixture-health.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-fixture-health-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-fixture-health-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-fixture-health-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-auth-login.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-auth-login-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-auth-login-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-auth-login-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home-reload.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home-reload-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home-reload-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home-reload-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-fixture-health.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-fixture-health-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-fixture-health-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-fixture-health-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-init.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-init-reload.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-init-reload-snapshot.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-auth-login.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-auth-login-snapshot.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-fixture-health.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-fixture-health-snapshot.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-init.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-init-snapshot.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-network.txt"
  ],
  "widgetChecks": [],
  "diagnostics": {
    "consoleErrors": "None reported by the errors artifacts for any profile.",
    "consoleWarnings": "Development-only HMR/React DevTools messages plus repeated PostHog already-initialized warnings; no uncaught application error observed.",
    "network": "All four assigned profiles rendered their app entry and fixture health page in browser metadata. The three seeded profiles also rendered auth/home/reload; onboarding rendered /init, /auth/login, and /init after reload/new session. Metadata includes normal 200/304 responses and non-blocking dev-only 404s for a Next static chunk/favicon; no redirect loop was observed. Request bodies were not inspected.",
    "artifactHygiene": "Screenshots were reviewed for visible secrets; text diagnostics were sanitized for data URIs, query strings, and credential-like fields. No password, cookie, bearer value, request body, or unredacted credential-like value was recorded."
  },
  "performance": {
    "measurements": [],
    "limitations": [
      "This packet verifies candidate identity and services only; no performance timing was requested or recorded.",
      "Onboarding-fresh was exercised through initial routing, fixture health, login/init rendering, reload, and a fresh session; onboarding completion and user creation were intentionally not reached.",
      "No product mutation was made. The read-only add-widget dialog was opened and cancelled solely to observe its visible boundary."
    ]
  },
  "notes": "Successful retest: the prior release-v2-auth-locale-redirect-loop was not reproduced in fresh named Chromium sessions for main-writable, main-readonly, or degraded. Each /auth/login entry and / home rendered, Avery reached the seeded home board, reload preserved the home, and each assigned seeded fixture /health rendered status ok for release-v2-qa. The rotated onboarding-fresh app at http://127.0.0.1:41775 routed / to /init without a loop, its fixture at http://127.0.0.1:33549/health rendered status ok, /auth/login rendered a normal empty login form, reload and a new named session returned to /init, and no user or QA board was observed. The fresh /init boundary is the expected PF-001 access result; onboarding completion and user creation are outside this packet and were intentionally not attempted."
}
-->

# preflight-01: Candidate identity and services

| Metadata | Value |
| --- | --- |
| Status | passed |
| Wave | preflight |
| PR refs | #6545 |
| Personas | Avery Admin |
| Boards | None |
| Profiles | main-writable, main-readonly, onboarding-fresh, degraded |
| Primary execution URL | http://127.0.0.1:34401 |
| Primary execution port | 34401 |
| Primary execution profile | main-writable |
| Primary runtime flags | DEMO_MODE=true; DEMO_READ_ONLY=false; UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Primary fixture health | http://127.0.0.1:37273/health |
| Chromium viewport | desktop-1440 (1440×900) |
| Zoom | 100% |
| Input | mouse, keyboard |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| Corrected rerun completed | 2026-08-31T22:57:16+02:00 |
| Auth | Auth-vault profiles used for seeded profiles; no password value read or recorded |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| PF-001-ENVIRONMENT | passed | [all-profile runtime and fixture artifacts](#artifacts) | main-writable (34401/37273), main-readonly (41589/44267), onboarding-fresh (41775/33549), and degraded (43903/39181) all rendered in named Chromium at 1440×900. Each fixture `/health` rendered `{"status":"ok","fixture":"release-v2-qa"}`; `/` routed to `/auth/login` for the seeded profiles and `/init` for onboarding-fresh without a loop. | Verify candidate identity, Chromium session, runtime health, fixture reachability, and clean console/network baselines. |
| PF-001-ACCESS | passed | [profile matrix](#profile-matrix) and [onboarding artifacts](#artifacts) | Avery reached the seeded home on main-writable, main-readonly, and degraded. Read-only Edit board/Add board content remained visibly available and no save/mutation was attempted. The fresh slot reached the expected first-board onboarding boundary with no seeded user or QA board and a normal `/auth/login` form; onboarding completion/user creation is outside PF-001 scope. | Verify assigned profiles, personas, boards, permissions, and read-only boundaries before mutations. |
| PF-001-EVIDENCE | passed | [timestamped screenshots, snapshots, and diagnostics](#artifacts) | All four profiles have rendered screenshot evidence plus console/errors/network metadata at the assigned 1440×900 viewport. The onboarding run includes initial `/init`, explicit `/auth/login`, fixture health, reload, and a second fresh named session; diagnostics were sanitized and contain no secrets. | Capture timestamped viewport/input/zoom evidence and confirm artifacts contain no secrets. |

## Profile matrix

| Profile | Status | App entry | Fixture health | Persona/access | Reload/session | Visible boundary |
| --- | --- | --- | --- | --- | --- | --- |
| main-writable | passed | `/auth/login` → `/` | `{"status":"ok","fixture":"release-v2-qa"}` | `QA v2 · Home · avery-admin` with Edit board, Board settings, and three seeded widgets | passed | Writable affordances visible |
| main-readonly | passed | `/auth/login` → `/` | `{"status":"ok","fixture":"release-v2-qa"}` | `QA v2 · Home · avery-admin` with three seeded widgets | passed | Edit board/Add board content remained visible; mutation/save boundary not exercised |
| onboarding-fresh | passed | `/` → `/init`; explicit `/auth/login` stayed on `/auth/login` | `{"status":"ok","fixture":"release-v2-qa"}` | Expected first-board onboarding boundary rendered; no seeded user or QA board was visible, and no seeded persona/home access was assigned | Reload returned `/init`; second named session also returned `/init` | Get started/Restore backup visible; completion/user creation is outside PF-001 and was not attempted |
| degraded | passed | `/auth/login` → `/` | `{"status":"ok","fixture":"release-v2-qa"}` | `QA v2 · Home · avery-admin` with three rendered widgets | passed | Degraded profile entry and home rendered; no fixture health failure |

## Console, network, and artifact hygiene

The browser `errors` captures were empty for all corrected runs, including both onboarding sessions. Console captures contain development HMR/React DevTools information and repeated PostHog initialization warnings, but no uncaught application error. Network metadata shows successful app/auth/home/health responses for the seeded profiles and `/init`, `/auth/login`, `/health`, reload, and new-session responses for onboarding-fresh. Non-blocking dev-only 404s for a Next static chunk/favicon were observed; no redirect loop occurred.

No password, cookies, bearer values, request bodies, or unredacted credential-like values were inspected or recorded. The read-only add-widget dialog was opened and cancelled without submitting a widget or changing product state. Onboarding controls were not submitted, so no user or board was created.

## Performance measurements and limitations

No performance timings were requested for PF-001. Onboarding-fresh was verified at its expected initial `/init` access boundary; completion and user creation are outside PF-001 and were intentionally not attempted. Current authenticated-profile access and all assigned evidence checks were run.

## Findings

No tracked finding remains after the successful retest. The previous `RV2-P1-001` locale/auth redirect-loop finding was removed because it was not reproduced in fresh sessions for main-writable, main-readonly, or degraded, and onboarding-fresh also showed no redirect loop. The successful retest is recorded in the structured notes above.

## Mutations and persistence

No product mutation occurred. Login, fixture navigation, clean reloads, opening/cancelling the read-only add-widget dialog, and exiting edit mode all completed without saving board changes. Avery’s seeded home remained available after reload for all three current authenticated profiles. The onboarding-fresh Get started/Restore backup controls were left untouched; no user or QA board was created.

## Artifacts

Corrected desktop-1440 evidence is under the [preflight-01 artifact directory](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01). The structured artifact list above is canonical for this report.

- main-writable: [login screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-auth-login.png), [home screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home.png), [reload screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-home-reload.png), [fixture health screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-writable-desktop-1440-fixture-health.png), and paired `-console.txt`, `-errors.txt`, and `-network.txt` diagnostics.
- main-readonly: [login screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-auth-login.png), [home screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home.png), [reload screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-home-reload.png), [edit-boundary screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-edit-boundary.png), [add-widget-boundary screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-add-widget-boundary.png), [fixture health screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-main-readonly-desktop-1440-fixture-health.png), and paired diagnostics for login/home/reload/fixture health.
- degraded: [login screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-auth-login.png), [home screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home.png), [reload screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-home-reload.png), [fixture health screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-degraded-desktop-1440-fixture-health.png), and paired `-console.txt`, `-errors.txt`, and `-network.txt` diagnostics.
- onboarding-fresh: [initial `/init` screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-init.png), [explicit login screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-auth-login.png), [fixture health screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-fixture-health.png), [reload screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-init-reload.png), rendered snapshots (`-snapshot.txt`), and sanitized [console](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-console.txt), [errors](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-errors.txt), and [network metadata](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-desktop-1440-network.txt).
- onboarding-fresh new session: [new-session `/init` screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-init.png), rendered [snapshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-init-snapshot.txt), and sanitized [console](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-console.txt), [errors](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-errors.txt), and [network metadata](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/rerun-onboarding-new-desktop-1440-network.txt).

## Cleanup

The named sessions `qa-v2-preflight-01-rerun-onboarding-1440` and `qa-v2-preflight-01-rerun-onboarding-new-1440` were closed after capture; earlier seeded-profile rerun sessions were also closed. Existing packet artifacts were preserved. No shared report aggregator or ledger was run.
