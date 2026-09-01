<!-- release-v2-qa-report
{
  "packetId": "board-03",
  "status": "failed",
  "caseStatuses": {
    "BD-003-THRESHOLDS": "passed",
    "BD-003-MUTATION": "failed",
    "BD-003-PERSISTENCE": "passed",
    "BD-003-ACCESS-RECOVERY": "passed"
  },
  "execution": {
    "candidateSha": "358d6469cf50ae9513cbce0f9238cd6c03aa4182",
    "url": "http://127.0.0.1:34355/boards/qa-dense-collisions",
    "actualPort": 34355,
    "runtimeProfile": "main-writable",
    "runtimeFlags": [
      "DEMO_MODE=true",
      "DEMO_READ_ONLY=false",
      "UNSAFE_ENABLE_MOCK_INTEGRATION=true"
    ],
    "persona": "Casey Chaos",
    "sessionId": "bd03-358d-main",
    "timestamp": "2026-09-01T12:39:31+02:00",
    "viewport": "tablet-1024",
    "input": "mouse",
    "zoom": 100
  },
  "findings": [
    {
      "id": "BD-003-F-001",
      "severity": "P2",
      "status": "blocked",
      "replayStatus": "awaiting independent clean-clone replay",
      "fingerprint": "board-grid-remove-item-does-not-remove-disposable-item",
      "caseIds": [
        "BD-003-MUTATION"
      ],
      "title": "Remove item does not remove a disposable board item",
      "steps": [
        "Login as Casey Chaos and enter Edit board.",
        "Open Settings for a Date and time item containing the date text.",
        "Activate Remove item by locator, semantic role, physical pointer, and keyboard Enter.",
        "Observe that the menu remains open and the item remains in the editor; Save board and reload."
      ],
      "observed": "The selected disposable item was not removed. Fresh session and reload retained both disposable items.",
      "expected": "Remove item should remove the selected item and the saved board should no longer contain it.",
      "evidence": [
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-fresh2-session.png",
        "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-final-reload-1440.png"
      ]
    }
  ],
  "artifacts": [
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1024-native-initial.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1024-native-edit-unobstructed.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1024-zoom125.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1440-native.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1440-zoom125.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-collision-reflow.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-saved-reflow.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-reload-persisted.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-fresh-session.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-fresh2-session.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-final-reload-1440.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-after-collision-drag.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-after-gap-drag.png",
    "/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-pointer-drag-gap-result.png"
  ],
  "widgetChecks": [
    {
      "widget": "Date and time",
      "status": "passed",
      "notes": "Rendered in the dense board and was created through the Add board content UI; one move/resize modal save triggered collision reflow."
    }
  ],
  "performance": {
    "measurements": [],
    "limitations": [
      "No touch command is available for the installed Chromium agent-browser provider; one fresh capability retry was limited to the CLI touch surface, so native touch semantics are not claimed.",
      "Low-level mouse DnD/resize attempts in collision and gap destinations produced no committed geometry change; the UI Move / resize item modal did commit a collision move and reflow.",
      "The UI Remove item action remained ineffective after a fresh-session retry. The final saved board therefore retains two disposable items and the collision-reflowed layout; original fixture geometry could not be restored through the UI."
    ]
  },
  "independentReproductions": [],
  "notes": "Casey Chaos (username casey-chaos) had the corrected MODIFY/Edit board permission. Native 100% and extension-backed 125% renders were exercised at 1024x768 and 1440x900; the full matrix is recorded below. Fresh2 was a persistence check, not an independent defect replay. Finding BD-003-F-001 awaits independent clean-clone replay. All browser sessions were closed. No repository tests, source inspection, API calls, or database access were used."
}
-->

# board-03: Dense collision handling

| Metadata | Value |
| --- | --- |
| Status | failed — mutation cleanup finding BD-003-F-001 |
| Wave | board |
| PR refs | #6503 |
| Personas | Casey Chaos (`casey-chaos`) |
| Boards | `qa-dense-collisions` |
| Profile | main-writable clone, `DEMO_MODE=true`, `DEMO_READ_ONLY=false`, `UNSAFE_ENABLE_MOCK_INTEGRATION=true` |
| Candidate SHA | `358d6469cf50ae9513cbce0f9238cd6c03aa4182` |
| URL / actual port | `http://127.0.0.1:34355/boards/qa-dense-collisions` / `34355` |
| Browser sessions | `bd03-358d-main`, `bd03-358d-fresh2`, `bd03-358d-zoom125` |
| Viewports | `1024x768`, `1440x900` |
| Zoom | native `100%`; extension `125%` (`/tmp/homarr-release-v2-qa-zoom-358d-s3-125`) |
| Input | mouse, keyboard; touch-equivalent capability checked but unavailable in Chromium CLI |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03) |
| Timestamp | `2026-09-01T12:39:31+02:00` |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| BD-003-THRESHOLDS | passed | [1024 native](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1024-native-initial.png), [1440 native](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1440-native.png), [1024 at 125%](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1024-zoom125.png), [1440 at 125%](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1440-zoom125.png) | Casey had Edit board; dense items rendered at all four viewport/zoom cells. No horizontal item overflow was observed; the dense canvas correctly continued vertically below the 1024px viewport. | Dense items render within bounds at both viewport sizes and zoom levels. |
| BD-003-MUTATION | failed | [edit](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1024-native-edit-unobstructed.png), [collision reflow](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-collision-reflow.png), [pointer collision](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-after-collision-drag.png), [pointer gap](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-after-gap-drag.png) | Two disposable Date/time items were created. Physical mouse DnD/resize attempts in collision/gap paths did not commit geometry; Move / resize item with X offset `6`→`8` did commit and reflow. Keyboard cancellation was attempted; no verified keyboard geometry change. Remove item remained ineffective, so the required delete/cleanup path failed. | Exercise collision/gap/bounds/invalid-drop/cancel/rollback with pointer and non-pointer input, then complete safe create/move/resize/reorder/delete cleanup. |
| BD-003-PERSISTENCE | passed | [saved](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-saved-reflow.png), [reload](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-reload-persisted.png), [fresh session](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-fresh2-session.png), [final reload](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-final-reload-1440.png) | Saved collision reflow survived reload, away/back navigation, and a second authenticated session. The two disposable items also survived because UI deletion did not work. | Saved changes survive reload, navigation, and a fresh session; cleanup should leave the original fixture. |
| BD-003-ACCESS-RECOVERY | passed | [native edit](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-1024-native-edit-unobstructed.png), [fresh session](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-fresh2-session.png) | Casey authenticated successfully in the isolated clone and consistently received Edit board / Save board controls. A fresh named session authenticated and recovered the saved board. | Corrected Casey MODIFY access exposes Edit board and saved state is recoverable in a second session. |

## Findings

### BD-003-F-001 — Remove item does not remove a disposable board item

In Edit board, selecting a Date/time item containing the date text and activating Remove item by locator, semantic role, physical pointer, and keyboard Enter left the menu open and the item present. Save/reload and a fresh session retained both disposable items. The finding awaits independent clean-clone replay; `bd03-358d-fresh2` was a persistence check, not an independent defect replay. See [fresh-session evidence](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-fresh2-session.png) and [final reload](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-03/bd03-358d-final-reload-1440.png).

## Performance measurements and limitations

No performance timings were collected. The installed Chromium agent-browser provider exposes no native touch command; the touch-equivalent capability retry therefore cannot claim native touch semantics. Low-level mouse collision/gap DnD and resize attempts were made and left the layout unchanged, while the visible Move / resize item dialog successfully committed one collision move and automatic reflow.

## Independent reproductions

None recorded. The fresh2 session was used for persistence, not as an independent defect replay; BD-003-F-001 awaits an independent clean-clone replay.

## Cleanup

Two disposable Date/time items were created through the UI. UI removal was attempted in the fresh session through semantic, locator, physical-pointer, and keyboard activation, but neither item was removed. The final reload evidence therefore records the retained disposable items and reflowed layout as an explicit cleanup limitation; original fixture geometry was not restored through the UI. Console and page-error commands returned no output. Status-only network inspection showed successful 200 responses for the app document/assets/data observed and no displayed app request failures. All named browser sessions were closed. No source, database, fixture manifest, API, test, build, or aggregator inspection was performed.
