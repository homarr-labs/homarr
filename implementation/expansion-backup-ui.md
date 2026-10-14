# Expansion 35: backup frontend capability freeze

## Delivered surface

`apps/nitro/src/features/backup/` contains an unmounted React/Mantine backup surface. No route, manifest, host, provider, API, database or legacy file is changed. `BackupPage` defaults to unavailable transport; it cannot apply data even if a caller supplies a transport claiming additional capabilities.

The component capabilities are frozen as follows:

| Component or adapter              | Capability                                                                                                                      | Explicit limitation                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `BackupPage` / `useBackupPreview` | Actual controlled single-file selection, 256 MiB compressed limit, inspection phases, retry and cancellation                    | No archive decoder or browser SQL; file extension is a chooser hint, not validation              |
| `createBackupNativeTransport`     | Explicit direct native ports, bounded file selection, runtime-validated frozen inspection output, ZIP response validation       | No inferred URLs, legacy fallback, arbitrary JSON success, progress percentages or apply port    |
| `BackupPreviewPanel`              | Version/date/dialect, all returned durable-family counts, encrypted-field counts, source home board and key-presence flag       | Missing data is not synthesized as zero; inspection does not verify ciphertext decryption        |
| `BackupRestoreReview`             | Source home-board selection, archive/manual original-key choice, in-memory key format validation and destructive warning review | Selection is not a board-only import; key is not transmitted or tested; restore remains disabled |
| `BackupExportPanel`               | Sensitive-data typed confirmation, export request and owned downloadable Blob URL                                               | Enabled only with an explicit native export binding; browser save completion cannot be proven    |

Replacement selection aborts the preceding inspector and prevents stale promise/phase updates from publishing. Clearing or unmounting releases the owned preview; export cancellation/replacement/unmount drops the owned download and revokes its object URL. Inspection bytes are cleared after the bound inspector settles. Abort is not a claim that server work stopped or that file-reading APIs are cancellable. The native binding must honor cancellation and dispose its own server resources. Source key values exist only inside the mounted review; file replacement, retry, clearing and unmount remove that review. No global storage clearing, session mutation, query-cache reset or persistence is performed.

## Frozen source semantics

Read-only source inspection used:

- `apps/nextjs/src/app/[locale]/manage/tools/backup/_components/backup-export-card.tsx` and `apps/nextjs/src/components/backup/{database-restore-flow,restore-confirmation,restore-progress-panel}.tsx`: file selection, typed `I understand` warning, restart/readiness and sign-in intent.
- `apps/nextjs/src/app/api/backup/{export,import}/route.ts`: original full SQL ZIP and error response contracts. The original export is `GET /api/backup/export`, `application/zip` with attachment filename; import is multipart `POST /api/backup/import` with a `file` and returns `success`, `restartAfterMs`, and `homeBoardName`. These are legacy evidence, not asserted Nitro endpoints and are never called by this feature.
- `packages/api/src/backup-runtime/{contracts,index,archive,inspection,inventory,crypto}.ts`: the existing bounded ZIP parser, disposable-copy lifecycle, `BackupInspection`, `PreparationOptions`, safe error codes and encryption behavior. No parser, migrations or inventory were copied or modified.

The inspected runtime result retains `scope: "sql-only-sensitive"` and `requiresMigrationLogout: true`. Inspection performs schema/content migration and reference validation on a copy. It does not decrypt credentials. A prepared source key must be original, 64 hexadecimal characters, and must agree with an archive key if both exist. Frozen preparation rejects missing keys, conflicts, malformed ciphertext and failed decryption; the UI preserves these distinct safe failures without displaying raw thrown messages, keys or plaintext.

`PreparationOptions.selectedBoardId` changes `homeBoard` in the returned inspection. It does **not** slice the prepared snapshot: full restore and source-board destination remain distinct. A board-only action is explicitly disabled because the frozen contract has no such operation. Durable database families include identity, authorization, integrations, widgets, assistant history and operational settings, not merely boards. SQL media rows do not imply filesystem uploads are included.

## Explicit native integration ports

`createBackupNativeTransport({ inspectAsync, exportAsync })` accepts optional direct native bindings. Inspection has the actual dependency-bound frozen function shape: `Uint8Array` plus `Pick<PreparationOptions, "signal">` returning `BackupInspection`. The native owner must bind `inspectLegacyBackupAsync` to accepted `BackupDependencies`, including genuine authorization and disposable-copy cleanup. The adapter never imports the server runtime into a browser bundle; it imports only its public types. The returned inspection is strict-validated and excludes key material, plaintext, database bytes and prepared snapshots.

Export accepts an explicitly supplied `(AbortSignal) => Promise<Response>` port, requiring a successful nonempty `application/zip` response with optional original attachment filename. The adapter parses the real legacy export response shape without assuming the legacy URL exists in Nitro. A caller binding HTTP must supply the accepted native endpoint itself, include its real authentication/CSRF contract, and translate native safe failures; there is no invented wire envelope or automatic RPC serialization of `Uint8Array`, `Response`, or `AbortSignal`.

No accepted Nitro backup resource or export implementation was found in the inspected native source. Therefore these are integration ports, **not** a shipped HTTP transport or proof that an endpoint exists. Default inspection and export report unsupported and do not invoke legacy handlers. Preparation is intentionally not exposed, because creating a sealed snapshot is not an accepted destructive apply operation.

## Remaining release proof and central wiring

1. Supply accepted native inspection/export endpoint bindings, then route this surface and mount it under the existing application providers. Genuine admin/first-run claim authorization must remain server enforced. A frontend capability flag is not an authorization check.
2. Declare `@homarr/api` in the Nitro workspace centrally before release. The installed hoisted package exposes `@homarr/api/backup-runtime`, used type-only here, but `apps/nitro/package.json` does not declare that workspace dependency. No missing export was fabricated or shared manifest edited. React 19.2.7, Mantine 9.6.0 and the Nitro-local Zod 4.6.5 were confirmed installed and declared; the root hoisted Zod is a separate 4.4.3 version.
3. Accept genuine whole-runtime fencing covering every writer, durable replacement, rollback/failure semantics, driver ownership and safe restart before enabling apply. Preparation alone, a process-local guard or SQL file rename does not prove this.
4. Accept post-apply reset/logout ownership, acknowledged durable application, server readiness and sign-in navigation together. Timeouts or transport loss must remain indeterminate, never false success or an automatic destructive retry. No readiness polling or restart listener runs in this frozen frontend.
5. Decide a real board-only contract if required. Do not interpret home-board selection as filtering, merge support or supported native SQL restoration.
6. Perform lint, typecheck and mounted accessibility/browser validation centrally once bindings and dependency declarations are ready. No tests, check commands, builds, installs, browser actions, Git commands, listeners or nested agents were run or added for this task. Current documentation lookup through Context7 was attempted but its monthly quota was exhausted; component APIs were checked against installed Mantine declarations and existing source. The UI skill's setup script was not run under the task's no-command constraint; existing `PRODUCT.md`, source UI and the product register were read instead.

English feature copy is local to this unmounted surface. Localization and live provider/auth integration remain release work, not claimed completed capabilities. No provider SQL, environment key access or current-data operations were performed.
