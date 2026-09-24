# Audit 6

Audited all 24 entries originally marked `addressed-in-v2` in batches 1–3 against the complete local issue bodies/comments and pinned `release/v2` source, plus the requested special cases (#6153, #5154, #4973, #5538, #4330, and #6850). No runtime, browser, build, or test validation was performed.

- **#962 and #2911:** confirmed the corrected `needs-verification` / `medium` disposition. Replacing dynamic sections and rebuilding the editor does not prove nested menu geometry or repeated cross-container drags work; the current source still has depth-agnostic container-menu offsets and whole-entry drag handles.
- **#4973:** changed the partial false negative to `addressed-in-v2` / `high`. The merged mapping now returns available memory plus physical-total-minus-available, and the widget sums those values to physical total instead of double-counting.
- **#6682:** retained `addressed-in-v2` / `high`, but corrected the evidence: commit `31e218295` is not an ancestor of the pinned HEAD. The current fetch path preserves SDK headers and the issue records the 1.76.1 fix.
- **#6153, #5154, #5538, and #6850:** remain not addressed. Custom Widgets/Assistant do not equal native Open WebUI; local redirect does not implement SLO; Unraid pools/caches are still absent; and the Authentik end-session redirect still follows the abort-prone logout path.
- **#4330:** remains partially addressed because 24 results are shown but no extended/show-more control reaches the remaining icons.
