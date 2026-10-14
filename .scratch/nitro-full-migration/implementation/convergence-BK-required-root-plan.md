# BK required migration root — read-only Oracle plan

## Decision: APPROVE one-file source amendment

In `packages/api/src/backup-runtime/sqlite.ts:7`, change only:

```diff
-  migrationsFolder?: string;
+  readonly migrationsFolder: string;
```

This aligns the API input with the required string in `packages/db/copied-sqlite.ts:53` and addresses the source-level cause of the two supplied TS2322 diagnostics at `backup-runtime/sqlite.ts:15` and `backup-runtime/nitro-join/service.ts:88`. Compiler acceptance is not claimed; no source amendment was performed by this review.

## Exact forwarding and capture

- `sqlite.ts:12–17` constructs one genuine copy engine, forwarding the caller's folder once through a fresh object literal. Keep the factory unchanged.
- `nitro-join/contracts.ts:32` extends `Omit<SqliteBackupConfiguration, "authorizeAsync">`; the required readonly field propagates without editing that interface.
- `nitro-join/service.ts:86–90` constructs one genuine copy engine and forwards the folder once. Later operations use that retained engine, not `config.migrationsFolder`. Keep service forwarding and request-bound authorization unchanged.
- The read-only copy-owner inspection found constructor validation at `copied-sqlite.ts:54–55`, primitive capture at `:56–57`, and initial bundle acquisition at `:58`. Later bundle/prefix/target checks and migration reference the captured local folder (`:81`, `:91`, `:96`, `:280`), not the input configuration. No deferred caller getter or later reassignment of the captured folder was found. No additional capture fields in `sqlite.ts` or `service.ts` are needed. This is source inspection, not independent acceptance of authentication or physical-history behavior.

Do not duplicate the copy owner's parser, pins, validation or authentication; do not introduce a fallback, environment lookup, source-relative default, fabricated folder, cast or framework.

## Genuine caller search

Repository code searches for both API factories/configuration types and the copy factory found the two production engine forwarders above. No external production invocation of `createNitroBackupService` or `createSqliteBackupDependencies`, and no new omitted-root producer, surfaced in searchable repository code; `apps/` had no matches. Public barrels only re-export these symbols.

All three existing API test call sites already supply `migrationsFolder`: `restore.test.ts:117–122`, `:444–449`, and `:571–576`. The five direct copy-engine test calls in `packages/db/runtime.spec.ts` also explicitly supply folders. Leave all tests unchanged. Providing a string is not proof of a valid packaged root: neither the oldTarget/custom old-migrations fixture nor source-folder fixtures are declared compatible with the new closed catalog.

The separate closed packaged-root/configuration producer remains required before activation. K's frozen handoff records that source migration folders contain nonasset entrypoints and that shortened fixture roots are not current-target acceptance evidence. Do not repair packaging, API joins or manifests in this amendment.

## Validation and held boundaries

After the allocated writer freezes the one-field amendment, the coordinator must run lint and typecheck with at least the same existing owner roots that produced the supplied diagnostics, without pruning roots, assertions, suppressions or optionalizing required producers. Any newly exposed missing caller must be reported to its owner, not given a default. This review ran no commands, checks, tests, module evaluation, native or SQL execution.

Only this new report was written. AW5's mutating Backend contracts/auth/main were not read. K physical-history review remains WITHHELD; this approval is solely for the required-root type amendment, not copy correctness, native behavior, preservation or activation. Broad restore, supervision, sanitization and real-data authorization remain held.
