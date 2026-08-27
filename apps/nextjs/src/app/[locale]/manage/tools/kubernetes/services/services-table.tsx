"use client";

import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { createId } from "@homarr/common";
import type { KubernetesService } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import { createKubernetesResourceQueryOptions } from "../kubernetes-query-options";

dayjs.extend(relativeTime);

interface ServicesTableComponentProps {
  contextId: string;
  initialServices: RouterOutputs["kubernetes"]["services"]["getServices"];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.services">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
): MRT_ColumnDef<KubernetesService>[] => [
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
    accessorKey: "type",
    header: tField("type.label"),
  },
  {
    accessorKey: "ports",
    header: t("field.ports.label"),
    Cell({ cell }) {
      return cell.row.original.ports?.map((port) => <div key={createId()}>{port}</div>);
    },
  },
  {
    accessorKey: "targetPorts",
    header: t("field.targetPorts.label"),
    Cell({ cell }) {
      return cell.row.original.targetPorts?.map((targetPort) => <div key={createId()}>{targetPort}</div>);
    },
  },
  {
    accessorKey: "clusterIP",
    header: t("field.clusterIP.label"),
    enableClickToCopy: true,
  },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => dayjs(row.original.creationTimestamp).fromNow(false),
  },
];

export function ServicesTable({ contextId, initialServices }: ServicesTableComponentProps) {
  const tServices = useI18n("kubernetes.services");
  const tField = useI18n("kubernetes.field");

  const { data } = clientApi.kubernetes.services.getServices.useQuery(
    { contextId },
    createKubernetesResourceQueryOptions(initialServices),
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
      placeholder: tServices("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },
    columns: createColumns(tServices, tField),
  });

  return <MantineReactTable table={table} />;
}
