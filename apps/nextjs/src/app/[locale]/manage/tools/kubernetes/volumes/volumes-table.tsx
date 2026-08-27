"use client";

import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { KubernetesVolume } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

import { createKubernetesResourceQueryOptions } from "../kubernetes-query-options";

dayjs.extend(relativeTime);

interface VolumesTableComponentProps {
  contextId: string;
  initialVolumes: RouterOutputs["kubernetes"]["volumes"]["getVolumes"];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.volumes">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
): MRT_ColumnDef<KubernetesVolume>[] => [
  {
    accessorKey: "status",
    header: tField("status.label"),
  },
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
    accessorKey: "storage",
    header: t("field.storage.label"),
  },
  {
    accessorKey: "storageClassName",
    header: t("field.storageClassName.label"),
    enableClickToCopy: true,
  },
  {
    accessorKey: "volumeMode",
    header: t("field.volumeMode.label"),
  },
  {
    accessorKey: "volumeName",
    header: t("field.volumeName.label"),
    enableClickToCopy: true,
  },
  {
    accessorKey: "accessModes",
    header: t("field.accessModes.label"),
    Cell({ cell }) {
      return cell.row.original.accessModes.map((accessMode) => <div key={accessMode}>{accessMode}</div>);
    },
  },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => dayjs(row.original.creationTimestamp).fromNow(false),
  },
];

export function VolumesTable({ contextId, initialVolumes }: VolumesTableComponentProps) {
  const tVolumes = useI18n("kubernetes.volumes");
  const tField = useI18n("kubernetes.field");

  const { data } = clientApi.kubernetes.volumes.getVolumes.useQuery(
    { contextId },
    createKubernetesResourceQueryOptions(initialVolumes),
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
      placeholder: tVolumes("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },

    columns: createColumns(tVolumes, tField),
  });

  return <MantineReactTable table={table} />;
}
