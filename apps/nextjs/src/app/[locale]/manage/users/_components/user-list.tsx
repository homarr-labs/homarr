"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Anchor, Button, Group, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useI18n, useScopedI18n } from "@homarr/translation/client";
import { UserAvatar } from "@homarr/ui";
import { useTranslatedMantineReactTable } from "@homarr/ui/hooks";

interface UserListComponentProps {
  initialUserList: RouterOutputs["user"]["getAll"];
  credentialsProviderEnabled: boolean;
}

export const UserListComponent = ({ initialUserList, credentialsProviderEnabled }: UserListComponentProps) => {
  const tUserList = useScopedI18n("management.page.user.list");
  const t = useI18n();
  const { data, isLoading } = clientApi.user.getAll.useQuery(undefined, {
    initialData: initialUserList,
  });

  const columns = useMemo<MRT_ColumnDef<RouterOutputs["user"]["getAll"][number]>[]>(
    () => [
      {
        accessorKey: "name",
        header: t("user.field.username.label"),
        grow: 100,
        Cell: ({ renderedCellValue, row }) => (
          <Group>
            <UserAvatar size="sm" user={row.original} />
            <Anchor component={Link} href={`/manage/users/${row.original.id}/general`}>
              {renderedCellValue}
            </Anchor>
          </Group>
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

  const table = useTranslatedMantineReactTable({
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
    renderTopToolbarCustomActions: () =>
      credentialsProviderEnabled ? (
        <Button component={Link} href="/manage/users/create">
          {t("management.page.user.create.title")}
        </Button>
      ) : null,
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
