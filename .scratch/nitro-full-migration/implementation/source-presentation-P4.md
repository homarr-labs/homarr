# P4 source presentation extraction — frozen producer-only handoff

## Admission and absence evidence

The explicit coordinator request admits all eight named new recovery-operations files, beyond the lease document's initial DangerousActionConfirmation-only priority. The inspected `FRONTEND-PRESENTATION-LEASES.md` has 184 lines and no producer-first amendment section. Its P4 boundaries and the request's exact new-file-only amendment govern this delivery; no original release is inferred.

Before editing, `packages/ui/src/source-views/recovery-operations/**` and `**/source-presentation-P4.md` returned no files. The UI source directory also had no source-views directory. Only the following eight new product files and this canonical scratch handoff were written. Original controls, manifests, exports, and all other producers remain read-only.

## Exact source origins

All targets below are relative to `packages/ui/src/source-views/recovery-operations/`.

| Target                              | Frozen original origin                                                                | Admitted body                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `contracts.ts`                      | The prop interfaces and displayed inputs in the seven origins below                   | Types-only presentation surface; no API model or runtime barrel                            |
| `dangerous-action-confirmation.tsx` | `apps/nextjs/src/components/backup/dangerous-action-confirmation.tsx:8–88`            | Actual confirmation state, match logic, and entire render tree                             |
| `restore-confirmation-view.tsx`     | `apps/nextjs/src/components/backup/restore-confirmation.tsx:20–33`                    | Actual DangerousActionConfirmation composition and 16px database-import icon               |
| `restore-progress-view.tsx`         | `apps/nextjs/src/components/backup/restore-progress-panel.tsx:28–92`                  | Actual active gate, status branches, reduced-motion hook, output tree, and actions         |
| `backup-preview-view.tsx`           | `apps/nextjs/src/components/backup/backup-preview-panel.tsx:36–133`                   | Actual version/export heading, count table, board badges, and migration presentation trees |
| `log-font-size-view.tsx`            | `apps/nextjs/src/app/[locale]/manage/tools/logs/font-size-slider.tsx:11–28`           | Actual font slider tree                                                                    |
| `log-level-view.tsx`                | `apps/nextjs/src/app/[locale]/manage/tools/logs/level-selection.tsx:17–32`            | Actual Select tree and recognized nonempty-value change guard                              |
| `task-status-badge-view.tsx`        | `apps/nextjs/src/app/[locale]/manage/tools/tasks/_components/tasks-table.tsx:481–507` | Only StatusBadge's disabled/null/running/idle render branches                              |

Read-only ordering evidence: `apps/nextjs/src/components/backup/types.ts:30` supplies board, user, app, integration, item, media, search_engine; `packages/core/src/infrastructure/logs/constants.ts:3,18–31` supplies error, warn, info, debug and their red/yellow/green/blue prefixes. Neither file is imported by UI.

## Frozen display contracts and actions

- Dangerous confirmation accepts the original title/warningTitle/warningBody/typePrompt/submitLabel/cancelLabel strings, submitIcon node, color, disabled and confirm/cancel actions. The phrase remains exactly `I understand`, matched with trim and case-insensitive comparison. Color still defaults to red. Disabled covers the input, cancel, and confirm; unmatched text disables confirm. No pending flag is invented: the existing owner must pass its real pending state through disabled. Local input state has the original mount lifetime and is not reset through a new effect.
- Restore confirmation supplies resolved copies from the original restore.confirm, backup.confirm.typePrompt with the fixed phrase, and common.action.cancel translations. It retains the original icon/default-red composition. UI does not perform translation or authorize restoration.
- Progress accepts real active, restoring/restarting/timedOut and reloginRequired values; resolved progress.title, progress.restarting, timeout.title/message, progress.relogin, common.action.tryAgain/refresh strings; and actions. `onRetryReadiness` deliberately names the original timeout retry's readiness observation, never a restore mutation retry. `onReload` is caller-owned. The leaf neither polls nor transitions status itself.
- Preview accepts resolved title/exportedLabel/entityLabel/countLabel/boardsLabel strings, actual homarrVersion, ordered display rows with required numeric counts, actual boardNames, and numeric pendingCount/totalCount plus resolved migration text. The seven-position row tuple fixes source ordering and keys. Each count is displayed directly, with the original green check only above zero. There is no missing-count fallback. The original exported date formatting (`new Date(exportedAt).toLocaleString()`) and label interpolation stay at the eventual wrapper. Board colon, badge keys, source font/spacing/alignment and Homarr version prefix remain in the leaf.
- Migration text comes from the original migrationsApplied/Plural and migrationsOlderVersion/Plural selection using pendingCount, migrationsPending using pendingCount, and migrationsUpToDate using totalCount. These misleadingly named translation keys are not claims that this leaf applied anything. The caller must supply exact resolved source text from genuine supported migration evidence; totalCount is retained for this join but its displayed interpolation is already in upToDateLabel. The leaf preserves the pendingCount > 0 orange-versus-green source branches; it never derives counts from inspection or assumes missing migrations are current.
- Font size is a controlled number and change action. Range 10–24, step 1, px label/value, 160px nowrap group, 18px icon, xs slider, and 32px right-aligned text are unchanged.
- Levels are actual error/warn/info/debug presentation values in an ordered four-position tuple with resolved labels, current value, and change action. Caller labels preserve each original colored prefix plus translated option. Empty/unrecognized changes are ignored; right-positioned check icon is preserved. There is no backend logger/context import or cast-based map.
- Task badge accepts enabled and actual running/idle/null display status with resolved disabled/running/idle copy. Source precedence is important: disabled always renders yellow, even with null status; enabled/null renders no badge, running is green, idle uses default. The separate lastExecutionStatus error badge is outside StatusBadge and remains with the task-table owner.

## Accessibility, effects and purity

Progress preserves component=output, aria-live=polite, aria-atomic=true, aria-busy until timedOut, aria-hidden decorative icons/loader, relogin only after restoring, and timeout-only retry/reload buttons. useReducedMotion retains the static database icon instead of the restoring loader; the other status icons and colors are unchanged. No new timers, readiness effects, listeners, transport, or application state were introduced. The retained official hook owns its original media-query behavior; it was not invoked during this work.

The confirmation's visible prompt/placeholder and control semantics, slider keyboard/range semantics, Select behavior, and table header/count alignment are extracted as found. No accessibility redesign or additional label contract is claimed. Presentation effects are limited to confirmation useState and the original reduced-motion hook. Every runtime import is declared React, Mantine core/hooks, Tabler, or the same-domain DangerousActionConfirmation leaf; relative contracts imports are types-only. No other mutable source views, legacy views, Next, tRPC, auth, database, backend, API model, native controller, or application context is imported.

Read-only official installed evidence: UI manifest declares React/Mantine core/hooks/Tabler and includes src via tsconfig. Installed versions are React 19.2.7, Mantine core/hooks 9.6.0, Tabler 3.44.0. Installed Select, Slider, Paper, TextInput, Group, Table and useReducedMotion declarations and React/Tabler declarations were inspected without evaluation. This is the requested installed-API fallback for the reported documentation quota exhaustion; no network lookup or quota retry was attempted.

## Held joins and independent review gate

`apps/nitro/src/features/backup/contracts.ts` was read only to establish the mismatch: BackupInspection is not BackupAnalysis; capabilities explicitly retain apply:false and boardOnly:false. This lane does not own the inspection-to-display projection. That join is blocked until an independent owner publishes reviewed supported metadata, every source row count, board names, and migration evidence. Missing fields must not become zero, an up-to-date migration label, fabricated readiness, restart, relogin, applied state, or any arbitrary business result. Do not mount this full legacy preview for unsupported inspection evidence.

Restore/export/native apply, readiness/restart/relogin resources, ZIP/WASM/crypto/key analysis, SQL/migrations, upload/transport and resource timing remain held. No encryptionKey or migration SQL enters view contracts. Keep the original 256MiB bound and source 5s request/750ms readiness polling/45s timeout with their resource owner; these leaves cannot unblock them. Timeout retry must observe readiness only, including ambiguous restore outcomes.

Logs context/terminal/history/order/retention/user-scroll/xterm and stream disposal remain original-owner work. Tasks table/MRT/createColumns/TimeAgo, fourteen cron presets, focus restoration/subscription/mutations remain original-owner work. J1 cron SQL, J2 reset and backend moves are separate owners; their active contracts were not consumed or changed. No Docker/Kubernetes or complete BackupOps parity is claimed.

Independent source-body/contract review must precede coordinator-owned public exports, domain barrel, original rewiring, projection, resource/action admission and mounting. Leave originals canonical and frozen until that join; these new leaves are unpublished candidates, not an active second editable product UI. Coordinator must rewire the existing wrappers to the reviewed leaves to establish one source of truth, retaining their translation/context/controller ownership. Callback availability alone is not authorization or proof of success.

## Validation boundary

Only source/manifest/installed declaration reads and the scoped new-file patch were performed. No checks, lint, typecheck, build, install, tests, import evaluation, Git, nested agents, live provider, network, SQL, browser, environment/credentials/data access, or listener activation were performed. No execution validation or whole-domain 1:1 parity is claimed.
