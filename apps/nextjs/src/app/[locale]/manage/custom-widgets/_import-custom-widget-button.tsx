"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import { IconUpload } from "@tabler/icons-react";

import {
  formatCustomWidgetImportIssues,
  looksLikeCustomWidgetClipboard,
  parseCustomWidgetClipboardDetailed,
} from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { showErrorNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { CustomWidgetImportDialog } from "~/components/custom-widgets/custom-widget-import-dialog";
import { MobileAffixButton } from "~/components/manage/mobile-affix-button";

export const ImportCustomWidgetButton = () => {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<HomarrCustomWidgetV2 | null>(null);
  const [reviewOpened, { open: openReview, close: closeReview }] = useDisclosure(false);
  const queueImport = useCallback(
    (value: HomarrCustomWidgetV2) => {
      setPendingImport(value);
      openReview();
    },
    [openReview],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (event.target instanceof Element && event.target.matches("input, textarea, [contenteditable='true']")) return;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!looksLikeCustomWidgetClipboard(text)) return;
      event.preventDefault();
      const result = parseCustomWidgetClipboardDetailed(text);
      if (!result.success) {
        showErrorNotification({
          title: tCommon("action.import"),
          message: formatCustomWidgetImportIssues(result.issues),
        });
        return;
      }
      queueImport(result.widget);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [queueImport, t, tCommon]);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", (loadEvent) => {
      try {
        const result = parseCustomWidgetClipboardDetailed(loadEvent.target?.result as string);
        if (!result.success) throw new Error(formatCustomWidgetImportIssues(result.issues));
        queueImport(result.widget);
      } catch (error) {
        showErrorNotification({
          title: tCommon("action.import"),
          message: error instanceof Error ? error.message : t("notification.importError"),
        });
      }
    });
    reader.addEventListener("error", () => {
      showErrorNotification({ title: tCommon("action.import"), message: t("notification.importError") });
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
        title={t("action.pasteImportHint")}
      >
        {tCommon("action.import")}
      </MobileAffixButton>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.md,text/markdown,application/json"
        hidden
        onChange={handleImport}
        aria-label={t("importReview.fileLabel")}
      />
      <CustomWidgetImportDialog
        opened={reviewOpened}
        widget={pendingImport}
        onClose={() => {
          closeReview();
          setPendingImport(null);
        }}
      />
    </>
  );
};
