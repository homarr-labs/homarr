"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";
import {
  ActionIcon,
  Avatar,
  Button,
  Flex,
  Group,
  IconCheck,
  IconEdit,
  IconTrash,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@homarr/ui";

interface UserListComponentProps {
  initialUserList: RouterOutputs["user"]["getAll"];
}

export const UserListComponent = ({
  initialUserList,
}: UserListComponentProps) => {
  const t = useScopedI18n("management.page.user.list");
  const { data, isLoading } = clientApi.user.getAll.useQuery(undefined, {
    initialData: initialUserList,
  });

  const columns = useMemo<
    MRT_ColumnDef<RouterOutputs["user"]["getAll"][number]>[]
  >(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        grow: 100,
        Cell: ({ renderedCellValue, row }) => (
          <Link href={`/manage/users/${row.original.id}`}>
            <Group>
              <Avatar size="sm"></Avatar>
              {renderedCellValue}
            </Group>
          </Link>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
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
    [],
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
      isLoading: isLoading,
    },
  });

  return (
    <>
      <Title mb="md">{t("title")}</Title>
      <MantineReactTable table={table} />
    </>
  );
};
