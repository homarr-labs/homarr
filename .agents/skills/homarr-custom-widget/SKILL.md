---
name: homarr-custom-widget
description: Author, validate, preview, and install safe Homarr Custom JSX v2 widgets from API documentation. Use when creating or fixing Homarr custom widgets, including multi-source dashboards, queries, actions, options, temporary inputs, and Mantine JSX.
license: Apache-2.0
metadata:
  version: "2.0.0"
---

# Homarr Custom Widget

Create one widget at a time. Repeat the workflow when the user asks for several widgets; do not invent packs or shared connections.

## Standalone workflow

When Homarr MCP tools and `homarr://` resources are unavailable, continue offline using this skill and the supplied authoring prompt. Do not search repeatedly for missing tools, stop, or ask whether to proceed. Produce the requested credential-free manifest and JSX directly, without claiming they were validated, previewed, or installed. The user will paste them into Homarr and return any diagnostics for correction.

## Connected workflow

Use this workflow only when the Homarr MCP tools and resources are actually available:

1. Get `homarr-custom-widget-author`, then read `homarr://custom-widgets/schema` and `homarr://custom-widgets/components`.
2. Read the API documentation supplied by the user. Ask for missing base URLs and credentials only when needed.
3. Build one `homarr-custom-widget-v2` document. Keep credentials outside the document.
4. Call `customWidget_validate`, fix every error, and treat advisory Mantine prop warnings as review items.
5. Call `customWidget_previewCreate`, then test load/manual queries with `customWidget_previewQuery` and actions with `customWidget_previewAction`.
6. If credentials are missing, call `customWidget_secretRequestUser`. Use `customWidget_secretSet` only when the user already supplied a credential and the tool is authorized.
7. Inspect the preview URL and `customWidget_previewJournal`. Patch JSX with `customWidget_templatePatch` or update the draft and repeat.
8. Call `customWidget_create` only after validation and preview pass. Continue with the next widget independently.

## Output rules

- Use inline sources, named requests, definition-owned options, temporary bound inputs, and one safe JSX template.
- Use `kind`, not the HTTP method, to distinguish reads from user-triggered actions.
- Give every declared request parameter an explicit source. Load queries use `optionsBinding` with an option reference or primitive literal; manual queries and actions receive values only from the invoking component's `params` prop. Never infer bindings from matching names.
- Never put a credential in JSX, options, headers, URLs, examples, exports, logs, or chat output.
- Use declarative `bind` controls and Homarr request components; never emit imports, hooks, callbacks, browser requests, or arbitrary JavaScript.
- Include responsive loading, empty, error, and success states.
- Keep actions explicit, permission-scoped, confirmed when destructive, and followed by targeted invalidation.

When connected through MCP, use the live schema, component, example, and skill resources. If live resources are unavailable, follow this document and the authoring prompt; do not assume access to repository-relative files.
