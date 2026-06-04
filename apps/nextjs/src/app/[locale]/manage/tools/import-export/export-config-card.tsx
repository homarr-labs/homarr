"use client";

import { useState } from "react";
import { Alert, Button, Card, Group, List, Loader, Popover, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconDatabaseExport } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { ConfigSummaryList } from "~/components/config-import/config-summary-list";

const exportWarningPointKeys = [
  "management.page.importExport.export.warning.message",
  "management.page.importExport.export.warning.storage",
  "management.page.importExport.export.warning.sharing",
] as const;

export const ExportConfigCard = () => {
  const t = useI18n() as unknown as (key: string, values?: Record<string, unknown>) => string;
  const { mutateAsync, isPending } = clientApi.config.exportFull.useMutation();
  const [popoverOpened, setPopoverOpened] = useState(false);

  const { data: preview, isLoading: previewLoading } = clientApi.config.previewExport.useQuery(undefined, {
    enabled: popoverOpened,
  });

  const closePopover = () => setPopoverOpened(false);

  const runExport = async () => {
    await mutateAsync(undefined, {
      onSuccess({ content, filename }) {
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
        showSuccessNotification({
          title: t("management.page.importExport.export.notification.success.title"),
          message: t("management.page.importExport.export.notification.success.message"),
        });
      },
      onError() {
        showErrorNotification({
          title: t("management.page.importExport.export.notification.error.title"),
          message: t("management.page.importExport.export.notification.error.message"),
        });
      },
    });
  };

  const handleConfirmExport = () => {
    closePopover();
    void runExport();
  };

  return (
    <Card withBorder>
      <Stack>
        <Stack gap="xs">
          <Title order={3}>{t("management.page.importExport.export.title")}</Title>
          <Text size="sm" c="dimmed">
            {t("management.page.importExport.export.description")}
          </Text>
        </Stack>

        <Popover
          opened={popoverOpened}
          onChange={setPopoverOpened}
          width={420}
          position="bottom-end"
          withArrow
          shadow="md"
        >
          <Popover.Target>
            <Group justify="flex-end">
              <Button
                leftSection={<IconDatabaseExport size="1rem" />}
                loading={isPending}
                disabled={isPending}
                onClick={() => setPopoverOpened(true)}
              >
                {t("management.page.importExport.export.action")}
              </Button>
            </Group>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="md">
              <Alert
                variant="light"
                color="red"
                icon={<IconAlertTriangle size="1.25rem" stroke={1.5} />}
                title={t("management.page.importExport.export.warning.title")}
              >
                <List size="sm" spacing="xs">
                  {exportWarningPointKeys.map((key) => (
                    <List.Item key={key}>{t(key)}</List.Item>
                  ))}
                </List>
              </Alert>

              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  {t("management.page.importExport.summary.title")}
                </Text>
                {previewLoading && (
                  <Group gap="xs">
                    <Loader size="xs" />
                    <Text size="sm" c="dimmed">
                      {t("management.page.importExport.preview.exportLoading")}
                    </Text>
                  </Group>
                )}
                {preview && <ConfigSummaryList counts={preview} t={t} />}
              </Stack>

              <Group justify="flex-end" gap="sm">
                <Button variant="default" onClick={closePopover}>
                  {t("common.action.cancel")}
                </Button>
                <Button
                  color="red.9"
                  onClick={handleConfirmExport}
                  disabled={previewLoading}
                  loading={isPending}
                >
                  {t("common.action.continue")}
                </Button>
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Stack>
    </Card>
  );
};
