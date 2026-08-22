"use client";

import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { KubernetesSecret } from "@homarr/definitions";
import type { ScopedTranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

dayjs.extend(relativeTime);

interface SecretsTableComponentProps {
  contextId: string;
  initialSecrets: RouterOutputs["kubernetes"]["secrets"]["getSecrets"];
}

const createColumns = (
  t: ScopedTranslationFunction<"kubernetes.secrets">,
  tField: ScopedTranslationFunction<"kubernetes.field">,
): MRT_ColumnDef<KubernetesSecret>[] => [
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
    enableClickToCopy: true,
  },
  {
    accessorKey: "creationTimestamp",
    header: tField("creationTimestamp.label"),
    Cell: ({ row }) => dayjs(row.original.creationTimestamp).fromNow(false),
  },
];

export function SecretsTable({ contextId, initialSecrets }: SecretsTableComponentProps) {
  const tSecrets = useI18n("kubernetes.secrets");
  const tField = useI18n("kubernetes.field");

  const { data } = clientApi.kubernetes.secrets.getSecrets.useQuery(
    { contextId },
    {
      initialData: initialSecrets,
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
      placeholder: tSecrets("table.search", { count: String(data.length) }),
      style: { minWidth: 300 },
      autoFocus: true,
    },

    columns: createColumns(tSecrets, tField),
  });

  return <MantineReactTable table={table} />;
}
