<!-- release-v2-qa-report
{
  "packetId": "performance-03",
  "status": "not-reached",
  "caseStatuses": {
    "PE-003-BASELINE": "not-reached",
    "PE-003-THRESHOLD": "not-reached",
    "PE-003-STRESS": "not-reached",
    "PE-003-RECOVERY-EVIDENCE": "not-reached"
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

# performance-03: Widget network and render budget

| Metadata | Value |
| --- | --- |
| Status | not-reached |
| Wave | performance |
| PR refs | #6502, #6555 |
| Personas | Ingrid Infra, Maya Media |
| Boards | qa-widgets-04, qa-widgets-07, qa-widgets-12 |
| Profiles | main-writable, degraded |
| Chromium viewports | mobile-320, desktop-1440 |
| Zoom | 100% |
| Input | mouse, touch |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03) |
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
| PE-003-BASELINE | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/PE-003-BASELINE.png) | Not executed | Capture repeatable cold and warm timing, request, render, memory, and console baselines with candidate metadata. |
| PE-003-THRESHOLD | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/PE-003-THRESHOLD.png) | Not executed | Measure the packet at every assigned viewport, zoom, input, board, and profile against the documented threshold. |
| PE-003-STRESS | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/PE-003-STRESS.png) | Not executed | Exercise dense data, repeated interaction, long-session, latency, and failure stress that applies. |
| PE-003-RECOVERY-EVIDENCE | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/performance-03/PE-003-RECOVERY-EVIDENCE.png) | Not executed | Verify recovery after stress and link trace, screenshot, network, memory, and cleanup artifacts. |

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
