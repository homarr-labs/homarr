"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ActionIcon, Badge, Button, Center, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useIntegrationsWithInteractAccess } from "@homarr/auth/client";
import { useTimeAgo } from "@homarr/common";
import type { AnchorNotePermission } from "@homarr/integrations";
import { useCurrentIntlLocale, useScopedI18n } from "@homarr/translation/client";
import { iconSizes } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import { getUsableWidgetQueryData } from "../common/query-state";
import { WidgetQueryErrorIndicator } from "../common/query-state-indicator";
import actionTargetClasses from "../common/action-target.module.css";
import { storedContentToPlainText } from "./content";

import "./anchor-note.css";

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
  const t = useScopedI18n("widget.anchorNote");
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
    <Stack className="homarr-anchor-note" h="100%" gap="xs" p={height < 120 ? "xs" : "sm"}>
      <Group justify="space-between" align="flex-start">
        <Stack gap={2} style={{ flex: 1 }}>
          {isEditing ? (
            <TextInput value={draftTitle} onChange={(event) => setDraftTitle(event.currentTarget.value)} size="sm" />
          ) : (
            (isAdvanced || options.showTitle) && <Text fw={600}>{note.title || t("untitled")}</Text>
          )}
          {!isEditing && (isAdvanced || options.showUpdatedAt) && (
            <Text size="xs" c="dimmed">
              {t("updatedAt", { date: updatedAtRelative })}
            </Text>
          )}
          {!isEditing && isViewer && (
            <Text size="xs" c="dimmed">
              {t("readOnlyViewer")}
            </Text>
          )}
          {!isEditing && isAdvanced && (
            <Group gap={4}>
              <Badge size="xs" variant="light">
                {t(`permission.${note.permission}`)}
              </Badge>
              {note.isPinned && <Badge size="xs">{t("status.pinned")}</Badge>}
              {note.isArchived && (
                <Badge size="xs" color="gray">
                  {t("status.archived")}
                </Badge>
              )}
              <Text size="xs" c="dimmed">
                {t("createdAt", { date: new Date(note.createdAt).toLocaleDateString(locale) })}
              </Text>
            </Group>
          )}
          {saveError && (
            <Text size="xs" c="red">
              {saveError}
            </Text>
          )}
        </Stack>
        <Group gap="xs" wrap="nowrap">
          <WidgetQueryErrorIndicator error={noteQuery.error} label={t("name")} />
          {(isEditing || canEdit) && (
            <Group className="homarr-anchor-actions" data-visible={isEditing || isAdvanced || undefined} gap="xs">
              {isEditing ? (
                <>
                  <Button size="xs" onClick={handleSave} loading={isUpdating} disabled={!hasChanges || !canEdit}>
                    {t("save")}
                  </Button>
                  <Button size="xs" variant="subtle" onClick={handleCancel} disabled={isUpdating}>
                    {t("cancel")}
                  </Button>
                </>
              ) : isAdvanced ? (
                <Button size="xs" variant="light" onClick={handleEdit} disabled={isUpdating}>
                  {t("edit")}
                </Button>
              ) : (
                <Tooltip label={t("edit")}>
                  <ActionIcon
                    className={actionTargetClasses.root}
                    aria-label={t("edit")}
                    size="md"
                    variant="light"
                    onClick={handleEdit}
                    disabled={isUpdating}
                  >
                    <IconEdit style={iconSizes.md} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          )}
        </Group>
      </Group>
      {isEditing || isAdvanced ? (
        <div
          className={`homarr-anchor-quill${isEditing ? "" : " homarr-anchor-quill--readonly"}`}
          style={{ flex: 1, minHeight: 0 }}
        >
          <AnchorNoteEditor
            content={isEditing ? draftContent : note.content}
            readOnly={!isEditing}
            onChange={setDraftContent}
            placeholder={t("emptyContent")}
          />
        </div>
      ) : (
        <Text
          size={width < 180 || height < 100 ? "xs" : "sm"}
          c={plainText ? undefined : "dimmed"}
          style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          lineClamp={Math.max(2, Math.floor((height - 70) / 18))}
        >
          {plainText || t("emptyContent")}
        </Text>
      )}
    </Stack>
  );
};
