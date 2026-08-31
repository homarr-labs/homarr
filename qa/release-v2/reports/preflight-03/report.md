<!-- release-v2-qa-report
{
  "packetId": "preflight-03",
  "status": "failed",
  "caseStatuses": {
    "PF-003-ENVIRONMENT": "passed",
    "PF-003-ACCESS": "passed",
    "PF-003-EVIDENCE": "failed"
  },
  "execution": {
    "candidateSha": "f57a660088d6777c86aca22977354fa8b810e2be",
    "url": "http://127.0.0.1:34401",
    "actualPort": 34401,
    "runtimeProfile": "main-writable",
    "runtimeFlags": [
      "DEMO_MODE=true",
      "DEMO_READ_ONLY=false",
      "UNSAFE_ENABLE_MOCK_INTEGRATION=true"
    ],
    "persona": "Casey Chaos",
    "sessionId": "qa-v2-preflight-03-final",
    "timestamp": "2026-08-31T21:18:20.630Z",
    "viewports": ["mobile-320", "desktop-1920"],
    "inputs": ["mouse", "keyboard"],
    "primaryZoom": 100,
    "additionalZooms": [125, 200],
    "zoom80Status": "not-reached"
  },
  "findings": [
    {
      "id": "RV2-P2-001",
      "fingerprint": "release-v2-mobile-weather-card-top-clipping",
      "severity": "P2",
      "area": "responsive layout",
      "title": "Weather card clips the top of the current temperature at 320px",
      "summary": "The seeded Casey home reproducibly renders the weather temperature above its 160x69px card at mobile-320, so the card's hidden overflow cuts off about 17.94px of the text.",
      "caseIds": ["PF-003-ENVIRONMENT", "PF-003-EVIDENCE"],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-plain.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-weather-geometry.json"
      ],
      "reproducedAfterReload": true
    },
    {
      "id": "RV2-P2-002",
      "fingerprint": "release-v2-mobile-high-zoom-horizontal-clipping",
      "severity": "P2",
      "area": "responsive layout/accessibility",
      "title": "Mobile home content is horizontally clipped at 200% visual scale",
      "summary": "At mobile-320 with visualViewport.scale=2, the dashboard content extends beyond the visible 160px visual viewport; the weather text and card edge are cut off and a horizontal scrollbar is exposed.",
      "caseIds": ["PF-003-EVIDENCE"],
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200-plain.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200-geometry.json"
      ],
      "qualification": "The headless CLI could not apply 80% keyboard zoom; 125% and 200% evidence uses Chromium visual page scale and should be confirmed with a real browser-zoom control before release triage.",
      "reproducedAfterReload": true
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-plain.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-geometry.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-keyboard-focus.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-keyboard-search.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-keyboard-search-geometry.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-keyboard-search-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-keyboard-search-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-weather-geometry.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-plain.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-geometry.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-console.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-errors.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-network.txt",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom125.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom125-geometry.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom200.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom200-geometry.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom125.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom125-geometry.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200-plain.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200-geometry.json",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-zoom80-capability.json"
  ],
  "widgetChecks": [],
  "performance": {
    "measurements": [],
    "limitations": [
      "This packet captured smoke and evidence hygiene, not performance timings.",
      "The headless agent-browser CLI did not change visualViewport.scale when Control-minus was pressed; the assigned 80% row is not claimed as passed.",
      "The final named session was launched after an infrastructure daemon restart; earlier disrupted-session artifacts were excluded from pass/fail evidence."
    ],
    "consoleBaseline": "No page errors. Document, auth session, and tRPC requests in the final 100% captures returned 200. Console contains React DevTools/HMR development logs and a repeatable PostHog duplicate-initialization warning."
  },
  "independentReproductions": [],
  "notes": "Black-box rerun only. Auth-vault login required the instructed username-only hydration fallback. No password, cookie, token, request body, or product mutation was recorded. The prior locale redirect-loop finding was not reproduced at the requested runtime."
}
-->

# preflight-03: Browser evidence hygiene

| Metadata | Value |
| --- | --- |
| Status | failed |
| Wave | preflight |
| PR refs | #6545 |
| Personas | Casey Chaos |
| Boards | None (seeded Casey home inspected) |
| Profiles | main-writable |
| Chromium viewports | mobile-320, desktop-1920 |
| Zoom | 100% primary; 125% and 200% measured; 80% not reachable via headless keyboard control |
| Input | mouse, keyboard |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03) |
| Candidate SHA | f57a660088d6777c86aca22977354fa8b810e2be |
| URL / actual port | http://127.0.0.1:34401 / 34401 |
| Runtime profile / flags | main-writable; DEMO_MODE=true, DEMO_READ_ONLY=false, UNSAFE_ENABLE_MOCK_INTEGRATION=true |
| Executed persona | Casey Chaos |
| Browser session ID | qa-v2-preflight-03-final |
| Timestamp | 2026-08-31T21:18:20.630Z |
| Executed viewports / input / zoom | mobile-320 and desktop-1920 / mouse and keyboard / 100% primary, 125% and 200% visual-scale evidence |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| PF-003-ENVIRONMENT | passed | [final mobile and desktop browser artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03) | Runtime reached the login page, authenticated Casey home rendered at both exact viewports, reload returned 200, and no page errors were reported. The previous redirect loop did not reproduce. | Verify candidate identity, Chromium session, runtime health, fixture reachability, and clean console/network baselines. |
| PF-003-ACCESS | passed | [final home and keyboard artifacts](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03) | Casey Chaos home and seeded widgets were reachable. Keyboard focus reached Search, Enter opened the Search dialog, and Escape closed it. No product state was mutated. | Verify assigned profile, persona, home render, and access boundary before mutations. |
| PF-003-EVIDENCE | failed | [timestamped final evidence](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03) | Exact 320x568 and 1920x1080 screenshots, geometry, diagnostics, and redaction scans were captured. Mobile 100% has a reproducible weather top clip; mobile 200% visual scale is horizontally clipped. Headless keyboard zoom-out did not reach 80%. | Capture timestamped viewport/input/zoom evidence, inspect overflow, and confirm artifacts contain no secrets. |

## Diagnostic and geometry baseline

- Mobile 320x568 at 100%: `innerWidth=320`, `innerHeight=568`, `scrollWidth=305`, `scrollHeight=729`; document, auth, and tRPC requests returned 200. See [geometry](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-geometry.json), [network](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-network.txt), [console](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-console.txt), and [errors](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-errors.txt).
- Desktop 1920x1080 at 100%: `innerWidth=1920`, `innerHeight=1080`, `scrollWidth=1905`, `scrollHeight=1185`; document, auth, and tRPC requests returned 200. See [geometry](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-geometry.json), [network](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-network.txt), [console](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-console.txt), and [errors](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-errors.txt).
- Console had no page errors. It contained the development React DevTools/HMR logs and a repeatable PostHog duplicate-initialization warning; no request bodies were captured.
- A marker scan over all `rerun-final-*` text artifacts found no password, authorization, bearer, cookie, session-token, access-token, client-secret, API-key, request-body, or response-body markers. Final PNGs were visually reviewed and contain only the rendered app.

## Findings

### RV2-P2-001 — P2: mobile weather card clips the current temperature

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, Casey Chaos, mobile-320, 100% primary zoom, fresh final named Chromium session.

1. Launch the named Chromium session with `--no-sandbox`, authenticate with the supplied vault, and wait for hydration.
2. Set the viewport to exactly 320x568 and reload after clearing diagnostics.
3. Observe the [plain mobile home screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-plain.png): the weather card's current temperature is cut off at its top edge.
4. The [numeric geometry](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-weather-geometry.json) measures the temperature text at `y=160.0625` and the 160x69 card at `y=178`, with `overflow=hidden` and `clippedTop=17.9375`.

Expected: the seeded weather card renders its current temperature fully inside the card. Actual: about 17.94px of the text is above the card and is hidden. Reproducibility: reproduced on the clean reload and after the daemon-restart handoff.

### RV2-P2-002 — P2: mobile home is horizontally clipped at 200% visual scale

Preconditions: candidate f57a660088d6777c86aca22977354fa8b810e2be, main-writable, Casey Chaos, mobile-320, 200% visual scale.

1. Set the viewport to exactly 320x568 and apply Chromium visual scale 2.
2. Capture the [plain 200% mobile screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200-plain.png).
3. Observe that the weather card and text extend beyond the visible 160px visual viewport; the right side is cut off and a horizontal scrollbar is exposed.
4. The [200% geometry](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200-geometry.json) records `visualViewport.scale=2`, `visualViewport.width=160`, and `scrollWidth=320`.

Expected: assigned high-zoom evidence remains usable without the home content being cut off. Actual: content requires horizontal movement and is visibly clipped. Reproducibility: reproduced after reload. Qualification: the headless CLI could not apply the 80% keyboard zoom; 125% and 200% rows were captured through Chromium visual page scale and should be confirmed with a real browser-zoom control before release triage.

## Artifacts

- [mobile 320x568, 100% mouse annotated](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse.png) and [plain](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-mouse-plain.png)
- [mobile keyboard focus](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-keyboard-focus.json) and [Search dialog](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-keyboard-search.png)
- [mobile weather geometry](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom100-weather-geometry.json)
- [desktop 1920x1080, 100% annotated](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse.png) and [plain](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom100-mouse-plain.png)
- [desktop 125%](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom125.png), [desktop 200%](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-desktop-1920-zoom200.png), [mobile 125%](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom125.png), and [mobile 200%](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200.png)
- [mobile 200% plain](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200-plain.png) and [200% geometry](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-mobile-320-zoom200-geometry.json)
- [80% capability result](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/preflight-03/rerun-final-zoom80-capability.json)

## Mutations and persistence

No credentials were printed or inspected. Reloaded authenticated home state returned to Casey's home. No product state was mutated; keyboard Search open/close was canceled cleanly.

## Blockers and infrastructure notes

- The prior locale redirect-loop blocker was not reproduced at `http://127.0.0.1:34401`; the login page and Casey home rendered normally after the instructed hydration fallback.
- A browser-daemon restart interrupted an earlier probe. The disrupted session and its artifacts were excluded from pass/fail evidence; all final artifacts above came from `qa-v2-preflight-03-final` launched after the restart.
- The headless CLI could not reach 80% with keyboard zoom-out; this is recorded as not reached, not passed.

## Cleanup

The final named browser session was closed. No shared report aggregator or ledger was run. Artifacts remain under the untracked packet directory; no secret values were captured.
