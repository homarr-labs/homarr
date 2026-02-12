"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Button, Center, Group, Loader, Stack, Text, TextInput } from "@mantine/core";
import { TRPCClientError } from "@trpc/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { clientApi } from "@homarr/api/client";
import type { AnchorNotePermission } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

import "react-quill-new/dist/quill.snow.css";
import "./anchor-note.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false }) as any;

dayjs.extend(relativeTime);

type QuillOp = {
  insert?: unknown;
  attributes?: Record<string, unknown>;
};

type QuillDelta = {
  ops: QuillOp[];
};

const quillModules = {
  toolbar: [
    ["bold", "italic", "underline", "strike"],
    [{ header: [1, 2, 3, 4, false] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
  history: {
    delay: 1000,
    maxStack: 200,
    userOnly: true,
  },
};

const readOnlyModules = {
  toolbar: false,
};

const quillFormats = [
  "bold",
  "italic",
  "underline",
  "strike",
  "header",
  "align",
  "list",
  "indent",
  "blockquote",
  "code-block",
  "link",
];

const emptyDelta = (): QuillDelta => ({ ops: [{ insert: "\n" }] });

const toPlainTextDelta = (value: string): QuillDelta => {
  const normalized = value.endsWith("\n") ? value : `${value}\n`;
  return { ops: [{ insert: normalized }] };
};

const parseStoredContent = (content?: string | null): QuillDelta => {
  if (!content) return emptyDelta();

  try {
    const parsed = JSON.parse(content) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed !== null &&
      "ops" in parsed &&
      Array.isArray((parsed as { ops: unknown }).ops)
    ) {
      return { ops: (parsed as { ops: QuillOp[] }).ops };
    }
  } catch {
    return toPlainTextDelta(content);
  }

  return toPlainTextDelta(content);
};

const stringifyDelta = (delta: unknown): string => {
  if (
    delta &&
    typeof delta === "object" &&
    delta !== null &&
    "ops" in delta &&
    Array.isArray((delta as { ops: unknown }).ops)
  ) {
    return JSON.stringify({ ops: (delta as { ops: QuillOp[] }).ops });
  }
  return JSON.stringify(emptyDelta());
};

const canEditPermission = (permission: AnchorNotePermission) => {
  return permission === "owner" || permission === "editor";
};

export default function AnchorNoteWidget({ options, integrationIds }: WidgetComponentProps<"anchorNote">) {
  const t = useScopedI18n("widget.anchorNote") as (key: string, values?: Record<string, unknown>) => string;

  const integrationId = integrationIds[0];
  const noteId = options.noteId.trim();
  const hasIntegration = Boolean(integrationId);
  const hasNoteId = Boolean(noteId);

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    data: note,
    isPending,
    error,
    refetch,
  } = clientApi.widget.anchorNotes.getNote.useQuery(
    {
      integrationId: integrationId ?? "",
      noteId,
    },
    {
      enabled: hasIntegration && hasNoteId,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );

  const { mutateAsync: updateNoteAsync, isPending: isUpdating } = clientApi.widget.anchorNotes.updateNote.useMutation();

  useEffect(() => {
    if (!note || isEditing) return;

    setDraftTitle(note.title);
    setDraftContent(note.content ?? "");
  }, [isEditing, note]);

  const canEdit = useMemo(() => (note ? canEditPermission(note.permission) : false), [note]);
  const isViewer = note?.permission === "viewer";

  const hasChanges = useMemo(() => {
    if (!note) return false;
    const normalizedTitle = draftTitle.trim() || note.title;
    return normalizedTitle !== note.title || draftContent !== (note.content ?? "");
  }, [draftContent, draftTitle, note]);

  const editorValue = useMemo(() => parseStoredContent(draftContent), [draftContent]);
  const readOnlyValue = useMemo(() => parseStoredContent(note?.content), [note?.content]);

  const handleEdit = useCallback(() => {
    if (!note || !canEdit) return;
    setDraftTitle(note.title);
    setDraftContent(note.content ?? "");
    setSaveError(null);
    setIsEditing(true);
  }, [canEdit, note]);

  const handleCancel = useCallback(() => {
    if (!note) return;
    setDraftTitle(note.title);
    setDraftContent(note.content ?? "");
    setSaveError(null);
    setIsEditing(false);
  }, [note]);

  const handleSave = useCallback(async () => {
    if (!note || !integrationId || !canEdit) return;

    const normalizedTitle = draftTitle.trim() || note.title || t("untitled");

    if (!hasChanges) {
      setSaveError(null);
      setIsEditing(false);
      return;
    }

    try {
      await updateNoteAsync({
        integrationId,
        noteId,
        title: normalizedTitle,
        content: draftContent,
      });
      await refetch();
      setSaveError(null);
      setIsEditing(false);
    } catch (mutationError) {
      if (
        mutationError instanceof TRPCClientError &&
        "code" in mutationError.data &&
        mutationError.data.code === "FORBIDDEN"
      ) {
        setSaveError(t("saveForbidden"));
        setIsEditing(false);
        await refetch();
        return;
      }

      setSaveError(t("saveFailed"));
    }
  }, [canEdit, draftContent, draftTitle, hasChanges, integrationId, note, noteId, refetch, t, updateNoteAsync]);

  if (!hasIntegration) {
    return (
      <Center h="100%">
        <Text c="dimmed">{t("integrationRequired")}</Text>
      </Center>
    );
  }

  if (!hasNoteId) {
    return (
      <Center h="100%">
        <Text c="dimmed">{t("empty")}</Text>
      </Center>
    );
  }

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

  return (
    <Stack h="100%" gap="xs" p="sm">
      <Group justify="space-between" align="flex-start">
        <Stack gap={2} style={{ flex: 1 }}>
          {isEditing ? (
            <TextInput value={draftTitle} onChange={(event) => setDraftTitle(event.currentTarget.value)} size="sm" />
          ) : (
            options.showTitle && <Text fw={600}>{note.title || t("untitled")}</Text>
          )}
          {!isEditing && options.showUpdatedAt && (
            <Text size="xs" c="dimmed">
              {t("updatedAt", { date: dayjs(note.updatedAt).fromNow() })}
            </Text>
          )}
          {!isEditing && isViewer && (
            <Text size="xs" c="dimmed">
              {t("readOnlyViewer")}
            </Text>
          )}
          {saveError && (
            <Text size="xs" c="red">
              {saveError}
            </Text>
          )}
        </Stack>
        <Group gap="xs">
          {isEditing ? (
            <>
              <Button size="xs" onClick={handleSave} loading={isUpdating} disabled={!hasChanges || !canEdit}>
                {t("save")}
              </Button>
              <Button size="xs" variant="subtle" onClick={handleCancel} disabled={isUpdating}>
                {t("cancel")}
              </Button>
            </>
          ) : (
            <Button size="xs" variant="light" onClick={handleEdit} disabled={!canEdit || isUpdating}>
              {t("edit")}
            </Button>
          )}
        </Group>
      </Group>
      <div className={`homarr-anchor-quill${isEditing ? "" : " homarr-anchor-quill--readonly"}`} style={{ flex: 1 }}>
        <ReactQuill
          theme="snow"
          readOnly={!isEditing}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value={(isEditing ? editorValue : readOnlyValue) as any}
          onChange={(
            _html: string,
            _delta: unknown,
            source: "user" | "api" | "silent" | string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            editor: any,
          ) => {
            if (!isEditing || source !== "user") return;
            const next = stringifyDelta(editor.getContents?.());
            setDraftContent(next);
          }}
          modules={isEditing ? quillModules : readOnlyModules}
          formats={quillFormats}
          placeholder={t("emptyContent")}
        />
      </div>
    </Stack>
  );
}
