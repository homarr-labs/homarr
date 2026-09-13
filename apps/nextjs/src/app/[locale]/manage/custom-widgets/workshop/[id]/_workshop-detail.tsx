"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
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

import type { HomarrCustomWidgetV2 } from "@homarr/custom-widgets/core";
import { ImportReviewContent } from "@homarr/custom-widgets/workbench";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { useWorkshopReportSummariesQuery, useWorkshopSubmissionQuery } from "@homarr/workshop/backend";
import { validateWorkshopWidget } from "@homarr/workshop/schema";

import { useCustomWidgetImport } from "~/components/custom-widgets/use-custom-widget-import";
import { CustomWidgetImportSetupPanel } from "~/components/custom-widgets/import-setup-panel";
import { CustomWidgetInstallCompletion } from "~/components/custom-widgets/install-completion";
import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { ManageStickyFooter } from "~/components/manage/manage-sticky-footer";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { WorkshopCodeViewer } from "~/components/workshop/workshop-code-viewer";
import { getWorkshopWebUrl } from "~/components/workshop/workshop-client";
import { WorkshopReportForm } from "~/components/workshop/workshop-report-form";
import { WorkshopScreenshots } from "~/components/workshop/workshop-screenshots";
import { useWorkshopSession } from "~/components/workshop/workshop-session";
import { WorkshopVoteControl } from "~/components/workshop/workshop-vote-control";
import { downloadWorkshopSubmission } from "~/components/workshop/workshop-download";

const browseHref = "/manage/custom-widgets/workshop";

export function WorkshopDetail({ id }: { id: string }) {
  const t = useI18n("workshop");
  const router = useRouter();
  const remix = useRef(false);
  const [installedId, setInstalledId] = useState<string>();
  const flowT = useI18n("customWidget.flow");
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
    detail.data?.type === "customWidget" && widget !== null && detail.data.widgetSchema === widget.$schema;

  const importer = useCustomWidgetImport({
    widget: compatible ? widget : null,
    workshop: detail.data ? { submissionId: id, revision: detail.data.revision } : undefined,
    // Ordinary installation does not load the workbench.
    onImported: (result) => {
      if (remix.current) router.push(`/manage/custom-widgets/edit/${result.id}`);
      else setInstalledId(result.id);
    },
  });

  const breadcrumb = (
    <DynamicBreadcrumb dynamicMappings={detail.data ? new Map([[id, detail.data.title]]) : undefined} />
  );

  if (installedId) {
    return (
      <ManagePageLayout title={detail.data?.title ?? t("title")} breadcrumb={breadcrumb}>
        <CustomWidgetInstallCompletion definitionId={installedId} />
      </ManagePageLayout>
    );
  }

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
                <CustomWidgetImportSetupPanel importer={importer} />
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
                onClick={() => downloadWorkshopSubmission(submission)}
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
            variant="default"
            disabled={!compatible || !importer.ready || importer.pending || importer.succeeded}
            onClick={() => {
              remix.current = true;
              importer.importWidget();
            }}
          >
            {flowT("remix")}
          </Button>
          <Button
            size="md"
            loading={importer.pending || importer.succeeded}
            disabled={!compatible || !importer.ready || importer.succeeded}
            onClick={() => {
              remix.current = false;
              importer.importWidget();
            }}
          >
            {t("install")}
          </Button>
        </ManageStickyFooter>
      </Stack>
    </ManagePageLayout>
  );
}
