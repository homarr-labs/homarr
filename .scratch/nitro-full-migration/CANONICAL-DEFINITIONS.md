# Approved canonical Widget extraction ownership

Oracle ses_ecf591918ffefCOw80BnBPOGHp approved exhaustive69kind extraction with resource ownership and unchanged original indexes/loaders. Read WRITER-RULES.md and convergence-LC.md. No subset registry, compiler alias, component import in canonical leaves or legacy caller repair. The original registry remains untouched.

## Frozen leaf convention

Ordinary NEW <module>/definition.ts exports `definition`: the exact original config plus literal `kind`, checked with `satisfies WidgetDefinition & {kind: <exact literal>}` rather than widened annotation. Preserve exact contextual createOptions parameters/inference/defaults/metadata/query matchers/actions/error behavior. Index imports the canonical raw definition and passes it to existing createWidgetDefinition(kind, definition).withDynamicImport(original component loader); preserve its exported definition/componentLoader and every other original export. No shared createWidgetDefinition API change is needed. Canonical definition has the same final kind/config shape as the original exported definition but no component acquisition.

Resource leaves export `DefinitionResources` and `createDefinition(resources)` returning that same raw exact-kind config. Required observation hooks derive data from genuine native factory outputs, preserve all existing arguments/pending/error behavior, and acquire nothing in the leaf itself. Original index supplies its original real legacy observation wrappers and keeps the original component loader; native target adapters supply real native observations later. Never a default resources/empty successful list/no-op view. Source default reductions and resource caches belong to supplied owner, not global kind-only cache.

## Ordinary groups — each owns only NEW definition.ts and existing index.ts

| Group | Literal module paths                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1    | clock, air-quality, countdown, timer, app, assistant, archive-team-warrior, anchor-note                                                                              |
| E2    | notebook, iframe, video, dns-hole/summary, dns-hole/controls, smart-home/entity-state, smart-home/execute-automation, stocks, media-server, calendar                 |
| E3    | downloads, media-requests/list, media-requests/stats, media-missing, network-controller/summary, network-controller/network-status, rssFeed, bazarr, indexer-manager |
| E4    | media-transcoding, minecraft/server-status, releases, firewall, notifications, media-releases, system-resources, coolify                                             |
| E5    | immich/server-stats, stats, paperless-ngx, patchmon, tracearr, speedtest-tracker, uptime-kuma                                                                        |
| E6    | audio-stats, umami, vpn, ups, beszel-system-table, beszel-system-grid, beszel-alerts, traefik, custom-api                                                            |
| E7    | weather, wud, llama-cpp, wazuh-agents, wazuh-alerts, wazuh-summary                                                                                                   |
| E8    | wazuh-timeline, wazuh-top-list, wazuh-vulnerabilities, wazuh-fim, wazuh-auth-failures                                                                                |

Stock immediateLC fiveleaf tranche now complete/frozen before E2 allocation. Weather format.ts remains outside E7 ownership. Extra actual required helper dependency is reported, not swept into ownership; source-preserving reexports/helper moves within owned pair are fine.

## Required-resource groups

- RD Docker: docker/definition.ts + index.ts. Required native endpoint hook and container column type. Preserve complete options.
- RT Timetable: timetable/definition.ts + index.ts. Required station search(query, baseUrl, item/board identity), source pending/error translations.
- RI Immich: immich/album-carousel/definition.ts + index.ts. Required albums hook, first integration/enabled/15min stale/allphotos semantics.
- RB Beszel: beszel-system-stats/definition.ts + index.ts. Required systems hook/querymatching; period typing without component import.
- RS Storage: health-monitoring/definition.ts + index.ts; system-disks/definition.ts + index.ts; storage-volume-options.ts. Required ordered per-integration observations, scopedvalues/dedup/somepending/everyerror-and-no-options.
- RK Bookmarks: bookmarks/definition.tsx + index.tsx + add-button.tsx + new non-acquiring selection-type/AddButton-view leaves. Required byIds/selectable observations, real AddButton/ItemComponent, preserve URL/group/migration/presentation. Original add-button remains real legacy wrapper; canonical definition/native paths cannot import that acquiring wrapper.

Shared assembly later owns ONLY NEW definition-registry.ts/definition-manifest.ts + existing definition.ts. All69mapping must match current literal registry. Infer options from raw definitions or resource-factory returns, never original indexes/withDynamicImport/WidgetImports/widenedrecord. Target adoption later owns widgets-runtime host/index + NEW definition-resources.tsx; W has exclusive widgets-editor/contracts.ts and adopts frozen canonical type there, never concurrent LC edit.

No component body/CSS/library/dependency/schema/runtime/route/manifest/lock edits by extractors. All resource-dependent target definitions remain unmounted until genuine required owners exist; extraction does not release Widget0/9 or compiler/runtime acceptance.
