# Evening I — thin Icon read resource adapter

Frozen source return for independent review. Sole product addition: `packages/api/src/nitro/routers/-icons/native-read-resources.ts`. Both this new handoff and the product path were checked absent initially and immediately before the patch. No existing product/report/manifest/assembly file changed.

`createIconProcedureResources` requires:

- `source: ReturnType<typeof createIconNativeReadSource>` from public `@homarr/icons/native-read`.
- `captureOperation(context: BackendContext): BoundedTransactionOperation`.
- `assertCurrent(context: BackendContext): void`.

It returns the existing `IconProcedureResources` contract. Execution order is currentness before operation capture; existing source invocation; currentness inside its callback before immediately invoking the domain reader; currentness after awaiting that reader; then currentness after awaiting the source's genuine settlement before publishing its result. No await is inserted before the domain reader captures its pending SQL group. All errors reject naturally; there is no catch, fallback result, retry or synthetic settlement.

All package imports are type-only. Current API manifest already declares Icons and DB; Icons already exports `./native-read`, DB already exports `./runtime`. No dependency, export, lock or constructor change is required by this local adapter addition. The supplied existing source, not this adapter, owns limits, native execution and read draining.

H/A/R must later supply the actual main-owned source and enrolled request operation/currentness functions. This adapter invents no clock, deadline, lifetime, authority, operation lease or release mechanism. It neither constructs nor closes the source and enrolls no route or runtime. App write authority, fetch/sync/upload, catalog changes and production readiness are outside this scope; 91/334 is unchanged.

No commands, lint/typecheck/compiler/build/install/tests, application/native/SQL execution, data/env/secret access, Git, children, Context7 or peer-source edits occurred. Source-only inspection is not a validation pass or independent acceptance.
