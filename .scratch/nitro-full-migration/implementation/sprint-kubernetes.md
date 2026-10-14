# Kubernetes sprint handoff

## Outcome and freeze

Eleven of eleven conserved leaf bodies are implemented as unmounted native oRPC candidates. Every leaf remains dependency-held for runtime authority/client/lifecycle binding. No leaf was registered, accepted, mounted, or exercised against a cluster. The central accepted 91/334 count is unchanged. This lane is frozen on return.

Exactly these files were written:

- `packages/api/src/nitro/routers/kubernetes.ts`
- `packages/api/src/nitro/routers/-kubernetes/resources.ts`
- `packages/api/src/nitro/routers/-kubernetes/helpers.ts`
- `.scratch/nitro-full-migration/implementation/sprint-kubernetes.md`

## Exact conserved inventory

All eleven leaves are queries using the shared `authenticatedProcedure`/`sourceProcedure` factory and genuine authenticated `BackendContext`. All retain guarded-demo metadata and the `admin` permission. Availability is checked after authentication/permission and before input validation. Owned lease acquisition occurs inside the handler after validation, with client lookup outside the source operation's catch boundary.

| Leaf                                          | Implemented body                                                                                                                                                                                                        | Runtime binding                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `kubernetes.contexts.getContexts`             | Ordered configured-client enumeration; concurrent version and metrics probes per context; `Promise.allSettled` availability/degraded/unavailable and metrics availability/unknown projection; default-context identity. | Held                                     |
| `kubernetes.nodes.getNodes`                   | `listNode` and optional node metrics in parallel; Ready condition, exact CPU/memory parsing, nullable rounded usage, capacity pod count and node metadata.                                                              | Held                                     |
| `kubernetes.cluster.getCluster`               | Version, nodes, all-namespace pods and optional metrics in parallel; capacity/allocatable/usage totals, source percentage rounding, CPU/Memory/Pods stat order, exact provider detection/order and context name.        | Held                                     |
| `kubernetes.cluster.getClusterResourceCounts` | Eight original list requests in original `Promise.all` order; original nodes/namespaces/ingresses/services/pods/secrets/configmaps/volumes result order.                                                                | Held                                     |
| `kubernetes.namespaces.getNamespaces`         | `listNamespace`; unchanged raw phase, unknown-name fallback and creation timestamp.                                                                                                                                     | Held; static namespace type caveat below |
| `kubernetes.ingresses.getIngresses`           | All-namespace ingress inventory; class, host and service/numeric-port projection with exact empty-string/zero fallbacks.                                                                                                | Held                                     |
| `kubernetes.services.getServices`             | All-namespace services; type/IP metadata and exact string interpolation for ports/protocols/target ports, including source undefined behavior.                                                                          | Held                                     |
| `kubernetes.pods.getPods`                     | All-namespace pod inventory; sequential Helm/direct-owner/recursive ReplicaSet workload inference; original image join, unknown phase and metadata defaults.                                                            | Held                                     |
| `kubernetes.secrets.getSecrets`               | All-namespace secrets; only name/namespace/type/timestamp are returned, with original unknown fallbacks.                                                                                                                | Held                                     |
| `kubernetes.configMaps.getConfigMaps`         | All-namespace ConfigMaps; only name/namespace/timestamp, with original unknown fallbacks.                                                                                                                               | Held                                     |
| `kubernetes.volumes.getVolumes`               | All-namespace persistent volume claims, not persistent volumes; original status access modes/storage/spec fields and fallbacks.                                                                                         | Held                                     |

`getContexts` has no input schema. The other ten use the conserved `z.object({ contextId: z.string().min(1) })`, with no trimming/defaulting. No source leaf declares an output validator; none was introduced. There are no conserved selectors, pagination, mutations, action procedures, watch/log subscriptions, subscription buffers, or subscription teardown bodies in this router. Those were not invented.

The three original MCP descriptions/enabled flags are copied to candidate projection metadata for contexts, ingresses and pods. Legacy MCP wrappers/metadata were read-only and were not tunneled or edited.

## Source comparison

Read the root Kubernetes router, all ten subrouter files, `middlewares/kubernetes.ts`, `kubernetes-context.ts`, the actual client/registry/probe/config-loading implementation, CPU/memory parsers, resource percentage helper, definitions and MCP source wrapper. Compared the candidate inventory, input sites, projection defaults, list-call order, catch placement, metadata strings and errors against those sources. Pure source CPU/memory/percentage helpers are reused without editing their implementation or importing ambient infrastructure.

The source context version-probe implementation is ported, including the 5,000 ms race, abort reason `Kubernetes context probe timed out`, request signal middleware and `finally` timer cleanup. Metrics reads use the actual typed `KubernetesClient.getNodeMetricsAsync` domain primitive, not a generic executor/controller. Its concrete binding must preserve the original `metrics.k8s.io` / `v1beta1` / `nodes` request, independent abortable timeout and source failure behavior; it is not claimed as an implemented credential adapter.

ReplicaSet resolution still creates `AppsV1Api` from the actual owned `KubeConfig`, before its read catch; recursion remains sequential, returns ReplicaSet when no parent resolves, logs `Error reading ReplicaSet:` on read failure and returns null. The resource logger must retain the `podsRouter` module association. No cycle guard or inferred behavior fix was added.

All ten source operation error messages are retained in native ORPCError bodies with their causes:

- `An error occurred while fetching Kubernetes nodes`
- `An error occurred while fetching Kubernetes cluster`
- `An error occurred while fetching Kubernetes resources count`
- `An error occurred while fetching Kubernetes namespaces`
- `An error occurred while fetching Kubernetes ingresses`
- `An error occurred while fetching Kubernetes services`
- `An error occurred while fetching Kubernetes pods`
- `An error occurred while fetching Kubernetes secrets`
- `An error occurred while fetching Kubernetes ConfigMaps`
- `An error occurred while fetching Kubernetes Volumes`

The availability failure remains NOT_FOUND / `Kubernetes route is not available`; an absent selected context remains NOT_FOUND / `Kubernetes context '<contextId>' was not found`. Context enumeration has no new source-operation catch/wrapper. Shared permission denial and unauthenticated behavior remain the existing factory's behavior.

## Honest holds and non-equivalences

- There is no production resource instance, host adapter, registration, accepted contribution or permissive substitute. `enabled`, `bindRequest(authenticatedContext)` and ReplicaSet diagnostics are mandatory injected resources. The owned request lease exposes concrete source-typed Core/Networking/Version clients, real `KubeConfig`, the typed metrics primitive, ordered configured-client map, configured default identity and disposal. No fabricated context/principal/credential was created.
- The host must establish the current principal, authoritative ENABLE_KUBERNETES value, credential/config ownership, source registry context isolation and default selection (`currentContext || first configured name`, including original missing-configuration errors), and a request-owned lifetime for clients. Registering `lease.dispose` with `BackendContext.onDispose` is only a candidate lifecycle seam; its runtime cleanup/cancellation behavior is not verified. Source ordinary inventory calls had no watch/log subscription cleanup or added request-cancellation behavior.
- Frozen `nitro/errors.ts` maps every INTERNAL_SERVER_ERROR to `Internal server error`, including the exact source-specific errors retained in these bodies. Consequently exact transport error-message parity cannot be claimed until the coordinator resolves the shared error contract; no out-of-scope repair was attempted.
- Legacy namespace code asserts the API's `string | undefined` phase to `KubernetesNamespaceState` without runtime validation. This candidate returns the exact raw value and honestly infers `string | undefined`, rather than reproducing that unsafe assertion or adding validation/fallback/errors. Runtime projection is conserved; the legacy narrow static output type is not. Coordinator reconciliation is required before claiming full output-type parity.
- Runtime configuration loading, service-account files, registry initialization and metric-client ownership are held, not ported by importing the ambient legacy client at runtime. The legacy client import is type-only. No API/provider/cluster/current-data access occurred.

## Dependency/API verification and deferred checks

Verified API manifest dependencies and installed manifests: `@orpc/server` 2.0.0-beta.43 (explicit API pin), `@kubernetes/client-node` 1.4.0 and `zod` 4.4.3 (matching root catalog pins); `@homarr/definitions` is already an API workspace dependency. Read installed oRPC builder middleware/input/meta/handler declarations, Kubernetes object-parameter API signatures, `KubeConfig.makeApiClient`, metrics types and the existing client package's `rxjsStub.of` declaration. No new dependency or manifest/lock change.

Only source reads/comparison and scoped patches were performed. No lint, typecheck, build, test, format, install, new tests, nested agents, Git operations, credentials/environment access, network/provider calls, listeners, browser/container actions or 3100/3200 changes. Validation and acceptance remain outstanding; this handoff is source evidence, not live parity.
