# AUTHHTTP — frozen caller prerequisite

Both Auth plan reviewers' terminal approval was supplied by the coordinator. This lease changes only the return annotation of `mutationFor` in `packages/auth/nitro/production-sessions/sql-persistence.ts`:

```diff
-): Exclude<AuthSessionMutation, { kind: "revoke" }> | null {
+): Extract<AuthSessionMutation, { kind: "establish" | "renew" }> | null {
```

The function body, runtime behavior, parameters, API, values and dispatch are unchanged. No renewal widening or expiry implementation was added. No other product source or prior handoff was edited; this new handoff is the only additional file.

Source is frozen for independent review and coordinator fresh typecheck/lint zero. The exact Native6 author must wait for those gates; this handoff does not authorize implementation. No commands, checks, builds, tests, evaluation, native SQL, configuration/environment/data/secret operations or nested agents were run. No comments, casts, tests, dependencies or helpers were added. Nearest instructions and `packages/auth/package.json` were inspected; the existing internal types require no dependency change. Old check evidence remains preserved, with no fresh PASS claimed.

All other product source remains frozen. Native history/comparator work remains report-only. Auth5, Backend4, new routes and runtime adoption remain held. The fourth artifact is unchanged, and the metadata one-SQL native success is not Auth proof.
