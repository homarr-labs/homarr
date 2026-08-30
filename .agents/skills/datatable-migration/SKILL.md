---
name: datatable-migration
description: Migrate Homarr tables from mantine-react-table to mantine-datatable. Use when converting an MRT table, changing DataTable columns, sorting, expansion, context menus, responsive visibility, or widget table layout persistence.
---

# DataTable Migration

Migrate one table at a time and preserve its behavior, permissions, translations, responsive layout, and error states.

## Workflow

1. Read the source table, its callers, translations, tests, and nearby migrated tables.
2. Search current consumers and shared patterns instead of relying on a cached candidate list:

   ```bash
   rg -l 'mantine-react-table' apps packages --glob '*.{ts,tsx}'
   rg -l 'from "mantine-datatable"' apps packages --glob '*.{ts,tsx}'
   ```

3. For a widget table, reuse `packages/widgets/src/common/homarr-data-table.tsx` and `use-persisted-table-layout.ts`. Preserve their shared sizing, edit-mode, styling, hydration, and debounced persistence behavior.
4. Read [references/migration-guide.md](references/migration-guide.md) for the conversion map, sorting, responsive columns, persistence, row interactions, and hardening rules.
5. Keep the existing data and mutation contracts. Convert the view layer without broad unrelated cleanup.
6. Validate the migrated table at its narrow and wide sizes and run only the focused formatter, typecheck, and existing tests that cover the changed table.

## Completion criteria

- No MRT imports, types, hooks, or translated-table helpers remain in the migrated component.
- Sorting, row identity, loading, empty, error, selection, expansion, and actions match the previous behavior.
- Widget tables use the shared Homarr wrapper and persistence hooks instead of local copies.
- User-visible strings remain translated and interactive controls remain accessible.
- Documentation is updated through `documentation-sync` when user-facing behavior changes.
