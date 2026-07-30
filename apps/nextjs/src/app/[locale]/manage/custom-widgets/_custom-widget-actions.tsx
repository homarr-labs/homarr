"use client";

import { useRef, useState } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBuildingStore,
  IconClipboard,
  IconCopy,
  IconDots,
  IconDownload,
  IconSparkles,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { formatCustomWidgetImportIssues, parseCustomWidgetClipboardDetailed } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { CustomWidgetImportDialog } from "~/components/custom-widgets/custom-widget-import-dialog";
import { WorkshopPublishModal } from "~/components/workshop/workshop-publish-modal";

const iconProps = { size: 16, stroke: 1.5 };

interface WidgetRef {
  id: string;
  name: string;
  enabled: boolean;
  valid: boolean;
  migrationRequired: boolean;
}

export const CustomWidgetRowActions = ({ widget }: { widget: WidgetRef }) => {
  const t = useScopedI18n("customWidget");
  const { openConfirmModal } = useConfirmModal();
  const deleteMutation = clientApi.customWidget.delete.useMutation();
  const duplicateMutation = clientApi.customWidget.duplicate.useMutation();
  const utils = clientApi.useUtils();
  const [publishOpened, publishControls] = useDisclosure(false);
  const [migrationOpened, migrationControls] = useDisclosure(false);
  const migrationFileInputRef = useRef<HTMLInputElement>(null);
  const [migratedWidget, setMigratedWidget] = useState<HomarrCustomWidgetV2 | null>(null);

  const copyMigrationPrompt = async () => {
    try {
      const result = await utils.customWidget.legacyMigrationPrompt.fetch({ id: widget.id });
      await navigator.clipboard.writeText(result.prompt);
      showSuccessNotification({
        title: t("action.copyMigrationPrompt"),
        message: t("notification.migrationPromptCopied"),
      });
    } catch (error) {
      showErrorNotification({
        title: t("action.copyMigrationPrompt"),
        message: error instanceof Error ? error.message : t("notification.migrationPromptCopyError"),
      });
    }
  };

  const queueMigratedWidget = (text: string) => {
    const result = parseCustomWidgetClipboardDetailed(text);
    if (!result.success) {
      showErrorNotification({
        title: t("action.migrate"),
        message: formatCustomWidgetImportIssues(result.issues),
      });
      return;
    }
    setMigratedWidget(result.widget);
    migrationControls.open();
  };

  const pasteMigratedWidget = async () => {
    try {
      queueMigratedWidget(await navigator.clipboard.readText());
    } catch {
      showErrorNotification({
        title: t("action.migrate"),
        message: t("notification.migrationError"),
      });
    }
  };

  const handleMigrationFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", (loadEvent) => {
      try {
        queueMigratedWidget(loadEvent.target?.result as string);
      } catch {
        showErrorNotification({
          title: t("action.migrate"),
          message: t("notification.migrationError"),
        });
      }
    });
    reader.addEventListener("error", () => {
      showErrorNotification({ title: t("action.migrate"), message: t("notification.migrationError") });
    });
    reader.readAsText(file);
    event.target.value = "";
  };

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
          void utils.customWidget.list.invalidate();
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
        const callbacks = {
          onSuccess: () => {
            showSuccessNotification({
              title: t("action.delete"),
              message: t("notification.deleted", { name: widget.name }),
            });
            void utils.customWidget.list.invalidate();
            void utils.customWidget.available.invalidate();
            void utils.widget.customApi.getData.invalidate();
            void revalidatePathActionAsync("/manage/custom-widgets");
          },
          onError: () => {
            showErrorNotification({ title: t("action.delete"), message: t("notification.deleteError") });
          },
        };
        deleteMutation.mutate({ id: widget.id }, callbacks);
      },
    });
  };

  return (
    <>
      <Menu withinPortal position="bottom-end" shadow="md">
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" aria-label={t("action.menu")}>
            <IconDots {...iconProps} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          {widget.valid && (
            <>
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
              <Menu.Item onClick={publishControls.open} leftSection={<IconBuildingStore {...iconProps} />}>
                {t("action.publishWorkshop")}
              </Menu.Item>
              <Menu.Divider />
            </>
          )}
          {widget.migrationRequired && (
            <>
              <Menu.Item onClick={() => void copyMigrationPrompt()} leftSection={<IconSparkles {...iconProps} />}>
                {t("action.copyMigrationPrompt")}
              </Menu.Item>
              <Menu.Item onClick={() => void pasteMigratedWidget()} leftSection={<IconClipboard {...iconProps} />}>
                {t("action.pasteMigration")}
              </Menu.Item>
              <Menu.Item
                onClick={() => migrationFileInputRef.current?.click()}
                leftSection={<IconUpload {...iconProps} />}
              >
                {t("action.importMigration")}
              </Menu.Item>
              <Menu.Divider />
            </>
          )}
          {!widget.migrationRequired && (
            <Menu.Item
              color="red"
              leftSection={<IconTrash {...iconProps} />}
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {t("action.delete")}
            </Menu.Item>
          )}
        </Menu.Dropdown>
      </Menu>
      {widget.valid && <WorkshopPublishModal opened={publishOpened} onClose={publishControls.close} widget={widget} />}
      {widget.migrationRequired && (
        <>
          <input
            ref={migrationFileInputRef}
            type="file"
            accept=".json,.md,text/markdown,application/json"
            hidden
            onChange={handleMigrationFile}
            aria-label={t("action.importMigration")}
          />
          <CustomWidgetImportDialog
            opened={migrationOpened}
            widget={migratedWidget}
            legacyId={widget.id}
            onClose={() => {
              migrationControls.close();
              setMigratedWidget(null);
            }}
          />
        </>
      )}
    </>
  );
};
