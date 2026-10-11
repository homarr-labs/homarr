Context7 CLI attempted via npx ctx7@latest library Next.js: failed monthly quota (repository cwd also exposes npm/Bun override incompatibility; ran in /tmp). User informed; no training-data fallback. Installed Next.js 16.3.6 CLI/source and Turbo 2.11.7 bundled docs checked. Current official references consulted:
- https://nextjs.org/docs/app/api-reference/cli/next
- https://nextjs.org/docs/pages/guides/package-bundling
- https://react.dev/reference/react/useEffect
Additional proposed library changes require matching installed source and official sources.

Additional current primary references checked for retained candidates:
- https://orm.drizzle.team/docs/rqb#partial-fields-select (nested columns, with installed Drizzle 0.45.2 source/types authoritative for this checkout)
- https://github.com/ldapts/ldapts (authorization finally/unbind usage; installed 8.1.8 unbind destroys the socket)
- https://tiptap.dev/docs/editor/api/editor (getHTML serialization on demand)
- https://tiptap.dev/docs/editor/api/events (update event semantics)

No feature, library version, or configuration was upgraded. Context7 monthly quota prevented its required lookup; installed package implementations and these current official references were used transparently.

The configured keyless Mantine MCP server was invoked via `mise exec -- bun x @mantine/mcp-server@9.6.0`, initialized, and its tools listed. `get_item_doc` and `get_item_props` for Collapse both returned 404 for `https://mantine.dev/mcp/components/core-collapse.json`. Current official `https://mantine.dev/core/collapse/` was inspected (site version9.7.2); installed Mantine9.6.0 Collapse implementation/props remain authoritative for this checkout. The MCP process was stopped after these read-only calls. No UI library upgrade or new dependency was added.
