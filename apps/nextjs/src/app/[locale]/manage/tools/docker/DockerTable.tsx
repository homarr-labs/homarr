"use client";

import { Stack } from "@mantine/core";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";
import type { DockerContainer } from "node_modules/@homarr/api/src/router/docker";

import type { api } from "@homarr/api/server";
import { useTimeAgo } from "@homarr/common";

const columns: MRT_ColumnDef<DockerContainer>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "state",
    header: "State",
  },
  {
    accessorKey: "image",
    header: "Image",
  },
  {
    accessorKey: "ports.PublicPort",
    header: "Ports",
    Cell: ({ renderedCellValue }) => (
      <div>
        <pre>{JSON.stringify(renderedCellValue, null, 2)}</pre>
      </div>
    ),
  },
];

export function DockerTable({
  containers,
  timestamp,
}: ReturnType<typeof api.docker.getContainers> extends Promise<infer T> ? T : never) {
  // Note: Clever way to get the return type of a TRPC promise
  const relateiveTime = useTimeAgo(timestamp, "en");
  const table = useMantineReactTable({
    data: containers,
    columns,
  });
  return (
    <Stack>
      <h3>Containers</h3>
      <p>Updated {relateiveTime}</p>
      <MantineReactTable table={table} />
    </Stack>
  );
}
