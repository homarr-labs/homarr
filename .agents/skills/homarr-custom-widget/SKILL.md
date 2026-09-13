---
name: homarr-custom-widget
description: Author, validate, preview, install, or configure Homarr Custom JSX v2/v3 widgets, including static and native integration widgets.
---

# Homarr Custom Widget

Load release-matched context. Run lifecycle tools alone; independent reads may run together. For a set, research once, then validate, preview, and persist each widget before the next.

1. For HTTP widgets, read primary API documentation. For native capabilities, discover installed schemas. Static widgets need no service.
2. Create credential-free definitions with keyed `sources`, `requests`, optional `options`, and safe JSX `template`.
3. While drafting, use `customWidget_validateTemplate` for focused JSX diagnostics without resending the manifest.
4. Send the definition once to `customWidget_previewCreate` and test its HTTP/native queries and simulated actions. For a JSX-only fix, validate, call `customWidget_previewReviseTemplate` with its session, and retest; it inherits the manifest and resets evidence. Other definition changes require a fresh preview.
5. Configure deployment-specific source URLs and credentials through Homarr; never repeat plaintext.
6. Persist each exact final tested preview with `customWidget_createFromPreview`. Do not resend a large definition through `customWidget_create` when a preview session is available.

Treat sample and preview responses as binding contracts. Render requested fields, guard optional values, humanize enums, and label timezones. Give errors and empty states a retry path.

Use `{option:name}` or `$option` for saved options. Use `{param:name}` or `$param` for values supplied by `SubFetch`, `ActionButton`, or `ToggleSwitch`. Load queries cannot use invocation parameters. Render load queries from `data` and `status` with `RefreshButton`; reserve `SubFetch` for manual parameterized queries. Templates read `data`, `status`, `options`, and temporary `inputs`.

For a bound control that depends on another input, declare its default and set `resetKey` to that scalar dependency. For example, `<Pagination bind="page" defaultValue={1} resetKey={inputs.search} />` restores page 1 when a search changes without fetching by itself.

`SubFetch` with `trigger="manual"` renders its own load button. Pass a card or image through `triggerContent` with `triggerAriaLabel` when that content should launch the request. Its callback is `(result, meta)`; callback names must not shadow the reserved roots `data`, `status`, `options`, or `inputs`. Never author `onClick` or a fetch callback. Use `Icon` or `TablerIcon` with a `name`; never invent an `IconFoo` component.

Plan capabilities. Use one `customWidget_findComponents` search per job. Batch selected non-obvious binding or interaction documentation with `customWidget_getComponents`; reserve `customWidget_getComponent` for one unknown-prop repair. Failed validation reopens discovery; otherwise search only for a missing capability. The full catalog is for broad exploration; load at most one example. Context never limits composition. Prefer clear hierarchy, responsive grids, divided lists, and aligned actions over nested row cards.

Compose installed components freely around the requested workflow. Use responsive layouts, clear hierarchy, quiet metadata, and actionable initial states. Wrap variable labels on narrow tiles and label interactive icons.

Do not use imports, hooks, refs, raw HTML, raw event callbacks, browser requests, arbitrary functions, eval, bigint, npm packages, authored statement blocks, IIFEs, or recursion. Do not pretend MCP tools exist in an offline chat session.

For a community widget, use `customWidget_workshopSearch`, `customWidget_workshopGet`, then `customWidget_workshopInstall`; configure its source securely. Preview configuration expires, so create before persisting configuration.

Reference routing:

- Load `schema` once before a new manifest; otherwise only for concrete request or option ambiguity.
- Load `runtime` for bound inputs, manual queries, actions, or other interaction.
- Load `security` once for any authenticated source or mutation, or to resolve a URL or interpreter limitation.

Repository installations expose these as files under `references/`. MCP clients can call `customWidget_getReference` or read `homarr://custom-widgets/references/{name}` instead of loading every reference.
