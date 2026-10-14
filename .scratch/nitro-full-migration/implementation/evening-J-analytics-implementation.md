# Evening J — Analytics error-status correction

Frozen source candidate for independent review. The sole product delta is inside the analytics job's `executeAsync` body in `packages/cron-jobs/src/runtime.ts`:

```diff
       executeAsync: async ({ signal }) => {
         if (resources.analytics.noExternalConnection()) return;
-        await analytics.sendServerAnalyticsAsync(signal);
+        const result = await analytics.sendServerAnalyticsAsync(signal);
+        if (result === "failed") throw new Error("Analytics job failed");
       },
```

The actual AnalyticsResult `failed` now rejects the job callback. Existing core execution catches/logs that error and attempts `finishAsync(name, runId, "error")` when it acquired a run ID; it no longer reaches the success finish through a resolved `failed` result. Persistence of that status still depends on the real backing succeeding. The generic error intentionally does not assert that delivery failed: `failed` can also follow acknowledged delivery and failed settings reconciliation. No original cause is fabricated from the result string.

`sent`, `disabled` and `skipped` remain normal resolved callback outcomes; the existing external-connection opt-out still returns before service invocation. Existing core cancellation handling is unchanged. Sender/delivery, result policies, settings updates, scheduling/defaults, other jobs and exported manual Analytics methods are unchanged. Core still catches execution errors, so resolved trigger/start calls do not become successful-effect receipts or newly propagated execution failures. No retry, replay, retention framework or composition skeleton was added.

Only the exact body was patched; other writers' files were not changed. No comments, casts, dependencies or tests were added. No commands, lint/typechecks/tests/build/install, runtime/native/SQL/provider/network/data/environment/secret access, Git or child agents. Source inspection and patch only; executable verification remains deferred until shared inputs freeze. No production approval or 91/334 coverage increment.
