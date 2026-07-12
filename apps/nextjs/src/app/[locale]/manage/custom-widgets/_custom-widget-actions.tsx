"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Code,
  Group,
  Menu,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconCopy, IconDots, IconDownload, IconTrash, IconUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { MobileAffixButton } from "~/components/manage/mobile-affix-button";
import { getImportReview, parseCustomWidgetClipboard } from "./_custom-widget-import-utils";

const iconProps = { size: 16, stroke: 1.5 };

interface WidgetRef {
  id: string;
  name: string;
  enabled: boolean;
}

export const CustomWidgetRowActions = ({ widget }: { widget: WidgetRef }) => {
  const t = useScopedI18n("customWidget");
  const { openConfirmModal } = useConfirmModal();
  const deleteMutation = clientApi.customWidget.delete.useMutation();
  const duplicateMutation = clientApi.customWidget.duplicate.useMutation();
  const utils = clientApi.useUtils();

  const handleExport = async () => {
    try {
      const data = await utils.customWidget.export.fetch({ id: widget.id });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${widget.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showErrorNotification({ title: t("action.export"), message: t("notification.exportError") });
    }
  };

  const handleDuplicate = () => {
    duplicateMutation.mutate(
      { id: widget.id },
      {
        onSuccess: (result) => {
          showSuccessNotification({
            title: t("action.duplicate"),
            message: t("notification.duplicated", { name: result.name }),
          });
          void utils.customWidget.all.invalidate();
          void revalidatePathActionAsync("/manage/custom-widgets");
        },
        onError: () => {
          showErrorNotification({ title: t("action.duplicate"), message: t("notification.duplicateError") });
        },
      },
    );
  };

  const handleDelete = () => {
    openConfirmModal({
      title: t("action.delete"),
      children: t("action.deleteConfirm", { name: widget.name }),
      onConfirm: () => {
        deleteMutation.mutate(
          { id: widget.id },
          {
            onSuccess: () => {
              showSuccessNotification({
                title: t("action.delete"),
                message: t("notification.deleted", { name: widget.name }),
              });
              void utils.customWidget.all.invalidate();
              void utils.widget.customApi.getData.invalidate();
              void revalidatePathActionAsync("/manage/custom-widgets");
            },
            onError: () => {
              showErrorNotification({ title: t("action.delete"), message: t("notification.deleteError") });
            },
          },
        );
      },
    });
  };

  return (
    <Menu withinPortal position="bottom-end" shadow="md">
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={t("action.menu")}>
          <IconDots {...iconProps} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          onClick={handleDuplicate}
          leftSection={<IconCopy {...iconProps} />}
          disabled={duplicateMutation.isPending}
        >
          {t("action.duplicate")}
        </Menu.Item>
        <Menu.Item onClick={() => void handleExport()} leftSection={<IconDownload {...iconProps} />}>
          {t("action.export")}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<IconTrash {...iconProps} />}
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
        >
          {t("action.delete")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export const ImportCustomWidgetButton = () => {
  const t = useScopedI18n("customWidget");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null);
  const [reviewOpened, { open: openReview, close: closeReview }] = useDisclosure(false);
  const utils = clientApi.useUtils();
  const importMutation = clientApi.customWidget.import.useMutation({
    onSuccess: () => {
      closeReview();
      setPendingImport(null);
      showSuccessNotification({ title: t("action.import"), message: t("notification.imported") });
      void utils.customWidget.all.invalidate();
      void revalidatePathActionAsync("/manage/custom-widgets");
    },
    onError: () => {
      showErrorNotification({ title: t("action.import"), message: t("notification.importError") });
    },
  });
  const review = useMemo(() => getImportReview(pendingImport), [pendingImport]);
  const queueImport = useCallback(
    (value: Record<string, unknown>) => {
      setPendingImport(value);
      openReview();
    },
    [openReview],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;
      const widget = parseCustomWidgetClipboard(event.clipboardData?.getData("text/plain") ?? "");
      if (!widget) return;
      event.preventDefault();
      queueImport(widget);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [queueImport]);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", (e) => {
      try {
        const widget = parseCustomWidgetClipboard(e.target?.result as string);
        if (!widget) throw new Error("Invalid import");
        queueImport(widget);
      } catch {
        showErrorNotification({ title: t("action.import"), message: t("notification.importError") });
      }
    });
    reader.addEventListener("error", () => {
      showErrorNotification({ title: t("action.import"), message: t("notification.importError") });
    });
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <>
      <MobileAffixButton
        variant="default"
        leftSection={<IconUpload size={16} />}
        onClick={() => fileInputRef.current?.click()}
        loading={importMutation.isPending}
        title={t("action.pasteImportHint")}
      >
        {t("action.import")}
      </MobileAffixButton>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.md,text/markdown,application/json"
        hidden
        onChange={handleImport}
        aria-label={t("importReview.fileLabel")}
      />
      <Modal opened={reviewOpened} onClose={closeReview} title={t("importReview.title")} centered size="lg">
        {pendingImport && review && (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t("importReview.description")}
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <ImportFact label={t("importReview.name")} value={review.name} />
              <ImportFact label={t("importReview.origin")} value={review.origin} />
              <ImportFact label={t("importReview.authentication")} value={review.authType} />
              <ImportFact label={t("importReview.networkScope")} value={review.networkScope} />
            </SimpleGrid>

            <div>
              <Text size="sm" fw={600} mb={6}>
                {t("importReview.methods")}
              </Text>
              <Group gap={6}>
                {review.methods.map((method) => (
                  <Badge
                    key={method}
                    color={method === "DELETE" ? "red" : method === "GET" ? "blue" : "orange"}
                    variant="light"
                  >
                    {method}
                  </Badge>
                ))}
              </Group>
            </div>

            <div>
              <Text size="sm" fw={600} mb={6}>
                {t("importReview.permissions")}
              </Text>
              <Group gap={6}>
                {review.permissions.map((permission) => (
                  <Badge key={permission} color="gray" variant="light">
                    {t(`preview.request.permission.${permission}` as never)}
                  </Badge>
                ))}
              </Group>
            </div>

            {review.hasActions && (
              <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
                <Text size="sm" fw={600}>
                  {t("importReview.actionWarning.title")}
                </Text>
                <Text size="sm">{t("importReview.actionWarning.description")}</Text>
              </Alert>
            )}

            <Group justify="flex-end">
              <Button variant="default" onClick={closeReview} disabled={importMutation.isPending}>
                {t("importReview.cancel")}
              </Button>
              <Button onClick={() => importMutation.mutate(pendingImport as never)} loading={importMutation.isPending}>
                {t("importReview.confirm")}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </>
  );
};

function ImportFact({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder p="xs">
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Code>{value || "—"}</Code>
    </Paper>
  );
}
