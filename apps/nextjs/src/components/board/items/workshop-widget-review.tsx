"use client";

import { useMemo } from "react";
import { Alert, Button, Group, Skeleton, Stack, Text } from "@mantine/core";

import { CUSTOM_WIDGET_SCHEMA } from "@homarr/custom-widgets/core";
import { ImportReviewContent } from "@homarr/custom-widgets/workbench";
import { SourceSetupPanel } from "@homarr/forms-collection/custom-widgets";
import { useI18n } from "@homarr/translation/client";
import { useWorkshopSubmissionQuery } from "@homarr/workshop/backend";
import { validateWorkshopWidget } from "@homarr/workshop/schema";

import { useCustomWidgetImport } from "~/components/custom-widgets/use-custom-widget-import";
import { createWorkshopClient } from "~/components/workshop/workshop-client";

export interface WorkshopWidgetReviewProps {
  submissionId: string;
  onBack: () => void;
  onImported: (definitionId: string) => void;
}

export function WorkshopWidgetReview({ submissionId, onBack, onImported }: WorkshopWidgetReviewProps) {
  const t = useI18n();
  const detail = useWorkshopSubmissionQuery(createWorkshopClient(), submissionId);
  const submission = detail.data;
  const { content, type, widgetSchema } = submission ?? {};
  const widget = useMemo(() => {
    if (!content || type !== "customWidget" || widgetSchema !== CUSTOM_WIDGET_SCHEMA) {
      return null;
    }
    const validation = validateWorkshopWidget(content);
    if (!validation.success) return null;
    return validation.data;
  }, [content, type, widgetSchema]);

  const importer = useCustomWidgetImport({ widget, onImported: ({ id }) => onImported(id) });

  return (
    <Stack gap="md">
      {detail.isPending && <Skeleton h={120} />}
      {detail.isError && <Alert color="red">{t("workshop.loadError")}</Alert>}
      {submission && !detail.isError && (
        <>
          <Stack gap={4}>
            <Text fw={700} size="lg">
              {submission.title}
            </Text>
            <Text size="sm" c="dimmed">
              {t("workshop.author", { name: submission.authorName || t("workshop.communityMember") })}
            </Text>
          </Stack>
          {submission.outdated && <Alert color="yellow">{t("workshop.outdatedWarning")}</Alert>}
          {submission.reportCount > 0 && (
            <Alert color="yellow">{t("workshop.reportWarning", { count: submission.reportCount })}</Alert>
          )}
          {!widget && <Alert color="red">{t("workshop.installErrorDescription")}</Alert>}
          {importer.review && (
            <>
              <Text size="sm" c="dimmed">
                {t("workshop.securityNotice")}
              </Text>
              <ImportReviewContent review={importer.review} messages={importer.reviewMessages}>
                <SourceSetupPanel
                  setups={importer.setups}
                  values={importer.values}
                  onChange={importer.setValue}
                  messages={importer.setupMessages}
                />
              </ImportReviewContent>
            </>
          )}
        </>
      )}
      <Group justify="space-between">
        <Button variant="default" disabled={importer.pending || importer.succeeded} onClick={onBack}>
          {t("item.create.workshop.back")}
        </Button>
        <Button
          loading={importer.pending || importer.succeeded}
          disabled={detail.isError || !widget || !importer.ready || importer.succeeded}
          onClick={importer.importWidget}
        >
          {t("item.create.workshop.installAndAdd")}
        </Button>
      </Group>
    </Stack>
  );
}
