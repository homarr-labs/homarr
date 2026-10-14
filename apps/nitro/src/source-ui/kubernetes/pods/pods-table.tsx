import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { KubernetesPod } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import { useRelativeCreationTime, useTranslatedMantineReactTable } from "../table-hooks";

export interface PodsTableProps {
  data: KubernetesPod[];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.pods">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
  relativeTime: (date: Date | undefined) => string,
): MRT_ColumnDef<KubernetesPod>[] => [
  { accessorKey: "name", header: tField("name.label") },
  { accessorKey: "namespace", header: tField("namespace.label") },
  { accessorKey: "image", header: t("field.image.label") },
  { accessorKey: "applicationType", header: t("field.applicationType.label") },
  { accessorKey: "status", header: tField("status.label") },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => relativeTime(row.original.creationTimestamp),
  },
];

export function PodsTable({ data }: PodsTableProps) {
  const tPods = useI18n("kubernetes.pods");
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
    initialState: { density: "xs", showGlobalFilter: true, expanded: true },
    mantineSearchTextInputProps: {
      placeholder: tPods("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },
    enableGrouping: true,
    columns: createColumns(tPods, tField, relativeTime),
  });
  return <MantineReactTable table={table} />;
}
