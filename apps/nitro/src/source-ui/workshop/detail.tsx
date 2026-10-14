import type { ReactNode } from "react";
import { Accordion, Alert, Badge, Button, Card, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { IconAlertTriangle, IconArrowLeft, IconExternalLink } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import type { WorkshopReportSummary } from "../../../../../packages/workshop/src/schema";
import type { WorkshopPresentation, WorkshopSubmissionDetail } from "./contracts";
import { WorkshopCodeViewer } from "./code-viewer";
import { WorkshopScreenshots } from "./screenshots";

export function WorkshopDetailScreen({
  submission,
  reports,
  reportFailure,
  fileUrl,
  presentation,
  onBack,
  communityUrl,
  review,
  footer,
  reportForm,
}: {
  submission: WorkshopSubmissionDetail;
  reports?: readonly WorkshopReportSummary[];
  reportFailure?: ReactNode;
  fileUrl?(submissionId: string, filename: string, thumb?: string): string;
  presentation?: WorkshopPresentation;
  onBack?(): void;
  communityUrl?: string;
  review: ReactNode;
  footer: ReactNode;
  reportForm: ReactNode;
}) {
  const t = useI18n("workshop");
  return (
    <Stack gap="md">
      <Group justify="space-between" align="start">
        <Stack gap={2}>
          <Title order={1}>{submission.title}</Title>
          <Text size="sm" c="dimmed">
            {t("author", { name: submission.authorName || t("communityMember") })}
          </Text>
          <Text size="xs" c="dimmed">
            Revision {submission.revision}
          </Text>
        </Stack>
        <Group gap="xs" wrap="nowrap">
          {onBack && (
            <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={onBack}>
              {t("back")}
            </Button>
          )}
          {communityUrl && (
            <Button
              component="a"
              href={communityUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="subtle"
              color="gray"
              leftSection={<IconExternalLink size={16} />}
              visibleFrom="sm"
            >
              {t("openCommunity")}
            </Button>
          )}
        </Group>
      </Group>
      {submission.outdated && (
        <Alert color="yellow" icon={<IconAlertTriangle size={18} />}>
          {t("outdatedWarning")}
        </Alert>
      )}
      {submission.reportCount > 0 && (
        <Stack gap="xs">
          <Alert color="red" icon={<IconAlertTriangle size={18} />}>
            {t("reportWarning", { count: submission.reportCount })}
          </Alert>
          {reports?.map((summary) => (
            <Card key={summary.id} withBorder radius="md" p="sm">
              <Badge color="red" variant="light" mb="xs">
                {t(`reportCategory.${summary.category}`)}
              </Badge>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {summary.explanation}
              </Text>
            </Card>
          ))}
          {reports?.length === 0 && (
            <Text size="xs" c="dimmed">
              {t("reportVisibility")}
            </Text>
          )}
          {reportFailure}
        </Stack>
      )}
      {submission.description && <Text>{submission.description}</Text>}
      {fileUrl && (
        <WorkshopScreenshots
          submissionId={submission.id}
          title={submission.title}
          screenshots={submission.screenshots}
          fileUrl={fileUrl}
          lightbox={presentation?.lightbox}
        />
      )}
      {submission.screenshots.length > 0 && !fileUrl && (
        <Alert color="yellow">Screenshot URLs require the original Workshop file service.</Alert>
      )}
      {review}
      <Accordion variant="contained" radius="md">
        <Accordion.Item value="technical-details">
          <Accordion.Control>{t("technicalDetails")}</Accordion.Control>
          <Accordion.Panel>
            <WorkshopCodeViewer
              value={submission.content}
              language={submission.type === "customCss" ? "css" : "json"}
              code={presentation?.code}
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
      {reportForm}
      <Paper
        withBorder
        shadow="md"
        radius="md"
        p="sm"
        pos="sticky"
        bottom="var(--mantine-spacing-md)"
        bg="var(--mantine-color-body)"
        style={{ zIndex: 2 }}
      >
        {footer}
      </Paper>
    </Stack>
  );
}
