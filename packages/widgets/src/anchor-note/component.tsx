"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useTimeAgo } from "@homarr/common";
import type { AnchorNotePermission } from "@homarr/integrations";
import { useCurrentIntlLocale, useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { storedContentToPlainText } from "./content";
import { AnchorNoteEmptyView, AnchorNoteView } from "./native-view";

const AnchorNoteEditor = dynamic(() => import("./editor"), { ssr: false });

const canEditPermission = (permission: AnchorNotePermission) => {
  return permission === "owner" || permission === "editor";
};

const isForbiddenError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;

  const data = (error as { data?: unknown }).data;
  if (typeof data !== "object" || data === null) return false;

  return (data as { code?: unknown }).code === "FORBIDDEN";
};

export default function AnchorNoteWidget({
  options,
  integrationIds,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"anchorNote">) {
  const t = useI18n("widget.anchorNote");
  const noteId = options.noteId.trim();
  if (!noteId) {
    return <AnchorNoteEmptyView label={t("empty")} />;
  }

  // It will always have at least one integration as otherwise the NoIntegrationSelectedError would be thrown in item-content.tsx
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const integrationId = integrationIds[0]!;

  return (
    <AnchorNoteWidgetContent
      options={options}
      integrationId={integrationId}
      noteId={noteId}
      width={width}
      height={height}
      isAdvanced={displayMode === "advanced"}
    />
  );
}

interface AnchorNoteWidgetContentProps {
  options: WidgetComponentProps<"anchorNote">["options"];
  integrationId: string;
  noteId: string;
  width: number;
  height: number;
  isAdvanced: boolean;
}

const AnchorNoteWidgetContent = ({
  options,
  integrationId,
  noteId,
  width,
  height,
  isAdvanced,
}: AnchorNoteWidgetContentProps) => {
  const t = useI18n("widget.anchorNote");
  const tWidgetCommon = useI18n("widget.common");
  const actionT = useI18n("common.action");
  const locale = useCurrentIntlLocale();
  const noteQuery = clientApi.widget.anchorNotes.getNote.useQuery({
    integrationId,
    noteId,
  });
  const note = getUsableWidgetQueryData(noteQuery);
  const { refetch } = noteQuery;
  const { mutateAsync: updateNoteAsync, isPending: isUpdating } = clientApi.widget.anchorNotes.updateNote.useMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(note?.title ?? "");
  const [draftContent, setDraftContent] = useState(note?.content ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing || !note) return;

    startTransition(() => {
      setDraftTitle(note.title);
      setDraftContent(note.content ?? "");
    });
  }, [isEditing, note]);

  const hasInteractAccess = useIntegrationsWithInteractAccess().some(({ id }) => id === integrationId);
  const canEdit = canEditPermission(note?.permission ?? "viewer") && hasInteractAccess;
  const isViewer = !note || note.permission === "viewer";
  const updatedAt = useMemo(() => (note ? new Date(note.updatedAt) : new Date()), [note]);
  const updatedAtRelative = useTimeAgo(updatedAt, 30000);

  const hasChanges = useMemo(() => {
    if (!note) return false;
    const normalizedTitle = draftTitle.trim() || note.title;
    return normalizedTitle !== note.title || draftContent !== (note.content ?? "");
  }, [draftContent, draftTitle, note]);

  const plainText = useMemo(() => storedContentToPlainText(note?.content), [note?.content]);

  const handleEdit = useCallback(() => {
    if (!canEdit || !note) return;
    startTransition(() => {
      setDraftTitle(note.title);
      setDraftContent(note.content ?? "");
      setSaveError(null);
      setIsEditing(true);
    });
  }, [canEdit, note]);

  const handleCancel = useCallback(() => {
    if (!note) return;
    startTransition(() => {
      setDraftTitle(note.title);
      setDraftContent(note.content ?? "");
      setSaveError(null);
      setIsEditing(false);
    });
  }, [note]);

  const handleSave = useCallback(async () => {
    if (!canEdit || !note) return;

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
  }, [canEdit, draftContent, draftTitle, hasChanges, integrationId, note, noteId, refetch, t, updateNoteAsync]);

  if (!note) return <WidgetEmptyState />;

  return (
    <AnchorNoteView
      note={note}
      width={width}
      height={height}
      isAdvanced={isAdvanced}
      showTitle={options.showTitle}
      showUpdatedAt={options.showUpdatedAt}
      isEditing={isEditing}
      isViewer={isViewer}
      canEdit={canEdit}
      isUpdating={isUpdating}
      hasChanges={hasChanges}
      draftTitle={draftTitle}
      saveError={saveError}
      plainText={plainText}
      labels={{
        untitled: !isEditing && (isAdvanced || options.showTitle) && !note.title ? t("untitled") : "",
        updatedAt:
          !isEditing && (isAdvanced || options.showUpdatedAt)
            ? tWidgetCommon("updatedAt", { date: updatedAtRelative })
            : "",
        readOnlyViewer: !isEditing && isViewer ? t("readOnlyViewer") : "",
        permission: !isEditing && isAdvanced ? t(`permission.${note.permission}`) : "",
        pinned: !isEditing && isAdvanced && note.isPinned ? t("status.pinned") : "",
        archived: !isEditing && isAdvanced && note.isArchived ? t("status.archived") : "",
        createdAt:
          !isEditing && isAdvanced ? t("createdAt", { date: new Date(note.createdAt).toLocaleDateString(locale) }) : "",
        save: isEditing ? actionT("save") : "",
        cancel: isEditing ? actionT("cancel") : "",
        edit: !isEditing && canEdit ? actionT("edit") : "",
        emptyContent: !isEditing && !isAdvanced && !plainText ? t("emptyContent") : "",
      }}
      onTitleChange={setDraftTitle}
      onEdit={handleEdit}
      onCancel={handleCancel}
      onSave={handleSave}
      editor={
        isEditing || isAdvanced ? (
          <AnchorNoteEditor
            content={isEditing ? draftContent : note.content}
            readOnly={!isEditing}
            onChange={setDraftContent}
            placeholder={t("emptyContent")}
          />
        ) : null
      }
    />
  );
};
