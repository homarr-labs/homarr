"use client";

import React from "react";
import { Badge, Progress, rem } from "@mantine/core";
import { IconCircleDashedCheck, IconHeartBroken } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { KubernetesNode } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useScopedI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

interface NodesListComponentProps {
  initialNodes: RouterOutputs["kubernetes"]["getNodes"];
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
      return (
        <Progress.Root size="xl">
          <Progress.Section value={cell.row.original.allocatableCpuPercentage} color="blue"></Progress.Section>
          <Progress.Section value={100 - cell.row.original.allocatableCpuPercentage} color="grey">
            <Progress.Label>{cell.row.original.allocatableCpuPercentage}%</Progress.Label>
          </Progress.Section>
        </Progress.Root>
      );
    },
  },
  {
    accessorKey: "allocatableRamPercentage",
    header: t("field.memory.label"),
    Cell({ cell }) {
      return (
        <Progress.Root size="xl">
          <Progress.Section value={cell.row.original.allocatableRamPercentage} color="blue"></Progress.Section>
          <Progress.Section value={cell.row.original.allocatableRamPercentage + 100} color="grey">
            <Progress.Label>{cell.row.original.allocatableRamPercentage}%</Progress.Label>
          </Progress.Section>
        </Progress.Root>
      );
    },
  },
  {
    accessorKey: "podsCount",
    header: t("field.pods.label"),
  },
  {
    accessorKey: "operatingSystem",
    header: t("field.operatingSystem.label"),
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
  },
];

export function NodesTable(initialData: NodesListComponentProps) {
  const tNodes = useScopedI18n("kubernetes.nodes");

  const { data } = clientApi.kubernetes.getNodes.useQuery(undefined, {
    initialData: initialData.initialNodes,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

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
      placeholder: tNodes("table.search", { count: data.length }),
      style: { minWidth: 300 },
      autoFocus: true,
    },
    columns: createColumns(tNodes),
  });

  return <MantineReactTable table={table} />;
}
