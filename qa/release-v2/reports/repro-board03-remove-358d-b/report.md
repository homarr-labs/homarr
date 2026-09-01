# Black-box replay report: board-grid-remove-item-does-not-remove-disposable-item

| Field | Value |
|---|---|
| Date | 2026-09-01 |
| App URL | http://127.0.0.1:41035 |
| Clone | Fresh isolated main-writable QA clone |
| Candidate | 358d6469cf50ae9513cbce0f9238cd6c03aa4182 |
| Flags | true / false / true |
| User | Casey Chaos (`casey-chaos`) |
| Board | `/boards/qa-dense-collisions` |
| Viewport | 1440x900, native 100% |
| Browser input | Mouse and keyboard |
| Session(s) | `r03b-358d-426f03114639`; `r03b-358d-second-426f03114639` |
| Fingerprint | `board-grid-remove-item-does-not-remove-disposable-item` |
| Outcome | **Not reproduced** |

## Outcome

**Not reproduced.** After the visible Remove item flow was correctly completed, the disposable Date/time widget was absent before save, after save/reload, and in a fresh second session. The flow did not retain the disposable item.

## Steps

1. Opened `http://127.0.0.1:41035/boards/qa-dense-collisions` in the isolated first session and authenticated as Casey Chaos using the vault profile. Initial board state showed the seeded Date/time, Weather, and Bookmarks items. Evidence: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/01-initial.png`.
2. Set the browser viewport to 1440x900 at native 100%, entered visible Edit board mode, opened Add board content -> Add widget, selected Date and time, and saved the widget configuration. This created exactly one additional Date/time widget, visible as the rightmost item (column 7, row 1). Evidence: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/05-disposable-created.png` and `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/06-after-widget-config-save.png`.
3. Clicked Save board, then reloaded. Both Date/time widgets were present after this initial save/reload, confirming the rightmost one was the disposable persisted item. Evidence: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/07-board-saved.png` and `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/08-after-reload-before-remove.png`.
4. Re-entered Edit board mode and opened Settings for the rightmost Date/time item (column 7, row 1). The visible menu exposed Edit item, Move / resize item, Duplicate item, and Remove item. Evidence: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/09-edit-before-remove.png` and `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/10-disposable-settings-open.png`.
5. Selected Remove item. The menu changed to the visible red Are you sure? confirmation. Evidence: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/15-remove-confirmation-visible.png`.
6. Completed the confirmation promptly within one browser batch (the confirmation label is transient between CLI actions). The rightmost Date/time item disappeared, leaving only the original Date/time, Weather, and Bookmarks items. Evidence: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/17-batched-confirm-result.png`.
7. Clicked Save board. The saved view contained only the original Date/time, Weather, and Bookmarks items. Evidence: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/18-board-saved-after-removal.png`.
8. Reloaded the board. The rightmost/disposable Date/time was still absent. Evidence: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/19-after-removal-reload.png`.
9. Opened the same board in fresh session `r03b-358d-second-426f03114639`, authenticated through the same vault profile, and verified the independent session also showed only the original Date/time, Weather, and Bookmarks items. Evidence: `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/20-fresh-second-session.png`.

## Persistence

- Before removal: exactly two Date/time widgets were present after save/reload; the disposable widget was the rightmost item at column 7, row 1.
- After correctly confirming removal: one Date/time widget remained in the current edit view.
- After Save board and reload: one Date/time widget remained.
- Fresh second session: one Date/time widget remained.
- Persistence result: removal persisted; the disposable item was absent. This is **not reproduced** for candidate `358d6469cf50ae9513cbce0f9238cd6c03aa4182` under flags `true / false / true`.

## Diagnostics

- Authentication: vault login succeeded as `qa-v2-r03b-358d-casey`; no credentials were typed into the page or printed.
- Browser sessions: both isolated sessions launched with Chromium argument `--args '--no-sandbox'`; both were closed cleanly after verification.
- Viewport/input: 1440x900, native 100%, mouse and keyboard interaction.
- URL observation: `reload` returned the app to `http://127.0.0.1:41035/` while retaining the board UI/state; the second session was opened directly at the supplied board URL.
- Page errors: none reported in either session.
- Console diagnostics: no output reported in either session.
- No source, database, manifest, first report, or prior reproducer report was inspected.

## Artifacts

Screenshots were written under the absolute directory:

`/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/`

Captured files:

- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/01-initial.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/02-edit-mode.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/03-add-content-menu.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/04-widget-picker.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/05-disposable-created.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/06-after-widget-config-save.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/07-board-saved.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/08-after-reload-before-remove.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/09-edit-before-remove.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/10-disposable-settings-open.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/11-after-remove-click.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/12-after-confirm-remove.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/13-retry-confirm-remove.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/14-current-after-retry-attempt.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/15-remove-confirmation-visible.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/17-batched-confirm-result.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/18-board-saved-after-removal.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/19-after-removal-reload.png`
- `/home/habs/.codex/worktrees/8ba8/homarr/.screenshots/release-v2/repro-board03-remove-358d-b/20-fresh-second-session.png`
