---
name: homarr-custom-widget
description: Author safe Homarr Custom JSX v2 widgets from API documentation. Use when creating or fixing Homarr custom widgets, including multi-source dashboards, queries, actions, options, temporary inputs, and Mantine JSX.
license: Apache-2.0
metadata:
  version: "2.0.0"
---

# Homarr Custom Widget

Create one widget at a time. Repeat the workflow when the user asks for several widgets; do not invent packs or shared connections.

## Authoring workflow

1. Read the API documentation supplied by the user. Ask for a missing base URL only when it cannot be inferred safely.
2. Build one credential-free `homarr-custom-widget-v2` manifest and one safe JSX template.
3. Return the complete manifest and JSX in the exact fenced-block format requested by the authoring prompt.
4. When the user supplies Homarr diagnostics, correct every reported issue while preserving unrelated fields.

## Output rules

- Use inline sources, named requests, definition-owned options, temporary bound inputs, and one safe JSX template.
- Use `kind`, not the HTTP method, to distinguish reads from user-triggered actions.
- Give every declared request parameter an explicit source. Load queries use `optionsBinding` with an option reference or primitive literal; manual queries and actions receive values only from the invoking component's `params` prop. Never infer bindings from matching names.
- Never put a credential in JSX, options, headers, URLs, examples, exports, logs, or chat output.
- Use declarative `bind` controls and Homarr request components; never emit imports, hooks, callbacks, browser requests, or arbitrary JavaScript.
- Include responsive loading, empty, error, and success states.
- Keep actions explicit, permission-scoped, confirmed when destructive, and followed by targeted invalidation.

Follow this document and the supplied authoring prompt as the complete authoring reference. Do not assume access to repository-relative files.
