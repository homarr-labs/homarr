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
  IconPlayerPause,
  IconPlayerPlay,
  IconSparkles,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { formatCustomWidgetImportIssues, parseCustomWidgetClipboardDetailed } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmMenuItem, Link } from "@homarr/ui";

import { CustomWidgetImportDialog } from "~/components/custom-widgets/custom-widget-import-dialog";
import { downloadJson } from "~/components/custom-widgets/download";

const iconProps = { size: 16, stroke: 1.5 };

interface WidgetRef {
  id: string;
  name: string;
  enabled: boolean;
  valid: boolean;
  migrationRequired: boolean;
}

export const CustomWidgetRowActions = ({ widget }: { widget: WidgetRef }) => {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const deleteMutation = clientApi.customWidget.delete.useMutation();
  const duplicateMutation = clientApi.customWidget.duplicate.useMutation();
  const toggleMutation = clientApi.customWidget.toggleEnabled.useMutation();
  const utils = clientApi.useUtils();
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

  const copyLegacyDefinition = async () => {
    try {
      const data = await utils.customWidget.exportLegacy.fetch({ id: widget.id });
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      showSuccessNotification({
        title: t("action.copyLegacyDefinition"),
        message: t("notification.legacyDefinitionCopied"),
      });
    } catch (error) {
      showErrorNotification({
        title: t("action.copyLegacyDefinition"),
        message: error instanceof Error ? error.message : t("notification.legacyDefinitionCopyError"),
      });
    }
  };

  const queueMigratedWidget = (text: string) => {
    const result = parseCustomWidgetClipboardDetailed(text);
    if (!result.success) {
      showErrorNotification({ title: t("action.migrate"), message: formatCustomWidgetImportIssues(result.issues) });
      return;
    }
    setMigratedWidget(result.widget);
    migrationControls.open();
  };
  const notifyMigrationError = () =>
    showErrorNotification({ title: t("action.migrate"), message: t("notification.migrationError") });

  const pasteMigratedWidget = async () => {
    try {
      queueMigratedWidget(await navigator.clipboard.readText());
    } catch {
      notifyMigrationError();
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
        notifyMigrationError();
      }
    });
    reader.addEventListener("error", notifyMigrationError);
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleExport = async () => {
    try {
      const data = await utils.customWidget.export.fetch({ id: widget.id });
      downloadJson(data, `${widget.name}.json`);
    } catch {
      showErrorNotification({ title: t("action.export"), message: t("notification.exportError") });
    }
  };

  const exportLegacyDefinition = async () => {
    try {
      const data = await utils.customWidget.exportLegacy.fetch({ id: widget.id });
      downloadJson(data, `${widget.name}.legacy.json`);
    } catch {
      showErrorNotification({ title: t("action.exportLegacyDefinition"), message: t("notification.exportError") });
    }
  };

  const handleToggleEnabled = () => {
    toggleMutation.mutate(
      { id: widget.id, enabled: !widget.enabled },
      {
        onSuccess: async () => {
          await utils.widget.customApi.getData.cancel();
          void utils.customWidget.list.invalidate();
          void utils.widget.customApi.getData.invalidate();
          void revalidatePathActionAsync("/manage/custom-widgets");
        },
        onError: () => {
          showErrorNotification({
            title: widget.enabled ? t("action.disable") : t("action.enable"),
            message: t("notification.toggleError"),
          });
        },
      },
    );
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
    deleteMutation.mutate(
      { id: widget.id },
      {
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
      },
    );
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
                onClick={handleToggleEnabled}
                leftSection={widget.enabled ? <IconPlayerPause {...iconProps} /> : <IconPlayerPlay {...iconProps} />}
                disabled={toggleMutation.isPending}
              >
                {widget.enabled ? t("action.disable") : t("action.enable")}
              </Menu.Item>
              <Menu.Divider />
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
              <Menu.Item
                component={Link}
                href={`/manage/custom-widgets/publish/${widget.id}`}
                leftSection={<IconBuildingStore {...iconProps} />}
              >
                {t("action.publishWorkshop")}
              </Menu.Item>
              <Menu.Divider />
            </>
          )}
          {widget.migrationRequired && (
            <>
              <Menu.Item onClick={() => void copyLegacyDefinition()} leftSection={<IconCopy {...iconProps} />}>
                {t("action.copyLegacyDefinition")}
              </Menu.Item>
              <Menu.Item onClick={() => void exportLegacyDefinition()} leftSection={<IconDownload {...iconProps} />}>
                {t("action.exportLegacyDefinition")}
              </Menu.Item>
              <Menu.Divider />
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
            <InlineConfirmMenuItem
              color="red"
              leftSection={<IconTrash {...iconProps} />}
              onConfirm={handleDelete}
              confirmLabel={tCommon("action.confirm")}
              disabled={deleteMutation.isPending}
            >
              {t("action.delete")}
            </InlineConfirmMenuItem>
          )}
        </Menu.Dropdown>
      </Menu>
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
