"use client";

import { Alert, Button, Group, Skeleton, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";
import { useWorkshopSubmissionQuery } from "@homarr/workshop/backend";

import { createWorkshopClient } from "~/components/workshop/workshop-client";
import { WorkshopInstallReview, useWorkshopWidgetImport } from "~/components/workshop/workshop-install-review";

export interface WorkshopWidgetReviewProps {
  submissionId: string;
  onBack: () => void;
  onImported: (definitionId: string) => void;
}

export function WorkshopWidgetReview({ submissionId, onBack, onImported }: WorkshopWidgetReviewProps) {
  const t = useI18n();
  const detail = useWorkshopSubmissionQuery(createWorkshopClient(), submissionId);
  const submission = detail.data;
  const importer = useWorkshopWidgetImport(submission, ({ id }) => onImported(id));
  const compatible = importer.validation?.success === true;

  return (
    <Stack gap="md">
      {detail.isPending && <Skeleton h={120} />}
      {detail.isError && <Alert color="red">{t("workshop.loadError")}</Alert>}
      {submission && !detail.isError && (
        <>
          <Group justify="space-between">
            <Stack gap={4}>
              <Text fw={700} size="lg">
                {submission.title}
              </Text>
              <Text size="sm" c="dimmed">
                {t("workshop.author", { name: submission.authorName || t("workshop.communityMember") })}
              </Text>
            </Stack>
            <Button
              component="a"
              href={`/manage/custom-widgets/workshop/${encodeURIComponent(submission.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              size="compact-sm"
            >
              {t("workshop.technicalDetails")}
            </Button>
          </Group>
          {submission.outdated && <Alert color="yellow">{t("workshop.outdatedWarning")}</Alert>}
          {submission.reportCount > 0 && (
            <Alert color="red">{t("workshop.reportWarning", { count: submission.reportCount })}</Alert>
          )}
          {!compatible && <Alert color="red">{t("workshop.installErrorDescription")}</Alert>}
          <WorkshopInstallReview importer={importer} />
        </>
      )}
      <Group justify="space-between">
        <Button variant="default" disabled={importer.pending || importer.succeeded} onClick={onBack}>
          {t("item.create.workshop.back")}
        </Button>
        <Button
          loading={importer.pending || importer.succeeded}
          disabled={detail.isError || !compatible || !importer.ready || importer.succeeded}
          onClick={importer.importWidget}
        >
          {t("item.create.workshop.installAndAdd")}
        </Button>
      </Group>
    </Stack>
  );
}
