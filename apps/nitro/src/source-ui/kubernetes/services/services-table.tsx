import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { KubernetesService } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import { useRelativeCreationTime, useTranslatedMantineReactTable } from "../table-hooks";

export interface ServicesTableProps {
  data: KubernetesService[];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.services">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
  relativeTime: (date: Date | undefined) => string,
): MRT_ColumnDef<KubernetesService>[] => [
  { accessorKey: "name", header: tField("name.label"), enableClickToCopy: true },
  { accessorKey: "namespace", header: tField("namespace.label"), enableClickToCopy: true },
  { accessorKey: "type", header: tField("type.label") },
  {
    accessorKey: "ports",
    header: t("field.ports.label"),
    Cell: ({ row }) => row.original.ports?.map((port, index) => <div key={`${port}:${index}`}>{port}</div>),
  },
  {
    accessorKey: "targetPorts",
    header: t("field.targetPorts.label"),
    Cell: ({ row }) => row.original.targetPorts?.map((port, index) => <div key={`${port}:${index}`}>{port}</div>),
  },
  { accessorKey: "clusterIP", header: t("field.clusterIP.label"), enableClickToCopy: true },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => relativeTime(row.original.creationTimestamp),
  },
];

export function ServicesTable({ data }: ServicesTableProps) {
  const tServices = useI18n("kubernetes.services");
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
      placeholder: tServices("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },
    columns: createColumns(tServices, tField, relativeTime),
  });
  return <MantineReactTable table={table} />;
}
