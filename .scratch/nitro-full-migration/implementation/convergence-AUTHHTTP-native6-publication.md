# AUTHHTTP — Native6 source freeze and caller blocker

The caller prerequisite SOURCE ACCEPT/fresh AUTHHTTP-CALLER-1 four-zero checks and amended plan approvals are coordinator-supplied premises, not checks repeated here. The six-file Native6 source delta is frozen at the blocker below. No seventh product source was touched; this is not Native6 source acceptance, validation, runtime activation or Auth proof.

## Exact allocated source delta

- `packages/auth/nitro/sql-authority/contracts.ts`: adds internal `OwnedIssuerSessionRecord`, discriminated `OwnedSessionObservation` (absent/active/expired/expiry-margin), and sanitized `OwnedSessionDisposition` for expiry settlement. Active has the genuine lease; expired has only the selected native record/expired-row locator, not a policy lease or authenticated principal. These types are not added to the public barrel.
- `packages/auth/nitro/sql-authority/snapshots.ts`: factors snapshot decoding while public admission still projects only active snapshots. The issuer decoder validates ready domain, namespace/head sequence, row lifetime/write evidence, exact stored expiry, profile and grants; separates strict three-clock expiry from the conservative expiry margin. A no-cookie selector uses a false session join, not a fabricated token, while still reading the real domain and clock. Unavailable/malformed domain, lineage, profile, grants and clocks do not become absence.
- `packages/auth/nitro/sql-authority/authority.ts`: adds `observeSessionForIssuerAsync`, `recheckOwnedSessionObservationAsync`, `releaseOwnedSessionObservationAsync` and `expireOwnedSessionAsync` only on the genuine session owner. Closure-private WeakMap registrations retain the exact handle, original signal/deadline, selector, native snapshot, observation lifetime and consumption. Original observer reads finish before fencing; recheck/admission markers cover only actual reads. Expiry owns a single claim/fence, registered whole task, actual native promise/evidence and retained cleanup results. Confirmation precedes mapping/currentness/retirement failures. Private cleanup does not await its own claim completion or an HTTP caller; public release and owner shutdown drain the actual task, observation resources, matching leases and token fence.
- `packages/db/runtime-auth-session/contracts.ts`: adds the distinct `expire` mutation using the existing revoke payload. Expiry preparation checks original request bounds/skew and genuinely elapsed expiry without clamping cleanup to the expired credential's host deadline. Existing establish/renew/revoke branches remain distinct.
- `packages/db/runtime-auth-session/statements.ts`: expiry retains the existing domain-locked transaction, exact namespace/version/session/user/provider evidence and delete statements. Expiry additionally checks native expiry storage and strict expiry earlier than native observed, wall and configured clocks, before effects and again before return. Renewed/replaced/missing rows fail rather than producing successful cleanup. No schema, adoption or grant mutation was added.
- `packages/db/runtime-auth-session.ts`: adds the tracked `expireAsync` method through the existing generic native mutation path; `renewAsync` remains renewal-only.

The supplied before-image manifest was read at `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-auth-native6-source-1b87wl40/source-before.json`. Its images and recorded hashes were not edited or recomputed. The caller-prerequisite source, barrels, generic runtime, transaction gate, manifests, routes, other handoffs and fourth artifact were not changed.

## Precise additional caller prerequisite — STOP

Read-only inspection found a second existing union-sensitive caller in the frozen `packages/auth/nitro/production-sessions/sql-persistence.ts`: `mapNativeAuthSessionSqlResult` still accepts the full `AuthSessionMutation` (currently line 1520). After adding the approved `expire` variant, the mapper's unchanged tail after the revoke and renew returns (currently lines 1658–1661) also admits expiry and accesses `mutation.session.kind`/`mutation.session.credential`, which do not exist on the expiry session witness. The accepted `mutationFor` return-type prerequisite does not narrow this separate mapper parameter.

This is a source-derived typing blocker, not a compiler result. Implementation stopped without editing that seventh file. The smallest requested separate lease is **only the mapper parameter annotation**:

```diff
-  mutation: AuthSessionMutation,
+  mutation: Extract<AuthSessionMutation, { kind: "establish" | "renew" | "revoke" }>,
```

That preserves its original pre-expiry input set and every mapper body/runtime/dispatcher behavior; it does not implement expiry publication or widen renewal. It requires explicit coordinator authorization, independent review and fresh checks. No covert guard, cast, new compatibility type or runtime workaround was added inside Native6 to avoid that scope decision.

## Review/check and activation holds

No commands/checks/lint/builds/tests/evaluation/native SQL/configuration/environment/data/secret operations or nested agents were run. Existing auth/db manifests, native lifetime/statement/validation patterns and common utilities were inspected; no new library, dependency, comment, cast, `any`, test or public token/principal export was added. Old evidence remains intact; no fresh zero/PASS is claimed.

The frozen six-file source requires independent Native6 source acceptance and drain review, then separately authorized coordinator checks. Auth5 must wait. Backend4, new routes, runtime validation/adoption/mounting/login/native activation remain held. Native history/comparator work is report-only; the metadata one-SQL success is not Auth proof. Other source lanes and the frozen fourth artifact remain disjoint and unchanged by this author.

## Frozen mapper-annotation resolution

Coordinator supplied both Native6 independent terminal SOURCE AXIS ACCEPT/no-findings reviews, physical reviewer's plan approval for this follow-up, and AUTHHTTP-NATIVE6-K4-1 backend/nitro/owners failures confirming TS2339 at mapper lines 1658/1660/1661 with lint zero. The separately frozen/rereviewed K2 line fix resolving TS18048 is also a supplied premise. None of those checks or reviews was repeated here; their old red evidence is preserved.

Applied only the approved `mapNativeAuthSessionSqlResult` parameter annotation in `packages/auth/nitro/production-sessions/sql-persistence.ts`:

```diff
-  mutation: AuthSessionMutation,
+  mutation: Extract<AuthSessionMutation, { kind: "establish" | "renew" | "revoke" }>,
```

This excludes expiry from the existing mapper's input type while preserving its pre-expiry input set. Its body, return type, other parameters, dispatcher, `mutationFor`, runtime behavior, native producers, DTO/cookie/publication logic and schema were not changed. No expiry mapping, renewal widening, cast, `any`, comment, test, dependency, helper or new file was added. The six accepted Native6 sources, all K4/COPY1 work and every other source remain untouched by this follow-up; only this existing handoff was appended.

The exact one-line source delta is frozen for independent rereview and coordinator fresh four checks. No commands/checks/hash helpers/lint/builds/evaluation/native SQL/environment/configuration/data/secret operations or nested agents were run. No fresh zero/PASS is claimed. Auth5, Backend4 and D author remain unreleased until those gates are zero; actual Auth, adoption, file/runtime/native activation remain held.
