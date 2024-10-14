"use client";

import { useMemo } from "react";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useModalAction } from "@homarr/modals";
import { useScopedI18n } from "@homarr/translation/client";
import { UserAvatar } from "@homarr/ui";

import { CopyApiKeyModal } from "~/app/[locale]/manage/tools/api/components/copy-api-key-modal";

interface ApiKeysManagementProps {
  apiKeys: RouterOutputs["apiKeys"]["getAll"];
}

export const ApiKeysManagement = ({ apiKeys }: ApiKeysManagementProps) => {
  const { openModal } = useModalAction(CopyApiKeyModal);
  const { mutate, isPending } = clientApi.apiKeys.create.useMutation({
    async onSuccess(data) {
      openModal({
        apiKey: data.randomToken,
      });
      await revalidatePathActionAsync("/manage/tools/api");
    },
  });
  const t = useScopedI18n("management.page.tool.api.tab.apiKey");

  const columns = useMemo<MRT_ColumnDef<RouterOutputs["apiKeys"]["getAll"][number]>[]>(
    () => [
      {
        accessorKey: "id",
        header: t("table.header.id"),
      },
      {
        accessorKey: "user",
        header: t("table.header.createdBy"),
        Cell: ({ row }) => (
          <Group gap={"xs"}>
            <UserAvatar user={row.original.user} size={"sm"} />
            <Text>{row.original.user.name}</Text>
          </Group>
        ),
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    data: apiKeys,
    renderTopToolbarCustomActions: () => (
      <Button
        onClick={() => {
          mutate();
        }}
        loading={isPending}
      >
        {t("button.createApiToken")}
      </Button>
    ),
    enableDensityToggle: false,
    state: {
      density: "xs",
    },
  });

  return (
    <Stack>
      <Title>{t("title")}</Title>
      <MantineReactTable table={table} />
    </Stack>
  );
};
