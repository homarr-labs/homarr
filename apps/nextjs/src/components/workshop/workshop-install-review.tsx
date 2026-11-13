"use client";

import { useMemo } from "react";
import { Stack, Text } from "@mantine/core";

import { CUSTOM_WIDGET_SCHEMA } from "@homarr/custom-widgets/core";
import { ImportReviewContent } from "@homarr/custom-widgets/workbench";
import { SourceSetupPanel } from "@homarr/forms-collection/custom-widgets";
import { useI18n } from "@homarr/translation/client";
import type { WorkshopSubmissionDetail } from "@homarr/workshop/schema";
import { validateWorkshopWidget } from "@homarr/workshop/schema";

import { useCustomWidgetImport } from "~/components/custom-widgets/use-custom-widget-import";

export function useWorkshopWidgetImport(
  submission: WorkshopSubmissionDetail | undefined,
  onImported: (result: { id: string }) => void,
) {
  const { content, type, widgetSchema } = submission ?? {};
  const validation = useMemo(() => {
    if (!content || type !== "customWidget" || widgetSchema !== CUSTOM_WIDGET_SCHEMA) return null;
    return validateWorkshopWidget(content);
  }, [content, type, widgetSchema]);

  const importer = useCustomWidgetImport({
    widget: validation?.success ? validation.data : null,
    workshop: submission && { submissionId: submission.id, revision: submission.revision },
    onImported,
  });
  return { ...importer, validation };
}

export function WorkshopInstallReview({ importer }: { importer: ReturnType<typeof useWorkshopWidgetImport> }) {
  const t = useI18n("workshop");
  if (!importer.review) return null;

  return (
    <Stack gap="md">
      <div>
        <Text fw={600}>{t("installReviewTitle")}</Text>
        <Text size="sm" c="dimmed">
          {t("securityNotice")}
        </Text>
      </div>
      <ImportReviewContent review={importer.review} messages={importer.reviewMessages}>
        <SourceSetupPanel
          setups={importer.setups}
          values={importer.values}
          onChange={importer.setValue}
          messages={importer.setupMessages}
        />
      </ImportReviewContent>
    </Stack>
  );
}
