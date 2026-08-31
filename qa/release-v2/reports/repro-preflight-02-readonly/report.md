# Release-v2 preflight reproduction (read-only)

| Field | Value |
|---|---|
| Candidate SHA | `f57a660088d6777c86aca22977354fa8b810e2be` |
| App | `http://127.0.0.1:34089` |
| Fixture | `http://127.0.0.1:44743` (not directly navigated) |
| Persona | Avery Admin |
| Board | `/boards/qa-grid-24` |
| Browser profile | Desktop, 1440x900, 100% scale, mouse + keyboard |
| Date | 2026-08-31 |
| Artifact root | `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/` |

Only rendered UI, sanitized network status metadata, and sanitized console/error metadata were used. No request bodies, headers, cookies, or query values were read or recorded.

## Summary

| Claim | Outcome | Reproducibility |
|---|---|---|
| `release-v2-readonly-edit-affordance` | **reproduced** | Edit controls and transient changed value observed; value absent after exit, reload, away/back, and a fresh named session |
| `release-v2-static-chunk-404` | **reproduced** | Same `404 Script /_next/static/chunks/_1xuxkfk._.js` on two clean reloads in separate named sessions |
| `release-v2-posthog-duplicate-init-warning` | **reproduced** | Same warning on two clean reloads in separate named sessions; page errors remained `0` |

## `release-v2-readonly-edit-affordance`

Expected: a read-only board should hide or block mutation affordances and should not accept a changed value.

Actual: the board showed `Edit board`. Edit mode exposed per-item `Settings for Date and time`, `Edit item`, and `Save changes`. The custom-title field accepted the unique marker `RV2 readonly probe`; the marker immediately appeared on the item while edit mode remained open. No success or failure toast/status was shown. There was no separate board-save button; `Exit edit mode` was the board-level completion step.

After clicking `Exit edit mode`, the marker disappeared immediately. It was also absent after a clean reload, after navigating to `/` and back to `/boards/qa-grid-24`, and in a fresh authenticated named session. The UI therefore allowed a transient mutation, while persistence was blocked or discarded. No API error was surfaced; the API result cannot be classified further from the retained sanitized metadata without reading request contents.

Steps and evidence:

1. Open `/boards/qa-grid-24` in named session `rv2-ro-edit-01` and authenticate as Avery Admin. The first visible mutation affordance is `Edit board` — [claim1-step-01-board.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-step-01-board.png).
2. Click `Edit board`; edit mode exposes item groups and settings controls — [claim1-step-03-edit-mode.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-step-03-edit-mode.png).
3. Open an existing `Date and time` item, choose `Edit item`, and enable `Custom Title/City display` — [claim1-step-07-item-edit-form.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-step-07-item-edit-form.png).
4. Type `RV2 readonly probe` into `Title` — [claim1-step-08-marker-entered.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-step-08-marker-entered.png).
5. Click `Save changes`. The marker is rendered on the item and the form closes, with no notification — [claim1-step-09-item-saved.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-step-09-item-saved.png).
6. Click `Exit edit mode`. The marker is no longer rendered — [claim1-step-10-after-exit-edit.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-step-10-after-exit-edit.png).
7. In `rv2-ro-persistence-01`, reload and verify the marker is absent — [claim1-step-12-after-reload.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-step-12-after-reload.png).
8. Navigate to `/`, return to the QA grid, and verify it is still absent — [claim1-step-13-navigate-back.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-step-13-navigate-back.png).
9. Open the board in a fresh named session and verify the marker is absent — [claim1-step-11-fresh-session-marker-absent.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-step-11-fresh-session-marker-absent.png).

Interactive recording: [claim1-edit-repro.webm](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim1-edit-repro.webm).

## `release-v2-static-chunk-404`

Expected: a clean board reload should not request a missing static JavaScript chunk.

Actual: after clearing the request log, reloading, and waiting for `domcontentloaded`, both clean named sessions recorded the same sanitized failure:

`404    Script    /_next/static/chunks/_1xuxkfk._.js`

Evidence:

- [claim2-session1-network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim2-session1-network.txt) — `rv2-ro-persistence-01`
- [claim2-session2-network.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim2-session2-network.txt) — `rv2-ro-static-console-02`

The board still rendered after each reload. Only status, resource type, and query-free path were retained.

## `release-v2-posthog-duplicate-init-warning`

Expected: a clean reload should not emit a duplicate PostHog initialization warning.

Actual: after clearing console and page-error buffers, reloading, and waiting for `domcontentloaded`, both named sessions emitted exactly:

`[PostHog.js] You have already initialized PostHog! Re-initializing is a no-op`

The page rendered normally and the page-error buffer contained `0` errors on both runs. Evidence:

- [claim3-session1-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim3-session1-console.txt) — `rv2-ro-persistence-01`
- [claim3-session2-console.txt](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim3-session2-console.txt) — `rv2-ro-static-console-02`
- [claim3-session2-page-rendered.png](/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-preflight-02-readonly/claim3-session2-page-rendered.png)

All three named sessions were closed after capture. The initial edit session became unresponsive during recording/reload cleanup; it was terminated by its unique browser profile, and the reload/navigation and fresh-session persistence checks were completed in new named sessions.
