"use client";

import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  Alert,
  Badge,
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

import { customWidgetPackageSchema } from "@homarr/custom-widgets/package";
import { extractErrorMessage } from "@homarr/common";

import { clientApi } from "@homarr/api/client";
import { useByteFormatter } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";
import { useWorkshopCreateMutation } from "@homarr/workshop/backend";
import {
  MAX_WORKSHOP_SCREENSHOTS,
  MAX_WORKSHOP_SCREENSHOT_BYTES,
  workshopScreenshotsSchema,
} from "@homarr/workshop/schema";

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

export function WorkshopPublishForm({
  widget,
  kind = "definition",
}: {
  widget: { id: string; name: string; description?: string; version?: string };
  kind?: "definition" | "package";
}) {
  const isPackage = kind === "package";
  const listHref = isPackage ? "/manage/custom-widgets/packages" : "/manage/custom-widgets";
  const t = useI18n("workshop");
  const tCommon = useI18n("common");
  const { formatBytes } = useByteFormatter();
  const session = useWorkshopSession();
  const utils = clientApi.useUtils();
  const [title, setTitle] = useState(widget.name.slice(0, 100));
  const [description, setDescription] = useState(widget.description ?? "");
  const [version, setVersion] = useState(widget.version ?? "1.0.0");
  const [changelog, setChangelog] = useState("");
  const [publishing, setPublishing] = useState(false);
  const inFlight = useRef(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [sourceUrlsReviewed, setSourceUrlsReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedSubmissionId, setPublishedSubmissionId] = useState<string | null>(null);

  const createSubmission = useWorkshopCreateMutation(session.client);
  const definition = clientApi.customWidget.export.useQuery({ id: widget.id }, { enabled: !isPackage });
  const packageDraft = clientApi.customWidget.package.get.useQuery({ id: widget.id }, { enabled: isPackage });
  const publishPackage = clientApi.customWidget.package.publishWorkshop.useMutation();
  const packageSource = customWidgetPackageSchema.safeParse(packageDraft.data?.source);
  const inspectedDefinition = isPackage ? packageDraft.data?.source : definition.data;
  const loadError = isPackage ? packageDraft.isError : definition.isError;
  const origin = packageDraft.data?.workshop;
  const updating = Boolean(isPackage && session.user && origin?.author === session.user.id);
  const privateSourceNames = getPrivateWorkshopSourceNames(definition.data);
  const definitionFingerprint = inspectedDefinition ? serializeWorkshopDefinition(inspectedDefinition) : null;
  useEffect(() => setSourceUrlsReviewed(false), [definitionFingerprint]);

  const breadcrumb = <DynamicBreadcrumb dynamicMappings={new Map([[widget.id, widget.name]])} />;

  const publish = async () => {
    // Publishing is immediate and public; a second in-flight call would create a
    // duplicate listing.
    if (inFlight.current) return;
    inFlight.current = true;
    setPublishing(true);
    setError(null);
    try {
      if (!inspectedDefinition) throw new Error(t("publish.error"));
      if (!workshopScreenshotsSchema.safeParse(screenshots).success) {
        throw new Error(t("publish.invalidScreenshot", { maxSize: formatBytes(MAX_WORKSHOP_SCREENSHOT_BYTES) }));
      }

      if (isPackage) {
        const token = session.client.authToken;
        if (!token || !packageDraft.data || !packageSource.success) throw new Error(t("publish.error"));
        if (updating && origin && screenshots.length > 0) {
          const listing = await session.client.get(origin.submissionId);
          if (listing.screenshots.length + screenshots.length > MAX_WORKSHOP_SCREENSHOTS)
            throw new Error(t("publish.screenshotLimit"));
        }
        const result = await publishPackage.mutateAsync({
          id: widget.id,
          token,
          mode: "auto",
          title,
          description,
          version,
          changelog,
          expectedDraftDigest: packageDraft.data.draftDigest,
        });
        // A release is already public here. Screenshot failure must not invite a duplicate publication.
        try {
          await session.client.addScreenshots(result.submissionId, screenshots);
        } catch (cause) {
          setScreenshotError(extractErrorMessage(cause));
        }
        void utils.customWidget.package.list.invalidate();
        void utils.customWidget.package.get.invalidate({ id: widget.id });
        setPublishedSubmissionId(result.submissionId);
        return;
      }
      let submissionId: string | null = null;
      const result = await publishWorkshopDefinition({
        inspectedDefinition,
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
    } finally {
      inFlight.current = false;
      setPublishing(false);
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
            {screenshotError && (
              <Alert color="yellow">
                {t("publish.screenshotUploadFailed")} {screenshotError}
              </Alert>
            )}
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
    publishing ||
    !inspectedDefinition ||
    loadError ||
    (isPackage && !packageSource.success) ||
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
                {isPackage ? t("publish.packageDescription") : t("publish.introDescription")}
              </Text>
            </Box>
          </Group>
        </Paper>

        {!session.user && <Alert color="blue">{t("publish.signInHint")}</Alert>}
        {session.user && (
          <Alert color="blue">
            <Text size="sm">{t("publish.publishingAs", { name: session.user.name })}</Text>
            {updating && <Text size="sm">{t("publish.updatingListing")}</Text>}
            {isPackage && origin && !updating && <Text size="sm">{t("publish.attributedCopy")}</Text>}
          </Alert>
        )}

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
              maxLength={100}
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

        {isPackage && (
          <Accordion variant="contained">
            <Accordion.Item value="release">
              <Accordion.Control>
                <Group gap="xs">
                  {t("publish.releaseDetails")}
                  <Badge variant="light">v{version}</Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack>
                  <TextInput
                    label={t("publish.version")}
                    value={version}
                    onChange={(event) => setVersion(event.currentTarget.value)}
                    required
                  />
                  <Textarea
                    label={t("publish.releaseNotes")}
                    description={t("publish.releaseNotesDescription")}
                    value={changelog}
                    onChange={(event) => setChangelog(event.currentTarget.value)}
                    autosize
                    minRows={2}
                    maxLength={2000}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        )}

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

        {isPackage && packageDraft.data && !packageSource.success && (
          <Alert color="yellow">
            <Text size="sm">{t("publish.packageInvalid")}</Text>
            <Button component={Link} href={`/manage/custom-widgets/packages/${widget.id}`} variant="subtle" size="xs">
              {tCommon("action.edit")}
            </Button>
          </Alert>
        )}
        {loadError && <Alert color="red">{t("publish.error")}</Alert>}
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
          <Button size="md" loading={publishing} disabled={blocked} onClick={() => void publish()}>
            {updating ? t("publish.updateAction") : t("publish.action")}
          </Button>
        </ManageStickyFooter>
      </Stack>
    </ManagePageLayout>
  );
}
