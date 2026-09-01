<!-- release-v2-qa-report
{
  "packetId": "core-v2-02",
  "status": "not-reached",
  "caseStatuses": {
    "CV-002-HAPPY-PATH": "not-reached",
    "CV-002-MUTATION-PERSISTENCE": "not-reached",
    "CV-002-ACCESSIBILITY-ACCESS": "not-reached",
    "CV-002-DEGRADED-RECOVERY": "not-reached"
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

# core-v2-02: Assistant tool flow

| Metadata | Value |
| --- | --- |
| Status | not-reached |
| Wave | core-v2 |
| PR refs | #6482 |
| Personas | Ash Assistant |
| Boards | qa-custom-widget-assistant |
| Profiles | main-writable, degraded |
| Chromium viewports | mobile-375, desktop-1440 |
| Zoom | 100%, 125% |
| Input | mouse, touch, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-02](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-02) |
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
| CV-002-HAPPY-PATH | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-02/CV-002-HAPPY-PATH.png) | Not executed | Complete the primary flow using every assigned viewport, zoom, input, persona, profile, and board that applies. |
| CV-002-MUTATION-PERSISTENCE | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-02/CV-002-MUTATION-PERSISTENCE.png) | Not executed | Exercise applicable create, edit, save, reload, reset, cancel, and destructive actions. |
| CV-002-ACCESSIBILITY-ACCESS | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-02/CV-002-ACCESSIBILITY-ACCESS.png) | Not executed | Verify keyboard/focus behavior, labels, permissions, outsider boundaries, and read-only enforcement. |
| CV-002-DEGRADED-RECOVERY | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/core-v2-02/CV-002-DEGRADED-RECOVERY.png) | Not executed | Verify empty, loading, failure, retry, recovery, console, network, evidence, and cleanup behavior. |

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
