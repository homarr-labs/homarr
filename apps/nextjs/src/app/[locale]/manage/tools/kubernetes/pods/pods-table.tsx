"use client";

import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { KubernetesPod } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import { createKubernetesResourceQueryOptions } from "../kubernetes-query-options";

dayjs.extend(relativeTime);

interface PodsTableComponentProps {
  contextId: string;
  initialPods: RouterOutputs["kubernetes"]["pods"]["getPods"];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.pods">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
): MRT_ColumnDef<KubernetesPod>[] => [
  {
    accessorKey: "name",
    header: tField("name.label"),
  },
  {
    accessorKey: "namespace",
    header: tField("namespace.label"),
  },
  {
    accessorKey: "image",
    header: t("field.image.label"),
  },
  {
    accessorKey: "applicationType",
    header: t("field.applicationType.label"),
  },
  {
    accessorKey: "status",
    header: tField("status.label"),
  },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => dayjs(row.original.creationTimestamp).fromNow(false),
  },
];

export function PodsTable({ contextId, initialPods }: PodsTableComponentProps) {
  const tPods = useI18n("kubernetes.pods");
  const tField = useI18n("kubernetes.field");

  const { data } = clientApi.kubernetes.pods.getPods.useQuery(
    { contextId },
    createKubernetesResourceQueryOptions(initialPods),
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
    initialState: { density: "xs", showGlobalFilter: true, expanded: true },
    mantineSearchTextInputProps: {
      placeholder: tPods("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },
    enableGrouping: true,
    columns: createColumns(tPods, tField),
  });

  return <MantineReactTable table={table} />;
}
