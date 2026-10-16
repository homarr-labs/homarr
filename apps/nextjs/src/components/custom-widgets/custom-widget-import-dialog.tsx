"use client";

import type { ModalProps } from "@mantine/core";

import { SourceSetupPanel } from "@homarr/forms-collection/custom-widgets";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { ImportReviewDialog } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";

import { useCustomWidgetImport } from "./use-custom-widget-import";

interface CustomWidgetImportDialogProps {
  opened: boolean;
  widget: HomarrCustomWidgetV2 | null;
  legacyId?: string;
  stackId?: string;
  zIndex?: number;
  modalProps?: Pick<ModalProps, "size" | "styles">;
  labels?: {
    title?: string;
    description?: string;
    cancel?: string;
    confirm?: string;
  };
  onClose(): void;
  onImported?(result: { id: string }): void;
}

export function CustomWidgetImportDialog({
  opened,
  widget,
  legacyId,
  stackId,
  zIndex,
  modalProps,
  labels,
  onClose,
  onImported,
}: CustomWidgetImportDialogProps) {
  const t = useI18n("customWidget");
  const tCommon = useI18n("common");
  const importer = useCustomWidgetImport({
    widget,
    legacyId,
    onImported: (result) => {
      onImported?.(result);
      onClose();
    },
  });

  return (
    <ImportReviewDialog
      opened={opened}
      stackId={stackId}
      zIndex={zIndex}
      {...modalProps}
      review={importer.review}
      pending={importer.pending}
      confirmDisabled={!importer.ready}
      onClose={onClose}
      onConfirm={importer.importWidget}
      messages={{
        ...importer.reviewMessages,
        description: legacyId
          ? t("importReview.migrationDescription")
          : (labels?.description ?? importer.reviewMessages.description),
        title: legacyId ? t("importReview.migrationTitle") : (labels?.title ?? t("importReview.title")),
        cancel: labels?.cancel ?? tCommon("action.cancel"),
        confirm: legacyId ? t("importReview.confirmMigration") : (labels?.confirm ?? tCommon("action.import")),
      }}
    >
      <SourceSetupPanel
        setups={importer.setups}
        values={importer.values}
        onChange={importer.setValue}
        messages={importer.setupMessages}
      />
    </ImportReviewDialog>
  );
}
