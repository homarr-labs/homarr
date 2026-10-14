# SD — mapped promise cache correction frozen

Oracle `ses_ecf1a7ab4ffeo7tmXSY8HW4FgC` approved this mechanical correction.

Only `packages/widgets/src/definition-manifest.ts` changed: added the private, genuinely generic `storeDefinitionPromise<TDefinitions extends object, TKind extends keyof TDefinitions>` mapped-cache setter and replaced the concrete indexed assignment with `storeDefinitionPromise<CanonicalDefinitions, TKind>(definitionPromises, kind, promise)`.

The setter stores the same promise without wrapping it or widening the cache. All 69 per-kind loader types, direct stable cached-promise returns, owner-local caches, captured ready/held resource bindings, matching-rejection eviction and retry, currentness checks, and disposal without borrowed-owner release remain unchanged. No casts, assertions, comments, default readiness, or changes to original registries, definitions, manifests, or public contracts were introduced.

No commands, checks, tests, installs, runtime/native/SQL execution, data/secrets access, or nested agents. Compiler acceptance remains coordinator-owned; this report claims source completion only. Existing coordinator export/target-adoption requirements and activation holds remain unchanged.
