# Homarr 2.0.0: our biggest upgrade yet

Homarr 2.0 is the biggest upgrade we have shipped. It keeps the dashboard and launcher you already know, then improves how you find, configure, and act on your self-hosted services.

![A populated Homarr 2.0 dashboard](https://raw.githubusercontent.com/homarr-labs/homarr/v2.0.0/apps/docs/blog/2026/09-03-homarr-2.0/img/homarr-v2-dashboard.webp)

## Highlights

- **Assistant and MCP:** search the instance, inspect live data, and propose permission-checked actions. The Assistant asks before sensitive changes; MCP clients use the same tool catalog under API-key or OAuth authentication, Homarr permissions, and endpoint capabilities.
- **Rebuilt boards:** transactional drag and drop, eight-direction resize, containers, desktop rails, Ctrl/Cmd multi-select, atomic batch moves, and protected Base and Mobile layouts for one responsive board.
- **Faster navigation:** a local-first Cmd/Ctrl+K menu, visual board switcher, configurable left/center/right header zones, board shortcuts, and contextual create flows.
- **Custom Widgets v2:** multiple API sources, encrypted credentials, load requests and guarded actions, GET/POST/PUT/PATCH/DELETE methods, `ActionButton` and `ToggleSwitch`, 15 typed option controls, explicit preview states, diagnostics, and AI-assisted authoring.
- **Community Workshop:** browse, install, update, publish, rate, report, and share Custom Widgets and CSS.
- **Advanced widgets:** richer focus views for 40 opted-in widget definitions while compact production layouts remain the default. Weather and Clock were redesigned, Air Quality, Countdown, and Timer were added, and media, calendar, Beszel, Docker, System Resources, and Bookmarks received focused improvements.
- **Onboarding and login:** a rebuilt setup studio, Docker-assisted discovery, transactional first-board creation, and shared instance branding across setup and authentication.
- **Docker and Podman:** multiple endpoints, per-host capability checks and failure isolation, assisted app/integration setup, native `homarr.*` labels, and selected `homepage.*` fallbacks.
- **Administration:** an explainable permission matrix with presets and effective access, LDAP first-sign-in provisioning, adapter-backed OIDC account persistence/linking, configured external group sync, application identity controls, authentication visuals, five corner styles, and global Custom CSS.
- **Efficiency:** parallel board data loading, request deduplication, bounded in-process caching, optional Redis coordination, session-scoped widget data, lazy surfaces, and isolated editor previews.

## Board editing, rebuilt

![A Calendar tile moving through the rebuilt board grid](https://raw.githubusercontent.com/homarr-labs/homarr/v2.0.0/apps/docs/blog/2026/09-03-homarr-2.0/img/drag-and-drop.gif)

Select several apps or widgets with Ctrl/Cmd, then move the group to the main canvas, a desktop rail, or a container. Homarr commits the placement as one operation and only offers destinations where every item fits.

![The multi-item Move menu](https://raw.githubusercontent.com/homarr-labs/homarr/v2.0.0/apps/docs/blog/2026/09-03-homarr-2.0/img/batch-move.webp)

Base and Mobile are layouts of the same board, not separately maintained copies. Desktop rails are projected into the main flow on mobile.

![Responsive layout settings and the mobile result](https://raw.githubusercontent.com/homarr-labs/homarr/v2.0.0/apps/docs/blog/2026/09-03-homarr-2.0/img/responsive-layouts.webp)

## Custom Widgets that can act

Custom Widgets remain Beta in 2.0, but their model is substantially more capable. A definition can combine fixed-origin sources, encrypted credentials, cached queries, manual sub-fetches, typed user options, and explicit actions. Network-scope validation, redirect checks, request budgets, timeouts, permissions, confirmations, and rate limits constrain execution.

![A live API-backed Custom Widget preview](https://raw.githubusercontent.com/homarr-labs/homarr/v2.0.0/apps/docs/blog/2026/09-03-homarr-2.0/img/custom-widget-workbench.webp)

![A permission-checked POST action in the workbench](https://raw.githubusercontent.com/homarr-labs/homarr/v2.0.0/apps/docs/blog/2026/09-03-homarr-2.0/img/custom-widget-post-action.webp)

## Assistant, MCP, and permissions

The Assistant is available from the board, command menu, and user menu. It can work across Homarr while retaining the signed-in user's access boundaries. The MCP page exposes client setup, connection testing, and the reviewed tool catalog without turning automation into an unrestricted administrator bypass.

![Homarr's MCP management page](https://raw.githubusercontent.com/homarr-labs/homarr/v2.0.0/apps/docs/blog/2026/09-03-homarr-2.0/img/mcp-management.webp)

Group access uses Viewer, Editor, and Admin presets, explicit levels and create capabilities, inherited/effective previews, and matching server-side filtering.

![The v2 group permission matrix](https://raw.githubusercontent.com/homarr-labs/homarr/v2.0.0/apps/docs/blog/2026/09-03-homarr-2.0/img/permission-matrix.webp)

## Performance note

The beta's “about 30%” memory shorthand came from an exploratory restored-backup benchmark. Its four-tab scenario measured 366.5 MiB to 258.2 MiB, while other phases ranged from 22% to 52% lower and CPU usage was 18% higher. The current v2 efficiency layer retains only a narrower, safer subset and makes no page-latency claim. Treat those results as directional workload evidence—not a benchmark of the final tagged build or a universal browser guarantee. No reproducible release benchmark supports an “80% less Custom Widget memory” number.

What is present in the v2 branch is concrete: parallel work, fewer duplicate requests and listeners, bounded caches, optional Redis sharing, lazy heavy surfaces, and narrower preview/editor updates.

## Before upgrading

Back up Homarr and copy the data volume before the first 2.0 start. Do not test prerelease images against the only production copy. Use the final tagged image and release notes when 2.0 is published.

Custom JSX v1 definitions enter an explicit migration state and retain an archived record and encrypted credentials until a validated v2 replacement is ready.

## Links

- [Try the public v2 preview](https://app-v2.preview.homarr.dev)
- [Read the release roll-up](https://github.com/homarr-labs/homarr/pull/6545)
- [Join the public beta thread](https://github.com/homarr-labs/homarr/issues/6600)
- [Browse the draft full comparison](https://github.com/homarr-labs/homarr/compare/v1.76.2...release/v2)
- [Read the full illustrated release tour](https://homarr.dev/blog/2026/09/03/homarr-2.0)
- [Read the Homarr documentation](https://homarr.dev/docs)

> Draft release copy: the media URLs target the final `v2.0.0` tag. Confirm that the tag contains these assets, replace the branch comparison with the final release link, and verify migration instructions before publishing.
