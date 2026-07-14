"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Menu } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconCopy, IconDots, IconDownload, IconTrash, IconUpload } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { revalidatePathActionAsync } from "@homarr/common/client";
import { getImportReview, parseCustomWidgetClipboard } from "@homarr/custom-widgets/core";
import { ImportReviewDialog } from "@homarr/custom-widgets/workbench";
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
      <ImportReviewDialog
        opened={reviewOpened}
        review={review}
        pending={importMutation.isPending}
        onClose={closeReview}
        onConfirm={() => pendingImport && importMutation.mutate(pendingImport as never)}
        messages={{
          title: t("importReview.title"),
          description: t("importReview.description"),
          name: t("importReview.name"),
          origin: t("importReview.origin"),
          authentication: t("importReview.authentication"),
          networkScope: t("importReview.networkScope"),
          methods: t("importReview.methods"),
          permissions: t("importReview.permissions"),
          actionWarningTitle: t("importReview.actionWarning.title"),
          actionWarningDescription: t("importReview.actionWarning.description"),
          cancel: t("importReview.cancel"),
          confirm: t("importReview.confirm"),
          permission: (permission) => t(`preview.request.permission.${permission}` as never),
        }}
      />
    </>
  );
};
