"use client";

import { useCallback, useMemo, useState } from "react";
import { Alert, Button, Group, Stack, Text, Title } from "@mantine/core";
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
import { OAuthConnectionDetails } from "./oauth-connection-details";
import { formatOAuthDisplayText, getOAuthCallbackHost } from "./oauth-display";

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
  pendingDeleteId: string | undefined;
}

const ApiKeyCreatedByCell = ({ row }: ApiKeyCellProps) => (
  <Group gap="xs">
    <UserAvatar user={row.original.user} size="sm" />
    <Text>{row.original.user.name}</Text>
  </Group>
);

const ApiKeyProvenanceCell = ({ row }: ApiKeyCellProps) => {
  const t = useI18n("management.page.tool.api.tab.apiKey.provenance");
  const key = row.original;
  if (key.oauthClientId === null) return <Text size="sm">{t("unattributed")}</Text>;

  return (
    <Stack gap={4} style={{ minWidth: 0, maxWidth: "24rem" }}>
      <Text size="sm" fw={500}>
        {t("oauth")}
      </Text>
      <Text size="sm" style={{ overflowWrap: "anywhere", unicodeBidi: "isolate" }}>
        <bdi>{formatOAuthDisplayText(key.oauthClientName ?? t("unnamedClient"))}</bdi>
      </Text>
      <Text size="sm" dir="ltr" style={{ overflowWrap: "anywhere", unicodeBidi: "isolate" }}>
        {getOAuthCallbackHost(key.oauthRedirectUri) ?? t("unknown")}
      </Text>
      <details>
        <summary style={{ cursor: "pointer", paddingBlock: "var(--mantine-spacing-xs)" }}>{t("details")}</summary>
        <Stack gap="sm" pt="xs">
          <Text size="sm">{t("clientNameHint")}</Text>
          <OAuthConnectionDetails connection={key} />
        </Stack>
      </details>
    </Stack>
  );
};

const ApiKeyActionsCell = ({ row, table }: ApiKeyCellProps & { table: MRT_TableInstance<ApiKey> }) => {
  const meta = table.options.meta as ApiKeysTableMeta;
  return (
    <Group gap="xs">
      <InlineConfirmActionIcon
        onConfirm={() => meta.handleDelete(row.original.id)}
        confirmLabel={meta.confirmLabel}
        confirmationAriaLabel={meta.confirmLabel}
        loading={meta.isPendingDelete && meta.pendingDeleteId === row.original.id}
        disabled={meta.isPendingDelete}
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
  const t = useI18n("management.page.tool.api.tab.apiKey");
  const utils = clientApi.useUtils();
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"createError" | "deleteError" | "deleteSuccess" | "refreshError" | null>(
    null,
  );
  const { mutate: mutateCreate, isPending: isPendingCreate } = clientApi.apiKeys.create.useMutation({
    onMutate() {
      setFeedback(null);
    },
    onSuccess(data) {
      setNewApiKey(data.apiKey);
      onCreated();
    },
    onError() {
      setFeedback("createError");
    },
  });
  const {
    mutateAsync: mutateDeleteAsync,
    isPending: isPendingDelete,
    variables: deleteVariables,
  } = clientApi.apiKeys.delete.useMutation({
    onMutate() {
      setFeedback(null);
    },
    async onSuccess() {
      setFeedback("deleteSuccess");
      void utils.apiKeys.getOwnOAuth.invalidate();
      await revalidatePathActionAsync("/manage/tools/api").catch(() => setFeedback("refreshError"));
    },
    onError() {
      setFeedback("deleteError");
    },
  });

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
        id: "provenance",
        accessorFn: (key) =>
          key.oauthClientId === null
            ? t("provenance.unattributed")
            : `${t("provenance.oauth")} ${key.oauthClientName ?? ""} ${key.oauthClientId} ${key.oauthRedirectUri ?? ""}`,
        header: t("table.header.source"),
        Cell: ApiKeyProvenanceCell,
        size: 300,
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
      confirmLabel: t("button.confirmDeletion"),
      deleteTitle: t("modal.delete.title"),
      isPendingDelete,
      pendingDeleteId: deleteVariables?.apiKeyId,
    },
    renderEmptyRowsFallback: () => (
      <Stack p="xl" gap="xs" align="center">
        <Text fw={500}>{t("empty.title")}</Text>
        <Text size="sm">{t("empty.description")}</Text>
      </Stack>
    ),
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
      {feedback !== null && (
        <Alert
          variant="light"
          color={feedback === "deleteSuccess" ? "green" : feedback === "refreshError" ? "yellow" : "red"}
          role={feedback === "deleteSuccess" ? "status" : "alert"}
          title={t(`feedback.${feedback}.title`)}
        >
          {t(`feedback.${feedback}.description`)}
        </Alert>
      )}
      {newApiKey && <NewApiKeyAlert apiKey={newApiKey} onDismiss={handleDismissNewApiKey} />}
      <MantineReactTable table={table} />
    </Stack>
  );
};
