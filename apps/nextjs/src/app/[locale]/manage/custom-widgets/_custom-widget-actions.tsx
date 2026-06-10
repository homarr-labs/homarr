"use client";

import { useRef } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import {
  IconCopy,
  IconDots,
  IconDownload,
  IconToggleLeft,
  IconToggleRight,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { MobileAffixButton } from "~/components/manage/mobile-affix-button";

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
  const toggleEnabledMutation = clientApi.customWidget.toggleEnabled.useMutation();
  const utils = clientApi.useUtils();

  const handleToggleEnabled = () => {
    toggleEnabledMutation.mutate(
      { id: widget.id, enabled: !widget.enabled },
      {
        onSuccess: () => {
          void utils.customWidget.all.invalidate();
          void utils.widget.customApi.getData.invalidate({ definitionId: widget.id });
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
              void utils.widget.customApi.getData.invalidate({ definitionId: widget.id });
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
          onClick={handleToggleEnabled}
          leftSection={widget.enabled ? <IconToggleLeft {...iconProps} /> : <IconToggleRight {...iconProps} />}
          disabled={toggleEnabledMutation.isPending}
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
  const utils = clientApi.useUtils();
  const importMutation = clientApi.customWidget.import.useMutation({
    onSuccess: () => {
      showSuccessNotification({ title: t("action.import"), message: t("notification.imported") });
      void utils.customWidget.all.invalidate();
      void revalidatePathActionAsync("/manage/custom-widgets");
    },
    onError: () => {
      showErrorNotification({ title: t("action.import"), message: t("notification.importError") });
    },
  });

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        importMutation.mutate(json);
      } catch {
        showErrorNotification({ title: t("action.import"), message: t("notification.importError") });
      }
    };
    reader.onerror = () => {
      showErrorNotification({ title: t("action.import"), message: t("notification.importError") });
    };
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
      >
        {t("action.import")}
      </MobileAffixButton>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        hidden
        onChange={handleImport}
        aria-label="Import custom widget"
      />
    </>
  );
};
