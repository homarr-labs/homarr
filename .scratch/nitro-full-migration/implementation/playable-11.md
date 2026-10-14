# PLAYABLE-WAVE32 lane 11

## Reopened independent-review P2 lease

Only these three existing files are writable for this rereview: `apps/nitro/src/features/certificates/upload-form.tsx`, `apps/nitro/src/features/certificates/mutation.tsx`, and this handoff. All other lane11 files, Next originals and shared P3 views remain frozen/read-only.

Exact corrections: keep the existing reset-before-cancel action usable during a write hold, disabling only write inputs/submission without altering P3's tree; settle pending state for a retained actual authority/client/signal/target lifetime when availability changes, suppress stale success and retain reload/block semantics for potentially completed operations. No native trust change, retries, rollback or fabricated results.

Validation artifacts will be under `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-11-p2-rereview/`: copied frozen closure, `validation/lint.log`, `validation/typecheck.log`, `validation/SHA256SUMS`, `validation/results.json`. Runtime reproductions and new tests are explicitly outside this reopened lease; validation is isolated static lint/typechecking plus source/currentness inspection.

### P2 return for rereview

Both scoped corrections are implemented. Only the two leased TSX files and this handoff changed; all eleven other lane11 source files were byte-compared with the previous frozen v3 snapshot and remain identical. Shared P3 views were not edited; native trust guards, dependencies, routes and manifests remain unchanged.

1. **Cancel during a write hold:** the neutral Fieldset no longer disables all descendants. The existing FileInput receives native `disabled` through the P3 leaf's unchanged forwarded binding. A synchronous Fieldset ref applies native `disabled` only to the existing final submission button. This deliberately uses the inspected frozen P3 tree, whose Add button is last in both embedded and standalone branches, because P3 does not expose a submit-disabled prop. No button/tree/layout is recreated or moved; no loading state is invented for a hold. The original Cancel remains in its source Group, and its handler still resets file/error before invoking onCancel. The existing submit guard also remains intact.
2. **Pending settlement across availability changes:** `retained()` preserves every original actual-lifetime check (live controller and scope signal, latest memoized authority/client/signal/target lifetime, matching authority/client/signal). `current()` still adds the original canWrite/admin/availability gate. A retained lifetime now settles rejection even when writes are held, using the unchanged error certainty classification and suppressing stale notifications. A resolved operation that cannot safely perform its current refresh settles pending, blocks that retained lifetime, and shows the existing completed-but-refresh-unavailable/reload feedback instead of success. The same settlement covers availability loss during awaited refresh and refresh rejection. Changed/aborted lifetimes receive no old state or callbacks. Restoration of availability on the same lifetime cannot resurrect a spinner or clear an uncertainty/completion block; no retry, rollback or synthetic success is added.

### P2 raw validation and hashes

Read-only isolated input closure: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-11-p2-rereview`. It reuses the prior frozen copied dependencies/P3 closure, overlays only the two returned files, has no symlinks, and verifies all32,703 input-file hashes unchanged after checks. No mutable peer, dependency install or application runtime was used.

Both commands used only clean `PATH=/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin:/usr/bin:/bin` and absolute Node24.18.0. Lint arguments: `node_modules/oxlint/bin/oxlint -c .oxlintrc.json apps/nitro/src/features/certificates/upload-form.tsx apps/nitro/src/features/certificates/mutation.tsx`. Type arguments: `node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json`; the snapshot config includes only those two seeds and their copied imports. Tool pins remain oxlint1.73.0 / TypeScript7.0.2.

Raw `validation/lint.log` (exit0):

```text
Found 0 warnings and 0 errors.
Finished in 130ms on 2 files with 197 rules using 16 threads.
```

Raw `validation/typecheck.log`: empty (0 bytes), exit0, no diagnostics. These are actual captured stdout/stderr streams, not reconstructed success logs; separate `.exit` files and `validation/results.json` record the process exits and commands.

| Input / artifact                                    | SHA-256                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| Returned `upload-form.tsx`                          | `8e99fe80de19d3488526b9fed416d84830be0b3bb86363ec14f2d01c5ce6e5ab` |
| Returned `mutation.tsx`                             | `2fb3cd68617e8a0efae26ed48263aa6b59df6f40fee7c861399acbf7856e500a` |
| `validation/lint.log`                               | `85167cc2604c6c8886cb1befc51174d0a1d79e12e079070cd1fff723d27f7777` |
| `validation/typecheck.log`                          | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `validation/SHA256SUMS` (full copied input closure) | `a494be75f56467f2dbe5e7e53f3cf46cc5a80f6304dba586db7c55e95e4e99b2` |
| `validation/results.json`                           | `b478a22087d84091ef082ecd06a5f2cb57045c1f385956d0a98cf5c01c65cbf6` |

Before hashes are retained in results.json: upload `19292b440075be088b61ee5a9df414055178456233e81da1c398c56b957700f3`; mutation `c4acb9ecf694df7c68928ab7467d53cec861c3de8c052bc05583f7d5d6f49786`. Returned source bytes were compared with the checked snapshot after both commands. No new tests/children/Git/runtime/provider calls, dependencies or native-guard changes. Static checks passed; runtime regression reproduction is not claimed under this lease. Ready for independent rereview, not self-accepted.

Status: implemented and frozen for coordinator integration. Final owned snapshot lint and typecheck pass. Next originals and accepted P3 leaves remained read-only. No native trust, backend, manifests, routes, tests or peer controllers were changed. This is presentation/controller implementation, not mounted3210 or production-trust proof.

## Exact writes declared before implementation

- `apps/nitro/src/source-ui/certificates/management-views.tsx` (new original list/hostname/empty presentation)
- `apps/nitro/src/source-ui/certificates/index.ts` (new named presentation exports and accepted P3 reuse)
- `apps/nitro/src/features/certificates/client.ts`
- `apps/nitro/src/features/certificates/contracts.ts`
- `apps/nitro/src/features/certificates/confirm-action.tsx`
- `apps/nitro/src/features/certificates/connection-certificate.tsx`
- `apps/nitro/src/features/certificates/details.tsx`
- `apps/nitro/src/features/certificates/hostnames-page.tsx`
- `apps/nitro/src/features/certificates/index.ts`
- `apps/nitro/src/features/certificates/list-page.tsx`
- `apps/nitro/src/features/certificates/mutation.tsx`
- `apps/nitro/src/features/certificates/remove-actions.tsx`
- `apps/nitro/src/features/certificates/upload-form.tsx`
- This handoff, `.scratch/nitro-full-migration/implementation/playable-11.md`.

Disposable clean-environment validation snapshot/config/results will live under the approved OpenCode temporary directory, never application output. Exact snapshot paths and outcomes will be recorded after validation.

## Implementation intent

Reuse accepted `CertificateUploadView`, `CertificateDetailsView`, and `PemContentView`. Restore original certificate icons/grid/empty state/table, original inline confirmation controls, shared file validation, generated CUID certificate filenames, original alerts/retry/upload branches and date formatting. Scope supplies real read authorization and explicit write availability; omitted/unavailable secure writes stay visibly disabled. No invented trust policy, clients, authenticated principal or success results.

## Dependency requests to 01

- Publish an isolated `@homarr/ui/inline-confirm-action` export for the existing frozen `src/components/inline-confirm-action.tsx` (avoid the broad UI root and its framework peers).
- Publish narrow exports for the accepted `src/source-views/connections/{certificate-upload-view,certificate-details-view,pem-content-view}.tsx` and their contracts. Current owned barrel imports those frozen source leaves directly, without duplication. The existing public connections barrel pulls the unrelated AppItem candidate into typechecking, where it fails TS2322 against installed Mantine9.6.0. Narrow consumption avoids that unrelated blocker; no P3 source was edited.
- Admit `dayjs` using its actual installed/catalog pin (`1.11.21` in this snapshot). Nitro did not declare it when inspected, so this lane imports no undeclared dayjs. `CertificatesPageProps.daysUntilExpiration` must be the original `dayjs(validTo).diff(dayjs(now), "days")`, supplied by01 after declaration admission. The prior hand-written date-difference replacement was removed, not treated as original behavior.
- Resolve declared Nitro Zod `4.6.5` versus actual installed Zod `4.4.3`. Validation/typechecking used the real installed4.4.3 API; this is not verification against unavailable4.6.5. No install or manifest edit by11.
- Existing `@homarr/common/id`, `@homarr/validation/certificates`, React/Mantine/Tabler/oRPC declarations are present. Verified installed React19.2.7, Mantine core/hooks9.6.0, Tabler3.44.0, oRPC client2.0.0-beta.43, cuid2 3.3.0, TypeScript7.0.2, oxlint1.73.0. File/Fieldset, Client/createORPCClient/RPCLink, shared Zod check, and accepted presentation bindings were checked against installed declarations/source. Context7 was not called under this wave's exhausted-quota instruction.

## Exact original source mappings

Source root: `apps/nextjs/src/app/[locale]/manage/` (all read-only).

| Original                                                                                                | Destination / retained behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/certificates/page.tsx` lines57–132                                                               | `source-ui/certificates/management-views.tsx`: original header/group,32px red alert or expiry-colored certificate icon, nowrap icon/text layout, flexible text stack/max width, gray filename/descriptions, exact sm/lg/xl grid and remove slot. Controller retains invalid-first/validTo ordering, localized RelativeTimeFormat and ISO tooltip.                                                                                                                                                                                                                                                                                             |
| `tools/certificates/hostnames/page.tsx` lines50–98                                                      | Same management view module: original three named columns plus empty action header, hostname/subject/fingerprint rows, hostname+thumbprint keys, right-aligned remove action, empty state. No extra table label, scroll threshold or replacement rows.                                                                                                                                                                                                                                                                                                                                                                                        |
| `apps/nextjs/src/components/no-results.tsx` lines18–33                                                  | `CertificateNoResultsView`: unchanged certificate-use Card/centered Stack/IconCertificateOff2rem/Text tree; unused generic description/action features are not recreated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `tools/certificates/_components/add-certificate.tsx`                                                    | `features/certificates/list-page.tsx`: original useDisclosure(false), toggle, aria-expanded, default Collapse/Card and awaited real refresh-before-close path. No forced zero-duration/keep-mounted replacement.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `tools/certificates/_components/certificate-upload-form.tsx`                                            | `features/certificates/upload-form.tsx` consumes accepted P3 `CertificateUploadView`. Shared `z.file().check(checkCertificateFile)` owns validation, actual FileInput owns chooser, original FormData file/name, reset-before-cancel, embedded button versus standalone submit and pending state retained. Fieldset adds unavailable/pending disabling without editing P3. File state is remounted per real authority/revision.                                                                                                                                                                                                               |
| `tools/certificates/_components/remove-certificate.tsx` and `hostnames/_components/remove-hostname.tsx` | `features/certificates/remove-actions.tsx` consumes the unchanged original `InlineConfirmActionIcon`, including4s confirmation lifetime/Escape/blur/outside-pointer reset/check icon and pending guards; exact trash icons, color/variant/labels and fileName or hostname+thumbprint inputs restored.                                                                                                                                                                                                                                                                                                                                         |
| `integrations/_components/test-connection/test-connection-certificate.tsx` lines22–195,319–322          | `features/certificates/connection-certificate.tsx`: original admin description/permission alert; highest issuer certificate selection; hostname mismatch versus self-signed confirm labels; original alert icons/extract rich documentation link; original trust/upload/retry branches and blue retry icon. Removed the prior invented chain accordion. Original hostname extraction and peer PEM hostname-trust input retained; self-signed upload uses highest PEM and `${hostname}-${createId()}.crt`, original MIME and FormData.append. Existing guarded cycle-safe traversal is retained; no trust classification/policy was rewritten. |
| Same file lines201–317                                                                                  | `features/certificates/details.tsx` consumes accepted `CertificateDetailsView` and `PemContentView`: ordered fields, original full/long locale formatting on supplied Dates, source PEM anchor, lg modal/title, dark copy panel and green copy feedback retained. No duplicate detail/PEM tree.                                                                                                                                                                                                                                                                                                                                               |

## Published mountable exports / props

- `apps/nitro/src/source-ui/certificates/index.ts`: `CertificatesManagementView`, `TrustedHostnamesManagementView`, `CertificateListItemView`, `CertificateNoResultsView`; their named management/item prop types; the accepted `CertificateUploadView`, `CertificateDetailsView`, `PemContentView` and their prop types; original `InlineConfirmButton`/`InlineConfirmActionIcon`.
- `apps/nitro/src/features/certificates/index.ts`: `CertificatesPage`/`CertificatesPageProps`, `TrustedHostnamesPage`/`TrustedHostnamesPageProps`, `AddCertificateSection`/`AddCertificateSectionProps`, `CertificateUploadForm`/`CertificateUploadFormProps`, `CertificateErrorDetails`/`CertificateErrorDetailsProps`, `CertificateDetailsCard`/`CertificateDetailsCardProps`, `PemContentModal`/`PemContentModalProps`, `RemoveCertificate`/`RemoveCertificateProps`, `RemoveHostnameActionIcon`/`RemoveHostnameProps`, `CertificateReadStatus`, `CertificateWriteUnavailable`, `createCertificateRpcClient`/`CertificateRpcClient`, data/scope/read-view/write-availability/notification types.
- Scope: real `authorityKey`, permissions, lifecycle `signal`, locale, source `t`/`rich`; optional client and `writes`. Only explicit `writes: {kind: "available"}` plus admin/current lifetime/client permits submission. Omitted writes or `{kind: "unavailable", reason}` displays a hold and disables writes. This is an availability UI seam, not authentication or native trust authority.
- Optional `scope.notify` adapts the real source success/error notification provider after25 returns frozen. Local feedback stays truthful when no provider is mounted. Required `onChanged`, `onTrustChanged`, `onSuccess` must invalidate/reload the actual source reads; no no-op refresh is supplied.
- Certificates page: scope, authority-matched `CertificateReadView<CertificateListEntry>`, source `now`/dayjs calculation, actual onChanged/onHostnames and optional breadcrumb node. Hostnames page: analogous trusted hostname view, actual onChanged/onCertificates and optional breadcrumb. Router03/01 owns navigation/prefetch and breadcrumb composition.
- Connection error: actual mapped source error with Date validity fields, actual tested URL, attemptKey, actual retry and trust-read refresh callbacks. Dates are not fabricated or guessed from strings. Public mapped data contracts are structurally frozen from the original mapper instead of importing its backend dependency graph.
- Client: narrowed, installed oRPC `Client` signatures for exactly the four existing mutation paths, verified against frozen `packages/api/src/nitro/routers/certificates.ts`. Outputs are unknown, never invented success payloads. Existing same-origin RPCLink factory remains available;02's actual generated client may supply those leaves. No made-up list/hostname query or query key was added.

##3210 integration and remaining holds

Route inventory for01: `/manage/tools/certificates`, `/manage/tools/certificates/hostnames`, and the existing integration test-connection certificate-error slot. This lane creates no route or mount.

For synthetic feedback, mount the presentation exports directly with clearly labeled synthetic display props, rather than inventing an admin/principal/authority scope. Use disabled upload/confirmation controls with a visible secure-write hold. Synthetic content is neither authentication nor native trust proof.

Real controller reads require an authorized owner-produced list/hostname read view. The certificate router inspected here has no list/hostname-list query; do not invent one.01 must keep an unbound real read visibly unavailable. Native writes remain held until accepted production composition/current authority/target-only trust joins are actually bound; declaring a client or showing a fixture never releases those holds. No Core trust, hostname policy, backend resource, grant, manifest, route or production guard was changed.

## Initial wave frozen validation (superseded by P2 rereview above)

Final copy: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-11-check-v3`. All13 owned TS/TSX files were byte-verified against this source return before checks. It contains copied frozen P3/source confirmation/common-id/validation/translation type closure and actual installed third-party/tool packages; no workspace symlinks. The final snapshot, configs and dependencies were made read-only. No check reads mutable peers or application output.

Working directory for both checks is that snapshot. Clean environment prefix: `env -i PATH=/Users/ajnart/.local/share/mise/installs/node/24.18.0/bin:/usr/bin:/bin /Users/ajnart/.local/share/mise/installs/node/24.18.0/bin/node`.

- `node_modules/oxlint/bin/oxlint -c .oxlintrc.json apps/nitro/src/features/certificates apps/nitro/src/source-ui/certificates`: exit0, **0 warnings /0 errors**,13 files,197 rules,138ms.
- `node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json`: exit0, **no diagnostics**. Strict ES2023/Bundler/React JSX, DOM libraries, no emit/cache; skipLibCheck matches the source app. Included only the owned folders and their frozen imports, not the broad app graph.
- Initial v1 check found one new role warning and client generic inference error (both corrected in owned code), plus the unrelated accepted AppItem barrel TS2322 (isolated by narrow imports). v2 passed; v3 is the final read-only return after removing the non-source date algorithm and isolating upload file state.

No child agents, Git commands/mutations, new tests, broad test/build/Docker/E2E runs, installs, provider/SQL/browser calls, credentials/data/environment-file reads, listeners or protected3100/3200 outputs. No new comments, unsafe casts or TypeScript any. Browser/mount proof and exact declared-Zod pin validation remain coordinator-owned blockers, not claimed passes.
