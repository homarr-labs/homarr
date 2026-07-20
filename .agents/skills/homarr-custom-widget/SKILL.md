---
name: homarr-custom-widget
description: Author safe Homarr Custom JSX v2 widgets from API documentation. Use when creating or fixing Homarr custom widgets, including multi-source dashboards, queries, actions, options, temporary inputs, and Mantine JSX.
license: Apache-2.0
metadata:
  version: "2.0.0"
---

# Homarr Custom Widget

Create one widget at a time. Repeat the workflow when the user asks for several widgets; do not invent packs or shared connections.

## Choose the authoring reference

When connected to Homarr, retrieve the live widget schema and component catalog before authoring. Live metadata is authoritative because Homarr and Mantine versions can differ between installations.

For offline authoring, read these installed, release-matched references in order:

1. [Schema](references/schema.md)
2. [JSX runtime](references/runtime.md)
3. [Security boundary](references/security.md)
4. [Component catalog](references/components.md)
5. [Mantine Core](references/mantine-core.md)
6. [Mantine Dates](references/mantine-dates.md)
7. [Mantine Charts](references/mantine-charts.md)
8. [Homarr components](references/homarr-components.md)

Together, this file and those references are the complete offline authoring bundle for the matching Homarr release. Do not require MCP tools, repository access, or external component documentation to produce a best-effort widget. If live metadata is available, prefer it over the installed static bundle.

## Authoring workflow

1. Read the API documentation supplied by the user. Ask for a missing base URL only when it cannot be inferred safely.
2. Build one credential-free `homarr-custom-widget-v2` manifest and one safe JSX template.
3. Use immutable local `const` blocks for repeated derived values and `RecursiveList` for arbitrary-depth trees. Do not emulate either feature with unrestricted JavaScript or authored recursion.
4. Return the complete manifest and JSX in the exact fenced-block format requested by the authoring prompt.
5. When the user supplies Homarr diagnostics, correct every reported issue while preserving unrelated fields.

## Output rules

- Use inline sources, named requests, definition-owned options, temporary bound inputs, and one safe JSX template.
- Use `kind`, not the HTTP method, to distinguish reads from user-triggered actions.
- Give every declared request parameter an explicit source. Load queries use `optionsBinding` with an option reference or primitive literal; manual queries and actions receive values only from the invoking component's `params` prop. Never infer bindings from matching names.
- Never put a credential in JSX, options, headers, URLs, examples, exports, logs, or chat output.
- Use declarative `bind` controls and Homarr request components. Controlled collection callbacks, zero-argument derived-value IIFEs, and the `RecursiveList` child template may use the restricted safe-block grammar documented in the runtime reference. Never emit imports, hooks, refs, raw callback props, browser requests, or arbitrary JavaScript.
- Include responsive loading, empty, error, and success states.
- Keep actions explicit, permission-scoped, confirmed when destructive, and followed by targeted invalidation.
