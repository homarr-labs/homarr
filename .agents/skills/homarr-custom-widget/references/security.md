# Security boundary

Homarr executes requests on the server and constrains them to a declared source. Network scopes, DNS checks, redirect validation, SSRF protection, request/response limits, timeouts, rates, permissions, and secret injection are enforced outside JSX.

Never include secrets in a widget document. Configure them per widget source. Stored plaintext is never returned, duplicated, or exported.

The runtime blocks imports, hooks, refs, raw callback props, polymorphic roots, provider replacement, arbitrary portals, browser `fetch`, `XMLHttpRequest`, arbitrary JavaScript, evaluation, npm packages, prototype-pollution keys, unsafe URLs, global selectors, and CSS escaping the widget root.

Safe block bodies are not general JavaScript. They permit only immutable `const` declarations with simple identifiers and one final return. Mutation, assignments, declarations of callable values, control-flow statements, async behavior, reserved-root shadowing, and multiple returns are rejected before rendering. A zero-argument IIFE is callable only when its callee is the inline arrow syntax itself. Values obtained from API data can never become executable callbacks.

Collection callbacks, zero-argument derived-value IIFEs, and the `RecursiveList` child template execute inside the interpreter and share the parent widget's budgets. They are never passed to Mantine or React as authored callbacks.

`RecursiveList` is a Homarr-owned traversal boundary, not general recursion. It validates dotted paths, rejects prototype-related segments, treats API objects as read-only, contains malformed branches, detects ancestor cycles, and enforces both depth and node caps. Defaults are 16 levels and 500 nodes; hard maximums are 32 levels and 2,000 nodes. Reaching a cap records a diagnostic and renders an omission row rather than throwing outside the widget.

Do not work around a blocked capability. Express network behavior as a named request and interaction as a declarative Homarr component. Require explicit confirmation for destructive actions. Never let actions trigger on load.

Treat request/response journals and diagnostics as sensitive. Homarr redacts credentials, but an agent should also avoid repeating private URLs, request bodies, or personal data unless necessary to fix the widget.

The installed static references describe the complete offline capability boundary for their matching release. When Homarr exposes live schema or component metadata, that metadata wins if it differs.
