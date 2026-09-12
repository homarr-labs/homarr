---
name: documentation-sync
description: Write concise Homarr docs for advanced users, covering only hidden capabilities and information not evident from the UI. Use when that information changes or existing guidance becomes inaccurate; skip obvious controls and routine fixes.
---

# Documentation Sync

Apply the audience and scope rules in `AGENTS.md` first. Before adding a passage, identify what an advanced user could not learn directly from the interface. If there is no such information, omit it.

For hidden capabilities such as the advanced widget feature, explain discovery, activation, and non-obvious behavior. For visible standard controls such as Delete, omit narration of what the label already conveys. Use the shortest explanation that preserves necessary technical detail; remove redundant prose in the passage being edited.

When an update is warranted, inspect adjacent pages for structure and types, not as a verbosity target. The mappings below locate needed information; they do not require a page for every feature or code change.

## Locate a needed update

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
- Explain only non-obvious option semantics, integration prerequisites, permission constraints, or behavior that the interface does not make clear.

## Completion criteria

1. Every passage adds information an advanced user cannot reasonably infer from the interface. Remove obvious, repetitive, or unnecessary prose.
2. Keep names, defaults, paths, screenshots, links, and prerequisites consistent with code.
3. Update every affected page and remove superseded guidance.
4. Run the narrowest useful docs validation. Use `pnpm turbo build --filter=@homarr/docs` when links, MDX, generated definitions, or navigation can fail; otherwise run the docs package formatter on touched files.
5. Treat broken links and anchors as failures; Docusaurus checks them strictly.
