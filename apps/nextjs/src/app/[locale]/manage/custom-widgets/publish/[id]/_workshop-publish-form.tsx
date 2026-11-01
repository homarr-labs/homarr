"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  FileInput,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconBuildingStore, IconCheck, IconExternalLink, IconPhoto } from "@tabler/icons-react";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { getCustomWidgetIntegrationKinds } from "@homarr/custom-widgets/core";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { useWorkshopCreateMutation } from "@homarr/workshop/backend";
import {
  MAX_WORKSHOP_SCREENSHOT_BYTES,
  workshopScreenshotsSchema,
  workshopSubmissionInputSchema,
} from "@homarr/workshop/schema";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { ManageStickyFooter } from "~/components/manage/manage-sticky-footer";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { getWorkshopWebUrl } from "~/components/workshop/workshop-client";
import { WorkshopIntegrationBadges } from "~/components/workshop/workshop-integration-badges";
import {
  publishWorkshopDefinition,
  serializeWorkshopDefinition,
} from "~/components/workshop/workshop-publish-definition";
import { WorkshopAccountButton, useWorkshopSession } from "~/components/workshop/workshop-session";

const listHref = "/manage/custom-widgets";

interface WorkshopPublishFormProps {
  widget: { id: string; name: string };
  initialDefinition: RouterOutputs["customWidget"]["export"];
}

export function WorkshopPublishForm({ widget, initialDefinition }: WorkshopPublishFormProps) {
  const t = useI18n("workshop");
  const tCommon = useI18n("common");
  const { formatBytes } = useByteFormatter();
  const session = useWorkshopSession();
  const [title, setTitle] = useState(widget.name.slice(0, 100));
  const [description, setDescription] = useState(initialDefinition.description ?? "");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [publishedSubmissionId, setPublishedSubmissionId] = useState<string | null>(null);

  const createSubmission = useWorkshopCreateMutation(session.client);
  const definition = clientApi.customWidget.export.useQuery({ id: widget.id }, { initialData: initialDefinition });
  const integrationKinds = getCustomWidgetIntegrationKinds((definition.data ?? initialDefinition).sources);

  const breadcrumb = <DynamicBreadcrumb dynamicMappings={new Map([[widget.id, widget.name]])} />;

  const publish = async () => {
    if (createSubmission.isPending || !session.user) return;
    setError(null);
    try {
      if (!definition.data) throw new Error(t("publish.error"));
      const input = workshopSubmissionInputSchema.safeParse({
        type: "customWidget",
        title,
        description,
        content: serializeWorkshopDefinition(definition.data),
      });
      if (!input.success) throw new Error(input.error.issues.map((issue) => issue.message).join("\n"));
      if (!workshopScreenshotsSchema.safeParse(screenshots).success) {
        throw new Error(t("publish.invalidScreenshot", { maxSize: formatBytes(MAX_WORKSHOP_SCREENSHOT_BYTES) }));
      }

      let submissionId: string | null = null;
      const result = await publishWorkshopDefinition({
        inspectedDefinition: definition.data,
        refetchDefinition: async () => (await definition.refetch()).data,
        publish: async (content) => {
          const submission = await createSubmission.mutateAsync({
            input: { ...input.data, content },
            screenshots,
          });
          submissionId = submission.id;
        },
      });
      if (result === "unavailable") throw new Error(t("publish.error"));
      if (result === "changed") {
        setError(t("publish.definitionChanged"));
        return;
      }
      if (!submissionId) throw new Error(t("publish.error"));
      setPublishedSubmissionId(submissionId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("publish.error"));
    }
  };

  if (publishedSubmissionId) {
    return (
      <ManagePageLayout title={t("publish.successTitle")} breadcrumb={breadcrumb}>
        <Paper withBorder radius="md" p="xl">
          <Stack align="center" gap="lg">
            <ThemeIcon size={64} radius="xl" color="green" variant="light">
              <IconCheck size={32} stroke={2} />
            </ThemeIcon>
            <Text c="dimmed" ta="center" maw={520}>
              {t("publish.success")}
            </Text>
            <Text c="dimmed" size="sm" ta="center" maw={520}>
              {t("publish.manageDescription")}
            </Text>
            <Group gap="sm">
              <Button component={Link} href={listHref} variant="default" leftSection={<IconArrowLeft size={16} />}>
                {t("publish.done")}
              </Button>
              <Button
                component="a"
                href={getWorkshopWebUrl(publishedSubmissionId)}
                target="_blank"
                rel="noopener noreferrer"
                rightSection={<IconExternalLink size={16} />}
              >
                {t("publish.viewSubmission")}
              </Button>
            </Group>
          </Stack>
        </Paper>
      </ManagePageLayout>
    );
  }

  const blocked =
    !session.user ||
    createSubmission.isPending ||
    !definition.data ||
    definition.isError ||
    title.trim().length < 3 ||
    title.trim().length > 100 ||
    description.trim().length > 2_000;

  return (
    <ManagePageLayout
      title={
        <Stack gap={2}>
          <Title order={1}>{t("publish.title")}</Title>
          <Text size="sm" c="dimmed">
            {widget.name}
          </Text>
        </Stack>
      }
      breadcrumb={breadcrumb}
      primaryAction={<WorkshopAccountButton session={session} />}
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-default-hover)">
          <Group wrap="nowrap" align="flex-start">
            <ThemeIcon variant="light" radius="md" size="lg">
              <IconBuildingStore size={20} />
            </ThemeIcon>
            <Box>
              <Text fw={600}>{t("publish.introTitle")}</Text>
              <Text c="dimmed" size="sm" mt={2}>
                {t("publish.introDescription")}
              </Text>
            </Box>
          </Group>
        </Paper>

        {!session.user && <Alert color="blue">{t("publish.signInHint")}</Alert>}

        <Paper withBorder radius="md" p="md">
          <Stack gap="md">
            <Box>
              <Text fw={600} size="sm">
                {t("publish.listingDetails")}
              </Text>
              <Text c="dimmed" size="xs" mt={2}>
                {t("publish.listingDetailsDescription")}
              </Text>
            </Box>
            <TextInput
              label={t("publish.titleField")}
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              minLength={3}
              maxLength={100}
              required
            />
            <Textarea
              label={t("publish.descriptionField")}
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              maxLength={2_000}
              minRows={4}
              autosize
              maxRows={8}
            />
            {integrationKinds.length > 0 && (
              <Stack gap={6}>
                <Text size="sm" fw={500}>
                  {t("integrations")}
                </Text>
                <WorkshopIntegrationBadges kinds={integrationKinds} />
              </Stack>
            )}
            <FileInput
              label={t("publish.screenshots")}
              description={t("publish.screenshotsDescription")}
              placeholder={t("publish.screenshotsPlaceholder")}
              leftSection={<IconPhoto size={16} />}
              accept="image/png,image/jpeg,image/webp"
              multiple
              value={screenshots}
              onChange={setScreenshots}
              clearable
            />
          </Stack>
        </Paper>

        {definition.isError && <Alert color="red">{t("publish.error")}</Alert>}
        {error && <Alert color="red">{error}</Alert>}

        <ManageStickyFooter
          secondary={
            <Text c="dimmed" size="xs" maw={420}>
              {t("publish.publicationNote")}
            </Text>
          }
        >
          <Button component={Link} href={listHref} variant="default">
            {tCommon("action.cancel")}
          </Button>
          <Button
            size="md"
            loading={createSubmission.isPending || definition.isFetching}
            disabled={blocked}
            onClick={() => void publish()}
          >
            {t("publish.action")}
          </Button>
        </ManageStickyFooter>
      </Stack>
    </ManagePageLayout>
  );
}
