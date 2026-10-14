import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { KubernetesVolume } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import { useRelativeCreationTime, useTranslatedMantineReactTable } from "../table-hooks";

export interface VolumesTableProps {
  data: KubernetesVolume[];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.volumes">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
  relativeTime: (date: Date | undefined) => string,
): MRT_ColumnDef<KubernetesVolume>[] => [
  { accessorKey: "status", header: tField("status.label") },
  { accessorKey: "name", header: tField("name.label"), enableClickToCopy: true },
  { accessorKey: "namespace", header: tField("namespace.label"), enableClickToCopy: true },
  { accessorKey: "storage", header: t("field.storage.label") },
  { accessorKey: "storageClassName", header: t("field.storageClassName.label"), enableClickToCopy: true },
  { accessorKey: "volumeMode", header: t("field.volumeMode.label") },
  { accessorKey: "volumeName", header: t("field.volumeName.label"), enableClickToCopy: true },
  {
    accessorKey: "accessModes",
    header: t("field.accessModes.label"),
    Cell: ({ row }) => row.original.accessModes.map((mode) => <div key={mode}>{mode}</div>),
  },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => relativeTime(row.original.creationTimestamp),
  },
];

export function VolumesTable({ data }: VolumesTableProps) {
  const tVolumes = useI18n("kubernetes.volumes");
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
      placeholder: tVolumes("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },
    columns: createColumns(tVolumes, tField, relativeTime),
  });
  return <MantineReactTable table={table} />;
}
