import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { KubernetesSecret } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import { useRelativeCreationTime, useTranslatedMantineReactTable } from "../table-hooks";

export interface SecretsTableProps {
  data: KubernetesSecret[];
}

const createColumns = (
  tField: ScopedTranslationFunction<"kubernetes.field">,
  relativeTime: (date: Date | undefined) => string,
): MRT_ColumnDef<KubernetesSecret>[] => [
  { accessorKey: "name", header: tField("name.label"), enableClickToCopy: true },
  { accessorKey: "namespace", header: tField("namespace.label"), enableClickToCopy: true },
  { accessorKey: "type", header: tField("type.label"), enableClickToCopy: true },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => relativeTime(row.original.creationTimestamp),
  },
];

export function SecretsTable({ data }: SecretsTableProps) {
  const tSecrets = useI18n("kubernetes.secrets");
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
      placeholder: tSecrets("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },
    columns: createColumns(tField, relativeTime),
  });
  return <MantineReactTable table={table} />;
}
