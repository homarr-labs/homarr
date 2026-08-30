# Mantine DataTable migration guide

## Contents

- [Choose the table seam](#choose-the-table-seam)
- [Convert imports and columns](#convert-imports-and-columns)
- [Implement sorting](#implement-sorting)
- [Use the shared widget table](#use-the-shared-widget-table)
- [Persist widget column layout](#persist-widget-column-layout)
- [Adapt columns to widget width](#adapt-columns-to-widget-width)
- [Preserve row interactions](#preserve-row-interactions)
- [Harden the result](#harden-the-result)
- [Migration checklist](#migration-checklist)

## Choose the table seam

Inspect current source before choosing an abstraction:

```bash
rg -l 'mantine-react-table' apps packages --glob '*.{ts,tsx}'
rg -n 'HomarrDataTable|usePersistedTableLayout|useTableLayoutPersistence' packages/widgets/src
```

Use `DataTable` directly for management pages and other non-widget surfaces unless that area has a narrower wrapper. For widget tables, use these shared modules:

- `packages/widgets/src/common/homarr-data-table.tsx`
- `packages/widgets/src/common/homarr-data-table.css`
- `packages/widgets/src/common/use-persisted-table-layout.ts`

Use downloads, Docker, and Beszel System Table as current examples. The wrapper owns transparent board-card styling, proportional/fixed table layout, paired-column resize previews, standard scroll-area props, cell padding, and edit-mode pointer behavior. Keep those decisions centralized.

## Convert imports and columns

Replace MRT primitives and types:

```typescript
// Before
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";
import type { MRT_ColumnDef } from "mantine-react-table";

// After
import { DataTable } from "mantine-datatable";
import type { DataTableColumn, DataTableSortStatus } from "mantine-datatable";
```

Convert each column deliberately:

| MRT                      | Mantine DataTable                    |
| ------------------------ | ------------------------------------ |
| `accessorKey`            | `accessor`                           |
| `header`                 | `title`                              |
| `size`                   | `width`                              |
| `enableSorting`          | `sortable`                           |
| `Cell: ({ row }) => ...` | `render: (record) => ...`            |
| table-body-cell props    | `cellsStyle` or shared wrapper props |

```typescript
const columns: DataTableColumn<Row>[] = [
  {
    accessor: "name",
    title: t("items.name.columnTitle"),
    width: 200,
    sortable: true,
    ellipsis: true,
    render: (record) => <Text>{record.name}</Text>,
  },
];
```

Pass records and columns directly:

```tsx
<DataTable records={records} columns={columns} />
```

Memoize columns when they depend on translations, options, permissions, or responsive configuration. Keep every dependency explicit.

## Implement sorting

Mantine DataTable reports sort state; the component still owns the sorted records.

```typescript
const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Row>>({
  columnAccessor: "name",
  direction: "asc",
});

const sortedRecords = useMemo(() => {
  const multiplier = sortStatus.direction === "desc" ? -1 : 1;
  return records.toSorted((left, right) => left.name.localeCompare(right.name) * multiplier);
}, [records, sortStatus.direction]);
```

Use an accessor-specific comparator map when columns contain different types. Preserve the original table's null ordering and stable tie-breaker. If options configure the default sort, synchronize `sortStatus` when those options change.

## Use the shared widget table

Render widget tables through `HomarrDataTable`:

```tsx
<HomarrDataTable
  records={sortedRecords}
  columns={effectiveColumns}
  isEditMode={isEditMode}
  cellPadding={`${size.cellPadding}px 8px`}
  sortStatus={sortStatus}
  onSortStatusChange={setSortStatus}
  fetching={isFetching && records.length === 0}
  noRecordsText={t("errors.noItems")}
  idAccessor={(record) => record.uniqueKey}
/>
```

Let the wrapper own its default border, hover, resize, scroll-area, height, transparency, and pointer-event behavior. Extend its props only when multiple widget tables need the same behavior. Keep widget-specific colors and row content in the widget.

## Persist widget column layout

Add hidden `columnOrder` and `columnWidths` string options to the widget definition when users can drag or resize columns. Hidden options still require translation labels.

Build the save callback with `useTableLayoutPersistence`; it updates local options and writes to the board item only when the user has change access and the board/item IDs exist:

```typescript
const persistLayout = useTableLayoutPersistence({
  boardId,
  hasChangeAccess,
  itemId,
  saveItemOptions,
  setOptions,
});
```

Hydrate, validate, merge, and debounce layout changes with `usePersistedTableLayout`:

```typescript
const { effectiveColumns, storeKey } = usePersistedTableLayout({
  columns,
  columnAccessors,
  columnOrder: options.columnOrder,
  columnWidths: options.columnWidths,
  itemId,
  storeKeyPrefix: "downloads-table",
  onLayoutChange: persistLayout,
});
```

Pass `effectiveColumns` to the table and `storeKey` through the DataTable storage prop used by the local example. Do not recreate JSON parsing, allowed-accessor filtering, hydration guards, store-key resets, hidden-column merging, width normalization, or delayed saves in a widget component.

## Adapt columns to widget width

Derive a small size configuration from the widget's measured width. Keep breakpoints ordered and return one complete configuration:

```typescript
interface SizeConfig {
  cellPadding: number;
  showSpeed: boolean;
  showState: boolean;
}

const getSizeConfig = (width: number): SizeConfig => {
  if (width < 300) return { cellPadding: 2, showSpeed: false, showState: false };
  if (width < 500) return { cellPadding: 4, showSpeed: false, showState: true };
  return { cellPadding: 4, showSpeed: true, showState: true };
};

const size = getSizeConfig(width);
```

Prefer clear `if` branches or a breakpoint lookup in production code when more than two tiers exist. Filter or mark columns hidden from one typed visibility map so option selection and width rules are both applied. Preserve the original accessor list for persistence even when a column is temporarily hidden.

## Preserve row interactions

### Context menus

Use Mantine `Menu` and `Portal` with `onRowContextMenu`. Store the pointer coordinates and selected record, prevent the browser menu, and close on scroll, Escape, action completion, or outside interaction. Use `closeOnItemClick={false}` only for a menu item with an inline confirmation step.

Disable the row context-menu handler in edit mode. Keep action permission checks from the original table and report mutation failures with the shared notification helper.

### Expansion

Use DataTable `rowExpansion` and a stable `idAccessor`. Avoid a competing `onRowClick` when `rowExpansion.trigger` is `"click"`; the handlers conflict. Keep expansion content resilient to missing optional fields.

### Row identity

Use a composite accessor when IDs can collide across integrations:

```tsx
idAccessor={(record) => `${record.integration.id}:${record.id}`}
```

## Harden the result

- Guard ratios and percentages against zero denominators.
- Catch `navigator.clipboard.writeText()` failures in non-secure contexts.
- Parse persisted or server-provided JSON through the shared persistence helper, not an unchecked cast.
- Use a small `Box` for a status dot instead of an empty dotted `Badge`.
- Keep tooltip targets clipped inside ellipsis cells and choose a position that remains inside narrow widgets.
- Give every `ActionIcon` an `aria-label` and toggle controls an `aria-pressed` state.
- Translate column titles, detail labels, states, actions, errors, empty states, and hidden option labels.
- Preserve `isError`, empty, initial-loading, background-refresh, and mutation-error behavior separately.
- Keep mutation invalidation and error handling shared when multiple row actions use the same flow.
- Validate action permissions at the procedure boundary; hiding a row action is not authorization.

## Migration checklist

1. Inventory the table's columns, sorting, filters, selection, actions, expansion, pagination, responsive behavior, translations, and permissions.
2. Replace MRT imports and convert column definitions.
3. Implement explicit sorting and stable row identity.
4. Use `HomarrDataTable` for widgets; use the nearest existing direct-DataTable pattern elsewhere.
5. Use shared widget persistence hooks when columns are draggable or resizable.
6. Preserve narrow-width visibility without losing saved layout for hidden columns.
7. Restore context menus, expansion, loading, empty, error, and mutation feedback.
8. Restore translations and accessibility attributes.
9. Remove obsolete MRT-only hooks or dependencies only when no consumers remain.
10. Validate the affected table at narrow and wide widths, then run only its focused checks.
