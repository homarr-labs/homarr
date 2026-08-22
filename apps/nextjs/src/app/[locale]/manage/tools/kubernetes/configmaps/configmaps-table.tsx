"use client";

import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { KubernetesBaseResource } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

dayjs.extend(relativeTime);

interface ConfigMapsTableComponentProps {
  contextId: string;
  initialConfigMaps: RouterOutputs["kubernetes"]["configMaps"]["getConfigMaps"];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.configmaps">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
): MRT_ColumnDef<KubernetesBaseResource>[] => [
  {
    accessorKey: "name",
    header: tField("name.label"),
    enableClickToCopy: true,
  },
  {
    accessorKey: "namespace",
    header: tField("namespace.label"),
    enableClickToCopy: true,
  },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => dayjs(row.original.creationTimestamp).fromNow(false),
  },
];

export function ConfigmapsTable({ contextId, initialConfigMaps }: ConfigMapsTableComponentProps) {
  const tConfigMaps = useI18n("kubernetes.configmaps");
  const tField = useI18n("kubernetes.field");

  const { data } = clientApi.kubernetes.configMaps.getConfigMaps.useQuery(
    { contextId },
    {
      initialData: initialConfigMaps,
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
      placeholder: tConfigMaps("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },

    columns: createColumns(tConfigMaps, tField),
  });

  return <MantineReactTable table={table} />;
}
