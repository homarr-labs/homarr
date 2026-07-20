"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, FileInput, Group, Modal, Stack, Textarea, TextInput } from "@mantine/core";

import { clientApi } from "@homarr/api/client";
import { showErrorNotification } from "@homarr/notifications";
import type { WorkshopUser } from "@homarr/workshop";
import { WORKSHOP_API_URL, WorkshopClient } from "@homarr/workshop";
import { useScopedI18n } from "@homarr/translation/client";

const workshopUrl = process.env.NEXT_PUBLIC_WORKSHOP_API_URL ?? WORKSHOP_API_URL;

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
  const client = useMemo(() => new WorkshopClient(workshopUrl), []);
  const utils = clientApi.useUtils();
  const [user, setUser] = useState<WorkshopUser | null>(null);
  const [title, setTitle] = useState(widget.name);
  const [description, setDescription] = useState("");
  const [changelog, setChangelog] = useState("");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const initialChangelog = t("publish.initialChangelog");

  useEffect(() => {
    const unsubscribe = client.subscribeToAuth(setUser);
    void client.refreshAuth().then(setUser);
    return unsubscribe;
  }, [client]);
  useEffect(() => {
    if (!opened) return;
    setTitle(widget.name);
    setDescription("");
    setChangelog(initialChangelog);
    setScreenshots([]);
    setError(null);
    setPublished(false);
  }, [initialChangelog, opened, widget.name]);

  const publish = async () => {
    setPending(true);
    setError(null);
    try {
      const definition = await utils.customWidget.export.fetch({ id: widget.id });
      await client.create({ title, description, changelog, content: JSON.stringify(definition) }, screenshots);
      setPublished(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("publish.error"));
    } finally {
      setPending(false);
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
            <Textarea
              label={t("publish.changelog")}
              value={changelog}
              onChange={(event) => setChangelog(event.currentTarget.value)}
              minRows={2}
            />
            <FileInput
              label={t("publish.screenshots")}
              description={t("publish.screenshotsDescription")}
              accept="image/png,image/jpeg,image/webp"
              multiple
              value={screenshots}
              onChange={setScreenshots}
            />
            {error && <Alert color="red">{error}</Alert>}
            <Button loading={pending} disabled={!user || title.trim().length < 3} onClick={() => void publish()}>
              {t("publish.action")}
            </Button>
          </>
        )}
      </Stack>
    </Modal>
  );
}
