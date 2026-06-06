"use client";

import { useRef } from "react";
import { ActionIcon, ActionIconGroup } from "@mantine/core";
import { IconDownload, IconTrash, IconUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { useConfirmModal } from "@homarr/modals";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useScopedI18n } from "@homarr/translation/client";

import { MobileAffixButton } from "~/components/manage/mobile-affix-button";

interface DeleteCustomWidgetButtonProps {
  widget: { id: string; name: string };
}

export const DeleteCustomWidgetButton = ({ widget }: DeleteCustomWidgetButtonProps) => {
  const t = useScopedI18n("customWidget");
  const { openConfirmModal } = useConfirmModal();
  const { mutateAsync, isPending } = clientApi.customWidget.delete.useMutation();

  return (
    <ActionIcon
      loading={isPending}
      variant="subtle"
      color="red"
      onClick={() => {
        openConfirmModal({
          title: t("action.delete"),
          children: t("action.deleteConfirm", { name: widget.name }),
          onConfirm: () => {
            void mutateAsync(
              { id: widget.id },
              {
                onSuccess: () => {
                  showSuccessNotification({
                    title: t("action.delete"),
                    message: t("notification.deleted", { name: widget.name }),
                  });
                  void revalidatePathActionAsync("/manage/custom-widgets");
                },
              },
            );
          },
        });
      }}
      aria-label={t("action.delete")}
    >
      <IconTrash size={16} stroke={1.5} />
    </ActionIcon>
  );
};

interface ExportCustomWidgetButtonProps {
  widget: { id: string; name: string };
}

export const ExportCustomWidgetButton = ({ widget }: ExportCustomWidgetButtonProps) => {
  const t = useScopedI18n("customWidget");
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

  return (
    <ActionIcon variant="subtle" color="gray" onClick={() => void handleExport()} aria-label={t("action.export")}>
      <IconDownload size={16} stroke={1.5} />
    </ActionIcon>
  );
};

export const CustomWidgetRowActions = ({ widget }: { widget: { id: string; name: string } }) => {
  return (
    <ActionIconGroup>
      <ExportCustomWidgetButton widget={widget} />
      <DeleteCustomWidgetButton widget={widget} />
    </ActionIconGroup>
  );
};

export const ImportCustomWidgetButton = () => {
  const t = useScopedI18n("customWidget");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = clientApi.customWidget.import.useMutation({
    onSuccess: () => {
      showSuccessNotification({ title: t("action.import"), message: t("notification.imported") });
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
      <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImport} />
    </>
  );
};
