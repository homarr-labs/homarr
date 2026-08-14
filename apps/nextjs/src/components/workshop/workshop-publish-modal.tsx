"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FileInput,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconBuildingStore, IconCheck, IconExternalLink, IconPhoto, IconShieldCheck } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification } from "@homarr/notifications";
import { useWorkshopCreateMutation } from "@homarr/workshop/backend";
import { workshopScreenshotsSchema } from "@homarr/workshop/schema";
import type { WorkshopUser } from "@homarr/workshop/schema";
import { useScopedI18n } from "@homarr/translation/client";

import { createWorkshopClient, getWorkshopWebUrl } from "./workshop-client";
import {
  getPrivateWorkshopSourceNames,
  publishWorkshopDefinition,
  serializeWorkshopDefinition,
} from "./workshop-publish-definition";

export function WorkshopPublishModal({
  opened,
  onClose,
  widget,
}: {
  opened: boolean;
  onClose(): void;
  widget: { id: string; name: string };
}) {
  const t = useScopedI18n("workshop");
  const client = useMemo(createWorkshopClient, []);
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [title, setTitle] = useState(widget.name);
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const createSubmission = useWorkshopCreateMutation(client);
  const [error, setError] = useState<string | null>(null);
  const [publishedSubmissionId, setPublishedSubmissionId] = useState<string | null>(null);
  const [sourceUrlsReviewed, setSourceUrlsReviewed] = useState(false);
  const definition = clientApi.customWidget.export.useQuery({ id: widget.id }, { enabled: opened });
  const privateSourceNames = getPrivateWorkshopSourceNames(definition.data);
  const definitionFingerprint = definition.data ? serializeWorkshopDefinition(definition.data) : null;

  useEffect(() => {
    const unsubscribe = client.subscribeToAuth(setUser);
    void client.refreshAuth().then(setUser);
    return unsubscribe;
  }, [client]);
  useEffect(() => {
    if (!opened) return;
    setTitle(widget.name);
    setDescription("");
    setScreenshots([]);
    setError(null);
    setPublishedSubmissionId(null);
    setSourceUrlsReviewed(false);
  }, [opened, widget.name]);
  useEffect(() => setSourceUrlsReviewed(false), [definitionFingerprint]);

  const publish = async () => {
    setError(null);
    try {
      if (!definition.data) throw new Error(t("publish.error"));
      if (!workshopScreenshotsSchema.safeParse(screenshots).success) {
        throw new Error(t("publish.invalidScreenshot"));
      }
      const inspectedDefinition = definition.data;
      let submissionId: string | null = null;
      const result = await publishWorkshopDefinition({
        inspectedDefinition,
        refetchDefinition: async () => (await definition.refetch()).data,
        publish: async (content) => {
          const submission = await createSubmission.mutateAsync({
            input: {
              type: "customWidget",
              title,
              description,
              content,
            },
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

  return (
    <Modal opened={opened} onClose={onClose} title={t("publish.title")} size="lg" radius="lg">
      <Stack gap="lg">
        {publishedSubmissionId ? (
          <Stack align="center" gap="lg" py="md">
            <ThemeIcon size={64} radius="xl" color="green" variant="light">
              <IconCheck size={32} stroke={2} />
            </ThemeIcon>
            <Box ta="center">
              <Title order={3}>{t("publish.successTitle")}</Title>
              <Text c="dimmed" size="sm" maw={480} mt={6}>
                {t("publish.success")}
              </Text>
            </Box>
            <Paper withBorder radius="md" p="md" w="100%">
              <Group wrap="nowrap" align="flex-start">
                <ThemeIcon variant="light" color="blue" radius="md" size="lg">
                  <IconBuildingStore size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={600} size="sm">
                    {t("publish.manageTitle")}
                  </Text>
                  <Text c="dimmed" size="sm" mt={2}>
                    {t("publish.manageDescription")}
                  </Text>
                </Box>
              </Group>
            </Paper>
            <Group justify="center">
              <Button variant="default" onClick={onClose}>
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
        ) : (
          <>
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
            {!user && (
              <Alert color="blue">
                <Group justify="space-between">
                  <span>{t("publish.signInHint")}</span>
                  <Button
                    size="xs"
                    onClick={() =>
                      void client
                        .signInWithGitHub()
                        .then(setUser)
                        .catch((cause: Error) => {
                          setError(cause.message);
                          showErrorNotification({ title: t("signIn"), message: cause.message });
                        })
                    }
                  >
                    {t("signIn")}
                  </Button>
                </Group>
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
                  maxRows={7}
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
            <Divider />
            <Group justify="space-between" align="center">
              <Text c="dimmed" size="xs" maw={360}>
                {t("publish.publicationNote")}
              </Text>
              <Group gap="sm">
                <Button variant="default" onClick={onClose}>
                  {t("publish.cancel")}
                </Button>
                <Button
                  loading={createSubmission.isPending || definition.isFetching}
                  disabled={
                    !user ||
                    !definition.data ||
                    definition.isError ||
                    title.trim().length < 3 ||
                    (privateSourceNames.length > 0 && !sourceUrlsReviewed)
                  }
                  onClick={() => void publish()}
                >
                  {t("publish.action")}
                </Button>
              </Group>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
