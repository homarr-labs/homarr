---
name: homarr-custom-widget
description: Author safe Homarr Custom JSX v2 widgets from API documentation.
---

# Homarr Custom Widget

Author one widget at a time. When connected to Homarr, retrieve `homarr://custom-widgets/schema` and only the component resources needed for the design. The live resources are authoritative for the installed release.

1. Read the API documentation.
2. Create one credential-free widget with keyed `sources`, keyed `requests`, optional keyed `options`, and safe JSX `template`.
3. Validate, preview, test queries and simulated actions, visually inspect, and iterate.
4. Request credentials through Homarr and never repeat plaintext.
5. Save only after narrow/wide, light/dark, loading, empty, error, and success states work.

Use `{option:name}` or `$option` for saved options. Use `{param:name}` or `$param` for values supplied by `SubFetch`, `ActionButton`, or `ToggleSwitch`. Load queries cannot use invocation parameters. Templates read `data`, `status`, `options`, and temporary `inputs`.

`SubFetch` with `trigger="manual"` renders its own load button. Its callback is `(result, meta)`; never author `onClick` or a fetch callback.

Use standard Mantine compound names and deliberate visual hierarchy, spacing, restrained semantic color, and responsive layouts. Avoid excessive nested cards.

Do not use imports, hooks, refs, raw HTML, raw event callbacks, browser requests, arbitrary functions, eval, bigint, npm packages, authored statement blocks, IIFEs, or recursion. Do not pretend MCP tools exist in an offline chat session.

When this skill is installed from the repository, optional offline details are in `references/schema.md`, `references/runtime.md`, and `references/security.md`. MCP-only clients should use the live Homarr resources instead.
