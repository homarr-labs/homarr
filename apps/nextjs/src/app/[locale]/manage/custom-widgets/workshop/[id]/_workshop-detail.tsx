"use client";

import { useRouter } from "next/navigation";
import {
  Accordion,
  Alert,
  Badge,
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

import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { useWorkshopReportSummariesQuery, useWorkshopSubmissionQuery } from "@homarr/workshop/backend";
import type { WorkshopSubmissionDetail } from "@homarr/workshop/schema";
import { workshopExportFilename } from "@homarr/workshop/schema";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { ManageStickyFooter } from "~/components/manage/manage-sticky-footer";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { WorkshopCodeViewer } from "~/components/workshop/workshop-code-viewer";
import { getWorkshopWebUrl } from "~/components/workshop/workshop-client";
import { WorkshopInstallReview, useWorkshopWidgetImport } from "~/components/workshop/workshop-install-review";
import { WorkshopReportForm } from "~/components/workshop/workshop-report-form";
import { WorkshopScreenshots } from "~/components/workshop/workshop-screenshots";
import { useWorkshopSession } from "~/components/workshop/workshop-session";
import { WorkshopVoteControl } from "~/components/workshop/workshop-vote-control";

const browseHref = "/manage/custom-widgets/workshop";
const installedHref = "/manage/custom-widgets";

export function WorkshopDetail({ id }: { id: string }) {
  const t = useI18n("workshop");
  const tCommon = useI18n("common");
  const router = useRouter();
  const session = useWorkshopSession();
  const [reportOpened, reportControls] = useDisclosure(false);

  const detail = useWorkshopSubmissionQuery(session.client, id);
  const reportSummaries = useWorkshopReportSummariesQuery(session.client, detail.data?.reportCount ? id : "");

  const importer = useWorkshopWidgetImport(detail.data, () => router.push(installedHref));
  const { validation } = importer;
  const compatible = validation?.success === true;

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
              <Card key={summary.id} radius="md" p="sm">
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
          <Paper radius="md" p="md">
            <WorkshopInstallReview importer={importer} />
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

        <WorkshopReportForm
          client={session.client}
          submissionId={submission.id}
          opened={reportOpened}
          onClose={reportControls.close}
        />

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
                {tCommon("action.export")}
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
                    aria-expanded={reportOpened}
                    aria-controls="workshop-report-form"
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
