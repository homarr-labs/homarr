"use client";

import { useEffect, useMemo } from "react";
import type { MRT_ColumnDef, MRT_Row } from "mantine-react-table";
import { MRT_Table } from "mantine-react-table";
import { Badge } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks/use-translated-mantine-react-table";

interface Season {
  id: number;
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

interface Props {
  seasons: Season[];
  requestedSeasons: Set<number>;
  onSelectionChange: (seasons: number[]) => void;
}

export const RequestMediaSeasonsTable = ({ seasons, requestedSeasons, onSelectionChange }: Props) => {
  const t = useI18n();
  const columns = useMemo<MRT_ColumnDef<Season>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("search.engine.media.request.modal.table.header.season"),
      },
      {
        accessorKey: "episodeCount",
        header: t("search.engine.media.request.modal.table.header.episodes"),
      },
      {
        id: "status",
        header: t("common.field.status"),
        Cell: ({ row }) =>
          requestedSeasons.has(row.original.seasonNumber) ? (
            <Badge size="xs" color="violet" variant="light">
              {t("search.engine.media.request.modal.table.status.requested")}
            </Badge>
          ) : null,
      },
    ],
    [requestedSeasons, t],
  );

  const table = useTranslatedMantineReactTable({
    columns,
    data: seasons,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableSorting: false,
    enableSelectAll: true,
    enableRowSelection: (row: MRT_Row<Season>) => !requestedSeasons.has(row.original.seasonNumber),
    mantineTableProps: {
      highlightOnHover: false,
      striped: "odd",
      withColumnBorders: true,
      withRowBorders: true,
      withTableBorder: true,
    },
    initialState: {
      density: "xs",
    },
  });
  const rowSelection = table.getState().rowSelection;
  const selectedSeasonNumbers = useMemo(
    () => table.getSelectedRowModel().rows.map(({ original }) => original.seasonNumber),
    [rowSelection, table],
  );

  useEffect(() => {
    onSelectionChange(selectedSeasonNumbers);
  }, [onSelectionChange, selectedSeasonNumbers]);

  return <MRT_Table table={table} />;
};
