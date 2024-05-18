"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Avatar, Button, Group, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n, useScopedI18n } from "@homarr/translation/client";

interface UserListComponentProps {
  initialUserList: RouterOutputs["user"]["getAll"];
}

export const UserListComponent = ({
  initialUserList,
}: UserListComponentProps) => {
  const tUserList = useScopedI18n("management.page.user.list");
  const t = useI18n();
  const { data, isLoading } = clientApi.user.getAll.useQuery(undefined, {
    initialData: initialUserList,
  });

  const columns = useMemo<
    MRT_ColumnDef<RouterOutputs["user"]["getAll"][number]>[]
  >(
    () => [
      {
        accessorKey: "name",
        header: t("user.field.username.label"),
        grow: 100,
        Cell: ({ renderedCellValue, row }) => (
          <Link href={`/manage/users/${row.original.id}/general`}>
            <Group>
              <Avatar size="sm"></Avatar>
              {renderedCellValue}
            </Group>
          </Link>
        ),
      },
      {
        accessorKey: "email",
        header: t("user.field.email.label"),
        Cell: ({ renderedCellValue, row }) => (
          <Group>
            {row.original.email ? renderedCellValue : <Text>-</Text>}
            {row.original.emailVerified && (
              <ThemeIcon radius="xl" size="sm">
                <IconCheck size="1rem" />
              </ThemeIcon>
            )}
          </Group>
        ),
      },
    ],
    [t],
  );

  const table = useMantineReactTable({
    columns,
    data,
    enableRowSelection: true,
    enableColumnOrdering: true,
    enableGlobalFilter: false,
    enableRowActions: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    layoutMode: "grid-no-grow",
    getRowId: (row) => row.id,
    renderTopToolbarCustomActions: () => (
      <Button component={Link} href="/manage/users/create">
        Create New User
      </Button>
    ),
    state: {
      isLoading,
    },
  });

  return (
    <>
      <Title mb="md">{tUserList("title")}</Title>
      <MantineReactTable table={table} />
    </>
  );
};
