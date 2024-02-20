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
    enableRowActions: true,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    getRowId: (row) => row.id,
    renderRowActions: ({ row }) => (
      <Flex gap="md">
        <Tooltip label="Edit">
          <ActionIcon
            component={Link}
            href={`/manage/users/${row.original.id}`}
          >
            <IconEdit size="1rem" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Delete">
          <ActionIcon color="red">
            <IconTrash size="1rem" />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
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
