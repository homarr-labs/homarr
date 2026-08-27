"use client";

import React from "react";
import { Badge, rem } from "@mantine/core";
import { IconCircleDashedCheck, IconHeartBroken } from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { KubernetesNamespace } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import { createKubernetesResourceQueryOptions } from "../kubernetes-query-options";

dayjs.extend(relativeTime);

interface NamespacesTableComponentProps {
  contextId: string;
  initialNamespaces: RouterOutputs["kubernetes"]["namespaces"]["getNamespaces"];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.namespaces">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
): MRT_ColumnDef<KubernetesNamespace>[] => [
  {
    accessorKey: "status",
    header: tField("state.label"),

    Cell({ cell }) {
      const checkIcon = <IconCircleDashedCheck style={{ width: rem(12), height: rem(12) }} />;
      const downIcon = <IconHeartBroken style={{ width: rem(12), height: rem(12) }} />;

      const badgeKubernetesNamespaceStatusColor = cell.row.original.status === "Active" ? "green" : "yellow";
      const badgeKubernetesNamespaceStatusIcon = cell.row.original.status === "Active" ? checkIcon : downIcon;

      return (
        <Badge
          leftSection={badgeKubernetesNamespaceStatusIcon}
          color={badgeKubernetesNamespaceStatusColor}
          variant="light"
        >
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
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => dayjs(row.original.creationTimestamp).fromNow(false),
  },
];

export function NamespacesTable({ contextId, initialNamespaces }: NamespacesTableComponentProps) {
  const tNamespaces = useI18n("kubernetes.namespaces");
  const tField = useI18n("kubernetes.field");

  const { data } = clientApi.kubernetes.namespaces.getNamespaces.useQuery(
    { contextId },
    createKubernetesResourceQueryOptions(initialNamespaces),
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
      placeholder: tNamespaces("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },

    columns: createColumns(tNamespaces, tField),
  });

  return <MantineReactTable table={table} />;
}
