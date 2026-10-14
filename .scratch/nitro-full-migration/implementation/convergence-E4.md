# E4 — frozen canonical definition extraction

Added `definition.ts` and amended only `index.ts` under these exact `packages/widgets/src/` paths:

- `media-transcoding`
- `minecraft/server-status`
- `releases`
- `firewall`
- `notifications`
- `media-releases`
- `system-resources`
- `coolify`

Each leaf exports the raw original configuration with its exact literal `kind`, checked using `satisfies WidgetDefinition & { kind: <literal> }`. Options/defaults/validation, integration metadata, query matchers, polling, focus support and error messages are retained. Every index still exports its original definition and component loader with the original `./component` dynamic import. The additional `media-transcoding` `views` export and `system-resources` `LabelDisplayModeOption` export remain intact.

The existing system-resource chart-label helper moved into its canonical leaf; its `never` assertion was replaced with the precise memory/network translation-key parameter without changing label behavior. The existing component-free `media-transcoding/views.ts` remains unchanged and reused. No additional helper extraction or resource owner is needed for E4.

Remaining dependency: shared `definition.ts`/registry/manifest adoption belongs to the allocated shared owner; this extraction alone does not sever their existing registry type edge or mount a native runtime. No shared source, components, helpers, manifests, dependencies or excluded resource-owner modules were edited.

No commands, lint, type checks, tests, builds or runtime/procedure verification were performed. Source is frozen for coordinator validation; no compiler/runtime/procedure acceptance is claimed.
