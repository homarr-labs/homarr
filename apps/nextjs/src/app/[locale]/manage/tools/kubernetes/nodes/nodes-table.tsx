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
import { invariantTechnicalLabels } from "@homarr/definitions";
import type { KubernetesNode } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import KubernetesErrorPage from "../cluster-dashboard/error";
import { createKubernetesResourceQueryOptions } from "../kubernetes-query-options";

dayjs.extend(relativeTime);

interface NodesListComponentProps {
  contextId: string;
  initialNodes: RouterOutputs["kubernetes"]["nodes"]["getNodes"];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.nodes">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
  tResource: ScopedTranslationFunction<"kubernetes.cluster.resources">,
): MRT_ColumnDef<KubernetesNode>[] => [
  {
    accessorKey: "status",
    header: tField("state.label"),

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
    header: tField("name.label"),
    enableClickToCopy: true,
  },
  {
    accessorKey: "allocatableCpuPercentage",
    header: invariantTechnicalLabels.cpu,
    Cell({ cell }) {
      return getRingProgress(cell.row.original.allocatableCpuPercentage, t("field.metricsUnavailable"));
    },
  },
  {
    accessorKey: "allocatableRamPercentage",
    header: invariantTechnicalLabels.ram,
    Cell({ cell }) {
      return getRingProgress(cell.row.original.allocatableRamPercentage, t("field.metricsUnavailable"));
    },
  },
  {
    accessorKey: "operatingSystem",
    header: invariantTechnicalLabels.os,
  },
  {
    accessorKey: "podsCount",
    header: tResource("pods"),
  },
  {
    accessorKey: "architecture",
    header: tField("architecture.label"),
  },
  {
    accessorKey: "kubernetesVersion",
    header: t("field.kubernetesVersion.label"),
  },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => dayjs(row.original.creationTimestamp).fromNow(false),
  },
];

export function NodesTable({ contextId, initialNodes }: NodesListComponentProps) {
  const tNodes = useI18n("kubernetes.nodes");
  const tField = useI18n("kubernetes.field");
  const tResource = useI18n("kubernetes.cluster.resources");

  const { data, isError } = clientApi.kubernetes.nodes.getNodes.useQuery(
    { contextId },
    createKubernetesResourceQueryOptions(initialNodes),
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
    columns: createColumns(tNodes, tField, tResource),
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
