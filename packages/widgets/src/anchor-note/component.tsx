"use client";

import dynamic from "next/dynamic";
import { Button, Center, Group, Loader, Stack, Text, TextInput } from "@mantine/core";
import { TRPCClientError } from "@trpc/client";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { clientApi } from "@homarr/api/client";
import type { AnchorNoteLockStatus } from "@homarr/integrations";
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

export default function AnchorNoteWidget({ options, integrationIds }: WidgetComponentProps<"anchorNote">) {
  const t = useScopedI18n("widget.anchorNote");
  const integrationId = integrationIds[0];
  const noteId = options.noteId.trim();
  const hasIntegration = Boolean(integrationId);
  const hasNoteId = Boolean(noteId);

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [lockStatus, setLockStatus] = useState<AnchorNoteLockStatus | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const quillRef = useRef<any>(null);

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

  const { mutateAsync: lockNoteAsync, isPending: isLockPending } =
    clientApi.widget.anchorNotes.lockNote.useMutation();
  const { mutateAsync: unlockNoteAsync } = clientApi.widget.anchorNotes.unlockNote.useMutation();
  const { mutateAsync: updateNoteAsync, isPending: isUpdating } =
    clientApi.widget.anchorNotes.updateNote.useMutation();

  useEffect(() => {
    if (!note || isEditing) return;
    setDraftTitle(note.title);
    setDraftContent(note.content ?? "");
  }, [note, isEditing]);

  const isLockedByAnchor = lockStatus?.status === "locked" && lockStatus.lockedBy === "anchor";
  const hasChanges = useMemo(() => {
    if (!note) return false;
    return draftTitle.trim() !== note.title || draftContent !== (note.content ?? "");
  }, [draftTitle, draftContent, note]);
  const editorValue = useMemo(() => parseStoredContent(draftContent), [draftContent]);
  const readOnlyValue = useMemo(() => parseStoredContent(note?.content), [note?.content]);
  const readOnlyModules = useMemo(() => ({ toolbar: false }), []);
  const getQuill = useCallback(() => quillRef.current?.getEditor?.(), []);

  const handleReadOnlyCheckToggle = useCallback(
    async (event: React.MouseEvent<HTMLDivElement>) => {
      if (isEditing || isUpdating || !note || !integrationId || isLockedByAnchor) return;

      const target = event.target as HTMLElement | null;
      const listItem = target?.closest('li[data-list="checked"], li[data-list="unchecked"]');
      if (!listItem) return;

      event.preventDefault();
      event.stopPropagation();

      const quill = getQuill();
      if (!quill) return;

      const blot = quill.scroll?.find(listItem);
      if (!blot) return;

      const index = quill.getIndex(blot);
      const [line] = quill.getLine(index);
      if (!line) return;

      const formats = line.formats?.() ?? {};
      const currentList = formats.list as string | undefined;
      const nextList = currentList === "checked" ? "unchecked" : "checked";

      let didLock = false;

      try {
        const lockResult = await lockNoteAsync({ integrationId, noteId });
        setLockStatus(lockResult);
        if (lockResult.status === "locked") {
          return;
        }
        didLock = true;

        quill.formatLine(index, 1, "list", nextList, "api");
        const nextContent = stringifyDelta(quill.getContents?.());

        await updateNoteAsync({
          integrationId,
          noteId,
          title: note.title,
          content: nextContent,
        });
        await refetch();
        setLockStatus(null);
      } catch (err) {
        if (err instanceof TRPCClientError && "code" in err.data && err.data.code === "CONFLICT") {
          setLockStatus({
            status: "locked",
            lockedBy: "anchor",
            expiresAt: new Date().toISOString(),
          });
          return;
        }
        console.error("Failed to toggle checklist item", err);
      } finally {
        if (didLock) {
          unlockNoteAsync({ integrationId, noteId }).catch(() => undefined);
        }
      }
    },
    [
      getQuill,
      integrationId,
      isEditing,
      isLockedByAnchor,
      isUpdating,
      lockNoteAsync,
      note,
      noteId,
      refetch,
      unlockNoteAsync,
      updateNoteAsync,
    ],
  );

  const handleEdit = useCallback(async () => {
    if (!note || !integrationId) return;
    try {
      const result = await lockNoteAsync({ integrationId, noteId });
      setLockStatus(result);
      if (result.status === "locked") {
        return;
      }
      setDraftTitle(note.title);
      setDraftContent(note.content ?? "");
      setIsEditing(true);
    } catch (err) {
      console.error("Failed to acquire note lock", err);
    }
  }, [integrationId, lockNoteAsync, note, noteId]);

  const handleCancel = useCallback(() => {
    if (!note) return;
    setDraftTitle(note.title);
    setDraftContent(note.content ?? "");
    setIsEditing(false);
    setLockStatus(null);
  }, [note]);

  const handleSave = useCallback(async () => {
    if (!note || !integrationId) return;
    const normalizedTitle = draftTitle.trim() || "Untitled";

    if (!hasChanges) {
      setIsEditing(false);
      setLockStatus(null);
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
      setIsEditing(false);
      setLockStatus(null);
    } catch (err) {
      if (err instanceof TRPCClientError && "code" in err.data && err.data.code === "CONFLICT") {
        setLockStatus({
          status: "locked",
          lockedBy: "anchor",
          expiresAt: new Date().toISOString(),
        });
        setIsEditing(false);
        return;
      }
      console.error("Failed to save note", err);
    }
  }, [draftContent, draftTitle, hasChanges, integrationId, note, noteId, refetch, updateNoteAsync]);

  useEffect(function refreshLockEffect() {
    if (!isEditing || !integrationId) return;

    let isActive = true;
    const refreshLock = async () => {
      try {
        const result = await lockNoteAsync({ integrationId, noteId });
        if (!isActive) return;
        setLockStatus(result);
        if (result.status === "locked") {
          setIsEditing(false);
        }
      } catch (err) {
        if (!isActive) return;
        console.error("Failed to refresh note lock", err);
      }
    };

    refreshLock();
    const interval = setInterval(refreshLock, 45_000);

    return () => {
      isActive = false;
      clearInterval(interval);
      unlockNoteAsync({ integrationId, noteId }).catch(() => undefined);
    };
  }, [integrationId, isEditing, lockNoteAsync, noteId, unlockNoteAsync]);

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
            <TextInput
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.currentTarget.value)}
              size="sm"
            />
          ) : (
            options.showTitle && <Text fw={600}>{note.title}</Text>
          )}
          {!isEditing && options.showUpdatedAt && (
            <Text size="xs" c="dimmed">
              {t("updatedAt", { date: dayjs(note.updatedAt).fromNow() })}
            </Text>
          )}
          {!isEditing && isLockedByAnchor && (
            <Text size="xs" c="orange">
              {t("lockedByAnchor")}
            </Text>
          )}
        </Stack>
        <Group gap="xs">
          {isEditing ? (
            <>
              <Button size="xs" onClick={handleSave} loading={isUpdating} disabled={!hasChanges}>
                {t("save")}
              </Button>
              <Button size="xs" variant="subtle" onClick={handleCancel} disabled={isUpdating}>
                {t("cancel")}
              </Button>
            </>
          ) : (
            <Button
              size="xs"
              variant="light"
              onClick={handleEdit}
              disabled={isLockedByAnchor || isLockPending || isUpdating}
            >
              {t("edit")}
            </Button>
          )}
        </Group>
      </Group>
      <div
        className={`homarr-anchor-quill${isEditing ? "" : " homarr-anchor-quill--readonly"}`}
        style={{ flex: 1 }}
        onMouseDownCapture={handleReadOnlyCheckToggle}
      >
        <ReactQuill
          theme="snow"
          readOnly={!isEditing}
            ref={quillRef}
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
