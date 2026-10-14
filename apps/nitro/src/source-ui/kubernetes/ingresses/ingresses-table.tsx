import { Anchor, Flex } from "@mantine/core";
import { IconArrowRight } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { KubernetesIngress } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import { useRelativeCreationTime, useTranslatedMantineReactTable } from "../table-hooks";

export interface IngressesTableProps {
  data: KubernetesIngress[];
}

const getAbsoluteUrl = (host: string) =>
  host.startsWith("http://") || host.startsWith("https://") ? host : `https://${host}`;

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.ingresses">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
  relativeTime: (date: Date | undefined) => string,
): MRT_ColumnDef<KubernetesIngress>[] => [
  { accessorKey: "name", header: tField("name.label"), enableClickToCopy: true },
  { accessorKey: "namespace", header: tField("namespace.label"), enableClickToCopy: true },
  { accessorKey: "className", header: t("field.className.label"), enableClickToCopy: true },
  {
    accessorKey: "rulesAndPaths",
    header: t("field.rulesAndPaths.label"),
    Cell({ cell }) {
      return (
        <>
          {cell.row.original.rulesAndPaths.map((ruleAndPaths, ruleIndex) => (
            <div key={`${ruleAndPaths.host}:${ruleIndex}`}>
              <Flex align="flex-end">
                <Anchor href={getAbsoluteUrl(ruleAndPaths.host)} target="_blank" rel="noopener noreferrer">
                  {getAbsoluteUrl(ruleAndPaths.host)}
                </Anchor>
                <IconArrowRight size={22} stroke={2} />
              </Flex>
              {ruleAndPaths.paths.map((path, index) => (
                <div key={`${path.serviceName}:${path.port}:${index}`}>
                  {path.serviceName}:{path.port}
                </div>
              ))}
            </div>
          ))}
        </>
      );
    },
  },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => relativeTime(row.original.creationTimestamp),
  },
];

export function IngressesTable({ data }: IngressesTableProps) {
  const tIngresses = useI18n("kubernetes.ingresses");
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
      placeholder: tIngresses("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },
    columns: createColumns(tIngresses, tField, relativeTime),
  });
  return <MantineReactTable table={table} />;
}
