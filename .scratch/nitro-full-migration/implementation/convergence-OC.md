# OC frozen onboarding next-step CAS

Scope: `packages/api/src/nitro/routers/-onboard-transitions/helpers.ts` only, plus this new report. Applied the Oracle-approved source repair from `convergence-MR.md:75–103` and `CONVERGENCE-NEXT.md:37`.

Both next-step SQL bodies now use the existing `resources.operators.eq` to restrict updates to `onboarding.step === candidate.previousStep`. SQLite requires `result.changes === 1`; PostgreSQL requires `(result.rowCount ?? 0) === 1`. Otherwise each throws `new ORPCError("CONFLICT")`. This follows the existing complete-setup conditional-update/result-count pattern without imports or interface changes.

The no-op candidate branch, preparation, existing errors, complete-setup bodies and all other logic remain unchanged. No handlers were enabled and no tests were added. No commands, lint, typecheck, tests, build, runtime or SQL execution were performed; coordinator validation and independent review remain pending.

Activation remains held pending AH claim issuer/account/group authority, DP native domain transaction resources, transaction-time admin-or-valid-claim/no-users/current-step admission (including no-op), candidate-read revalidation, authority through COMMIT and genuine typed client mounting. This repair does not establish those prerequisites or compiler/runtime/procedure acceptance.

## Exact source diff

```diff
@@
 ) {
   if (candidate.kind === "no-op") return;
-  transaction
+  const result = transaction
     .update(resources.schema.onboarding)
     .set({ previousStep: candidate.previousStep, step: candidate.step })
+    .where(resources.operators.eq(resources.schema.onboarding.step, candidate.previousStep))
     .run();
+  if (result.changes !== 1) throw new ORPCError("CONFLICT");
 }
@@
 ) {
   if (candidate.kind === "no-op") return;
-  await transaction
+  const result = await transaction
     .update(resources.schema.onboarding)
-    .set({ previousStep: candidate.previousStep, step: candidate.step });
+    .set({ previousStep: candidate.previousStep, step: candidate.step })
+    .where(resources.operators.eq(resources.schema.onboarding.step, candidate.previousStep));
+  if ((result.rowCount ?? 0) !== 1) throw new ORPCError("CONFLICT");
 }
```
