# Proxy error callback typeflow plan

Status: read-only investigation; product source remains frozen. A future author requires independent review before applying this proposal.

## Exact one-file delta

Only `packages/core/src/infrastructure/http/proxy-connector.ts:287`:

```diff
-          target.once("error", (failure) => finish(failure, target));
+          target.once("error", (failure: Error) => finish(failure, target));
```

Use the existing global `Error`; no import is needed. Do not use `unknown` or add a conversion: the installed native socket error contract supports `Error`, and `finish` already accepts `Error | null` at line 148.

## Installed declaration evidence

- `node_modules/@types/node/tls.d.ts:1277-1279` re-exports `tls` through `node:tls`; line 1124 declares `connect(ConnectionOptions, ...)` returning `TLSSocket`, and line 214 declares `TLSSocket extends net.Socket`.
- `node_modules/@types/node/net.d.ts:457` explicitly declares `once(event: "error", listener: (err: Error) => void): this`; line 422 also declares `emit(event: "error", err: Error): boolean`. These support the native error payload annotation.
- `TLSSocket` declares its own `once` overloads at `tls.d.ts:499-504`: a broad string-event listener followed by TLS-specific events, but no explicit `"error"` overload. Thus its surface does not itself provide the narrower error callback context available on `net.Socket`.
- `tooling/typescript/base.json:22` includes genuine `node` and `bun` types. `node_modules/@types/bun/index.d.ts:1` references `bun-types`; `bun-types/index.d.ts:19` loads `overrides.d.ts`. That file augments `node:tls` at lines 315-361, adding `connect(BunConnectionOptions, ...) => TLSSocket` at line 360; it does not add or replace a socket `once` declaration. Do not describe this as a Bun error-event override.
- The declarations expose an additional connect overload and a broad TLS listener surface, explaining why relying on contextual error inference is fragile. The reported TS7006 after Bun inclusion is supplied diagnostic evidence, not reproduced here; the precise compiler overload-resolution cause is not established by declaration inspection alone.
- `packages/core/package.json` already declares `undici` and `@types/bun` version `1.3.10`; no dependency change is required.

## Preservation and scope

The sole addition is the erased `: Error` parameter annotation. Keep the callback body `finish(failure, target)` unchanged, forwarding the original native error object without wrapping or replacing it. Preserve every JavaScript body, physical socket identity and ownership, client destruction/drain joining, quarantine behavior, and listener registration order and cardinality.

No casts, `any`, guards, rewrites, tests, comments, dependency/configuration changes, or ambient overrides. No other product file is in scope.

## Future validation gate

After independent review and separately authorized implementation, require a fresh, uncached `@homarr/core` typecheck with the shared genuine Bun types still enabled, plus focused lint of this file through the existing core scripts (`typecheck`: `tsc --noEmit`; `lint`: `oxlint`). Confirm TS7006 is absent and report any unrelated diagnostics separately; do not broaden the patch to clear them. Review the source delta to ensure only this annotation changed.

No commands, compiler checks, lint, tests, network access, or runtime execution were performed in this investigation. Only this new report was written.
