"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Checkbox, FileInput, Group, Modal, Stack, Textarea, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification } from "@homarr/notifications";
import { useWorkshopCreateMutation } from "@homarr/workshop/backend";
import { workshopScreenshotsSchema } from "@homarr/workshop/schema";
import type { WorkshopUser } from "@homarr/workshop/schema";
import { useScopedI18n } from "@homarr/translation/client";

import { createWorkshopClient } from "./workshop-client";
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
  const [published, setPublished] = useState(false);
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
    setPublished(false);
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
      const result = await publishWorkshopDefinition({
        inspectedDefinition,
        refetchDefinition: async () => (await definition.refetch()).data,
        publish: (content) =>
          createSubmission.mutateAsync({
            input: {
              type: "customWidget",
              title,
              description,
              content,
            },
            screenshots,
          }),
      });
      if (result === "unavailable") throw new Error(t("publish.error"));
      if (result === "changed") {
        setSourceUrlsReviewed(false);
        setError(t("publish.definitionChanged"));
        return;
      }
      setPublished(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("publish.error"));
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t("publish.title")} size="lg">
      <Stack>
        {published ? (
          <Alert color="green">{t("publish.success")}</Alert>
        ) : (
          <>
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
              minRows={3}
            />
            <FileInput
              label={t("publish.screenshots")}
              description={t("publish.screenshotsDescription")}
              accept="image/png,image/jpeg,image/webp"
              multiple
              value={screenshots}
              onChange={setScreenshots}
            />
            {privateSourceNames.length > 0 && (
              <Alert color="yellow">
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
          </>
        )}
      </Stack>
    </Modal>
  );
}
