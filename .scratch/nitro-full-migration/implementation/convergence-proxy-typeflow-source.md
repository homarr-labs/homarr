# Proxy typeflow source release

Applied the approved annotation-only change in `packages/core/src/infrastructure/http/proxy-connector.ts:287`:

```diff
-          target.once("error", (failure) => finish(failure, target));
+          target.once("error", (failure: Error) => finish(failure, target));
```

Evidence directory: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-proxy-typeflow-source-0e189fc8dd4b108e40a74fdf`.

Records: `records.proxy-connector.before`, `records.proxy-connector.after`, `records.proxy-connector.diff`, and `source.json`. The before record was captured separately before the mandatory product patch. Two bounded Python stdlib file-I/O calls used `-I -S -B`, exclusive creation without overwrite, directory mode `0700`, and record modes `0600`. The after capture confirmed that the sole source-byte delta is insertion of `: Error`; `source.json` records both SHA-256 values and byte lengths.

All JavaScript bodies, callback forwarding, socket ownership, client drain, quarantine, and event registration remain unchanged. No other product source was read or written during this release; existing unrelated changes were not discarded. No comments, casts, defaults, guards, dependencies, tests, ambient overrides, or suppressions were added.

This author is frozen: no further product edits. No compiler, lint, tests, app runtime, Engine, SQL, network, private configuration/environment reads, or process inventory were performed. The coordinator owns fresh full core typechecking and focused lint after all product authors freeze; auth schema, invite editor, and lifecycle work remain separate ownership.

These records establish only the exact source delta, not compiler or runtime closure. Historical artifacts and pins remain untouched; type erasure does not associate a current compiler closure with a historical app child.
