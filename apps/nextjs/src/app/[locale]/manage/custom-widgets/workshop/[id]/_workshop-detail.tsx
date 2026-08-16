"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconAlertTriangle, IconArrowLeft, IconDownload, IconExternalLink, IconFlag } from "@tabler/icons-react";

import { CUSTOM_WIDGET_SCHEMA } from "@homarr/custom-widgets/core";
import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { CustomWidgetSourceSetupPanel, ImportReviewContent } from "@homarr/custom-widgets/workbench";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { useWorkshopReportSummariesQuery, useWorkshopSubmissionQuery } from "@homarr/workshop/backend";
import type { WorkshopSubmissionDetail } from "@homarr/workshop/schema";
import { validateWorkshopWidget, workshopExportFilename } from "@homarr/workshop/schema";

import { useCustomWidgetImport } from "~/components/custom-widgets/use-custom-widget-import";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { ManageStickyFooter } from "~/components/manage/manage-sticky-footer";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { WorkshopCodeViewer } from "~/components/workshop/workshop-code-viewer";
import { getWorkshopWebUrl } from "~/components/workshop/workshop-client";
import { WorkshopReportModal } from "~/components/workshop/workshop-report-modal";
import { WorkshopScreenshots } from "~/components/workshop/workshop-screenshots";
import { useWorkshopSession } from "~/components/workshop/workshop-session";
import { WorkshopVoteControl } from "~/components/workshop/workshop-vote-control";

const browseHref = "/manage/custom-widgets/workshop";
const installedHref = "/manage/custom-widgets";

export function WorkshopDetail({ id }: { id: string }) {
  const t = useScopedI18n("workshop");
  const router = useRouter();
  const session = useWorkshopSession();
  const [reportOpened, reportControls] = useDisclosure(false);

  const detail = useWorkshopSubmissionQuery(session.client, id);
  const reportSummaries = useWorkshopReportSummariesQuery(session.client, detail.data?.reportCount ? id : "");

  const content = detail.data?.content;
  const validation = useMemo(() => (content ? validateWorkshopWidget(content) : null), [content]);
  const widget = useMemo<HomarrCustomWidgetV2 | null>(
    () => (validation?.success && typeof validation.data !== "string" ? validation.data : null),
    [validation],
  );
  const compatible =
    detail.data?.type === "customWidget" && widget !== null && detail.data.widgetSchema === CUSTOM_WIDGET_SCHEMA;

  const importer = useCustomWidgetImport({
    widget: compatible ? widget : null,
    // Straight back to the installed list: the edit form is heavy to load and the
    // widget is usable as-is once its sources are configured here.
    onImported: () => router.push(installedHref),
  });

  const breadcrumb = (
    <DynamicBreadcrumb dynamicMappings={detail.data ? new Map([[id, detail.data.title]]) : undefined} />
  );

  if (detail.isPending) {
    return (
      <ManagePageLayout title={<Skeleton h={36} w={280} />} breadcrumb={breadcrumb}>
        <Skeleton h={420} radius="md" />
      </ManagePageLayout>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <ManagePageLayout title={t("title")} breadcrumb={breadcrumb}>
        <Alert color="red" icon={<IconAlertTriangle size={18} />} title={t("loadError")}>
          <Stack gap="sm" align="flex-start">
            <Text size="sm">{detail.error instanceof Error ? detail.error.message : t("unavailable")}</Text>
            <Button
              component={Link}
              href={browseHref}
              variant="light"
              size="xs"
              leftSection={<IconArrowLeft size={14} />}
            >
              {t("back")}
            </Button>
          </Stack>
        </Alert>
      </ManagePageLayout>
    );
  }

  const submission = detail.data;

  return (
    <ManagePageLayout
      title={
        <Stack gap={2}>
          <Title order={1}>{submission.title}</Title>
          <Text size="sm" c="dimmed">
            {t("author", {
              name: submission.authorName || t("communityMember"),
            })}
          </Text>
        </Stack>
      }
      breadcrumb={breadcrumb}
      primaryAction={
        <Group gap="xs" wrap="nowrap">
          <Button component={Link} href={browseHref} variant="default" leftSection={<IconArrowLeft size={16} />}>
            {t("back")}
          </Button>
          <Button
            component="a"
            href={getWorkshopWebUrl(submission.id)}
            target="_blank"
            rel="noopener noreferrer"
            variant="subtle"
            color="gray"
            leftSection={<IconExternalLink size={16} />}
            visibleFrom="sm"
          >
            {t("openCommunity")}
          </Button>
        </Group>
      }
    >
      <Stack gap="md">
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
            {reportSummaries.data?.map((summary) => (
              <Card key={summary.id} withBorder radius="md" p="sm">
                <Badge color="red" variant="light" mb="xs">
                  {t(`reportCategory.${summary.category}`)}
                </Badge>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {summary.explanation}
                </Text>
              </Card>
            ))}
            {reportSummaries.data?.length === 0 && (
              <Text size="xs" c="dimmed">
                {t("reportVisibility")}
              </Text>
            )}
          </Stack>
        )}
        {!compatible && (
          <Alert color="red" icon={<IconAlertTriangle size={18} />} title={t("installError")}>
            {t("installErrorDescription")}
            {validation && !validation.success ? ` ${validation.error}` : ""}
          </Alert>
        )}

        {submission.description && <Text>{submission.description}</Text>}

        <WorkshopScreenshots
          client={session.client}
          submissionId={submission.id}
          title={submission.title}
          screenshots={submission.screenshots}
        />

        {compatible && importer.review && (
          <Paper withBorder radius="md" p="md">
            <Stack gap="md">
              <Box>
                <Text fw={600}>{t("installReviewTitle")}</Text>
                <Text size="sm" c="dimmed">
                  {t("securityNotice")}
                </Text>
              </Box>
              <ImportReviewContent review={importer.review} messages={importer.reviewMessages}>
                <CustomWidgetSourceSetupPanel
                  setups={importer.setups}
                  values={importer.values}
                  onChange={importer.setValue}
                  messages={importer.setupMessages}
                />
              </ImportReviewContent>
            </Stack>
          </Paper>
        )}

        <Accordion variant="contained" radius="md">
          <Accordion.Item value="technical-details">
            <Accordion.Control>{t("technicalDetails")}</Accordion.Control>
            <Accordion.Panel>
              <WorkshopCodeViewer
                value={submission.content}
                language={submission.type === "customCss" ? "css" : "json"}
              />
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>

        <ManageStickyFooter
          secondary={
            <>
              <WorkshopVoteControl
                client={session.client}
                submissionId={submission.id}
                score={submission.score}
                canVote={session.user !== null}
              />
              <Button
                variant="subtle"
                color="gray"
                size="compact-sm"
                leftSection={<IconDownload size={16} />}
                onClick={() => downloadSubmission(submission)}
              >
                {t("export")}
              </Button>
              {/* Wrapped: a tooltip on the disabled button itself would never fire. */}
              <Tooltip label={session.user ? t("report") : t("signInHint")}>
                <span>
                  <Button
                    variant="subtle"
                    color="red"
                    size="compact-sm"
                    leftSection={<IconFlag size={16} />}
                    disabled={!session.user}
                    onClick={reportControls.open}
                  >
                    {t("report")}
                  </Button>
                </span>
              </Tooltip>
            </>
          }
        >
          <Button
            size="md"
            loading={importer.pending || importer.succeeded}
            disabled={!compatible || !importer.ready || importer.succeeded}
            onClick={importer.importWidget}
          >
            {t("install")}
          </Button>
        </ManageStickyFooter>
      </Stack>

      <WorkshopReportModal
        client={session.client}
        submissionId={submission.id}
        opened={reportOpened}
        onClose={reportControls.close}
      />
    </ManagePageLayout>
  );
}

function downloadSubmission(submission: WorkshopSubmissionDetail) {
  const url = URL.createObjectURL(
    new Blob([submission.content], {
      type: submission.type === "customCss" ? "text/css" : "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = workshopExportFilename(submission.title, submission.type);
  link.click();
  URL.revokeObjectURL(url);
}
