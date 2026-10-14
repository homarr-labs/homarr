import { Badge, rem } from "@mantine/core";
import { IconCircleDashedCheck, IconHeartBroken } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { KubernetesBaseResource } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import { useRelativeCreationTime, useTranslatedMantineReactTable } from "../table-hooks";

export interface KubernetesNamespaceRow extends KubernetesBaseResource {
  status: string | undefined;
}

export interface NamespacesTableProps {
  data: KubernetesNamespaceRow[];
}

const createColumns = (
  tField: ScopedTranslationFunction<"kubernetes.field">,
  relativeTime: (date: Date | undefined) => string,
): MRT_ColumnDef<KubernetesNamespaceRow>[] => [
  {
    accessorKey: "status",
    header: tField("state.label"),
    Cell({ cell }) {
      const checkIcon = <IconCircleDashedCheck style={{ width: rem(12), height: rem(12) }} />;
      const downIcon = <IconHeartBroken style={{ width: rem(12), height: rem(12) }} />;
      const color = cell.row.original.status === "Active" ? "green" : "yellow";
      const icon = cell.row.original.status === "Active" ? checkIcon : downIcon;
      return (
        <Badge leftSection={icon} color={color} variant="light">
          {cell.row.original.status}
        </Badge>
      );
    },
  },
  { accessorKey: "name", header: tField("name.label"), enableClickToCopy: true },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => relativeTime(row.original.creationTimestamp),
  },
];

export function NamespacesTable({ data }: NamespacesTableProps) {
  const tNamespaces = useI18n("kubernetes.namespaces");
  const tField = useI18n("kubernetes.field");
  const relativeTime = useRelativeCreationTime();
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
    columns: createColumns(tField, relativeTime),
  });
  return <MantineReactTable table={table} />;
}
