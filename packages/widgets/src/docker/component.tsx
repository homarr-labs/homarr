"use client";

import type { MantineColor, MantineStyleProp } from "@mantine/core";
import { ActionIcon, Avatar, Badge, Group, Stack, Text, Tooltip } from "@mantine/core";
import type { IconProps } from "@tabler/icons-react";
import { IconBrandDocker, IconPlayerPlay, IconPlayerStop, IconRotateClockwise } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import type { ContainerState } from "../../../docker/src";

const containerStates = {
  created: "cyan",
  running: "green",
  paused: "yellow",
  restarting: "orange",
  exited: "red",
  removing: "pink",
  dead: "dark",
} satisfies Record<ContainerState, MantineColor>;

const ContainerStateBadge = ({ state }: { state: ContainerState }) => {
  const t = useScopedI18n("docker");
  return (
    <Badge radius="sm" variant="transparent" color={containerStates[state]}>
      <Text>{t(`field.state.option.${state}`)}</Text>
    </Badge>
  );
};

const badgeColor = (number: number, state: string) => {
  if (number === 0 && state !== "running") return "red";
  if (number < 40) return "green";
  if (number < 60) return "yellow";
  if (number < 90) return "orange";
  return "red";
};

const safeValue = (value?: number, fallback = 0) => value ?? fallback;

const actionIconIconStyle: IconProps["style"] = {
  height: "var(--ai-icon-size)",
  width: "var(--ai-icon-size)",
};

const baseStyle: MantineStyleProp = {
  "--total-width": "calc(100cqw / var(--total-width))",
  "--ratio-width": "calc(100cqw / var(--total-width))",
  "--space-size": "calc(var(--ratio-width) * 0.1)", //Standard gap and spacing value
  "--text-fz": "calc(var(--ratio-width) * 0.45)", //General Font Size
  "--icon-size": "calc(var(--ratio-width) * 2 / 3)", //Normal icon size
  "--mrt-base-background-color": "transparent",
};

const columns = (
  t: ReturnType<typeof useScopedI18n<"docker">>,
): MRT_ColumnDef<RouterOutputs["docker"]["getContainersStats"]["data"]["containers"][number]>[] => [
  {
    accessorKey: "name",
    header: t("field.name.label"),
    mantineTableHeadCellProps: {
      style: {
        width: "25%",
      },
    },
    Cell({ renderedCellValue, row }) {
      return (
        <Group gap="xs">
          <Avatar variant="outline" radius="md" size="10cqmin" src={row.original.iconUrl}>
            {row.original.name.at(0)?.toUpperCase()}
          </Avatar>
          <Text p="0.5" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {renderedCellValue}
          </Text>
        </Group>
      );
    },
  },
  {
    accessorKey: "state",
    header: t("field.state.label"),
    mantineTableHeadCellProps: {
      style: {
        width: "25%",
      },
    },
    Cell({ row }) {
      return <ContainerStateBadge state={row.original.state as ContainerState} />;
    },
  },
  {
    accessorKey: "cpuUsage",
    header: t("field.stats.cpu.label"),
    mantineTableHeadCellProps: {
      style: {
        width: "20%",
      },
    },
    Cell({ row }) {
      return (
        <Badge
          radius="sm"
          variant="transparent"
          color={badgeColor(safeValue(row.original.cpuUsage), row.original.state)}
        >
          <Text>{`${row.original.cpuUsage.toFixed(2)}%`}</Text>
        </Badge>
      );
    },
  },
  {
    accessorKey: "memoryUsage",
    header: t("field.stats.memory.label"),
    mantineTableHeadCellProps: {
      style: {
        width: "20%",
      },
    },
    Cell({ row }) {
      return (
        <Badge
          radius="sm"
          variant="transparent"
          color={badgeColor(safeValue(row.original.memoryUsage), row.original.state)}
        >
          <Text>{(safeValue(row.original.memoryUsage) / (1024 * 1024)).toFixed(2)} MiB</Text>
        </Badge>
      );
    },
  },
  {
    accessorKey: "actions",
    header: t("action.title"),
    mantineTableHeadCellProps: {
      style: {
        width: "10%",
      },
    },
    Cell({ row }) {
      const utils = clientApi.useUtils();
      const { mutateAsync: startContainer } = clientApi.docker.startAll.useMutation();
      const { mutateAsync: stopContainer } = clientApi.docker.stopAll.useMutation();
      const { mutateAsync: restartContainer } = clientApi.docker.restartAll.useMutation();

      const handleActionAsync = async (action: "start" | "stop" | "restart") => {
        const mutation = action === "start" ? startContainer : action === "stop" ? stopContainer : restartContainer;

        await mutation(
          { ids: [row.original.id] },
          {
            async onSettled() {
              await utils.docker.getContainersStats.invalidate();
            },
            onSuccess() {
              showSuccessNotification({
                title: t(`action.${action}.notification.success.title`),
                message: t(`action.${action}.notification.success.message`),
              });
            },
            onError() {
              showErrorNotification({
                title: t(`action.${action}.notification.error.title`),
                message: t(`action.${action}.notification.error.message`),
              });
            },
          },
        );
      };

      return (
        <Group wrap="nowrap" gap="xs">
          <Tooltip label={row.original.state === "running" ? t("action.stop.label") : t("action.start.label")}>
            <ActionIcon
              variant="transparent"
              radius={999}
              size="var(--button-size)"
              onClick={() => handleActionAsync(row.original.state === "running" ? "stop" : "start")}
            >
              {row.original.state === "running" ? (
                <IconPlayerStop style={actionIconIconStyle} />
              ) : (
                <IconPlayerPlay style={actionIconIconStyle} />
              )}
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("action.restart.label")}>
            <ActionIcon
              variant="transparent"
              radius={999}
              size="var(--button-size)"
              onClick={() => handleActionAsync("restart")}
            >
              <IconRotateClockwise style={actionIconIconStyle} />
            </ActionIcon>
          </Tooltip>
        </Group>
      );
    },
  },
];

export default function DockerWidget() {
  const t = useScopedI18n("docker");

  const [{ data }] = clientApi.docker.getContainersStats.useSuspenseQuery();
  const relativeTime = useTimeAgo(new Date());

  const totalContainers = data.containers.length;
  const containerStateCounts = data.containers.reduce<Record<string, number>>((acc, container) => {
    acc[container.state] = (acc[container.state] ?? 0) + 1;
    return acc;
  }, {});

  const table = useTranslatedMantineReactTable({
    columns: columns(t),
    data: data.containers,
    enablePagination: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableSorting: false,
    enableColumnActions: false,
    enableStickyHeader: false,
    enableColumnOrdering: false,
    enableRowSelection: false,
    enableFullScreenToggle: false,
    enableGlobalFilter: false,
    enableDensityToggle: false,
    enableFilters: false,
    enableHiding: false,
    initialState: {
      density: "xs",
    },
    mantinePaperProps: {
      flex: 1,
      withBorder: false,
      shadow: undefined,
    },
    mantineTableProps: {
      className: "docker-widget-table",
      style: {
        tableLayout: "fixed",
      },
    },
    mantineTableContainerProps: {
      style: {
        height: "100%",
      },
    },
  });

  return (
    <Stack gap={0} h="100%" display="flex" style={baseStyle}>
      <MantineReactTable table={table} />
      <Group
        gap="1cqmin"
        h="var(--ratio-width)"
        px="var(--space-size)"
        pr="3cqmin"
        pl="3cqmin"
        justify="space-between"
        style={{
          borderTop: "0.0625rem solid var(--border-color)",
        }}
      >
        <Group gap={1}>
          <IconBrandDocker />
          <Text>{t("table.footer", { count: totalContainers })}</Text>
        </Group>
        <Group gap="2cqmin">
          {Object.entries(containerStateCounts).map(([state, count]) =>
            count > 0 ? (
              <Text key={state} variant="light">
                {t(`field.state.option.${state as keyof typeof containerStates}`)}:{count}
              </Text>
            ) : null,
          )}
        </Group>
        <Text p="2cqmin">{t("table.updated", { when: relativeTime })}</Text>
      </Group>
    </Stack>
  );
}
