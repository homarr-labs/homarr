# Editor catalog retention — section G source freeze

## Outcome

Applied the independently plan-approved section G repair under the renewed **sole `apps/nitro/src/features/widgets-editor/add-widget.tsx` lease**. Only passive admission and cleanup changed: nine added lines and one replaced line. The source is frozen for renewed independent SOURCE review; plan approval does not clear that post-author gate.

New stage:

`/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-editor-catalog-retention-source-wdioufn_`

| Image         | Bytes | SHA-256                                                            |
| ------------- | ----: | ------------------------------------------------------------------ |
| `before.tsx`  | 27244 | `d9c36c5dea3e1e8ec430a905a2eb71c7ce1edb05dad98450860d922d25d08f81` |
| `after.tsx`   | 27546 | `dbfb36c8231bba5b76b45149bf543979589e2c1d27b0de2505308f38cfca284f` |
| `source.diff` |  1040 | `be40f24d00c73112512e773635eff12d9a40184670ea1df7a19e24dc5df2b33d` |

`before.json`, `after.json` and `freeze.json` pin the exact source/diff. The before source matched the released d9c36 image before editing. The after source matched its captured image at the end of capture. Evidence was created with two bounded Python `-I -S -B` stdlib-only file-I/O/hash/difflib invocations, a new 0700 directory and O_EXCL 0600 files. Prior `nitro-editor-catalog-source-8nt8rh6z` HOLD images, receipts and report were not overwritten or relabeled.

## Exact delta

1. At passive-effect admission, inspect `catalogLoad.current` before any new capture. Reuse it only when its phase is pending/ready, its attempt equals `catalogAttempt`, its actual manifest/domain/board/client/query binding matches, and its existing `isCurrent()` admits the captured host and live committed owner. Reuse returns without another capture, pending publication or manifest load. No new memo, field, counter or owner API.
2. Passive cleanup now returns when its lease is no longer the attached observation **or that exact attached lease remains current**. Callback reference changes alone therefore retain a valid pending/ready observation. A genuinely invalid old captured owner still fails the unchanged predicate; it cannot gain reuse from equal callback/binding references.

The real Board caller recreates ownership callbacks on ordinary render (`features/boards/editor.tsx:488–489`). Its otherwise-current selected editor/draft is no longer invalidated merely by a passive callback-dependency restart. This is the source repair's intended behavior, not an executed runtime result.

## Preserved contracts

- Existing committed layout still owns permanent binding/attempt/permission/captured-host/live-owner retirement and bounded once-only readmission; unmount still retires/detaches both observations. Reused effects need no new cleanup wrapper: these existing committed/unmount owners remain responsible for actual lifetime loss.
- Transferred failures remain separate under amendment F: the attachment-mismatch short circuit never changes a lease already held by `catalogFailure`. Its failure barrier, current error visibility and explicit retry/changed-binding replacement remain unchanged.
- Required genuine manifest, direct all69 stable promise, domain-function mismatch error, actual resource holds, one `catalogAttempt`, first-render/publication guards, selection-origin await guards and exact loading/finally ownership remain unchanged.
- Mantine layout/cards/copy, props/contracts/routes and the three generated queries are unchanged. No new comments, tests, dependencies, casts, any, scalar authority substitutes, fake callbacks, helper framework or other product files.

## Review handoff

Resubmit this exact after image/diff for independent SOURCE review, specifically pending/ready callback-only restarts and selection retention, invalid captured-owner rejection, committed generation/attempt/permission loss, unmount, and transferred-failure preservation. Coordinator-owned fresh typecheck/lint follow all writer freezes; none were run here.

Only authorized named-source evidence commands ran. No compiler/check/format/application/SSR/browser/SQL/native/Engine/network/private-config/data access or nested agents. Source12 reads, recorded procedure acceptance91/334 and activation0/9 remain supplied unchanged baselines, not new acceptance claims. Old compiled outputs and original fifth-artifact/source association remain untouched. Author work is complete and frozen at the after pin above; no further source lease is inferred.
