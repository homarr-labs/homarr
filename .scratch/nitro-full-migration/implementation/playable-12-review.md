# Exact combined12 independent bounded review

## Decision: ACCEPT both exact hashes

| File                                              | SHA-256                                                            | Decision |
| ------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| `apps/nitro/src/source-ui/backup/upload-zone.tsx` | `e6b9035ff8b4afc6de098fff3c897f40bf99d13d31fb6bb70b151c834df31cf7` | ACCEPT   |
| `apps/nitro/src/features/backup/contracts.ts`     | `020f9e3b24b22b73b3c087f72657b6148221e6287e81f655275aeb2fb7730e45` | ACCEPT   |

No findings in this fast bounded gate. Lane01 may consume these exact bytes in a new immutable preview; restore/apply remains **HELD**. This is not full parity, integrated runtime, release or destructive-backend acceptance. Lane01 still owns the existing `@mantine/dropzone/styles.css` integration.

## Source verification

- Compared the uploader with the read-only original `database-restore-flow.tsx:240–277`: native Dropzone, ZIP MIME accepts, blue/red status colors, radius, centered pointer-events-none Group, accept/reject/idle icons, rem52/stroke1.5, translated title/description and standalone200/card160 minimum heights are preserved. Added native rejection feedback does not replace the original body.
- `multiple={false}`, `maxFiles={1}` and `maxSize={maximumBackupFileBytes}` enforce one ZIP with the exact 268435456-byte limit. Props retain optional variant, optional disabled and the sole `(File | null) => void` selection callback. Accepted input selects its first file; native rejection/dialog cancellation clears selection. Every callback guards disabled, which is also passed to Dropzone. Existing translated size/type errors and analysis-error label are used. No source-native completion, restore, backend or direct-fetch callback is introduced.
- Read the copied installed Dropzone declaration/implementation: it forwards accepted/rejected callbacks, disabled, maxFiles and file-dialog cancellation to native react-dropzone. This is source verification, not an executed browser interaction.
- The contracts change is byte-for-byte only the type import subpath replacement. Remaining canonical frontend types/body are identical to the preceding Dropzone snapshot; `apply` and `boardOnly` remain literal false.
- Actual `packages/api/package.json` publishes `./backup-runtime/contracts` to `./src/backup-runtime/contracts.ts`. Its copied resolving manifest is byte-identical, SHA-256 `4ad695a510afbfedd00ca715322eb3438144629da6d11663a211e7ece5e9415c`. The actual, copied source and resolving package target are byte-identical, SHA-256 `7a9a242530d125ad28bf8f9596ef3d9293ab4c214a4b5fc443e1928745cb54dd`. The resolving package contains only that canonical API source, with no private SQLite/DB tail or substituted DTO. Input paths are not symlinks; strict Bundler/noEmit configuration has no paths aliases, baseUrl, extends or ambient substitute.

## Independently inspected evidence

Read actual command records and raw stdout/stderr in approved temporary directory `playable-wave32-lane12-contracts-GbHqHP/pure-contract-evidence`, plus the preceding `playable-wave32-lane12-dropzone-3x0GMV/evidence`. Both packets record typecheck, lint and format exit0 with null signals. Typecheck stdout and every stderr are empty; combined lint reports zero warnings/errors on two files; combined formatting reports both files clean. Recomputed every raw-log hash against its corresponding command record: all match. Retained Dropzone evidence is byte-identical to its original snapshot.

Read-only SHA-256 checks confirm both requested live hashes equal the executed immutable copy, upload bytes also equal the preceding Dropzone snapshot, all17 owned lane12 sources match the immutable copy and the other16 sources match the preceding frozen baseline with zero mismatches. The original source hash also matches `db870982c45bb72df966e2927b6e038626e5a3fcc6061c703f0f30be5dfb0574`.

No checks were rerun, and no tests, build, installation, app runtime, Git, child agents or source writes were performed. Only this canonical review was written via patch. The prior DLFgfj subset decision is inherited, not expanded or re-reviewed.
