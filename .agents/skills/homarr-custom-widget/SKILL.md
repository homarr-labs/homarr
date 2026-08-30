---
name: homarr-custom-widget
description: Author safe Homarr Custom JSX v2 widgets from API documentation.
---

# Homarr Custom Widget

Author one widget or a coordinated set of widgets. Start with the compact release-matched entrypoint; load only needed references, components, shared props, or examples. Run lifecycle tools alone; independent context reads may run together. For a set, research once and finish each widget's validation, evidence, and persistence before the next.

1. Read primary API documentation. Use web search when documentation is not supplied or may have changed.
2. Create credential-free definitions with keyed `sources`, `requests`, optional `options`, and safe JSX `template`.
3. While drafting, use `customWidget_validateTemplate` for focused JSX diagnostics without resending the manifest.
4. Send the definition once to `customWidget_previewCreate` and test its queries/actions. For a JSX-only fix, validate, call `customWidget_previewReviseTemplate` with its session, and retest; it inherits the manifest and resets evidence. Create a preview only for source/request/option changes.
5. Configure deployment-specific source URLs and credentials through Homarr; never repeat plaintext.
6. Persist each exact final tested preview with `customWidget_createFromPreview`. Do not resend a large definition through `customWidget_create` when a preview session is available.

Treat a supplied sample or successful preview response as the binding contract. Render every core requested field, guard optional arrays and nested values before indexing, and do not silently drop returned items. Humanize numeric enums with indexed literal label arrays, omit absent numeric values instead of inventing zero, and label timestamp timezones. Give recoverable load errors and empty states a clear refresh or retry path.

Use `{option:name}` or `$option` for saved options. Use `{param:name}` or `$param` for values supplied by `SubFetch`, `ActionButton`, or `ToggleSwitch`. Load queries cannot use invocation parameters. Render load queries from `data` and `status` with `RefreshButton`; reserve `SubFetch` for manual parameterized queries. Templates read `data`, `status`, `options`, and temporary `inputs`.

For a bound control that depends on another input, declare its default and set `resetKey` to that scalar dependency. For example, `<Pagination bind="page" defaultValue={1} resetKey={inputs.search} />` restores page 1 when a search changes without fetching by itself.

`SubFetch` with `trigger="manual"` renders its own load button. Pass a card or image through `triggerContent` with `triggerAriaLabel` when that content should launch the request. Its callback is `(result, meta)`; callback names must not shadow the reserved roots `data`, `status`, `options`, or `inputs`. Never author `onClick` or a fetch callback. Use `Icon` or `TablerIcon` with a `name`; never invent an `IconFoo` component.

Plan capabilities. Use one `customWidget_findComponents` search per job. Batch selected non-obvious binding or interaction documentation with `customWidget_getComponents`; reserve `customWidget_getComponent` for one unknown-prop repair. Failed validation reopens discovery; otherwise search only for a missing capability. The full catalog is for broad exploration; load at most one example. Context never limits composition. Prefer clear hierarchy, responsive grids, divided lists, and aligned actions over nested row cards.

Do not simplify a useful workflow merely because the template is interpreted. Freely compose any supported installed components with multiple sources, requests, options, `choicesFrom`, bound filters, charts, responsive detail areas, manual queries, and safe actions when they improve the user's job. Complexity must remain purposeful rather than decorative.

Polish with a divided list or responsive media grid. Make one metric/action asymmetrically primary; keep headers compact, identity/state clear, metadata quiet, and one badge. At base artwork fills its row and caps above xs; never combine full-width media and nowrap.

Make initial states actionable and wrap variable labels/values on narrow tiles. Do not use an unlabeled decorative icon as an empty state.

Do not use imports, hooks, refs, raw HTML, raw event callbacks, browser requests, arbitrary functions, eval, bigint, npm packages, authored statement blocks, IIFEs, or recursion. Do not pretend MCP tools exist in an offline chat session.

For a community widget, use `customWidget_workshopSearch`, `customWidget_workshopGet`, then `customWidget_workshopInstall`; configure its source securely. Preview configuration expires, so create before persisting configuration.

Reference routing:

- Load `schema` once before a new manifest; otherwise only for concrete request or option ambiguity.
- Load `runtime` for bound inputs, manual queries, actions, or other interaction.
- Load `security` once for any authenticated source or mutation, or to resolve a URL or interpreter limitation.

Repository installations expose these as files under `references/`. MCP clients can call `customWidget_getReference` or read `homarr://custom-widgets/references/{name}` instead of loading every reference.
