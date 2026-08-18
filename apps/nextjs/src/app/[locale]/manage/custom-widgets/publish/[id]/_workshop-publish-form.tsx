"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
import {
  IconArrowLeft,
  IconBuildingStore,
  IconCheck,
  IconExternalLink,
  IconPhoto,
  IconShieldCheck,
} from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { useWorkshopCreateMutation } from "@homarr/workshop/backend";
import { workshopScreenshotsSchema } from "@homarr/workshop/schema";

import { ManagePageLayout } from "~/components/manage/manage-page-layout";
import { ManageStickyFooter } from "~/components/manage/manage-sticky-footer";
import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { getWorkshopWebUrl } from "~/components/workshop/workshop-client";
import {
  getPrivateWorkshopSourceNames,
  publishWorkshopDefinition,
  serializeWorkshopDefinition,
} from "~/components/workshop/workshop-publish-definition";
import { WorkshopAccountButton, useWorkshopSession } from "~/components/workshop/workshop-session";

const listHref = "/manage/custom-widgets";

export function WorkshopPublishForm({ widget }: { widget: { id: string; name: string } }) {
  const t = useScopedI18n("workshop");
  const session = useWorkshopSession();
  const [title, setTitle] = useState(widget.name);
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [sourceUrlsReviewed, setSourceUrlsReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedSubmissionId, setPublishedSubmissionId] = useState<string | null>(null);

  const createSubmission = useWorkshopCreateMutation(session.client);
  const definition = clientApi.customWidget.export.useQuery({ id: widget.id });
  const privateSourceNames = getPrivateWorkshopSourceNames(definition.data);
  const definitionFingerprint = definition.data ? serializeWorkshopDefinition(definition.data) : null;
  useEffect(() => setSourceUrlsReviewed(false), [definitionFingerprint]);

  const breadcrumb = <DynamicBreadcrumb dynamicMappings={new Map([[widget.id, widget.name]])} />;

  const publish = async () => {
    // Publishing is immediate and public; a second in-flight call would create a
    // duplicate listing.
    if (createSubmission.isPending) return;
    setError(null);
    try {
      if (!definition.data) throw new Error(t("publish.error"));
      if (!workshopScreenshotsSchema.safeParse(screenshots).success) throw new Error(t("publish.invalidScreenshot"));

      let submissionId: string | null = null;
      const result = await publishWorkshopDefinition({
        inspectedDefinition: definition.data,
        refetchDefinition: async () => (await definition.refetch()).data,
        publish: async (content) => {
          const submission = await createSubmission.mutateAsync({
            input: { type: "customWidget", title, description, content },
            screenshots,
          });
          submissionId = submission.id;
        },
      });
      if (result === "unavailable") throw new Error(t("publish.error"));
      if (result === "changed") {
        setSourceUrlsReviewed(false);
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
    (privateSourceNames.length > 0 && !sourceUrlsReviewed);

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
              required
            />
            <Textarea
              label={t("publish.descriptionField")}
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              minRows={4}
              autosize
              maxRows={8}
            />
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

        {privateSourceNames.length > 0 && (
          <Alert color="yellow" icon={<IconShieldCheck size={18} />} title={t("publish.reviewSourcesTitle")}>
            {t("publish.privateSourceWarning", {
              sources: privateSourceNames.join(", "),
            })}
            <Checkbox
              mt="sm"
              checked={sourceUrlsReviewed}
              onChange={(event) => setSourceUrlsReviewed(event.currentTarget.checked)}
              label={t("publish.privateSourceConfirmation")}
            />
          </Alert>
        )}

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
            {t("publish.cancel")}
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
