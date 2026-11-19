"use client";

import { useState } from "react";
import { Alert, Button, Group, Modal, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { IconExternalLink, IconUpload } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import type { CustomTheme } from "@homarr/validation/theme";

import { getWorkshopWebUrl } from "./workshop-client";
import { WorkshopCodeViewer } from "./workshop-code-viewer";
import { WorkshopAccountButton, useWorkshopSession } from "./workshop-session";

export function WorkshopThemePublishButton({ theme }: { theme: CustomTheme | undefined }) {
  const t = useI18n("workshop.theme");
  const [document, setDocument] = useState<CustomTheme | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="light"
        disabled={!theme}
        leftSection={<IconUpload size={16} />}
        onClick={() => {
          if (theme) setDocument(theme);
        }}
      >
        {t("share")}
      </Button>
      <Modal
        opened={document !== null}
        onClose={() => setDocument(null)}
        closeOnEscape={!pending}
        closeOnClickOutside={!pending}
        withCloseButton={!pending}
        title={t("share")}
        size="lg"
      >
        {document && <PublishThemeForm document={document} pending={pending} setPending={setPending} />}
      </Modal>
    </>
  );
}

function PublishThemeForm({
  document,
  pending,
  setPending,
}: {
  document: CustomTheme;
  pending: boolean;
  setPending: (pending: boolean) => void;
}) {
  const t = useI18n("workshop");
  const session = useWorkshopSession();
  const [error, setError] = useState<string>();
  const [publishedId, setPublishedId] = useState<string>();
  const content = JSON.stringify(document);

  if (publishedId) {
    return (
      <Stack>
        <Text component="output">{t("theme.published")}</Text>
        <Button
          component="a"
          href={getWorkshopWebUrl(publishedId)}
          target="_blank"
          rel="noopener noreferrer"
          rightSection={<IconExternalLink size={16} />}
        >
          {t("publish.viewSubmission")}
        </Button>
      </Stack>
    );
  }

  return (
    <form
      method="post"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending || !session.user) return;
        const fields = new FormData(event.currentTarget);
        setError(undefined);
        setPending(true);
        try {
          const result = await session.client.create({
            type: "customTheme",
            title: String(fields.get("title") ?? ""),
            description: String(fields.get("description") ?? ""),
            content,
          });
          setPublishedId(result.id);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : t("publish.error"));
        } finally {
          setPending(false);
        }
      }}
    >
      <Stack>
        <Text size="sm">{t("theme.shareHint")}</Text>
        <Group>
          <WorkshopAccountButton session={session} />
        </Group>
        {!session.user && <Text size="sm">{t("publish.signInHint")}</Text>}
        <TextInput name="title" label={t("theme.title")} required minLength={3} maxLength={100} />
        <Textarea name="description" label={t("theme.description")} maxLength={2_000} />
        <WorkshopCodeViewer value={content} language="json" height="200px" />
        {error && (
          <Alert color="red" role="alert">
            {error}
          </Alert>
        )}
        <Button type="submit" loading={pending} disabled={!session.user}>
          {t("publish.action")}
        </Button>
      </Stack>
    </form>
  );
}
