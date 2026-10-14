# Widget edit-state boundary

Read-only explorer `ses_ed0adbab5ffeANGub5swaKTcEQ` identified a genuine reverse dependency: widget definition/options and bookmarks group inputs reach `_inputs/form.ts`, which imports its state type from `modals/widget-edit-modal.tsx`; that implementation imports the whole input registry and embedded app editor. Exact registries also retain all original definition/component loaders, so native renderer injection does not remove their legacy type graph.

## Exclusive source-only move, pending oracle approval

- New `packages/widgets/src/edit-state.ts`: move the exact three-field `WidgetEditModalState` interface, with its existing `BoardItemAdvancedOptions` dependency from the declared/public `@homarr/validation/shared`.
- `packages/widgets/src/_inputs/form.ts`: import that genuine contract from the new dependency-light owner.
- `packages/widgets/src/modals/widget-edit-modal.tsx`: import and re-export the same contract for existing consumers; remove only its moved declaration.

Preserve the contract byte-for-byte in meaning, field names/requiredness, option inference, actual form context, refs, all runtime bodies, loader paths, exports already consumed, CSS and UI. No new dependency, duplicate DTO, any/cast, optional resource/owner prop, source-root exclusion, Vite/TypeScript alias, fake module, registry pruning or legacy caller repair. No tests/comments. Verify declared dependency before editing; use patch and freeze exact three files.

This resolves one real reverse source dependency; it is not a claim that retained components/option hooks or tRPC-specific WidgetDefinition error types are native. The eight legacy/resource diagnostics and three missing genuine group-host diagnostics must stay visible until their actual producer/adoption work is done. No expected diagnostic count or successful compile is promised.

Independent source review precedes separately released ordinary focused lint and existing backend/Nitro typechecks with complete fresh statuses. No build/install/application/SQL/native/capture/reader or protected owner acquisition follows. Integration outcome work and Darwin contract preparation are disjoint scopes, separately reviewed.

Oracle `ses_ed09c129dffeHg6deVCInE1S6R` approved exact three-file type-only move; source writer `ses_ed09b5259ffe8HflHsOmyDs61K` now dispatched under that exclusive allocation. Type fields/dependency verified, no transport/adoption acceptance.
