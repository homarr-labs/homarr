"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import type { MRT_ColumnDef, MRT_Row, MRT_TableInstance } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { invariantTechnicalLabels } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmActionIcon, UserAvatar } from "@homarr/ui";

import { NewApiKeyAlert } from "./new-api-key-alert";

interface ApiKeysManagementProps {
  apiKeys: RouterOutputs["apiKeys"]["getAll"];
  onCreated: () => void;
}

type ApiKey = RouterOutputs["apiKeys"]["getAll"][number];
type ApiKeyCellProps = { row: MRT_Row<ApiKey> };

interface ApiKeysTableMeta {
  handleDelete: (id: string) => Promise<void>;
  confirmLabel: string;
  deleteTitle: string;
  isPendingDelete: boolean;
}

const ApiKeyCreatedByCell = ({ row }: ApiKeyCellProps) => (
  <Group gap="xs">
    <UserAvatar user={row.original.user} size="sm" />
    <Text>{row.original.user.name}</Text>
  </Group>
);

const ApiKeyActionsCell = ({ row, table }: ApiKeyCellProps & { table: MRT_TableInstance<ApiKey> }) => {
  const meta = table.options.meta as ApiKeysTableMeta;
  return (
    <Group gap="xs">
      <InlineConfirmActionIcon
        onConfirm={() => meta.handleDelete(row.original.id)}
        confirmLabel={meta.confirmLabel}
        confirmationAriaLabel={meta.confirmLabel}
        loading={meta.isPendingDelete}
        color="red"
        variant="subtle"
        aria-label={meta.deleteTitle}
      >
        <IconTrash size="1rem" />
      </InlineConfirmActionIcon>
    </Group>
  );
};

export const ApiKeysManagement = ({ apiKeys, onCreated }: ApiKeysManagementProps) => {
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const { mutate: mutateCreate, isPending: isPendingCreate } = clientApi.apiKeys.create.useMutation({
    onSuccess(data) {
      setNewApiKey(data.apiKey);
      onCreated();
    },
  });
  const { mutateAsync: mutateDeleteAsync, isPending: isPendingDelete } = clientApi.apiKeys.delete.useMutation({
    async onSuccess() {
      await revalidatePathActionAsync("/manage/tools/api");
    },
  });

  const t = useI18n("management.page.tool.api.tab.apiKey");
  const tCommon = useI18n("common");
  const handleDelete = useCallback(
    async (id: string) => {
      await mutateDeleteAsync({ apiKeyId: id });
    },
    [mutateDeleteAsync],
  );
  const handleDismissNewApiKey = useCallback(async () => {
    setNewApiKey(null);
    await revalidatePathActionAsync("/manage/tools/api");
  }, []);

  const columns = useMemo<MRT_ColumnDef<ApiKey>[]>(
    () => [
      {
        accessorKey: "id",
        header: invariantTechnicalLabels.id,
      },
      {
        accessorKey: "user",
        header: t("table.header.createdBy"),
        Cell: ApiKeyCreatedByCell,
      },
      {
        header: t("table.header.actions"),
        Cell: ApiKeyActionsCell,
      },
    ],
    [t],
  );

  const table = useMantineReactTable({
    columns,
    data: apiKeys,
    meta: {
      handleDelete,
      confirmLabel: tCommon("action.confirm"),
      deleteTitle: t("modal.delete.title"),
      isPendingDelete,
    },
    renderTopToolbarCustomActions: () => (
      <Button
        onClick={() => {
          mutateCreate();
        }}
        loading={isPendingCreate}
        disabled={newApiKey !== null}
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
      {newApiKey && <NewApiKeyAlert apiKey={newApiKey} onDismiss={handleDismissNewApiKey} />}
      <MantineReactTable table={table} />
    </Stack>
  );
};
