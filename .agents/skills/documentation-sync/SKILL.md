---
name: documentation-sync
description: Keep Homarr's Docusaurus documentation aligned with user-facing code. Use when adding or changing integrations, widgets, APIs, environment variables, CLI commands, authentication, permissions, cron jobs, settings, or UI behavior that users must understand.
---

# Documentation Sync

Update `apps/docs/` in the same change as user-facing behavior. Inspect adjacent pages and the docs types before copying a pattern; the source and docs evolve together.

## Map the change

| Code change                         | Documentation target                                                 |
| ----------------------------------- | -------------------------------------------------------------------- |
| New integration                     | `apps/docs/docs/integrations/<slug>/index.mdx` and `index.ts`        |
| New widget                          | `apps/docs/docs/widgets/<slug>/index.mdx` and `index.ts`             |
| Changed public or management API    | `apps/docs/docs/management/api/index.mdx`                            |
| New or changed environment variable | Relevant page under `apps/docs/docs/advanced/` or installation docs  |
| New or changed CLI command          | `apps/docs/docs/advanced/command-line/`                              |
| Authentication/provider change      | Relevant SSO or authentication page under `apps/docs/docs/advanced/` |
| UI or workflow change               | Relevant getting-started, management, widget, or integration page    |
| Cron-job behavior                   | `apps/docs/docs/management/tasks.mdx`                                |
| Permission behavior                 | `apps/docs/docs/management/users.mdx` and the affected feature page  |
| Custom Widget or Workshop behavior  | Relevant Custom Widget, Assistant, or Workshop documentation         |

If no existing row fits, search by the user-visible term and update the page where a user would look for the behavior:

```bash
rg -n "<term>" apps/docs/docs apps/docs/src
```

## Follow existing typed patterns

For an integration:

- Add or update `apps/docs/docs/integrations/<slug>/index.ts` with the local `IntegrationDefinition` pattern.
- Add or update `index.mdx` with the established `IntegrationHeader`, `IntegrationCapabilites`, and `IntegrationSecrets` components as applicable.
- Reuse metadata from `@homarr/definitions` when the docs app already exposes it.

For a widget:

- Add or update `apps/docs/docs/widgets/<slug>/index.ts` with the local `WidgetDefinition` pattern.
- Add or update `index.mdx` with the established `WidgetHeader`, `WidgetConfig`, and `AddingWidget` components as applicable.
- Document options, required integrations, permissions, empty states, and changed behavior that affect setup or use.

## Completion criteria

1. Describe the shipped behavior, not an implementation plan.
2. Keep names, defaults, paths, screenshots, links, and prerequisites consistent with code.
3. Update every affected page and remove superseded guidance.
4. Run the narrowest useful docs validation. Use `pnpm turbo build --filter=@homarr/docs` when links, MDX, generated definitions, or navigation can fail; otherwise run the docs package formatter on touched files.
5. Treat broken links and anchors as failures; Docusaurus checks them strictly.
