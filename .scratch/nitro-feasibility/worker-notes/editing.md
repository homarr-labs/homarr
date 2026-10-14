# AJN-503 runtime editing handoff

**Editing-complete within the owned lane; review and composed verification pending.** Canonical AJN-503 read through Linear read-only, with SPEC, coordination, foundation, rendering, access, and router-reconciliation handoffs consumed. No branch/worktree changes, commits, pushes, shared-file edits, Linear changes, or roster updates. This lane is relinquished to coordinator review/integration.

## Changed paths and stable exports

Relative to `apps/nitro-experiment/`:

- `src/features/editor/board-editor.tsx`: replaces the registered `BoardEditor(props: EditorSlotProps)` placeholder with an owner-affordance-gated inline Mantine editor, preserving the viewer and all slot/callback signatures.
- `src/features/editor/draft.ts`: owned draft copying, dirty comparison, and schema-based field validation. Exports `EditorDraft`, `DraftErrors`, `createDraft`, `hasDraftChanges`, and `validateDraft` only within the editing feature.
- `src/server/board-edit/service.ts`: implements the existing `saveBoard(context: RequestContext, input: BoardSaveInput): Promise<BoardSaveOutput>` export. This is the same `{board: BoardProjection}` return shape.
- This new note, `.scratch/nitro-feasibility/worker-notes/editing.md`.

`src/server/api/board-save.ts` was inspected but not changed: its existing registered `boardSaveProcedure` delegates to `saveBoard` under `rpc.board.save`. No registration request, contract change, dependency change, widget edit, repository change, or render-cache change is needed.

## Server boundary

- The service calls the common `assertMutationRequest` before repository work, validates the strict shared save input, awaits the record, then calls **live** `authorizeBoardWrite(context, record)` immediately before the repository's atomic `compareAndSave`. It does not use `context.session` truthiness or the browser affordance as authorization.
- The repository remains the foundation's parameter-bound atomic expected-revision CAS, not an ORM or service read-then-write update. Its saved/conflict/not-found results become sanitized output, `CONFLICT {currentRevision}`, or `NOT_FOUND`. Invalid direct-service input yields `BAD_REQUEST {reason:"invalid-board-edit"}`; the typed procedure retains shared validation/errors.
- After CAS awaits, write authorization and abort status are checked again before any result is returned. A logout/expiry while work was pending can deny delivery even if the atomic commit already occurred. Abort or late denial is **not** represented as rollback or permission to automatically retry.
- Successful projections pass through the common live `authorizeBoardRead` and strict output schema. Only id, visibility, revision, bounded content, and current capabilities are returned; no owner, principal, token, or request is exposed.

## Draft, conflict, and reconciliation behavior

- Inline responsive fields edit only board label, columns 1..4, and widget display label. Shared strict schemas trim/validate both 1..80-character labels. Field and summary errors are explicit, and validation rejection keeps the draft.
- A conflict retains the original draft and expected revision. Save remains disabled until the owner intentionally checks the saved settings and compares all three fields. **Keep my draft** changes only the comparison baseline to the reviewed revision; a separate **Save changes** action submits it. **Use saved settings** explicitly discards the draft. Further concurrent edits still encounter CAS, never automatic overwrite/retry.
- Unknown transport/malformed response outcomes preserve the active draft and block blind resubmission. **Check saved settings** performs a fresh typed authorized read and awaited Router reconciliation before exposing the same intentional settings choice. Read failures retain a blocked draft, rather than converting an unknown mutation into an assumed failure.
- New board props advance clean drafts. Newer props do not silently reset dirty/conflicted input or advance its expected revision; they supply a comparison candidate only when not older than a known conflict. Save/review locks inputs while pending. Successful save reconciliation adopts the committed revision, then any still-newer clean props. Widget display configuration flows through committed board props; no widget/source file was changed.
- Browser Query and Router work remain distinct: exact keys come from `createFixtureQueryUtils(client).board.read.queryKey({input:{boardId}})` and `.widget.read.queryKey(...)`, matching the renderer. Reads are cancelled, both keys invalidated with `refetchType:"none"`, and the obsolete board query is removed. No response is optimistically inserted into Query, and no global Query/server-cache clear is used by this feature.
- The existing `onCommitted(board): Promise<void>` is awaited separately. Its shared fresh-loader/epoch/revision checks, not promise resolution alone, decide whether the browser refreshed. Denied/failed reconciliation masks the old view and leaves the existing SessionControls recovery reachable. No callback/save is wrapped in `runSessionTransition` and no raw begin/complete notifier is used.
- Durable revision advancement already selects a different renderer artifact key. Foundation seeding already initializes absent rows only. These paths are consumed unchanged; runtime edit/restart correctness is still an observation to perform, not a result claimed here.

## Approved shared seam and stale completion protection

The initial boolean-only hook could not synchronously reject a completed save racing session begin before React unmount. Coordinator approved and assigned the actual missing additive seam to the access owner, who implemented it. Exact read-only import path: `src/features/session/session-transition.ts`.

- `captureSessionTransition(queryClient: QueryClient): number | null`
- `isSessionTransitionCurrent(queryClient: QueryClient, epoch: number): boolean`
- `invalidateSessionTransition(queryClient: QueryClient, capturedEpoch: number): void`
- Existing `useSessionTransition(queryClient): boolean` remains the rendering mask.

The editor captures before starting an operation and checks the producer's synchronous generation after every await and before each cancellation, invalidation, obsolete-query removal, Router callback, and async UI write. A null capture starts no dependent work. Unauthorized/forbidden saves or failed post-save reconciliation conditionally invalidate only the captured current generation; stale completions cannot mask a newer session. Unknown transport outcomes are kept inline for draft review, not immediately treated as auth failure.

Each operation also captures Router history-location identity and href. The owned consumer subscribes to the installed history API, aborts an operation when navigation changes that location, and blocks an already-submitted mutation as unconfirmed if the same component remains. Async completions additionally compare the captured location/href, preventing late navigation completion from invoking an old callback or masking a new route. Unmount aborts the typed request and clears the owned operation reference. Neither abort nor ignoring an old result claims that a submitted server save was undone.

Access masking/unmount intentionally removes the old authorized form. No private draft is persisted/shared across identity changes. SessionControls/Recovery own outer transition arbitration and recovery. The approved producer handoff/review and composed races remain integration gates; no further shared-seam request is outstanding from this lane.

## Actual evidence and limits

**No application probe was run or reserved.** No lint, typecheck, tests/new test files, build/bundle execution, install, shared output, listener/port, database, Docker, browser probe, or application-module execution was used. Evidence is source inspection only. The Impeccable context script read the existing product/design context; it was not an application validation probe.

Manifest/declarations/source inspection verified existing Mantine **9.6.0** TextInput, numeric generic Select, Alert, Button, Group, SimpleGrid, and Title APIs; React **19.2.7** hooks/declarations; Query **5.101.2** exact cancellation/invalidation/removal behavior; oRPC **2.0.0-beta.43** typed client AbortSignal, ORPCError, query-key utilities, and existing registered procedure. Installed Router **1.168.8** / core **1.168.7** and history source establish useRouter, latestLocation/state, stable history location getter, and subscription cleanup. No Context7 retry or broad research occurred. Existing common/UI public surfaces were inspected, but their Homarr/Next-aware graphs and absent app dependency are unsuitable for this isolated feature.

## Coordinator/final AJN-506 checks still pending

1. Review owned changes and the approved access seam, then final package-scoped lint/typecheck after all writers finish. No green-check claim is made.
2. Mounted typed API: owner public/private saves, direct viewer/anonymous saves denied, invalid/extra inputs rejected, wrong/missing Origin and read-only mutation methods rejected, sanitized outputs, missing board, and revocation/expiry before CAS and during awaited completion. Check durable effects separately from late-denied/aborted responses.
3. Two copies with one expected revision: exactly one commit, explicit conflict, draft retained, fresh comparison, intentional keep/discard, and another concurrent update before retry. Verify new props after a successful save and after a newer concurrent revision do not drop conflict input.
4. Browser Query cancellation/invalidation versus Router fresh-loader success, denied/failed/aborted reconciliation, owner edit plus committed widget label, no optimistic stale capability insertion, and unknown transport save with intentional latest-read review instead of resubmission.
5. Delay save/read/reconciliation around logout, identity switch, expiry, unmount, navigation (including away/back and same-component search/history changes), and recovery. Old completion must not seed Query, update an old form, call an old reconciliation callback, or mask/unmask a newer session. Verify failed access recovery remains reachable and callbacks never acquire a nested runner.
6. Subsequent populated HTML under the unchanged application build identity must show the durable new revision/content. Delay an old render across the commit and verify its old key cannot replace the current artifact.
7. Final built container restart using only the dedicated fixture volume: saved labels/columns/revision persist, seeding does not overwrite them, and caches/sessions cold-start. This lane did not touch a database or execute restart evidence.

Consume with the existing foundation repository/contracts/registrations, rendering note, access note including the generation addendum, and router-reconciliation note. Complete build/container/browser/restart validation belongs to AJN-506; coordinator owns integration/status updates.
