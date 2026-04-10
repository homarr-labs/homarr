"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import { Button, Center, Group, Stack, Text, TextInput } from "@mantine/core";
import { Quill } from "react-quill-new";
import type { DeltaStatic } from "react-quill-new";
import type ReactQuillComponent from "react-quill-new";
import { z } from "zod/v4";

import { clientApi } from "@homarr/api/client";
import { useTimeAgo } from "@homarr/common";
import type { AnchorNotePermission } from "@homarr/integrations";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";

import "react-quill-new/dist/quill.snow.css";
import "./anchor-note.css";

type ReactQuillProps = ComponentProps<typeof ReactQuillComponent>;
type ReactQuillOnChange = NonNullable<ReactQuillProps["onChange"]>;

const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const quillDeltaOperationSchema = z.object({
  insert: z.unknown().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

const quillDeltaSchema = z.object({
  ops: z.array(quillDeltaOperationSchema),
});

type QuillDelta = z.infer<typeof quillDeltaSchema>;

const DeltaConstructor = Quill.import("delta") as new (
  ops?: QuillDelta["ops"] | { ops: QuillDelta["ops"] },
) => DeltaStatic;

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

const emptyDelta = (): DeltaStatic => new DeltaConstructor([{ insert: "\n" }]);

const toPlainTextDelta = (value: string): DeltaStatic => {
  const normalized = value.endsWith("\n") ? value : `${value}\n`;
  return new DeltaConstructor([{ insert: normalized }]);
};

const parseStoredContent = (content?: string | null): DeltaStatic => {
  if (!content) return emptyDelta();

  try {
    const parsedDelta = quillDeltaSchema.safeParse(JSON.parse(content));
    if (parsedDelta.success) {
      return new DeltaConstructor(parsedDelta.data.ops);
    }
  } catch {
    return toPlainTextDelta(content);
  }

  return toPlainTextDelta(content);
};

const stringifyDelta = (delta: unknown): string => {
  const parsedDelta = quillDeltaSchema.safeParse(delta);
  if (parsedDelta.success) {
    return JSON.stringify(parsedDelta.data);
  }
  return JSON.stringify(emptyDelta());
};

const canEditPermission = (permission: AnchorNotePermission) => {
  return permission === "owner" || permission === "editor";
};

const isForbiddenError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;

  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return false;

  return (data as { code?: unknown }).code === "FORBIDDEN";
};

export default function AnchorNoteWidget({ options, integrationIds }: WidgetComponentProps<"anchorNote">) {
  const t = useScopedI18n("widget.anchorNote");
  const noteId = options.noteId.trim();
  if (!noteId) {
    return (
      <Center h="100%">
        <Text c="dimmed">{t("empty")}</Text>
      </Center>
    );
  }

  // It will always have at least one integration as otherwise the NoIntegrationSelectedError would be thrown in item-content.tsx
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const integrationId = integrationIds[0]!;

  return <AnchorNoteWidgetContent options={options} integrationId={integrationId} noteId={noteId} />;
}

interface AnchorNoteWidgetContentProps {
  options: WidgetComponentProps<"anchorNote">["options"];
  integrationId: string;
  noteId: string;
}

const AnchorNoteWidgetContent = ({ options, integrationId, noteId }: AnchorNoteWidgetContentProps) => {
  const t = useScopedI18n("widget.anchorNote");
  const [note, { refetch }] = clientApi.widget.anchorNotes.getNote.useSuspenseQuery(
    {
      integrationId,
      noteId,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  const { mutateAsync: updateNoteAsync, isPending: isUpdating } = clientApi.widget.anchorNotes.updateNote.useMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(note.title);
  const [draftContent, setDraftContent] = useState(note.content ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;

    startTransition(() => {
      setDraftTitle(note.title);
      setDraftContent(note.content ?? "");
    });
  }, [isEditing, note.content, note.title]);

  const canEdit = canEditPermission(note.permission);
  const isViewer = note.permission === "viewer";
  const updatedAt = useMemo(() => new Date(note.updatedAt), [note.updatedAt]);
  const updatedAtRelative = useTimeAgo(updatedAt, 30000);

  const hasChanges = useMemo(() => {
    const normalizedTitle = draftTitle.trim() || note.title;
    return normalizedTitle !== note.title || draftContent !== (note.content ?? "");
  }, [draftContent, draftTitle, note.content, note.title]);

  const editorValue = useMemo(() => parseStoredContent(draftContent), [draftContent]);
  const readOnlyValue = useMemo(() => parseStoredContent(note.content), [note.content]);
  const handleEditorChange = useCallback<ReactQuillOnChange>(
    (_html, _delta, source, editor) => {
      if (!isEditing || source !== "user") return;
      const next = stringifyDelta(editor.getContents());
      setDraftContent(next);
    },
    [isEditing],
  );

  const handleEdit = useCallback(() => {
    if (!canEdit) return;
    startTransition(() => {
      setDraftTitle(note.title);
      setDraftContent(note.content ?? "");
      setSaveError(null);
      setIsEditing(true);
    });
  }, [canEdit, note.content, note.title]);

  const handleCancel = useCallback(() => {
    startTransition(() => {
      setDraftTitle(note.title);
      setDraftContent(note.content ?? "");
      setSaveError(null);
      setIsEditing(false);
    });
  }, [note.content, note.title]);

  const handleSave = useCallback(async () => {
    if (!canEdit) return;

    const normalizedTitle = draftTitle.trim() || note.title || t("untitled");

    if (!hasChanges) {
      startTransition(() => {
        setSaveError(null);
        setIsEditing(false);
      });
      return;
    }

    await updateNoteAsync(
      {
        integrationId,
        noteId,
        title: normalizedTitle,
        content: draftContent,
      },
      {
        onSuccess() {
          void (async () => {
            await refetch();
            startTransition(() => {
              setSaveError(null);
              setIsEditing(false);
            });
          })();
        },
        onError(error) {
          if (isForbiddenError(error)) {
            void (async () => {
              await refetch();
              startTransition(() => {
                setSaveError(t("saveForbidden"));
                setIsEditing(false);
              });
            })();
            return;
          }

          startTransition(() => {
            setSaveError(t("saveFailed"));
          });
        },
      },
    );
  }, [canEdit, draftContent, draftTitle, hasChanges, integrationId, note.title, noteId, refetch, t, updateNoteAsync]);

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
              {t("updatedAt", { date: updatedAtRelative })}
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
          value={isEditing ? editorValue : readOnlyValue}
          onChange={handleEditorChange}
          modules={isEditing ? quillModules : readOnlyModules}
          formats={quillFormats}
          placeholder={t("emptyContent")}
        />
      </div>
    </Stack>
  );
};
