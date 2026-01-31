"use client";

import { useState } from "react";
import type { MantineColor } from "@mantine/core";
import { Alert, Badge, Box, Button, Group, Select, Stack, Text } from "@mantine/core";
import {
  IconInfoCircle,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRotateClockwise,
  IconServer,
} from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import type { TablerIcon } from "@homarr/ui";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

type IncusInstance = RouterOutputs["incus"]["getInstances"][number];

const instanceStateColorMap: Record<string, MantineColor> = {
  Running: "green",
  Stopped: "red",
  Frozen: "blue",
  Error: "red",
  Starting: "yellow",
  Stopping: "orange",
};

// Static labels until translations are built
const labels = {
  title: "Incus Instances",
  selectIntegration: "Select Incus Server",
  noIntegration: "No Incus integrations configured. Add an Incus integration first.",
  table: {
    updated: "Updated",
    search: "Search instances",
    selected: "selected",
  },
  field: {
    name: "Name",
    type: "Type",
    state: "State",
    description: "Description",
    location: "Node",
  },
  action: {
    refresh: "Refresh",
    start: { label: "Start", success: "Instances started", error: "Failed to start instances" },
    stop: { label: "Stop", success: "Instances stopped", error: "Failed to stop instances" },
    restart: { label: "Restart", success: "Instances restarted", error: "Failed to restart instances" },
    freeze: { label: "Freeze", success: "Instances frozen", error: "Failed to freeze instances" },
    unfreeze: { label: "Unfreeze", success: "Instances unfrozen", error: "Failed to unfreeze instances" },
  },
};

const createColumns = (): MRT_ColumnDef<IncusInstance>[] => [
  {
    accessorKey: "name",
    header: labels.field.name,
    Cell({ renderedCellValue, row }) {
      return (
        <Group gap="xs">
          <IconServer size={20} />
          <Text>{renderedCellValue}</Text>
          {row.original.type === "virtual-machine" && (
            <Badge size="xs" variant="light" color="violet">
              VM
            </Badge>
          )}
        </Group>
      );
    },
  },
  {
    accessorKey: "status",
    header: labels.field.state,
    size: 120,
    Cell({ cell }) {
      const state = cell.row.original.status;
      return (
        <Badge size="lg" radius="sm" variant="light" w={120} color={instanceStateColorMap[state] ?? "gray"}>
          {state}
        </Badge>
      );
    },
  },
  {
    accessorKey: "type",
    header: labels.field.type,
    size: 120,
    Cell({ cell }) {
      const type = cell.row.original.type;
      return (
        <Badge size="md" variant="outline" color={type === "virtual-machine" ? "violet" : "cyan"}>
          {type === "virtual-machine" ? "VM" : "Container"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "description",
    header: labels.field.description,
    maxSize: 200,
    Cell({ renderedCellValue, cell }) {
      return (
        <Box maw={200}>
          <Text truncate="end" title={cell.row.original.description}>
            {renderedCellValue || "-"}
          </Text>
        </Box>
      );
    },
  },
  {
    accessorKey: "location",
    header: labels.field.location,
    size: 100,
    Cell({ cell }) {
      return <Text>{cell.row.original.location}</Text>;
    },
  },
];

interface IncusInstancesTableProps {
  integrations: RouterOutputs["integration"]["all"];
}

export function IncusInstancesTable({ integrations }: IncusInstancesTableProps) {
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(
    integrations.length > 0 ? integrations[0]?.id ?? null : null,
  );

  const { data, isLoading, dataUpdatedAt, refetch, isRefetching } = clientApi.incus.getInstances.useQuery(
    { integrationId: selectedIntegrationId ?? "" },
    {
      enabled: !!selectedIntegrationId,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const timestamp = new Date(dataUpdatedAt);
  const relativeTime = useTimeAgo(timestamp);

  const table = useTranslatedMantineReactTable({
    data: data ?? [],
    enableDensityToggle: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableRowSelection: true,
    positionToolbarAlertBanner: "top",
    enableTableFooter: false,
    enableBottomToolbar: false,
    positionGlobalFilter: "right",
    state: {
      isLoading,
    },
    mantineSearchTextInputProps: {
      placeholder: `${labels.table.search} (${data?.length ?? 0})`,
      style: { minWidth: 300 },
      autoFocus: true,
    },
    initialState: { density: "xs", showGlobalFilter: true },
    renderTopToolbarCustomActions: () => {
      return (
        <Group>
          <Select
            value={selectedIntegrationId}
            onChange={setSelectedIntegrationId}
            data={integrations.map((i) => ({ value: i.id, label: i.name }))}
            placeholder={labels.selectIntegration}
            w={200}
          />
          <Button
            variant="default"
            rightSection={<IconRefresh size="1rem" />}
            onClick={() => refetch()}
            loading={isRefetching}
          >
            {labels.action.refresh}
          </Button>
        </Group>
      );
    },
    renderToolbarAlertBannerContent: ({ groupedAlert, table }) => {
      const selectedInstances = table.getSelectedRowModel().rows.map((row) => row.original);
      return (
        <Group gap="sm">
          {groupedAlert}
          <Text fw={500}>
            {table.getSelectedRowModel().rows.length} of {table.getRowCount()} {labels.table.selected}
          </Text>
          <InstanceActionBar
            selectedInstances={selectedInstances}
            integrationId={selectedIntegrationId ?? ""}
            onActionComplete={() => refetch()}
          />
        </Group>
      );
    },
    columns: createColumns(),
  });

  if (integrations.length === 0) {
    return (
      <Alert icon={<IconInfoCircle size={16} />} title={labels.noIntegration} color="blue">
        Add an Incus integration in the integrations management page to start monitoring your instances.
      </Alert>
    );
  }

  return (
    <Stack>
      {data && <Text>{labels.table.updated} {relativeTime}</Text>}
      <MantineReactTable table={table} />
    </Stack>
  );
}

interface InstanceActionBarProps {
  selectedInstances: IncusInstance[];
  integrationId: string;
  onActionComplete: () => void;
}

const InstanceActionBar = ({ selectedInstances, integrationId, onActionComplete }: InstanceActionBarProps) => {
  const selectedNames = selectedInstances.map((instance) => instance.name);

  return (
    <Group gap="xs">
      <InstanceActionBarButton
        icon={IconPlayerPlay}
        color="green"
        action="start"
        selectedNames={selectedNames}
        integrationId={integrationId}
        onComplete={onActionComplete}
      />
      <InstanceActionBarButton
        icon={IconPlayerStop}
        color="red"
        action="stop"
        selectedNames={selectedNames}
        integrationId={integrationId}
        onComplete={onActionComplete}
      />
      <InstanceActionBarButton
        icon={IconRotateClockwise}
        color="orange"
        action="restart"
        selectedNames={selectedNames}
        integrationId={integrationId}
        onComplete={onActionComplete}
      />
      <InstanceActionBarButton
        icon={IconPlayerPause}
        color="blue"
        action="freeze"
        selectedNames={selectedNames}
        integrationId={integrationId}
        onComplete={onActionComplete}
      />
      <InstanceActionBarButton
        icon={IconPlayerPlay}
        color="cyan"
        action="unfreeze"
        selectedNames={selectedNames}
        integrationId={integrationId}
        onComplete={onActionComplete}
      />
    </Group>
  );
};

interface InstanceActionBarButtonProps {
  icon: TablerIcon;
  color: MantineColor;
  action: "start" | "stop" | "restart" | "freeze" | "unfreeze";
  selectedNames: string[];
  integrationId: string;
  onComplete: () => void;
}

const InstanceActionBarButton = (props: InstanceActionBarButtonProps) => {
  const mutationMap = {
    start: clientApi.incus.startInstances,
    stop: clientApi.incus.stopInstances,
    restart: clientApi.incus.restartInstances,
    freeze: clientApi.incus.freezeInstances,
    unfreeze: clientApi.incus.unfreezeInstances,
  };

  const actionLabels = labels.action[props.action];

  const { mutateAsync, isPending } = mutationMap[props.action].useMutation({
    onSettled() {
      props.onComplete();
    },
  });

  const handleClickAsync = async () => {
    await mutateAsync(
      { integrationId: props.integrationId, instanceNames: props.selectedNames },
      {
        onSuccess(result) {
          if (result.success > 0) {
            showSuccessNotification({
              title: actionLabels.success,
              message: `${result.success} instance(s) ${props.action}ed successfully`,
            });
          }
          if (result.failed > 0) {
            showErrorNotification({
              title: actionLabels.error,
              message: `${result.failed} instance(s) failed to ${props.action}`,
            });
          }
        },
        onError() {
          showErrorNotification({
            title: actionLabels.error,
            message: `Failed to ${props.action} instances`,
          });
        },
      },
    );
  };

  return (
    <Button
      leftSection={<props.icon />}
      color={props.color}
      onClick={handleClickAsync}
      loading={isPending}
      variant="light"
      radius="md"
    >
      {actionLabels.label}
    </Button>
  );
};
