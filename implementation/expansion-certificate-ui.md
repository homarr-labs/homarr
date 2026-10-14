# EXPANSION35 certificate frontend freeze

## Ownership and status

Owned implementation: `apps/nitro/src/features/certificates/` and this receipt only. React/Mantine views and direct, derived oRPC bindings are implemented and frozen. They are exported, not mounted. No routes, manifests, Auth, API, SQL, Core trust resources, legacy files, application providers, or other frontend lanes were edited. No peer frontend implementation was read. Integration frontend retains ownership of connection testing, attempts, result selection, and retry submission.

Entry point: `apps/nitro/src/features/certificates/index.ts`.

Separate integration handoff export: `CertificateErrorDetails`, with `CertificateErrorDetailsProps`. It accepts `{ scope, error, url, attemptKey, onRetry, onTrustChanged }`. It does not import the integration frontend, initiate a test, reinterpret another error category, submit its enclosing form, or call a legacy transport. `error` is the source mapped certificate error, not an arbitrary error string or native summary token.

## Source inspected

- Next.js certificate list, add section, upload form, and remove action under `apps/nextjs/src/app/[locale]/manage/tools/certificates/`.
- Trusted hostname list and removal action under that directory's `hostnames/`.
- Source `test-connection-certificate.tsx`, including administrator branch, trust confirmations, highest issuer selection, details, PEM modal, embedded import, and retry affordance.
- `packages/api/src/router/integration/map-test-connection-error.ts`, including the canonical `X509Certificate.toString()` PEM, dates, fingerprint256 mapping, issuer chain, and the existing `ca || DEPTH_ZERO_SELF_SIGNED_CERT` self-signed heuristic.
- Source certificate router and validation, native certificate router and authority bindings, Core certificate service/file resources, and native integration test result schema.

No certificate is parsed or cryptographically approved in the browser. No new meaning is assigned to the source self-signed heuristic.

## Frozen views and actions

| Export                                            | View/action                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CertificatesPage`                                | Administrator-only source list: invalid entries first, then ascending validity end; subject, filename, invalid state, relative expiration, removal confirmation, add section, and hostnames navigation callback. Source expiration thresholds remain less than 1/7/30 days. `now` is supplied by the host for a stable render.                                                          |
| `TrustedHostnamesPage`                            | Administrator-only hostname/subject/thumbprint table, nullable subject, source order, pair-keyed removal confirmation, certificates navigation callback. Narrow screens scroll the table.                                                                                                                                                                                               |
| `AddCertificateSection` / `CertificateUploadForm` | Collapsible import, one unchanged `File` in `FormData.file`, field validation, loading state, source notifications, cancellation and successful-refresh completion. Embedded mode uses buttons, never a nested form.                                                                                                                                                                    |
| `RemoveCertificate`                               | Inline confirmation calls removal with the exact filename. Server removal owns associated hostname revocation.                                                                                                                                                                                                                                                                          |
| `RemoveHostnameActionIcon`                        | Inline confirmation calls removal with the exact hostname/thumbprint pair. The implementation uses a labelled Mantine button, not an undeclared icon dependency.                                                                                                                                                                                                                        |
| `CertificateErrorDetails`                         | Source description and administrator branch; highest issuer details; hostname risk warning; extraction warning/manual upload for an untrusted non-self-signed highest issuer; trust confirmation only for hostname mismatch or untrusted/self-signed highest issuer; retry affordance only after confirmed mutation and refresh. Expired/not-yet-valid reasons acquire no trust action. |
| `CertificateDetailsCard` / `PemContentModal`      | Subject, issuer, validity dates formatted in the host locale, serial number, fingerprint and canonical PEM. Chain inspection adds peer-to-highest-issuer disclosure without changing trust selection. Modal has an accessible title, unchanged-content copy and close controls.                                                                                                         |

List data is supplied through `CertificateReadView`: `loading`, `unavailable`, `failed`, or `ready`. Ready views require the matching `authorityKey`, a reconciled `revision`, and their entries. A ready certificate row needs only filename, subject and validity end, or the invalid discriminator. A ready hostname row needs hostname, thumbprint and nullable parsed subject. Unavailable/failed reads are never displayed as an empty successful list, and no importer is shown on an unavailable list page.

Source UI language keys remain host-supplied via `scope.t` and `scope.rich`. Added chain labels and operational-hold text are English; localization of those additions remains a hold, not an invented translation catalog. Modal/collapse transitions are disabled for deterministic reduced-motion behavior.

## Exact native API bindings

`CertificateRpcClient` is `RouterClient<{ certificates: ReturnType<typeof createCertificateProcedures> }>` derived from the native certificate router by a type-only import. `createCertificateRpcClient` takes the host's actual endpoint URL, verifies same origin, captures its origin/path/query, and sends same-origin credentials through `RPCLink`. No endpoint, auth token, resource factory, retry plugin, cache, or backend contribution is installed here.

| Native procedure                     | Binding/input and frontend use                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `certificates.getCertificate`        | `{ fileName }`; native public root metadata or null only. Available on the typed client; no new named-inspection view or PEM reconstruction.     |
| `certificates.ensureRootCertificate` | `{ fileName, certificate }`; native created flag and metadata. Available on the typed client; deliberately no new ensure/overwrite/CA policy UI. |
| `certificates.addCertificate`        | Original `FormData` with `file`; upload form and source untrusted/self-signed trust action.                                                      |
| `certificates.trustHostnameMismatch` | `{ hostname: new URL(url).hostname, certificate: error.data.certificate.pem }`; uses the peer PEM, never the highest issuer PEM.                 |
| `certificates.removeTrustedHostname` | Exact `{ hostname, thumbprint }` from the current row.                                                                                           |
| `certificates.removeCertificate`     | Exact `{ fileName }` from the current row.                                                                                                       |

Automatic self-signed import uses the highest issuer's unchanged PEM in an X.509 MIME `File`, with a hostname-prefixed unique `.crt` filename. UUID generation is browser-native because the application does not declare the source ID library. The bytes are not normalized to fit native restrictions.

Local file validation preserves source order: required file, source filename character rule, case-sensitive `.crt`/`.pem` suffix, then 1 MiB limit. The native service's stricter 64 KiB, root-CA, self-signature, current-validity and filename rules remain authoritative server checks. Conflict and failure are reported; there is no fallback to a different trust lane or overwrite action.

## Canonical bytes and trust authority

Public certificate fields and PEM are rendered directly as React text. The same canonical PEM string is used for display, `CopyButton.value`, hostname trust and automatic highest-issuer import. The manually selected file is forwarded unchanged. No substring secret redactor, trim, line-ending rewrite, PEM extraction, chain concatenation, replacement certificate, or fingerprint recalculation is applied.

`CertificateUiScope` is presentation context, not a certificate authority: `{ authorityKey, permissions, signal, client, locale, t, rich }`. Inspection/actions require current source administrator permission; non-administrators see only the source permission warning in the integration certificate branch. Administrator pages render nothing when unauthorized, leaving source-style not-found handling to their eventual route owner. Aborted scopes render no certificate-error branch.

Server procedure authority remains unchanged. Every native certificate leaf requires administrator access. Native procedure order remains demo mutation guard, authentication, permission, input validation, resource/authority acquisition and fenced operation. No frontend demo policy, local permission escalation, CA targeting, or target-proxy trust policy was added. Root trust retirement, post-mutation fencing, hostname cleanup and authority release remain exclusively native responsibilities.

## Lifetime and mutation behavior

- The host must replace `authorityKey` for identity/permission lifetime changes, abort the previous signal, and synchronously clear/re-render protected UI. No signal listeners or application provider changes were installed. An abort alone cannot synchronously remove already rendered DOM without the host render.
- Host route/list/attempt ownership must not reuse a stale ready projection. Standalone exports must be remounted for authority/projection revision changes. The composed pages and connection export already key their children by those lifetimes.
- Each mutation instance has a synchronous pending latch, captured abort signal, target lifetime and latest authority/client checks. It rejects overlapping calls and suppresses old-lifetime feedback/completion. Unmount/target/client/signal replacement aborts the previous request. Strict-effect replay does not revive an aborted operation's completion.
- Refresh is separate from mutation acknowledgement. Host `onChanged`/`onTrustChanged` callbacks must themselves fence any asynchronous reads and publication. Upload completion and retry visibility occur only after successful refresh and a still-current operation. Refresh failure is an explicit hold, not a claim that the mutation failed.
- `CERTIFICATE_OPERATION_FAILED` retains its code and `mutationMayHaveCompleted` semantics. Ambiguous transport/malformed outcomes also hold the current mutation instance; no automatic retry occurs. A definite native failure retains source error notification and its code. Arbitrary exception messages/causes are not echoed.
- Holds remain latched inside the mounted mutation instance. The list's collapsed importer retains its instance, and embedded import cancellation is disabled during pending/held state. Reconciliation across navigation, another row/component, a changed attempt or a new authority lifetime is the host's responsibility; there is no global trust mutation coordinator here.
- Client cancellation or UI disposal is not rollback. A fresh authorized read must reconcile possibly completed mutations before repeating them.

## Residual holds

1. The native six-leaf certificate router exposes no list-certificate or list-hostname read. Core resource lists are not browser API leaves, and their metadata omits the source subject fields. No SQL reader, Core bridge, new trust resource or invented endpoint was added. Hosts must supply authorized source-compatible read projections before these pages can be mounted as complete native pages.
2. Native stored `integration.testConnection` currently returns a certificate category, not the detailed source mapped chain/PEM error. That summary cannot be manufactured into `CertificateConnectionError`. The integration owner must provide an authorized detailed result before consuming the separate certificate export. Its test flow and error-category ordering are not changed here.
3. Q17 override semantics remain undecided. There is no overwrite prompt, override flag, proxy-trust switch, new CA policy or interpretation of idempotent ensure as overwrite authorization.
4. Route authorization/not-found behavior, translations, actual endpoint contribution, current authority signals, navigation, refreshed read projections and post-mutation lifetime reconciliation remain host-owned. No browser or production publication claim is made.

## Verification receipt

Existing dependencies were verified in `apps/nitro/package.json`: React 19.2.7, Mantine 9.6.0 and oRPC 2.0.0-beta.43. Source UI skills were loaded. Context7 discovery hit its monthly quota; official Mantine FileInput/Modal and oRPC client/link documentation and installed declarations were used instead. The installed oRPC version requires separate `origin` and a slash-prefixed relative `url`, not a full URL string.

Repository-required scoped lint and typechecking were run despite the requested no-check preference. Final certificate-folder lint has no diagnostics. Final entry-point typecheck reports no certificate frontend diagnostic, but is not a passing check: its imported source graph reports five existing UniFi declaration/implicit-type errors. The earlier full-app typecheck was blocked by an active unrelated `apps/nitro/src/features/apps/search.tsx` syntax error; that file was neither read nor edited. No fixes, ambient declarations, unsafe casts or dependencies were added to conceal these blockers.

No tests, builds, installations, manual format commands, live SQL/data access, environment-key access, listeners, browser sessions, Git actions or nested agents were used. The implementation remains frozen for the owning session's integration and consolidated validation.
