---
name: datatable-migration
description: Playbook for migrating tables from mantine-react-table (MRT) to mantine-datatable. Use when converting any table component from mantine-react-table to mantine-datatable, working on DataTable column/sort/expansion/context-menu code, or implementing responsive column visibility, column persistence, or transparent tables in widgets.
---

# Migrating Tables from mantine-react-table to mantine-datatable

This document captures every pattern, fix, and decision from the downloads widget rework (PR #6430). Use it as a playbook when porting other tables.

## Migration Candidates

Current `mantine-react-table` consumers that could be migrated:

**Widgets (in `packages/widgets/`):**

- `docker/component.tsx` — Docker container table
- `media-server/component.tsx` — Media server sessions

**Admin pages (in `apps/nextjs/src/app/[locale]/manage/`):**

- `tools/docker/docker-table.tsx`
- `tools/tasks/_components/tasks-table.tsx`
- `tools/api/components/api-keys.tsx`
- `users/_components/user-list.tsx`
- `users/invites/_components/invite-list.tsx`
- `tools/kubernetes/` — 8 Kubernetes resource tables

**Modals:**

- `packages/modals-collection/src/search-engines/request-media-modal.tsx`

**Shared hook to remove once all migrated:**

- `packages/ui/src/hooks/use-translated-mantine-react-table.ts`

## 1. Core Migration: mantine-react-table → mantine-datatable

### Import changes

```typescript
// BEFORE
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";
import type { MRT_ColumnDef } from "mantine-react-table";

// AFTER
import { DataTable, useDataTableColumns } from "mantine-datatable";
import type { DataTableColumn, DataTableSortStatus } from "mantine-datatable";
```

### Column definition shape

```typescript
// BEFORE (MRT)
const columns: MRT_ColumnDef<MyRow>[] = [
  {
    accessorKey: "name",
    header: "Name",
    size: 200,
    enableSorting: true,
    Cell: ({ row }) => <Text>{row.original.name}</Text>,
  },
];

// AFTER (mantine-datatable)
const columns: DataTableColumn<MyRow>[] = [
  {
    accessor: "name",           // not accessorKey
    title: "Name",              // not header
    width: 200,                 // not size
    sortable: true,             // not enableSorting
    render: (record) => <Text>{record.name}</Text>,  // not Cell
  },
];
```

Key differences:

- `accessorKey` → `accessor`
- `header` → `title`
- `size` → `width`
- `Cell: ({ row }) =>` → `render: (record) =>`
- `enableSorting` → `sortable`
- `enableColumnActions` → does not exist (no column action menus)
- `mantineTableBodyCellProps` → `cellsStyle` in `defaultColumnProps`

### Table component

```typescript
// BEFORE
const table = useTranslatedMantineReactTable({ columns, data, ... });
return <MantineReactTable table={table} />;

// AFTER
return (
  <DataTable
    records={data}
    columns={columns}
    sortStatus={sortStatus}
    onSortStatusChange={setSortStatus}
    ...
  />
);
```

### Sorting is manual

mantine-datatable does NOT sort for you. You must sort the data yourself:

```typescript
const [sortStatus, setSortStatus] = useState<DataTableSortStatus<MyRow>>({
  columnAccessor: "name",
  direction: "asc",
});

const sortedData = useMemo(() => {
  const mult = sortStatus.direction === "desc" ? -1 : 1;
  return [...data].toSorted((a, b) => {
    const aVal = a[sortStatus.columnAccessor];
    const bVal = b[sortStatus.columnAccessor];
    if (typeof aVal === "string") return aVal.localeCompare(bVal as string) * mult;
    return ((aVal as number) - (bVal as number)) * mult;
  });
}, [data, sortStatus]);

// Pass sortedData to records, not data
<DataTable records={sortedData} sortStatus={sortStatus} onSortStatusChange={setSortStatus} />
```

## 2. Making Tables Transparent (Widget Context)

Widgets sit inside board cards that have user-controlled opacity. The table must be fully transparent so the card background shows through. mantine-datatable defaults to `var(--mantine-color-body)` which is opaque.

Create a CSS file alongside the component:

```css
/* styles.css */
.my-table,
.my-table .mantine-datatable-table,
.my-table .mantine-datatable-table thead,
.my-table .mantine-datatable-table tbody,
.my-table .mantine-datatable-table tfoot,
.my-table th,
.my-table td {
  background-color: transparent !important;
}

.my-table .mantine-datatable-table tr {
  background-color: transparent;
}

/* Hover: translucent instead of opaque */
.my-table .mantine-datatable-table tbody tr:hover {
  background-color: color-mix(
    in srgb,
    var(--mantine-color-default-hover) 40%,
    transparent
  ) !important;
}

/* Headers: frosted glass effect */
.my-table th {
  white-space: nowrap;
  background-color: color-mix(
    in srgb,
    var(--mantine-color-body) 60%,
    transparent
  ) !important;
  backdrop-filter: blur(8px);
}

/* Cell overflow */
.my-table td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Hide sort icon until hover */
.my-table .mantine-datatable-header-cell-sortable-icon {
  opacity: 0;
  transition: opacity 150ms;
}
.my-table th:hover .mantine-datatable-header-cell-sortable-icon {
  opacity: 1;
}

/* Row expansion area */
.my-table .mantine-datatable-row-expansion-cell {
  background-color: color-mix(
    in srgb,
    var(--mantine-color-body) 40%,
    transparent
  ) !important;
}
```

Import it: `import "./styles.css";` and apply via `className="my-table"`.

## 3. Responsive Column Visibility

Use a lookup table of width breakpoints instead of media queries. The widget receives `width` as a prop.

```typescript
interface SizeConfig {
  fontSize: "xs" | "sm";
  iconSize: number;
  cellPadding: number;
  showSpeedColumns: boolean;
  showTimeColumn: boolean;
  showStateColumn: boolean;
}

const SIZE_BREAKPOINTS: { maxWidth: number; config: SizeConfig }[] = [
  {
    maxWidth: 300,
    config: {
      fontSize: "xs",
      iconSize: 12,
      cellPadding: 2,
      showSpeedColumns: false,
      showTimeColumn: false,
      showStateColumn: false,
    },
  },
  {
    maxWidth: 500,
    config: {
      fontSize: "xs",
      iconSize: 14,
      cellPadding: 4,
      showSpeedColumns: false,
      showTimeColumn: true,
      showStateColumn: false,
    },
  },
];

const DEFAULT_SIZE_CONFIG: SizeConfig = {
  fontSize: "sm",
  iconSize: 14,
  cellPadding: 4,
  showSpeedColumns: true,
  showTimeColumn: true,
  showStateColumn: true,
};

function getSizeConfig(width: number): SizeConfig {
  for (const { maxWidth, config } of SIZE_BREAKPOINTS) {
    if (width < maxWidth) return config;
  }
  return DEFAULT_SIZE_CONFIG;
}

// Usage: memoize it
const size = useMemo(() => getSizeConfig(width), [width]);
```

Then use a visibility check lookup table for columns:

```typescript
const columnVisibilityChecks: Partial<
  Record<string, (ctx: ColumnContext) => boolean>
> = {
  upSpeed: (ctx) => ctx.hasTorrents && ctx.size.showSpeedColumns,
  downSpeed: (ctx) => ctx.size.showSpeedColumns,
  time: (ctx) => ctx.size.showTimeColumn,
  state: (ctx) => ctx.size.showStateColumn,
};

function shouldIncludeColumn(accessor: string, ctx: ColumnContext): boolean {
  if (!ctx.optionsColumnSet.has(accessor)) return false;
  const check = columnVisibilityChecks[accessor];
  if (check && !check(ctx)) return false;
  return true;
}
```

## 4. Column Persistence (Drag/Resize → Server)

`useDataTableColumns` stores column order and widths in localStorage by default. For widgets, this must persist server-side so it works across devices.

### Hidden widget options

In `index.ts`, add hidden text options:

```typescript
columnOrder: factory.text({ defaultValue: "" }),
columnWidths: factory.text({ defaultValue: "" }),
```

With visibility override:

```typescript
{
  columnOrder: { shouldHide: () => true },
  columnWidths: { shouldHide: () => true },
}
```

### Translation keys required

Even hidden options need translation keys or the translation test fails:

```json
"widget.mywidget.option.columnOrder.label": "Column order",
"widget.mywidget.option.columnWidths.label": "Column widths"
```

### Dynamic storeKey

Use a key that includes `itemId` and sorted column names. This prevents cross-widget localStorage bleeding:

```typescript
const storeKey = `mytable-${itemId ?? "preview"}-${[...options.columns].toSorted().join(",")}`;
```

### Hydration from server → localStorage

On mount, seed `useDataTableColumns` with server-persisted values. Use a `hydrated` ref to prevent the persist effect from immediately writing defaults back:

```typescript
const {
  effectiveColumns,
  columnsOrder,
  columnsWidth,
  setColumnsOrder,
  setMultipleColumnWidths,
} = useDataTableColumns<MyRow>({ key: storeKey, columns });

const lastStoreKey = useRef(storeKey);
const hydrated = useRef(false);

useEffect(() => {
  if (lastStoreKey.current !== storeKey) {
    lastStoreKey.current = storeKey;
    hydrated.current = false;
  }
  if (hydrated.current) return;
  if (savedOrder.length > 0) setColumnsOrder(savedOrder);
  if (Object.keys(savedWidths).length > 0) {
    setMultipleColumnWidths(
      Object.entries(savedWidths).map(([accessor, w]) => ({
        accessor,
        width: w,
      })),
    );
  }
  requestAnimationFrame(() => {
    hydrated.current = true;
  });
}, [
  storeKey,
  savedOrder,
  savedWidths,
  setColumnsOrder,
  setMultipleColumnWidths,
]);
```

### Persist localStorage → server

Watch for changes and write back:

```typescript
const prevOrder = useRef(columnsOrder);
const prevWidths = useRef(columnsWidth);

useEffect(() => {
  if (!hydrated.current) return;
  const orderChanged =
    JSON.stringify(columnsOrder) !== JSON.stringify(prevOrder.current);
  const widthsChanged =
    JSON.stringify(columnsWidth) !== JSON.stringify(prevWidths.current);
  prevOrder.current = columnsOrder;
  prevWidths.current = columnsWidth;

  if (!orderChanged && !widthsChanged) return;

  if (orderChanged)
    persistOption({ columnOrder: JSON.stringify(columnsOrder) });
  if (widthsChanged) {
    const widthMap: Record<string, number> = {};
    for (const entry of columnsWidth) {
      const key = Object.keys(entry)[0];
      if (!key) continue;
      const v = entry[key as keyof typeof entry];
      if (typeof v === "number") widthMap[key] = v;
      else if (typeof v === "string" && v.endsWith("px"))
        widthMap[key] = parseInt(v, 10);
    }
    persistOption({ columnWidths: JSON.stringify(widthMap) });
  }
}, [columnsOrder, columnsWidth, persistOption]);
```

The `persistOption` helper calls both `setOptions` (local state) and `saveItemOptions` (server mutation).

## 5. Context Menu (Right-Click)

Do NOT install `mantine-contextmenu`. Use Mantine's `Menu` + `Portal` directly:

```typescript
interface ContextMenuState {
  x: number;
  y: number;
  item: MyRow;
}

const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

const handleContextMenu = useCallback(
  ({ record, event }: { record: MyRow; event: React.MouseEvent }) => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY, item: record });
  },
  [],
);

// On DataTable:
<DataTable onRowContextMenu={handleContextMenu} />

// Render:
{contextMenu && <RowContextMenu state={contextMenu} onClose={closeContextMenu} />}
```

The menu component uses `Portal` for correct z-index:

```tsx
function RowContextMenu({
  state,
  onClose,
}: {
  state: ContextMenuState;
  onClose: () => void;
}) {
  return (
    <Portal>
      <Menu
        opened
        onClose={onClose}
        closeOnItemClick={false}
        position="right-start"
        offset={0}
      >
        <Menu.Target>
          <Box
            style={{
              position: "fixed",
              left: state.x,
              top: state.y,
              width: 0,
              height: 0,
            }}
          />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            onClick={() => {
              /* action */ onClose();
            }}
          >
            Action
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Portal>
  );
}
```

**Key fix:** Use `closeOnItemClick={false}` if any menu item needs a two-step confirmation (like delete → confirm). Close the menu on scroll: `onScroll={() => { if (contextMenu) closeContextMenu(); }}`.

## 6. Row Expansion

```typescript
<DataTable
  rowExpansion={{
    trigger: "click",
    allowMultiple: true,
    collapseProps: {
      transitionDuration: 200,
      animateOpacity: true,
      transitionTimingFunction: "ease-out",
    },
    content: ({ record, collapse }) => <ExpandedRow item={record} collapse={collapse} />,
  }}
/>
```

**Critical:** Do NOT set `onRowClick` when using `rowExpansion` with `trigger: "click"`. They conflict and the expansion won't work.

## 7. Common Pitfalls & Fixes

### Status indicator dots

Don't use `<Badge variant="dot" />` without children — it renders a pill with empty space. Use a plain `Box`:

```tsx
<Box
  w={8}
  h={8}
  style={{
    borderRadius: "50%",
    backgroundColor: `var(--mantine-color-${color}-filled)`,
    flexShrink: 0,
  }}
/>
```

### Tooltip overflow on long text columns

When a column has `ellipsis: true`, the tooltip target element can still extend beyond the cell bounds if inner elements don't clip. Fix:

```tsx
<Tooltip position="bottom-start" ...>
  <Group style={{ overflow: "hidden" }}>
    ...
  </Group>
</Tooltip>
```

Use `position="bottom-start"` instead of `position="right"` so the tooltip never escapes the widget horizontally.

### Dark mode tooltips

Mantine tooltips default to the theme's tooltip color which may be white in light mode and stay white in dark mode. Always set `color="dark"` on informational tooltips inside widgets.

### Division by zero

Guard all ratio calculations:

```typescript
if (item.size > 0) ratio = item.sent / item.size;
if (totalDown > 0) ratio = totalUp / totalDown;
```

### Composite idAccessor

When rows can come from multiple integrations, IDs may collide. Use a composite key:

```typescript
idAccessor={(record) => `${record.integration.id}:${record.id}`}
```

### JSON option parsing

Always wrap in try/catch:

```typescript
function parseJsonOption<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
```

### Clipboard API

`navigator.clipboard.writeText()` can throw in non-HTTPS contexts. Always catch:

```typescript
void navigator.clipboard.writeText(text).catch(() => {});
```

### Sync sortStatus with widget options

If the widget has configurable default sort, sync it:

```typescript
useEffect(() => {
  setSortStatus({
    columnAccessor: options.defaultSort,
    direction: defaultSortDirection,
  });
}, [options.defaultSort, defaultSortDirection]);
```

## 8. Accessibility

- All `ActionIcon` components need `aria-label`
- Filter toggles (client badges, status badges) need `aria-pressed={isActive}`
- `textSelectionDisabled` on DataTable prevents accidental text selection during drag/resize

## 9. Error Handling

- Every mutation needs an `onError` callback with `showErrorNotification`
- The `saveItemOptions` mutation (column persistence) also needs `onError`
- Check `isError` on the main query and show a fallback UI
- Use a shared `mutationOptions` object to avoid repeating `onSettled`/`onError`:

```typescript
const mutationOptions = {
  onSettled: () => void utils.myQuery.invalidate(),
  onError: () =>
    showErrorNotification({
      title: t("errors.actionFailed"),
      message: t("errors.actionFailedMessage"),
    }),
};
```

## 10. i18n

- No hardcoded strings. Every user-visible string goes through `useScopedI18n`
- Column titles: `t("items.{accessor}.columnTitle")`
- Detail labels: `t("items.{accessor}.detailsTitle")`
- States: `t("states.{state}")`
- Actions: `t("actions.{action}")`
- Errors: `t("errors.{errorKey}")`
- Hidden options still need `.label` translation keys

## 11. Edit Mode

Disable pointer events on the table during edit mode to prevent conflicts with the board's drag-and-drop:

```typescript
let tablePointerEvents: React.CSSProperties["pointerEvents"];
if (isEditMode) tablePointerEvents = "none";

let rowContextMenuHandler = handleContextMenu;
if (isEditMode) rowContextMenuHandler = undefined;

<DataTable style={{ pointerEvents: tablePointerEvents }} />
```

## 12. DataTable Props Reference (Commonly Used)

```typescript
<DataTable
  records={sortedData}
  columns={effectiveColumns}
  storeColumnsKey={storeKey}
  withTableBorder={false}
  borderRadius={0}
  highlightOnHover
  striped="odd"
  stripedColor={{ dark: "dark.7", light: "gray.0" }}
  highlightOnHoverColor={{ dark: "dark.5", light: "gray.1" }}
  verticalAlign="center"
  fetching={isFetching && data.length === 0}
  loaderBackgroundBlur={2}
  fz={size.fontSize}
  textSelectionDisabled
  sortStatus={sortStatus}
  onSortStatusChange={setSortStatus}
  noRecordsText={t("errors.noItems")}
  idAccessor={(record) => record.uniqueKey}
  height="100%"
  className="my-table"
  defaultColumnProps={{
    noWrap: true,
    draggable: true,
    resizable: true,
    cellsStyle: () => ({ padding: `${size.cellPadding}px 8px` }),
  }}
  scrollAreaProps={{ type: "auto", scrollbarSize: 6 }}
  rowBackgroundColor={(record) => conditionalBgMap[record.state]}
  onRowContextMenu={handleContextMenu}
  rowExpansion={{ ... }}
  onScroll={() => { if (contextMenu) closeContextMenu(); }}
/>
```

## 13. Layout Stability

- Don't use `table-layout: fixed` — it fights mantine-datatable's resize logic
- Give non-name columns explicit `width` values so only the name column flexes
- Use `ellipsis: true` on the name column — it handles `text-overflow: ellipsis` internally
- Names should truncate at the cell boundary, not a character count, so the layout is stable regardless of content length
- `flexShrink: 0` on badges/icons prevents them from being squeezed by long names

## 14. Checklist for Each Migration

1. Replace imports (`mantine-react-table` → `mantine-datatable`)
2. Convert column definitions (`accessorKey` → `accessor`, `header` → `title`, `Cell` → `render`, etc.)
3. Implement manual sorting with `useState` + `useMemo`
4. Add CSS file for transparent backgrounds (if widget context)
5. Add responsive column visibility (if widget context)
6. Add hidden options + hydration logic (if column persistence needed)
7. Add translation keys (including hidden option labels)
8. Add context menu if row actions exist
9. Add row expansion if detail view exists
10. Add error handling on all mutations
11. Add accessibility attributes
12. Test at multiple widget widths
13. Update docs in `apps/docs/docs/widgets/` if applicable
14. Run `pnpm turbo typecheck`
15. Run translation spec — catches missing keys
