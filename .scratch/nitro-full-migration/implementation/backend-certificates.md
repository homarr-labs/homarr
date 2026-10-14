# Native certificate procedures: unmounted review handoff

Six native factory leaves are prepared for independent review, not accepted, mounted, or a completed #18. The accepted localization/settings/home sources, Core certificate services/files/resources, DB r3 repository, HTTP transport, manifests, central index and port map were not edited by this lane. Q16 remains unanswered.

## Exact source dispositions

Comparator: `packages/api/src/router/certificates/certificate-router.ts`. `createCertificateProcedures(resources)` in `packages/api/src/nitro/routers/certificates.ts` returns exactly:

| Identity                             | Body                         | Preserved input/output and projection                                                                                                      |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `certificates.getCertificate`        | Core `getCertificate`        | Source root filename validator; explicit nullable metadata schema; source R49 GET metadata only.                                           |
| `certificates.ensureRootCertificate` | Core `ensureRootCertificate` | Source root filename and nonempty 64 KiB string schemas; explicit `{created, certificate}` metadata schema; source R50 POST metadata only. |
| `certificates.addCertificate`        | Core `addCertificate`        | Actual source `zfd.formData`/`zfd.file().check(checkCertificateFile)`; no new output object.                                               |
| `certificates.trustHostnameMismatch` | Core `trustHostnameMismatch` | Exact hostname/certificate strings; Core computes the fingerprint and stores the compound grant.                                           |
| `certificates.removeTrustedHostname` | Core `removeTrustedHostname` | Exact hostname/thumbprint strings; compound removal, without normalization.                                                                |
| `certificates.removeCertificate`     | Core `removeCertificate`     | Actual legacy filename validator, distinct from get/ensure; Core removes fingerprint grants after file removal.                            |

All six use the existing authenticated source procedure pipeline, `admin` permission and source demo guards. There are no absent domain bodies in this factory; all production joins below remain held. No list API, extra REST/MCP metadata, tRPC caller, ambient DB, copied crypto/files/SQL implementation, or opaque whole-controller port was added. R49/R50 are candidate intent, not exposure approval.

## Typed constructor and security contracts

`routers/-certificates/bindings.ts` constructs the actual accepted `createCertificateService` with fenced `CertificateFileStore`, `TrustedCertificateHostnameStore`, current-admin admission and a mandatory awaited retirement effect. It uses the actual Core `createCertificateTrustReader` for the unchanged-version retirement supplement, not a parallel version/hash implementation.

- `files`: explicit actual Core file store supplied by the host. No environment-derived folder or fallback store is constructed here.
- `acquireAuthorityAsync(authenticatedContext)`: trusted host admission returning `CertificateAuthority` with immutable policy identity, abort signal, `assertCurrentAsync` and `releaseAsync`. Initial and subsequent fences require current admin policy, matching context user ID and non-aborted request/admission signals. The host must invalidate the admission on identity/permission/session changes; this interface is not an implemented session verifier, principal admission proof or product administrator.
- `createHostnameStore(authenticatedContext)`: typed primitive store construction, after current-admin admission. COMPOSITION can supply the accepted DB r3 `createTrustedCertificateHostnameStore(admittedRuntime)` from `@homarr/db`; this lane implements no SQL/repository substitute. The host owns the admitted persistence runtime and its authority lifetime.
- `retireTrustMaterialAsync(effect)`: required, no default/no-op production callback. Receives the actual Core `trust-material-changed` version or `trust-material-unavailable` effect and must await actual shared-runtime retirement. The fixture spy proves invocation/awaiting only.

Current-admin admission precedes native input validation and any fixture SQL/files/effects. A service-facing File proxy retains the validated source File and fences its actual `text()` call before and after the asynchronous read, including after Core trust preflight. It does not read/copy bytes or implement multipart parsing.

Every resource mutation is fenced before dispatch. Once mutation dispatch begins, lost currentness/cancellation is recorded rather than suppressing fingerprint revocation cleanup, internal retirement reads or the mandatory retirement effect. The caller receives an honest failure after retirement, never a rollback claim. These are dispatch boundaries: authority cannot be rechecked inside frozen Core filesystem operations, and this wrapper does not make file/repository mutations atomic.

Actual Core publication and validators are retained: bounded root-only validation, identical-byte idempotence, conflicting-byte CONFLICT without overwrite, safe legacy removal names, exact hostname/fingerprint grants and no TLS-chain relaxation. If Core omits an unchanged-version effect after an idempotent mutation, the binding reads Core's actual version and awaits retirement before returning. Unavailable material is retired as unavailable; effect failures are not swallowed or automatically retried.

Actual `RootCertificateError` retains its BAD_REQUEST/CONFLICT code and message without a cause. Other service/resource failures are sanitized. `CertificateOperationError` declares the candidate typed `CERTIFICATE_OPERATION_FAILED` code with only `{mutationMayHaveCompleted: boolean}` and fixed safe messages. This is necessary because the frozen shared pipeline deliberately masks INTERNAL_SERVER_ERROR messages; no central error behavior was changed. The native fixture verifies the post-mutation message survives that pipeline. HTTP status mapping and host/client consumption of this candidate error remain review/composition joins; installed oRPC v2 errors have no per-error `status` option. No PEM, SQL details or credentials are included in outputs or wire error causes.

## Public declaration requirements: COMPOSITION only

1. Declare accepted Core `./infrastructure/certificates/resources` -> `./src/infrastructure/certificates/resources.ts`. The source exists, but the Core manifest does not yet export it. Do not substitute the legacy root certificate barrel or an undeclared deep production import.
2. Declare API `./nitro/routers/certificates` -> `./src/nitro/routers/certificates.ts` when this exact factory is accepted. Factory and resource types are exported together; a separate helper export is unnecessary for its host constructor.
3. Declare API's direct `zod-form-data` dependency. The exact source router already imports it and installed/catalog version is 3.0.2, but it is absent from API dependencies. Existing API declarations cover `@orpc/server` 2.0.0-beta.43, Core, auth, validation and Zod 4.4.3; no dependencies were installed or declared here.

The isolated `routers/-certificates/tsconfig.json` maps only the missing Core resources entrypoint to its actual source for fixture compilation/execution. This is explicitly fixture-only resolution, not production package resolution or public subpath acceptance. Other runtime imports use declared package entrypoints. Drizzle 0.45.2 is already an API development dependency; its inert typed mock only fills the required BackendContext DB field and throws on any attempted access.

Current API/Core manifests were inspected read-only. Primary oRPC [middleware](https://orpc.dev/docs/middleware) and [error](https://orpc.dev/docs/error-handling) documentation and pinned installed declarations were used; prior Context7 quota exhaustion remains recorded. No install/manifest/lock change was made by this lane.

## Scoped evidence

Passed commands:

```sh
bun --no-env-file --tsconfig-override ./packages/api/src/nitro/routers/-certificates/tsconfig.json packages/api/src/nitro/checks/certificates.mts
bun --no-env-file packages/api/src/nitro/routers/-certificates/typecheck.mts
./node_modules/.bin/oxlint packages/api/src/nitro/routers/certificates.ts packages/api/src/nitro/routers/-certificates packages/api/src/nitro/checks/certificates.mts
```

Behavior evidence is Bun 1.4.2 with actual public-intent Core service/file constructors and three freshly generated disposable certificates (two roots, one non-CA), real fixture files, a typed primitive Map hostname store and an awaited effect spy. Typecheck is the isolated installed TypeScript 7.0.2 program; no broad suite or live DB/transport probe was run. Bun emits a nonfatal `--tsconfig-override` directory-mismatch diagnostic; the fixture completes with exit 0, but this is not a clean production runtime claim.

- Exactly six source identities and only the two original REST metadata candidates; no list leaf.
- Anonymous, missing/stale admin, mismatched principal and pre-aborted admissions fail before hostile input/FormData parsing, File.text, store/file reads or effects. Zero DB accesses throughout.
- Metadata-only get/ensure, null absence, root-only rejection, upload size rejection before File.text, identical ensure/upload behavior and unchanged file bytes after ensure/upload conflicts.
- A native FormData/File fixture traverses source validation; it is not an HTTP multipart-ingress test.
- Exact compound grants preserve hostname case/port and other fingerprints; legacy spaced filename removal and stricter get filename rejection retain their distinct validators.
- Fingerprint cleanup still runs after actual file deletion when authority changes. Revocation still proceeds when trust material is unavailable.
- Identical-version, unavailable-material and post-mutation authority/abort effects are awaited through a controlled promise gate. Retirement failure returns a sanitized failure with the already-removed grant still removed. No rollback is asserted.
- Fresh fixture keys/configs/certificates and known managed files are removed individually, then only the empty owned directories are removed. No listener was needed.

Final scoped lint has no warnings/errors and scoped typecheck has zero diagnostics. The owned helper directory contains only `bindings.ts`, `tsconfig.json` and `typecheck.mts`, with no fixture residue. Previously frozen `server-settings.ts`, `onboard.ts` and `home.ts` SHA256 values still exactly match the earlier accepted handoff (`aa72c683…`, `46058c01…`, `6b4e4074…`).

## Holds and next review

Independent review and coordinator acceptance are still required. The factory is unregistered and uncommitted. Accepted DB r3 PostgreSQL evidence remains construction-only; this fixture does not establish SQLite/PostgreSQL persistence, constraint behavior, migration preservation or transaction acceptance.

Host authority/session/origin/expiry/current-policy admissions, real DB repository/persistence admissions, explicit production certificate folder, package declarations, native File/multipart ingress before host parsing, request-total/concurrency limits, client error handling and certificate administration UI/page workflows remain unjoined. Q16/private SQL sessions were not selected or changed.

Physical HTTP transport retirement, pending CONNECT ownership, Node proxy production acceptance and the Bun proxy guard remain HELD; no wrapper or effect spy clears them. No TLS probes, real CA folder, credentials, environment files, live SQL/provider/network analysis, browser/container actions or 3100/3200 experiment changes were used. Submit only this exclusive file set for review; keep accepted Core, localization and the eleven settings/setup/home leaves frozen. No #18 completion is claimed.
