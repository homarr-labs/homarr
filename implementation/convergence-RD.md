# RD — Docker canonical definition extraction

Frozen source scope: new `packages/widgets/src/docker/definition.ts`, original `packages/widgets/src/docker/index.ts`, and this report only.

The canonical leaf exports required `DefinitionResources`, `DockerEndpointObservation`, native `DockerContainerColumn`, and `createDefinition(resources)`. Endpoint data derives from the actual `createDockerProcedures` required `getDockerEndpointsAsync` producer; container keys derive from that same factory's required inventory handler output. Existing declared API, Definitions, Tabler and Zod dependencies suffice. No legacy client, `RouterOutputs`, component import, default resources or fabricated observation exists in the leaf.

The raw result preserves literal `dockerContainers` with `satisfies WidgetDefinition & { kind: "dockerContainers" }`, inferred options, all eleven option defaults, endpoint limit/description, exact ordered column and sort keys, translations, hidden layout fields, focus/query/refetch metadata and internal-server-error behavior. Missing endpoint data still maps to an empty list while the real pending/error flags remain intact.

The original index supplies the genuine unchanged no-argument legacy endpoint query through `useEndpoints`, preserving exported `definition`/`componentLoader` and original `withDynamicImport(() => import("./component"))`.

Remaining required dependencies: native target adapters must supply the real admitted endpoint observation owner; exhaustive canonical registry/type adoption and target resource binding belong to their allocated owners. The shared definition type still reaches the original registry until that adoption. This source extraction does not mount native resources or release Widget0/9, compiler, runtime or procedure acceptance. No checks, tests, builds, services, provider calls or data access were run; coordinator owns focused lint/types after writers freeze.
