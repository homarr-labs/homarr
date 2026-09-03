# Title

Homarr 2.0 is our biggest upgrade ever: the dashboard you already use, rebuilt to manage more of your self-hosted stack + agentic workflows

# Post

We have been upgrading much more than the Homarr UI.

**Homarr 2.0 builds on the dashboard and app launcher you already know.** Those familiar, glanceable surfaces remain at the center; v2 upgrades the Assistant, board editor, Docker discovery, Custom Widgets, permissions, search, and automation around them so you can finish more without leaving Homarr.

The headline changes:

- A Homarr Assistant that can inspect your instance and propose permission-checked actions—with approval before sensitive changes
- An MCP tool surface you can connect to compatible agents using an API key or OAuth
- A completely rebuilt drag-and-drop board grid with containers, desktop side rails, keyboard/touch handling, eight-way resize, and rollback when placement fails
- Ctrl/Cmd multi-select, so you can move several apps and widgets as one atomic group
- One board that automatically gets Base and Mobile layouts instead of two copies drifting apart
- A visual board switcher, a configurable three-zone header for built-in controls, and a Cmd/Ctrl+K menu spanning apps, boards, integrations, settings, commands, people, media, web, and the Assistant
- Custom Widgets v2 with real API sources, encrypted credentials, GET/POST/PUT/PATCH/DELETE actions, buttons, toggles, confirmations, cache invalidation, and **15 typed option controls**
- A Community Workshop for browsing, installing, updating, publishing, and sharing Custom Widgets and CSS
- Advanced focus views for 40 opted-in widget definitions, while the compact layouts stay compact by default
- A rebuilt onboarding studio that can discover Docker-compatible services and help turn them into apps, integrations, widgets, and a first board
- A polished login experience with instance-wide identity and authentication-page branding
- Multiple Docker/Podman endpoints, per-host failure isolation, `homarr.*` labels, and compatibility fallbacks for selected `homepage.*` labels
- A much clearer permission matrix, server-side permission filtering, LDAP first-sign-in provisioning, adapter-backed OIDC persistence/linking, configured external group sync, instance branding, auth-page theming, five radius styles, and global Custom CSS
- Contextual Add content and Quick Add flows that remove detours when creating widgets, apps, integrations, and containers
- Parallel board loading, in-flight request deduplication, bounded caches, optional Redis coordination, lazy heavy screens, and isolated previews

There is a lot of “AI can do everything” marketing around right now, so one important detail: **Homarr's automation does not bypass Homarr.** The user or API key still needs permission, Docker endpoints retain their own capabilities, secrets stay constrained, and sensitive mutations need confirmation.

The same honesty applies to performance. The beta's “about 30% less memory” came from one exploratory restored-backup benchmark: its four-tab case went from 366.5 MiB to 258.2 MiB, with different phases ranging from 22% to 52% lower and CPU usage 18% higher. That is promising workload evidence, not a magic guarantee for every Chrome tab. We also found no reproducible basis for an “80% less Custom Widget memory” claim, so we are not using it.

What you should feel is simpler: fewer duplicate requests, less idle work, faster paths to what you want, and a dashboard that lets you finish more before you need to leave it.

Custom Widgets are still marked Beta in 2.0. Please review anything you import, and **back up Homarr plus the data volume before upgrading**. Do not point prerelease images at your only production copy.

Try the very full demo here: https://app-v2.preview.homarr.dev

Release roll-up and technical detail: https://github.com/homarr-labs/homarr/pull/6545

Public beta feedback thread: https://github.com/homarr-labs/homarr/issues/6600

Full illustrated release tour: https://homarr.dev/blog/2026/09/03/homarr-2.0

What part should we show in a deeper technical post first: the board engine, Custom Widgets, Assistant/MCP, or the upgraded data/caching path?
