# Security boundary

Homarr executes requests on the server and constrains them to a declared source. Network scopes, DNS checks, redirect validation, SSRF protection, request/response limits, timeouts, rates, permissions, and secret injection are enforced outside JSX.

Never include secrets in a widget document. Configure them per widget source. Stored plaintext is never returned, duplicated, or exported.

The runtime blocks imports, hooks, refs, raw callbacks, polymorphic roots, provider replacement, arbitrary portals, browser `fetch`, `XMLHttpRequest`, arbitrary JavaScript, evaluation, npm packages, prototype-pollution keys, unsafe URLs, global selectors, and CSS escaping the widget root.

Do not work around a blocked capability. Express network behavior as a named request and interaction as a declarative Homarr component. Require explicit confirmation for destructive actions. Never let actions trigger on load.

Treat request/response journals and diagnostics as sensitive. Homarr redacts credentials, but an agent should also avoid repeating private URLs, request bodies, or personal data unless necessary to fix the widget.
