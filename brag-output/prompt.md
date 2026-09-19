# Homarr 2.0 — full Brag prompt

Use `/brag` to create a polished, animated landscape release film for Homarr 2.0, grounded in the actual `origin/release/v2` source. Explain Homarr to someone discovering it: a self-hosted dashboard that brings apps, service data, and controls together. Then demonstrate what v2 changes. This is a full-release showcase, so use 80 seconds instead of Brag's short teaser default. No narration; use a restrained music bed and interaction sounds.

Use the release article at `apps/docs/blog/2026/09-03-homarr-2.0/index.mdx` as the editorial spine, and its real screenshots as product evidence. Preserve Homarr's real logo, Inter typography, red accent, dark surfaces and rounded widgets. Start with a populated board, not a wall of marketing claims.

Recreate the onboarding integration marquee from `packages/ui/src/components/integration-marquee.tsx` and `packages/onboarding/src/onboarding-studio.module.css`: three tilted vertical columns, offset travel and softened edges. Include every non-Mock integration from `packages/definitions/src/integration.ts`, using its actual icon. Extend the idea to widgets: feature live-looking Weather, Clock, Air Quality, Countdown, Timer, calendar, downloads and system status cards; include the complete widget-kind inventory from `packages/definitions/src/widget.ts`. Avoid claiming every widget is new.

Show board editing as motion: pick up a Calendar tile, show its destination preview, release into the grid, then resize. Show Containers grouping apps and widgets; demonstrate fixed side rails and explain that Mobile moves their contents into the main flow. Show Base and Mobile layouts as two views of one board.

Show Assistant with a source-faithful, clearly illustrative conversation: ask about service health, read live data, propose a change, and require approval before applying it. Include its free Homarr provider and permission-aware external MCP access. Do not invent a real tool run or imply unrestricted AI control.

Give Custom Widgets v2 and Workshop their own scene: describe or write a widget, preview in the workbench, then share/install it in Workshop. Show the actual workbench and catalog. Mark Custom Widgets Beta; mention that credentials stay on the instance and Workshop also shares Custom CSS.

Cover the six-stage onboarding studio, Docker/Podman discovery and multiple hosts, board switcher, command menu, configurable header, branding and permissions. Close with the real upgrade boundary: SQLite/PostgreSQL supported; MySQL must be converted before upgrading. Mention legacy Custom JSX migration in the accompanying release coverage notes. End on Homarr 2.0, `homarr.dev`, the demo and Workshop.

Deliver an editable Hyperframes composition, source inventory, storyboard, composition brief, preview, MP4, selected poster baked into frame zero, and concise share copy. Validate actual rendered frames and animation states; a passing static check alone is insufficient.
