<!-- release-v2-qa-report
{
  "packetId": "board-05",
  "status": "not-reached",
  "caseStatuses": {
    "BD-005-THRESHOLDS": "not-reached",
    "BD-005-MUTATION": "not-reached",
    "BD-005-PERSISTENCE": "not-reached",
    "BD-005-ACCESS-RECOVERY": "not-reached"
  },
  "execution": {
    "candidateSha": "2d5edf46513b96c8b9f973d4a121b396d688e9bb",
    "url": null,
    "actualPort": null,
    "runtimeProfile": null,
    "runtimeFlags": [],
    "persona": null,
    "sessionId": null,
    "timestamp": null,
    "viewport": null,
    "input": null,
    "zoom": null
  },
  "findings": [],
  "artifacts": [],
  "widgetChecks": [],
  "performance": {
    "measurements": [],
    "limitations": []
  },
  "independentReproductions": [],
  "notes": "Not executed."
}
-->

# board-05: Responsive layout boundaries

| Metadata | Value |
| --- | --- |
| Status | not-reached |
| Wave | board |
| PR refs | #6450 |
| Personas | Morgan Mobile |
| Boards | qa-layout-boundaries |
| Profiles | main-writable |
| Chromium viewports | boundary-767, boundary-768, boundary-1279, desktop-1280 |
| Zoom | 100% |
| Input | touch, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05) |
| Candidate SHA | 2d5edf46513b96c8b9f973d4a121b396d688e9bb |
| URL / actual port | not-recorded |
| Runtime profile / flags | not-recorded |
| Executed persona | not-recorded |
| Browser session ID | not-recorded |
| Timestamp | not-recorded |
| Executed viewport / input / zoom | not-recorded |

## Dogfood evidence

| Case ID | Status | Evidence | Observed | Expected |
| --- | --- | --- | --- | --- |
| BD-005-THRESHOLDS | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-THRESHOLDS.png) | Not executed | Exercise every assigned viewport, zoom, and input, including breakpoint and dense-layout stress. |
| BD-005-MUTATION | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-MUTATION.png) | Not executed | Exercise create, move, resize, reorder, collapse, and delete paths that apply to this packet. |
| BD-005-PERSISTENCE | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-PERSISTENCE.png) | Not executed | Reload, switch layouts or sessions, and verify saved and reset state remains correct. |
| BD-005-ACCESS-RECOVERY | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/board-05/BD-005-ACCESS-RECOVERY.png) | Not executed | Verify Owner, Editor, Viewer, outsider, read-only, keyboard, cancellation, error, and recovery behavior that applies. |

## Performance measurements and limitations

Record structured measurements in `performance.measurements` with units, thresholds, status, and evidence. Record every environmental or tooling limitation in `performance.limitations`; leave measurements empty instead of inventing a result.

## Independent reproductions

Record a second agent's result in `independentReproductions` with the finding fingerprint, agent ID, outcome, evidence, and notes. An unattempted reproduction remains `not-reached`.

## Findings

No findings recorded. Add structured findings to the metadata block and mirror them here.

## Blockers and gaps

Not executed.

## Cleanup

Record created resources, cleanup outcome, console errors, and network failures. Never include secret values.
