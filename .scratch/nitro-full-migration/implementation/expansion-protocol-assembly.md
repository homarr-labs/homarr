# EXPANSION35: selected native protocol assembly

## P1 security correction: current boundary

This slice is metadata-only preparation. Executable REST and MCP projections are unconditionally `private_unavailable` with `security_unverified`. Concrete independently reviewed authentication, resource, and wire-codec owners are genuinely absent. Metadata eligibility is not authentication evidence, deployment readiness, endpoint availability, or tool publication.

The reviewer identified that the previous admission accepted caller requirement strings, a credential DTO whose user ID matched a caller-produced principal, copied request-resource references, and a `hasSourceBindings` boolean. These mutually consistent caller claims do not independently establish authentication or resource ownership. Codec verification strings likewise do not prove wire/error/secret preservation. The previous ready branch was unsound and has been removed, not replaced by a brand, witness, controller, review flag, or fake authorizer.

The corrected boundary is exact:

- `projectSelectedRest` and `projectSelectedMcp` immediately return `private_unavailable`. They do not read or destructure their options, describe caller selections, inspect bindings, resolve contexts, decode inputs, serialize outputs, format errors, construct Fetch handlers or native clients, or perform native effects.
- `checkProtocolAdmission` always returns the same private hold without examining requirements or bindings. `getProtocolAdmissionHold` never returns a ready result.
- `resolveAdmittedProtocolContext` and the executable result guard have been removed. No replacement context-admission path exists in this slice.
- `listSelectedMcpTools` also unconditionally returns the private hold without reading resources, iterating supplied projections, or invoking caller `listFor` callbacks. No live authenticated/tool-publication claim remains.
- The retained requirement, credential, resource, listing, and codec interfaces are preparatory type shapes only. No supplied string, DTO, boolean, callback implementation, or claimed review state can enable execution.

Real native metadata selections remain unchanged: REST52 method/path pairs and OpenAPI descriptor behavior, MCP133 stable aliases/descriptions and declared visibility/authentication metadata, source identity/membership selection, duplicate metadata checks, actual-schema JSON Schema preparation, and standalone REST path matching. `available` from these metadata-only helpers means only that preparation succeeded; it is never an executable projection. Annotation-only llama.cpp/Wazuh leaves, subscriptions, and unselected auth/secret internals remain excluded.

No authentication/API-key provider, Q16/Q18 selection, registration, route, tRPC tunnel, canonical-map modification, or peer-assembly change was introduced. Re-enabling execution requires a future separately scoped implementation and independent review of real concrete owners, not a value accepted by the retained interfaces.

## Superseded pre-P1 handoff evidence

The original implementation record below is preserved as historical evidence. Its executable/admission behavior was removed by the correction above; those descriptions are not statements of current capability or security guarantees.

## Boundary

`packages/api/src/nitro/protocol-assembly/` is an isolated projection slice. It accepts the existing `BackendContribution<TRouter>` contract and an explicit typed selector into its concrete native router. It does not import or compose Integration/Widget routers, consume peer resource implementations, modify source procedures, or export through the existing canonical index/manifests. It creates no host, route mount, listener, MCP registration, credential resolver, database operation, or network client.

The selection is derived from the unchanged 334-row `sourcePortRows`: 52 selected REST operations and 133 selected MCP leaves. REST method/path pairs are frozen with their source IDs. MCP aliases and descriptions are frozen from the legacy eager `mcp.ts` surface, including the Kubernetes eager wrappers and widget aliases that omit the native `widget.` prefix. Metadata alone does not expand selection. The nine annotation-only llama.cpp/Wazuh leaves, subscriptions, onboarding/session internals, API-key creation, and Kubernetes secret inventory remain excluded. Existing explicitly selected credential-configuration operations are not authority to expose other secret-bearing procedures.

## Native selection and descriptors

`selectNativeProtocolProcedure` retains the exact selected procedure type, schemas, initial/current contexts, and error map. It verifies source identity, contribution membership, physical router path, an eager local contribution, and enabled native input/output validation. It does not traverse a legacy caller or run tRPC execution.

```ts
const selection = selectNativeProtocolProcedure({
  contribution,
  path: "app.getPaginated",
  select: (router) => router.app.getPaginated,
});
```

`describeSelectedRest` verifies the frozen method/path and protected OpenAPI metadata, preserving source summaries, descriptions, tags, and deprecation. It records optional API-key authentication only for `GET /api/boards` and `GET /api/apps/{id}`, matching the selected OpenAPI document overrides; resource visibility stays inside the native procedures.

`describeSelectedMcp` verifies enabled native metadata, any explicit alias, and the exact frozen legacy description. `describeSelectedMcpInput` projects actual Zod object/optional-object or no-input schemas, retains the legacy string-normalization/date-time JSON Schema corrections, compiles the schema without coercion/default insertion, and freezes only the generated schema. Unsupported inputs or conversion failures produce a private hold, not a replacement schema. `checkSelectedProtocolIdentities` rejects duplicate aliases, REST method/path pairs, and repeated source identities.

## Executable projections

`projectSelectedRest` produces an unmounted Fetch operation using the installed oRPC `StandardHandler` and `FetchHandler`. It matches the frozen source method/path, preserves the legacy case-insensitive/trailing-slash path matching and raw path parameters, resolves an admitted request context, decodes wire input, and executes the selected native procedure through the oRPC validation/middleware/output pipeline. Unmatched requests are returned as unmatched; this slice does not implement a catch-all, HEAD warmup, or OPTIONS policy.

`projectSelectedMcp` produces a descriptor, authenticated `listFor`, a native typed `execute`, and a raw-arguments `callArguments` operation. Calls execute the selected native procedure through `createProcedureClient`, with the real request abort signal and source path. Object tools normalize only omitted arguments to `{}`; no-input tools require an empty argument object. Success and sanitized failure use the existing MCP text-content shape. `listSelectedMcpTools` lists only explicitly supplied projections, hides denied/missing request bindings, rejects duplicate aliases, and sorts by stable alias. It never registers tools or implements a Streamable HTTP session.

## Admission and remaining holds

Descriptor eligibility is not publication or endpoint availability. Projection factories return `private_unavailable` when concrete resource/codec bindings are missing, metadata drifts, input schemas are unsupported, or security/wire requirements remain unverified. Binding objects are snapshotted without assuming methods are own properties.

Required bindings resolve an already authenticated request context and verify the actual selected source resources. Request, abort signal, response-effect sink, and disposal registration must be the original request resources. API-key credentials must identify the same authenticated principal; anonymous admission must have an anonymous principal. MCP always requires an API key and hides all `customWidget.*` tools from non-admin callers. A browser session or public-session tunnel is not an accepted credential. Missing per-request source bindings stop execution with a safe unavailable error.

Native middleware retains source authentication, permissions, public-board filtering, demo behavior, integration use/interact/full-access boundaries, confirmation, and secret handling. The transport does not replace these with descriptor-based authorization. Stream/binary admission remains held, and returned nested streams, async iterators, blobs, responses, or binary buffers are rejected before serialization. Native subscriptions are not selected.

Concrete transport owners must supply and review these contracts before claiming `legacyWireContract`, `legacySafeContract`, or `sourceBoundaryPreserved`:

- REST body/content-type/size rules, query arrays and coercion, and path-parameter precedence. Do not mutate native schemas or feed already transformed inputs through native transforms a second time.
- REST raw success serialization/status/headers and the existing safe error envelope, including validation details. Native schema validation errors outside source middleware must also be normalized safely.
- MCP raw argument decoding into the actual schema input type, existing SuperJSON-normalized success text, and custom-widget-aware safe error formatting. Do not substitute raw exception messages or secret-bearing error data.
- Real resource availability, response effects, abort/disposal behavior, authorization, demo behavior, and source result redaction. A typed requirement value is a review obligation, not evidence that the deployed host satisfies it.

These helpers deliberately provide no permissive default codec or mock binding. No operation is made available merely to reach the selected counts. The final transport owner still owns protocol-envelope validation, auth-failure handling/rate limits, key extraction, response effects, request disposal, publication, and end-to-end acceptance.

## Verification status

The MCP integration skill was loaded. Existing dependencies were verified in `packages/api/package.json`; the installed oRPC version is `2.0.0-beta.43`. Current Context7 documentation lookup was attempted but the account quota was exhausted, so API signatures were checked against that installed version's declarations, including procedure clients and Standard/Fetch handler codecs.

No tests, lint/typecheck, build, formatting, installation, live runtime probes, SQL, Git operations, or nested agents were run in this slice. Compilation, lint, metadata parity, codec acceptance, security/error checks, and final runtime validation remain for the coordinated EXPANSION35 validation pass.

## P1 rereview status

The correction is confined to `packages/api/src/nitro/protocol-assembly/` and this handoff, moved by patch from `implementation/expansion-protocol-assembly.md` to this exact scratch path. The original evidence is retained above. No commands, tests, checks, lint/typecheck, build, installation, formatting, runtime/SQL/browser/network/provider/environment/current-data/Git access, or nested agents were used for this correction. Final validation remains deferred; no compilation or runtime acceptance is claimed.
