<!-- release-v2-qa-report
{
  "packetId": "whole-product-03",
  "status": "not-reached",
  "caseStatuses": {
    "WP-003-JOURNEY": "not-reached",
    "WP-003-THRESHOLDS": "not-reached",
    "WP-003-PERSISTENCE-ACCESS": "not-reached",
    "WP-003-FAILURE-EVIDENCE": "not-reached"
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

# whole-product-03: Editor daily journey

| Metadata | Value |
| --- | --- |
| Status | not-reached |
| Wave | whole-product |
| PR refs | #6503, #6502, #6450 |
| Personas | Eden Editor |
| Boards | qa-scroll-lab, qa-layout-boundaries |
| Profiles | main-writable |
| Chromium viewports | tablet-1024, desktop-1280 |
| Zoom | 100% |
| Input | mouse, touch, keyboard |
| Widget kinds | None |
| Artifact directory | [/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03) |
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
| WP-003-JOURNEY | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/WP-003-JOURNEY.png) | Not executed | Complete the persona journey across all assigned boards and profiles without bypassing product navigation. |
| WP-003-THRESHOLDS | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/WP-003-THRESHOLDS.png) | Not executed | Repeat critical steps across every assigned viewport, zoom, and input and inspect clipping, overflow, and focus. |
| WP-003-PERSISTENCE-ACCESS | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/WP-003-PERSISTENCE-ACCESS.png) | Not executed | Verify mutations persist and role, outsider, permission, and read-only boundaries remain intact. |
| WP-003-FAILURE-EVIDENCE | not-reached | [planned screenshot](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/whole-product-03/WP-003-FAILURE-EVIDENCE.png) | Not executed | Exercise applicable cancellation, degraded, retry, cleanup, console, network, and timestamped artifact evidence. |

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
