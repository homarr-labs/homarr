# SQLite construction failure preservation — source-only handoff

**Implemented the sole approved construction-catch change in `packages/core/src/infrastructure/db/drivers/sqlite.ts`. Validation NOT RUN; independent frozen-source review, then coordinator ordinary checks, remain pending.** Authority is the exact implementation A approval from Oracle `ses_ed0c73916ffeoAPMc1qAT9w9Jf` under the named SQLITE-FAILURE-PRESERVATION-AND-HOST-JOIN plan, not a runtime/native execution lease. That control and peer B prospective sources were not read.

The exact file was read wholly before (1–55 EOF) and after (1–59 EOF). Returned lines1–50 and the final function closure are unchanged; only construction catch51–58 differs. These are retained literal source-text observations, not fresh hash/stat pins, filesystem seals or formal FILE/DATA acceptance. Both exact optional-handoff collision checks were absent, the second immediately before its sole creation patch.

## Exact before catch — lines51–54

```ts
  } catch (error) {
    connection.close(true);
    throw error;
  }
```

## Exact after catch — lines51–58

```ts
  } catch (error) {
    try {
      connection.close(true);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "SQLite construction and cleanup failures", { cause: error });
    }
    throw error;
  }
```

Strict `connection.close(true)` is still attempted exactly once. Successful cleanup reaches `throw error`, preserving the identical original thrown value without conversion. Failed cleanup creates a native AggregateError with errors ordered `[original, cleanup]` and original as cause; both values are retained directly, including arbitrary non-Error/undefined/null/object values. No casts, normalization, logging, retry or asynchronous cleanup was introduced. Actual native close behavior was not executed or assumed.

Only this product file and this optional handoff were written. Transaction logic, imports/dependencies/signature and all prior reports remain unchanged. No helpers/comments/tests, commands/compiler/lint/build/install/runtime/SQL/data/env/secrets/native/stat/hash/capture/browser/Git/delegation occurred. Existing dependency declarations were already verified; no new library/API was introduced.

PG cleanup/static-schema/host/principal/durable epoch/adoption/compatible writers/through-COMMIT/native/private-host/restore/publication and91/334 holds remain unchanged. Backend B's public-consumer planner stays disjoint. Self-hosting remains any user server without Cloudflare/tunnel mandate; Darwin tooling remains paused. **Source-only candidate for independent review; no subsequent execution or acquisition authorized.**
