"use client";

import { Center, Loader, ScrollArea, Stack, Text } from "@mantine/core";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

dayjs.extend(relativeTime);

export default function AnchorNoteWidget({ options, integrationIds }: WidgetComponentProps<"anchorNote">) {
  const t = useScopedI18n("widget.anchorNote");
  const integrationId = integrationIds[0];
  const noteId = options.noteId.trim();

  if (!noteId) {
    return (
      <Center h="100%">
        <Text c="dimmed">{t("empty")}</Text>
      </Center>
    );
  }

  const { data: note, isPending, error } = clientApi.widget.anchorNotes.getNote.useQuery(
    {
      integrationId: integrationId ?? "",
      noteId,
    },
    {
      enabled: Boolean(integrationId),
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  if (error) {
    throw error;
  }

  if (isPending) {
    return (
      <Center h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  if (!note) {
    return (
      <Center h="100%">
        <Text c="dimmed">{t("notFound")}</Text>
      </Center>
    );
  }

  const content = extractPlainText(note.content);

  return (
    <Stack h="100%" gap="xs" p="sm">
      {options.showTitle && <Text fw={600}>{note.title}</Text>}
      {options.showUpdatedAt && (
        <Text size="xs" c="dimmed">
          {t("updatedAt", { date: dayjs(note.updatedAt).fromNow() })}
        </Text>
      )}
      <ScrollArea offsetScrollbars style={{ flex: 1 }}>
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {content || t("emptyContent")}
        </Text>
      </ScrollArea>
    </Stack>
  );
}

const extractPlainText = (content?: string | null) => {
  if (!content) return "";

  try {
    const parsed = JSON.parse(content) as { ops?: { insert?: unknown }[] };
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.ops)) {
      return parsed.ops
        .map((op) => (typeof op.insert === "string" ? op.insert : ""))
        .join("")
        .trim();
    }
  } catch {
    return content;
  }

  return content;
};
