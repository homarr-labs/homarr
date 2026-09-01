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
    "url": "http://127.0.0.1:34499",
    "actualPort": 34499,
    "runtimeProfile": "main-writable",
    "runtimeFlags": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
    "fixtureUrl": "http://127.0.0.1:37357",
    "fixtureHealthUrl": "http://127.0.0.1:37357/health",
    "candidateSha": "d3e7cd45a303bcd2c06757ead05306d334836074",
    "persona": "Avery Admin",
    "sessionId": "pf01-main-writable-d3e7",
    "sessionIds": ["pf01-main-writable-d3e7", "pf01-main-writable-d3e7-fresh"],
    "timestamp": "2026-09-01T10:37:30+02:00",
    "completedAt": "2026-09-01T10:37:30+02:00",
    "viewport": "desktop-1440",
    "viewportPx": "1440x900",
    "input": "mouse",
    "inputs": ["mouse", "keyboard"],
    "zoom": 100,
    "profiles": [
      {
        "runtimeProfile": "main-writable",
        "appUrl": "http://127.0.0.1:34499",
        "fixtureUrl": "http://127.0.0.1:37357",
        "fixtureHealthUrl": "http://127.0.0.1:37357/health",
        "flags": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
        "sessionId": "pf01-main-writable-d3e7",
        "sessionIds": ["pf01-main-writable-d3e7", "pf01-main-writable-d3e7-fresh"],
        "viewport": "desktop-1440",
        "viewportPx": "1440x900",
        "input": ["mouse", "keyboard"],
        "zoom": 100,
        "result": "passed",
        "visibleBoundaryNote": "Avery reached the seeded home and healthy Weather details. Reload, Board settings away/back, fresh-session access, and Ctrl+K/Escape passed without product mutation.",
        "caseCoverage": {
          "PF-001-ENVIRONMENT": "passed",
          "PF-001-ACCESS": "passed",
          "PF-001-EVIDENCE": "passed"
        }
      },
      {
        "runtimeProfile": "main-readonly",
        "appUrl": "http://127.0.0.1:44129",
        "fixtureUrl": "http://127.0.0.1:46609",
        "fixtureHealthUrl": "http://127.0.0.1:46609/health",
        "flags": ["DEMO_MODE=true", "DEMO_READ_ONLY=true", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
        "sessionId": "pf01-main-readonly-d3e7",
        "sessionIds": ["pf01-main-readonly-d3e7", "pf01-main-readonly-d3e7-fresh"],
        "viewport": "desktop-1440",
        "viewportPx": "1440x900",
        "input": ["mouse", "keyboard"],
        "zoom": 100,
        "result": "passed",
        "visibleBoundaryNote": "The seeded home, Weather details, Edit board boundary, and Add widget picker rendered. The picker was dismissed; no save or product mutation was attempted.",
        "caseCoverage": {
          "PF-001-ENVIRONMENT": "passed",
          "PF-001-ACCESS": "passed",
          "PF-001-EVIDENCE": "passed"
        }
      },
      {
        "runtimeProfile": "onboarding-fresh",
        "appUrl": "http://127.0.0.1:40295",
        "fixtureUrl": "http://127.0.0.1:33189",
        "fixtureHealthUrl": "http://127.0.0.1:33189/health",
        "flags": ["DEMO_MODE=false", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
        "sessionId": "pf01-onboarding-d3e7",
        "sessionIds": ["pf01-onboarding-d3e7", "onb-d3e7-fresh"],
        "viewport": "desktop-1440",
        "viewportPx": "1440x900",
        "input": ["mouse", "keyboard"],
        "zoom": 100,
        "result": "passed",
        "visibleBoundaryNote": "Anonymous root access redirected once and stably to /init. Get started and Restore backup rendered; no seeded user or QA board was visible, and onboarding completion was not attempted.",
        "caseCoverage": {
          "PF-001-ENVIRONMENT": "passed",
          "PF-001-ACCESS": "passed",
          "PF-001-EVIDENCE": "passed"
        }
      },
      {
        "runtimeProfile": "degraded",
        "appUrl": "http://127.0.0.1:44059",
        "fixtureUrl": "http://127.0.0.1:43513",
        "fixtureHealthUrl": "http://127.0.0.1:43513/health",
        "flags": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
        "sessionId": "degr-d3e7",
        "sessionIds": ["degr-d3e7", "degr-fresh"],
        "viewport": "desktop-1440",
        "viewportPx": "1440x900",
        "input": ["mouse", "keyboard"],
        "zoom": 100,
        "result": "passed",
        "visibleBoundaryNote": "Avery reached the seeded home and healthy Weather details. Fixture status modes and a fixture-only slow abort were exercised; route removal restored the fixture and app.",
        "caseCoverage": {
          "PF-001-ENVIRONMENT": "passed",
          "PF-001-ACCESS": "passed",
          "PF-001-EVIDENCE": "passed"
        }
      }
    ],
    "onboardingFresh": {
      "status": "passed",
      "appUrl": "http://127.0.0.1:40295",
      "fixtureUrl": "http://127.0.0.1:33189",
      "fixtureHealthUrl": "http://127.0.0.1:33189/health",
      "flags": ["DEMO_MODE=false", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
      "sessionIds": ["pf01-onboarding-d3e7", "onb-d3e7-fresh"],
      "viewport": "desktop-1440",
      "viewportPx": "1440x900",
      "routes": ["/ -> /init", "/auth/login -> /auth/login", "back from /auth/login -> /init", "fresh / -> /init"],
      "fixtureHealth": "HTTP 200; response body omitted",
      "noSeededUserOrQABoardObserved": true,
      "completionAttempted": false,
      "reason": "The anonymous slot reached the expected first-board boundary. Completion and user creation were intentionally outside this preflight run."
    },
    "degraded": {
      "status": "passed",
      "appUrl": "http://127.0.0.1:44059",
      "fixtureUrl": "http://127.0.0.1:43513",
      "fixtureHealthUrl": "http://127.0.0.1:43513/health",
      "fixtureStatuses": {
        "health": 200,
        "slow": 200,
        "empty": 204,
        "malformed": 200,
        "error": 503
      },
      "slowAbort": "Fixture-only slow route aborted with no response status; route removed; slow endpoint recovered to HTTP 200; app reload and Weather recovered.",
      "completionAttempted": false
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
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-weather.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-reload.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-away-settings.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-back-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-fresh.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-search-open.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-search-escape.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-fixture-health-status.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-diagnostics.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-weather.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-reload.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-away-settings.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-back-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-edit-boundary.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-fresh.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-search-open.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-search-escape.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-fixture-health-status.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-diagnostics.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-init.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-restore-expanded.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-auth-login.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-auth-login-reload.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-back-init.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-fresh.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-final-init.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-fixture-health-status.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-diagnostics.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-weather.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-away-settings.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-back-home.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-recovery.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-recovery-weather.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-fresh.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-search-open.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-search-escape.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-fixture-status.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-diagnostics.txt"
  ],
  "widgetChecks": [],
  "diagnostics": {
    "consoleErrors": "No page errors were captured in the clean app sessions or after degraded fixture recovery.",
    "consoleWarnings": "No actionable browser console error was observed. Console and error diagnostics were reduced to sanitized counts.",
    "network": "All four app profiles reached their assigned entry and fixture health endpoint. Degraded fixture status-only evidence recorded health 200, slow 200, empty 204, malformed 200, and error 503. A fixture-only slow abort produced no response status; removing the route restored slow 200. App recovery recorded no app 4xx/5xx or static-missing signal.",
    "artifactHygiene": "All current-candidate text artifacts contain status/path-classification counts only. No password, cookie, bearer value, token, request header, request/response body, query value, or secret was retained. Fixture response bodies were discarded."
  },
  "performance": {
    "measurements": [],
    "limitations": [
      "No performance timing was requested or recorded.",
      "Visual checks were performed at 1440x900, zoom 100%, with mouse and keyboard input.",
      "Onboarding completion and user creation were intentionally not attempted.",
      "No product state was changed; the only network interception was a local fixture slow-path abort that was removed before final app recovery."
    ]
  },
  "notes": "Candidate d3e7cd45a303bcd2c06757ead05306d334836074 passed PF-001-ENVIRONMENT, PF-001-ACCESS, and PF-001-EVIDENCE across main-writable, main-readonly, onboarding-fresh, and degraded profiles at 1440x900, zoom 100%, with mouse and keyboard. Avery reached the seeded home and healthy Weather details on all authenticated profiles; reload, away/back, fresh sessions, and Ctrl+K/Escape passed. The anonymous profile reached /init without a loop and showed no seeded persona or board. Deterministic degraded fixture modes and scoped slow abort/recovery behaved as expected."
}
-->

# preflight-01: Candidate identity and services

| Metadata | Value |
| --- | --- |
| Status | passed |
| Wave | preflight |
| PR refs | #6545 |
| Candidate SHA | d3e7cd45a303bcd2c06757ead05306d334836074 |
| Profiles | main-writable, main-readonly, onboarding-fresh, degraded |
| Primary execution | `http://127.0.0.1:34499` (main-writable) |
| Primary fixture health | `http://127.0.0.1:37357/health` |
| Runtime flags | `DEMO_MODE=true`, `DEMO_READ_ONLY=false`, `UNSAFE_ENABLE_MOCK_INTEGRATION=true` |
| Persona | Avery Admin |
| Primary sessions | `pf01-main-writable-d3e7`; fresh `pf01-main-writable-d3e7-fresh` |
| Viewport / input | 1440x900, zoom 100%, mouse and keyboard |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01) |
| Completed | 2026-09-01T10:37:30+02:00 |
| Auth | Auth-vault profiles used for seeded profiles; no password value was read or recorded |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| PF-001-ENVIRONMENT | passed | [profile matrix](#profile-matrix) and [fixture artifacts](#artifacts) | All four assigned app/fixture pairs rendered in named Chromium at the required desktop viewport. App entries and fixture health endpoints were reachable; the anonymous root reached `/init` once without a locale loop. | Candidate identity, runtime flags, browser setup, fixture reachability, and a clean app baseline. |
| PF-001-ACCESS | passed | [profile matrix](#profile-matrix) and [Weather/reload artifacts](#artifacts) | Avery reached seeded home and healthy Weather details on main-writable, main-readonly, and degraded. The anonymous profile reached the expected first-board boundary with no seeded persona or QA board. | Assigned persona, seeded access, onboarding boundary, reload behavior, and read-only boundary. |
| PF-001-EVIDENCE | passed | [sanitized diagnostics](#console-network-and-artifact-hygiene) and [artifacts](#artifacts) | Screenshots cover home, Weather, reload, away/back, fresh sessions, keyboard search, onboarding controls, read-only boundary, fixture statuses, and degraded recovery. Text evidence contains status/path counts only. | Timestamped viewport/input/zoom evidence with no secrets, bodies, or credential material. |

## Profile matrix

| Profile | App / fixture | Flags | Result | Evidence and boundary |
| --- | --- | --- | --- | --- |
| main-writable | `34499 / 37357` | `DEMO_MODE=true`, `DEMO_READ_ONLY=false`, mock integration true | passed | Authenticated `QA v2 · Home · avery-admin`; Weather details rendered `Clear`; reload and Board settings away/back passed; fresh named session and Ctrl+K/Escape passed. |
| main-readonly | `44129 / 46609` | `DEMO_MODE=true`, `DEMO_READ_ONLY=true`, mock integration true | passed | Authenticated home and Weather rendered; Edit board and Add widget boundary were inspected and dismissed without save or mutation; reload, away/back, fresh session, and Ctrl+K/Escape passed. |
| onboarding-fresh | `40295 / 33189` | `DEMO_MODE=false`, `DEMO_READ_ONLY=false`, mock integration true | passed | Anonymous `/` → `/init` once and stably; Get started/Restore backup visible; `/auth/login` stable through reload; back returned to `/init`; no seeded user or QA board visible; completion not attempted. |
| degraded | `44059 / 43513` | `DEMO_MODE=true`, `DEMO_READ_ONLY=false`, mock integration true | passed | Authenticated home and healthy Weather rendered; reload and Board settings away/back passed; fixture health/slow/empty/malformed/error statuses matched expected classes; scoped slow abort was removed and app/fixture recovered; fresh session and Ctrl+K/Escape passed. |

## Console, network, and artifact hygiene

Clean app and post-recovery diagnostics recorded zero page-error lines and zero console lines. No app 4xx/5xx, static-missing, locale-loop, appdata, or EACCES signal was observed. The degraded fixture’s intentional error endpoint returned 503, empty returned 204, malformed returned 200, and the fixture-only slow abort produced no response status until its route was removed; these are fixture exercise outcomes, not product findings.

All current-candidate text artifacts were normalized to status/path-classification counts. Fixture response bodies were discarded. No password, cookie, bearer value, token, request header, request/response body, query value, or secret was retained.

## Performance measurements and limitations

No performance timings were requested. Visual checks used 1440x900, zoom 100%, with mouse and keyboard input. Onboarding completion and user creation were intentionally not attempted. No product state was changed; the only network interception was a fixture-only slow-path abort that was removed before final app recovery.

## Findings

No product finding was opened. The observed fixture 503, 204, malformed response, and scoped route-abort behavior were deterministic fixture exercises and the degraded app remained healthy after recovery.

## Mutations and persistence

No product mutation occurred. Login, fixture status checks, Weather expansion, reloads, away/back navigation, keyboard search open/close, and read-only boundary inspection did not save board changes. The onboarding controls were not submitted. The fixture was not stopped, and the temporary slow route was removed before final app recovery verification.

## Artifacts

All evidence is under the [preflight-01 artifact directory](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01). All paths below are absolute current-candidate artifacts.

- Main-writable: [home](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-home.png), [Weather](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-weather.png), [reload](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-reload.png), [away/settings](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-away-settings.png), [back home](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-back-home.png), [fresh session](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-fresh.png), [Ctrl+K open](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-search-open.png), [Escape home](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-search-escape.png), [fixture health status](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-fixture-health-status.txt), and [sanitized diagnostics](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-writable-diagnostics.txt).
- Main-readonly: [home](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-home.png), [Weather](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-weather.png), [reload](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-reload.png), [away/settings](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-away-settings.png), [back home](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-back-home.png), [edit boundary](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-edit-boundary.png), [fresh session](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-fresh.png), [Ctrl+K open](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-search-open.png), [Escape home](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-search-escape.png), [fixture health status](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-fixture-health-status.txt), and [sanitized diagnostics](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-main-readonly-diagnostics.txt).
- Onboarding-fresh: [initial /init](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-init.png), [Restore expanded](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-restore-expanded.png), [/auth/login](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-auth-login.png), [/auth/login reload](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-auth-login-reload.png), [back /init](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-back-init.png), [fresh /init](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-fresh.png), [final /init](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-final-init.png), [fixture health status](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-fixture-health-status.txt), and [sanitized diagnostics](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-onboarding-diagnostics.txt).
- Degraded app: [home](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-home.png), [Weather](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-weather.png), [away/settings](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-away-settings.png), [back home](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-back-home.png), [app recovery](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-recovery.png), [Weather recovery](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-recovery-weather.png), [fresh session](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-fresh.png), [Ctrl+K open](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-search-open.png), [Escape home](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-search-escape.png), [fixture status-only evidence](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-fixture-status.txt), and [sanitized diagnostics](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-01/d3e7-degraded-diagnostics.txt).

## Cleanup

All exact named sessions used in this four-profile replay were closed after evidence capture. The artifact directory was preserved. No source, build, test, or shared report aggregator was run.
