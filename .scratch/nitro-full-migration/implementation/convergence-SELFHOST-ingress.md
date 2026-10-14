# SELFHOST Batch A — frozen startup and ingress source

## Outcome and allocation

Frozen source implementation for coordinator checks and Oracle `ses_ece32b93effedhwzCMim6TCcW2`, not runtime acceptance. The approved frozen SELFHOST plan and all 132 lines of `convergence-SELFHOST-ingress-evidence.md` were read. The plan's no-findings review is supplied authorization context, not an independent review of this implementation.

Only these leased paths were changed:

- `apps/backend/src/server/startup-configuration.ts`
- `apps/backend/server/entry.ts`
- New `apps/backend/src/server/public-origin-ingress.ts`
- This new implementation record

Batch B, its fixtures, coordinator checks, QA controls, manifests, build configuration, auth, DB/core drivers, public routes and other contracts remain untouched by this writer. No dependencies, tests, code comments, casts, profiles, version framework, environment adapter or new owner were added.

## Captured startup boundary

The existing strict version-1 parser retains the single explicit absolute JSON argument, immutable capture and authentication-origin equality. Public origin is now independent of the listener. Public HTTP(S) must exactly equal URL canonical origin spelling; credentials, query, fragment, paths and wildcard/unspecified public destinations are rejected. Required basePath remains the literal empty string.

The bind host admits `localhost` or a valid native unbracketed IPv4/IPv6 literal through built-in `node:net` `isIP`, including wildcard bind addresses. The explicit integer port range is 1–65535. Product parsing no longer excludes QA-reserved ports; no QA assertion was edited. The native listener remains explicitly HTTP-only, without an alternate bind or fallback.

SQLite mode must explicitly select fresh or existing. Fresh rejects every present DB path; existing rejects an absent, symlink, nonregular, multiply linked, noncanonical or unprotected DB target. Migration root remains explicitly required, captured and already present. The native no-create driver, exclusive fresh creation, fresh-only initialization, existing ledger checks and credential-adoption hold are unchanged; this syntax is not permission to open real data.

Config parent, DB parent and migration root checks walk every physical ancestor through the filesystem root. Each must be canonical, a real directory, owned by the service UID or root, and not group/world writable. Protected 0755/0750 layouts are no longer rejected merely for not being 0700. No supplementary-group ownership/access assumption, chmod, chown or directory creation was introduced.

The configuration file must be process-owned, exactly 0600, single-link and regular; UID 0 is admitted only when it is the process UID. A no-follow/nonblocking descriptor read is bounded to 1 MiB plus one overflow byte. Path/descriptor identity, size and modification/change timestamps are checked before and after reading, with regular-file/private-mode checks on both identities. Failure retains the existing explicit close/aggregate-error handling.

The collision guard uses physical canonical roots: config cannot occupy the loaded module's source directory, the DB filename or its journal/WAL/SHM names, or migration assets. The DB/sidecar parent cannot contain migration assets or overlap the loaded source directory in either direction. Protected sibling roots and a distinct private config filename within the DB parent are not rejected just for sharing a parent. The source guard is the loaded module directory, not a claim to scan or protect every unrelated checkout/deployment source tree.

## Original native request ingress

The local factory captures immutable public-origin, public-authority, public-protocol and expected plain-HTTP native-origin strings once. It returns the original request or typed `null`; it does not invoke Nitro.

Before any request mutation, admission rejects any existing `_url` property and missing/empty Host, commas, controls including DEL, whitespace, or any Host not exactly the captured canonical authority. Host is not trimmed, lowercased or recovered from URL/forwarding metadata. Duplicate-Host comma observability is supported by the pinned Bun source evidence, not measured on the wire.

The original native URL must parse, contain no userinfo or fragment, and have the expected plain-HTTP origin calculated from validated Host under HTTP default-port semantics. Unexpected HTTPS native input is rejected even for captured public HTTPS: the sole listener is plain HTTP. This avoids comparing an HTTP-native port normalization to HTTPS default-port normalization.

All `Forwarded` and case-insensitive `x-forwarded-*` names are collected before any header deletion, so deleting through a live iterator cannot skip adjacent names. Other headers, including Origin, Sec-Fetch-Site, Cookie, Authorization and content headers, are left untouched.

Matching direct public HTTP keeps the original URL unchanged. Captured public HTTPS overrides only the original request's `url` using the pinned srvx descriptor pattern: configurable and enumerable, with captured origin plus parsed pathname plus search concatenated explicitly. Leading-double-slash paths cannot resolve against another authority. Descriptor failure or an ineffective URL view denies admission before Nitro; `_url` is never deleted or rewritten.

The same native Request reaches the existing `nitro.fetch`, including Nitro static dispatch. There is no clone, proxy, buffering, body read, stream tee, synthetic runtime/context, IP rewrite or new request/native owner. Body-use state, signal, runtime, context, waitUntil and transport-derived IP remain on their original object. The entry returns a small 400 only for ingress denial; Nitro dispatch is outside the helper's catch, so Nitro failures are not converted to ingress 400s. Existing closing 503, single listener, `trustProxy:false`, `reusePort:false`, manual startup and shutdown/close semantics are retained.

## Evidence and validation limits

The nearest backend manifest was read before library code: Nitro `3.0.260903-beta`, srvx `1.0.5` and existing Zod are declared. Installed srvx `1.0.5` and its Bun adapter/original-object descriptor source were read. Bun `1.4.2` and Nitro's nested H3 `2.0.2` provenance, official documentation and request/static call chain come from the pinned evidence record. No bare H3 or new library is imported.

Only source/manifest/instruction/report reads and the leased file patches were performed. No shell commands, lint, typecheck, tests, builds, application imports, listener execution, native SQL, configuration/environment/data/secret reads or nested agents were performed. Required lint/type validation and the four coordinator-owned checks remain for the coordinator after this freeze; no successful check is claimed here.

Raw-wire Host fidelity, proxy normalization/TLS/exposure policy, absolute-form original-target authority, actual generated-artifact dispatch, descriptor/native URL behavior, later auth Request conversions, upload/response streaming and cancellation, runtime/context/waitUntil/IP fidelity and lifecycle/readiness remain unmeasured. A Fetch guard cannot recover duplicate Host or original target authority lost upstream. The user's proxy must preserve the exact public Host and root path, and reject ambiguous wire authority before losing evidence.

All independent native opened-identity/fresh-resource provenance, K/D, auth credential adoption/Auth HTTP acceptance, private SSR, restore/cutover and production holds remain unchanged. No ordinary-host listener run, native adoption, auth acceptance or production PASS is asserted. The accepted third-artifact/static-owner/Linux-header/142-asset evidence and accepted-but-not-rebuilt CLI correction are not promoted into proof of this new ingress.

## Appended P2 ROOT amendment — frozen for handoff

The coordinator supplied approval from Oracle `ses_ece32b93effedhwzCMim6TCcW2` for exactly two product files, `startup-configuration.ts` and `server/entry.ts`, plus this appended record. Earlier source findings and validation limits above are retained as history. The earlier loaded-module-directory guard was insufficient to cover the complete packaged artifact; this amendment replaces it rather than treating the original scope as adequate.

The owning entry now calls the internal initializer `initializeStartupConfiguration(import.meta.url)`. It publishes and retains the sole configuration promise synchronously, before the deferred entry validation or any await. Later initializer calls join that same promise, including after rejection; no root setter, retry or replacement promise is introduced. The unchanged no-argument loader only joins the initialized promise. Before initialization it explicitly rejects, without calling the raw reader or guessing a root. The bounded retained caller in `host.ts` is unchanged.

The initializer derives the artifact root solely from its owning entry's canonical file URL. It requires a physical canonical regular single-link `index.mjs` directly inside a directory named `server`, then validates that directory's parent and the exact packaged sibling directories `server`, `public`, `db`, `cli` and `scripts` through the existing protected physical-ancestor predicate. Config reading cannot begin until this structural capture succeeds. No chunk ascent, current directory, environment, command-line main path, config-selected root, source-entry fallback or new mode supplies authority.

The layout basis was read from `scripts/build-nitro-candidate.sh:24–37,56–80`: the build requires `artifact/server/index.mjs` and `artifact/public`, creates the `db`, `scripts` and `cli` siblings, and packages their assets/runners. The coordinator's accepted third-artifact evidence is historical context, not a new artifact inspection by this writer. A future generated-output inspection must still verify that the explicit owning entry's `import.meta.url` identifies `server/index.mjs`, not a relocated loader chunk; no successful compiled-location check is claimed by this amendment.

Private config must now be outside the entire captured artifact root before its read. The captured DB/sidecar parent must be disjoint from that root in both directions, protecting all artifact descendants rather than only the loader directory, including `_libs`, `_ssr`, `_chunks`, `node_modules`, public assets, CLI and scripts. Existing config/DB/sidecar/migration collision checks remain. Read-only migration assets at `artifact/db/migrations/sqlite` remain legal: the migration folder is not rejected merely because it is inside the artifact. It still must be explicit, present, physical and protected, and outside the writable DB/sidecar parent.

The portable public parser, protected ancestors, private 0600 bounded config read, explicit SQLite fresh/existing selection, no-create driver and all data/adoption holds are unchanged. The accepted ingress helper was not edited. Entry request dispatch, listener options, startup/shutdown and close behavior are unchanged apart from the initializer import and call. No QA controls, fixtures, coordinator checks, manifests or other source files were edited by this amendment.

Only the relevant source, manifest and build-script text was read and the two leased source files plus this append were patched. No commands, lint/type checks, tests, builds, imports, evaluation, structural filesystem probes, real config/environment/data/secret reads, SQL, native operations or nested agents were performed. The structural filesystem checks described here are code for future normal startup, not checks executed in this session. Coordinator-supplied prior Batch A typecheck/four-check EXIT-0 results remain pre-fix history, not validation of this amendment; required lint/type and coordinator checks remain pending after this freeze.

Frozen ROOT-fix handoff for coordinator validation and Oracle review only. No source/runtime PASS, ordinary-host acceptance, native/auth adoption or actual restore/cutover authorization is asserted. Raw-wire/proxy/descriptor/live-runtime fidelity and all prior independent holds remain unchanged.
