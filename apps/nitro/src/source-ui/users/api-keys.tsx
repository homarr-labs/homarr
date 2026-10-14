import type { ReactNode } from "react";
import { useMemo } from "react";
import { Alert, Button, CopyButton, Group, Loader, PasswordInput, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import type { MRT_ColumnDef } from "mantine-react-table";
import { MantineReactTable, useMantineReactTable } from "mantine-react-table";

import type { ApiKeyRow, UserAvatarRenderer, UserTableOptions } from "./contracts";
import { useUserTableLocalization } from "./contracts";
import { renderUserAvatar } from "./user-list";
import { useI18n } from "@homarr/translation/client";
import { invariantTechnicalLabels } from "@homarr/definitions";

export function NewApiKeyView({ apiKey, onDismiss }: { apiKey: string; onDismiss: () => void | Promise<void> }) {
  const [visible, { toggle }] = useDisclosure(false);
  const t = useI18n("management.page.tool.api.modal.createApiToken");
  const tCommon = useI18n("common");
  return (
    <Alert color="yellow" title={t("title")}>
      <Stack gap="sm">
        <Text size="sm">{t("description")}</Text>
        <PasswordInput
          value={apiKey}
          visible={visible}
          onVisibilityChange={toggle}
          aria-label={t("title")}
          autoComplete="off"
          readOnly
          visibilityToggleFocusable
        />
        <Stack gap="xs" align="stretch">
          <CopyButton value={apiKey} timeout={2000}>
            {({ copied, copy }) => {
              let color: "green" | undefined;
              let icon = <IconCopy size={16} />;
              let label = tCommon("action.copy");
              if (copied) {
                color = "green";
                icon = <IconCheck size={16} />;
                label = tCommon("action.copied");
              }
              return (
                <Button onClick={copy} variant="default" color={color} leftSection={icon}>
                  {label}
                </Button>
              );
            }}
          </CopyButton>
          <Button onClick={onDismiss} variant="subtle">
            {tCommon("action.close")}
          </Button>
        </Stack>
      </Stack>
    </Alert>
  );
}

export interface ApiKeysViewProps extends UserTableOptions {
  apiKeys: ApiKeyRow[];
  creating: boolean;
  createDisabled: boolean;
  onCreate?: () => void;
  createdKey: ReactNode;
  feedback?: ReactNode;
  renderActions?: (key: ApiKeyRow) => ReactNode;
  renderAvatar?: UserAvatarRenderer;
}

function renderCreatedByCell(apiKey: ApiKeyRow, renderAvatar: UserAvatarRenderer) {
  return (
    <Group gap="xs">
      {renderAvatar(apiKey.user, "sm")}
      <Text>{apiKey.user.name ?? apiKey.user.id}</Text>
    </Group>
  );
}

export function ApiKeysView({
  apiKeys,
  creating,
  createDisabled,
  onCreate,
  createdKey,
  feedback,
  renderActions,
  renderAvatar = renderUserAvatar,
  loading = false,
  refreshing = false,
  localization,
}: ApiKeysViewProps) {
  const t = useI18n("management.page.tool.api.tab.apiKey");
  const tCommon = useI18n("common");
  const tUnavailable = useI18n("customWidget.secretEntry");
  const tableLocalization = useUserTableLocalization(localization);
  const columns = useMemo<MRT_ColumnDef<ApiKeyRow>[]>(
    () => [
      { accessorKey: "id", header: invariantTechnicalLabels.id },
      {
        accessorKey: "user",
        header: t("table.header.createdBy"),
        Cell: ({ row }) => renderCreatedByCell(row.original, renderAvatar),
      },
      {
        id: "actions",
        header: t("table.header.actions"),
        Cell: ({ row }) => renderActions?.(row.original) ?? tUnavailable("unavailable"),
      },
    ],
    [renderActions, renderAvatar, t, tUnavailable],
  );
  const table = useMantineReactTable({
    columns,
    data: apiKeys,
    localization: tableLocalization,
    renderTopToolbarCustomActions: () => (
      <Button onClick={onCreate} loading={creating} disabled={createDisabled || !onCreate}>
        {t("button.createApiToken")}
      </Button>
    ),
    enableDensityToggle: false,
    state: { density: "xs", isLoading: loading },
    getRowId: (row) => row.id,
  });
  return (
    <Stack>
      <Title>{t("title")}</Title>
      {!onCreate && <Alert title={tUnavailable("unavailable")}>{t("button.createApiToken")}</Alert>}
      {createdKey}
      {feedback}
      {refreshing && (
        <Group component="output" aria-live="polite" gap="xs">
          <Loader size="xs" />
          <Text size="sm">{tCommon("action.refresh")}</Text>
        </Group>
      )}
      <MantineReactTable table={table} />
    </Stack>
  );
}
