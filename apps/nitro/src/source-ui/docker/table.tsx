import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { DockerTableViewProps, DockerViewContainer } from "./contracts";

export function DockerTableView<Container extends DockerViewContainer>(props: DockerTableViewProps<Container>) {
  const table = useMantineReactTable({
    columns: props.columns,
    data: props.containers,
    localization: props.localization,
    getRowId: (row) => row.resourceId,
    state: { isLoading: props.fetching, showProgressBars: props.actionPending },
    enableDensityToggle: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableRowSelection: true,
    enableRowActions: true,
    positionActionsColumn: "last",
    positionToolbarAlertBanner: "top",
    enableTableFooter: false,
    enableBottomToolbar: false,
    enableFullScreenToggle: false,
    positionGlobalFilter: "right",
    mantineSearchTextInputProps: {
      placeholder: props.searchLabel,
      style: { minWidth: 300 },
      autoFocus: true,
      "aria-label": props.searchLabel,
    },
    initialState: { density: "xs", showGlobalFilter: true, columnVisibility: { cpuUsage: false, memoryUsage: false } },
    mantineTableBodyCellProps: { style: { padding: "4px 8px" } },
    mantineTableHeadCellProps: { style: { padding: "4px 8px" } },
    renderRowActions: ({ row }) => props.renderRowActions(row.original),
    renderTopToolbarCustomActions: () => (
      <Button
        variant="default"
        rightSection={<IconRefresh size="1rem" />}
        onClick={props.onRefresh}
        disabled={!props.onRefresh || props.actionPending}
        loading={props.fetching}
      >
        {props.refreshLabel}
      </Button>
    ),
    renderToolbarAlertBannerContent: ({ groupedAlert, table: currentTable }) => {
      const selected = currentTable.getSelectedRowModel().rows.map(({ original }) => original);
      return (
        <Group gap="sm">
          {groupedAlert}
          <Text fw={500}>{props.selectedLabel(selected.length, currentTable.getRowCount())}</Text>
          {props.renderSelectedActions(selected)}
        </Group>
      );
    },
    renderEmptyRowsFallback: () => <Text p="md">{props.emptyLabel}</Text>,
  });
  return (
    <Stack gap="xs">
      {props.unavailableLabel && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
          {props.unavailableLabel}
        </Alert>
      )}
      <Text>{props.updatedLabel}</Text>
      <MantineReactTable table={table} />
    </Stack>
  );
}
