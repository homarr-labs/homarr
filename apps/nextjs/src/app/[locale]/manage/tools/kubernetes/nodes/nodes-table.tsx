"use client";

import React from "react";
import { Badge, rem, RingProgress, Text } from "@mantine/core";
import { IconCircleDashedCheck, IconHeartBroken } from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { KubernetesNode } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import KubernetesErrorPage from "../cluster-dashboard/error";

dayjs.extend(relativeTime);

interface NodesListComponentProps {
  contextId: string;
  initialNodes: RouterOutputs["kubernetes"]["nodes"]["getNodes"];
}

const createColumns = (t: ScopedTranslationFunction<"kubernetes.nodes">): MRT_ColumnDef<KubernetesNode>[] => [
  {
    accessorKey: "status",
    header: t("field.state.label"),

    Cell({ cell }) {
      const checkIcon = <IconCircleDashedCheck style={{ width: rem(12), height: rem(12) }} />;
      const downIcon = <IconHeartBroken style={{ width: rem(12), height: rem(12) }} />;

      const badgeKubernetesNodeStatusColor = cell.row.original.status === "Ready" ? "green" : "red";
      const badgeKubernetesNodeStatusIcon = cell.row.original.status === "Ready" ? checkIcon : downIcon;

      return (
        <Badge leftSection={badgeKubernetesNodeStatusIcon} color={badgeKubernetesNodeStatusColor} variant="light">
          {cell.row.original.status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "name",
    header: t("field.name.label"),
    enableClickToCopy: true,
  },
  {
    accessorKey: "allocatableCpuPercentage",
    header: t("field.cpu.label"),
    Cell({ cell }) {
      return getRingProgress(cell.row.original.allocatableCpuPercentage, t("field.metricsUnavailable"));
    },
  },
  {
    accessorKey: "allocatableRamPercentage",
    header: t("field.memory.label"),
    Cell({ cell }) {
      return getRingProgress(cell.row.original.allocatableRamPercentage, t("field.metricsUnavailable"));
    },
  },
  {
    accessorKey: "operatingSystem",
    header: t("field.operatingSystem.label"),
  },
  {
    accessorKey: "podsCount",
    header: t("field.pods.label"),
  },
  {
    accessorKey: "architecture",
    header: t("field.architecture.label"),
  },
  {
    accessorKey: "kubernetesVersion",
    header: t("field.kubernetesVersion.label"),
  },
  {
    accessorKey: "creationTimestamp",
    header: t("field.creationTimestamp.label"),
    Cell: ({ row }) => dayjs(row.original.creationTimestamp).fromNow(false),
  },
];

export function NodesTable({ contextId, initialNodes }: NodesListComponentProps) {
  const tNodes = useScopedI18n("kubernetes.nodes");

  const { data, isError } = clientApi.kubernetes.nodes.getNodes.useQuery(
    { contextId },
    {
      initialData: initialNodes,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: (query) => (query.state.status === "error" ? 30_000 : false),
    },
  );

  const table = useTranslatedMantineReactTable({
    data,
    enableDensityToggle: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableRowSelection: true,
    positionToolbarAlertBanner: "top",
    enableTableFooter: false,
    enableBottomToolbar: false,
    positionGlobalFilter: "right",
    initialState: { density: "xs", showGlobalFilter: true },
    mantineSearchTextInputProps: {
      placeholder: tNodes("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },
    columns: createColumns(tNodes),
  });

  if (isError) {
    return <KubernetesErrorPage />;
  }

  return <MantineReactTable table={table} />;
}

function getRingProgress(value: number | null, unavailableLabel: string) {
  if (value === null) {
    return <Text c="dimmed">{unavailableLabel}</Text>;
  }

  return (
    <RingProgress
      size={70}
      roundCaps
      thickness={7}
      sections={[{ value, color: "blue" }]}
      label={
        <Text c="blue" fw={400} ta="center" size="md">
          {value}%
        </Text>
      }
    />
  );
}
