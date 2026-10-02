<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Fumadocs workflow

- Start with `README.md`, `src/lib/source.ts`, `source.config.ts`, and the matching route under `src/app/`.
- Read current [Fumadocs documentation](https://fumadocs.dev/docs) with Context7 before changing framework APIs. Check the installed version and types; latest examples may use a different search adapter.
- Preserve static export: search uses `staticGET` with the matching static client. Do not introduce a request-time search server into this app.
- Keep integration/widget metadata in the existing typed definitions. Check both rendered HTML and processed Markdown when changing MDX components; JSX alone does not guarantee readable search or AI output.
- Run the README validation commands after content or navigation changes. Search results and table-of-contents links must resolve to rendered anchors.
- Kapa is an independent hosted assistant. Keep its keyboard shortcut disabled so it does not override docs search; follow the README for its build configuration and crawler setup.
