"use client";

import type { ReactNode } from "react";
import { ActionIcon, Badge, Button, Center, Group, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";

import type { AnchorNote } from "@homarr/integrations";

import actionTargetClasses from "../common/action-target.module.css";

import "./anchor-note.css";

export interface AnchorNoteViewProps {
  note: Pick<AnchorNote, "title" | "isPinned" | "isArchived">;
  width: number;
  height: number;
  isAdvanced: boolean;
  showTitle: boolean;
  showUpdatedAt: boolean;
  isEditing: boolean;
  isViewer: boolean;
  canEdit: boolean;
  isUpdating: boolean;
  hasChanges: boolean;
  draftTitle: string;
  saveError: string | null;
  plainText: string;
  labels: {
    untitled: string;
    updatedAt: string;
    readOnlyViewer: string;
    permission: string;
    pinned: string;
    archived: string;
    createdAt: string;
    save: string;
    cancel: string;
    edit: string;
    emptyContent: string;
  };
  onTitleChange: (title: string) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  editor: ReactNode;
}

export function AnchorNoteEmptyView({ label }: { label: string }) {
  return (
    <Center h="100%">
      <Text c="dimmed">{label}</Text>
    </Center>
  );
}

export function AnchorNoteView({
  note,
  width,
  height,
  isAdvanced,
  showTitle,
  showUpdatedAt,
  isEditing,
  isViewer,
  canEdit,
  isUpdating,
  hasChanges,
  draftTitle,
  saveError,
  plainText,
  labels,
  onTitleChange,
  onEdit,
  onCancel,
  onSave,
  editor,
}: AnchorNoteViewProps) {
  return (
    <Stack className="homarr-anchor-note" h="100%" gap="xs" p={height < 120 ? "xs" : "sm"}>
      <Group justify="space-between" align="flex-start">
        <Stack gap={2} style={{ flex: 1 }}>
          {isEditing ? (
            <TextInput value={draftTitle} onChange={(event) => onTitleChange(event.currentTarget.value)} size="sm" />
          ) : (
            (isAdvanced || showTitle) && <Text fw={600}>{note.title || labels.untitled}</Text>
          )}
          {!isEditing && (isAdvanced || showUpdatedAt) && (
            <Text size="xs" c="dimmed">
              {labels.updatedAt}
            </Text>
          )}
          {!isEditing && isViewer && (
            <Text size="xs" c="dimmed">
              {labels.readOnlyViewer}
            </Text>
          )}
          {!isEditing && isAdvanced && (
            <Group gap={4}>
              <Badge size="xs" variant="light">
                {labels.permission}
              </Badge>
              {note.isPinned && <Badge size="xs">{labels.pinned}</Badge>}
              {note.isArchived && (
                <Badge size="xs" color="gray">
                  {labels.archived}
                </Badge>
              )}
              <Text size="xs" c="dimmed">
                {labels.createdAt}
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
          {(isEditing || canEdit) && (
            <Group className="homarr-anchor-actions" data-visible={isEditing || isAdvanced || undefined} gap="xs">
              {isEditing ? (
                <>
                  <Button size="xs" onClick={onSave} loading={isUpdating} disabled={!hasChanges || !canEdit}>
                    {labels.save}
                  </Button>
                  <Button size="xs" variant="subtle" onClick={onCancel} disabled={isUpdating}>
                    {labels.cancel}
                  </Button>
                </>
              ) : isAdvanced ? (
                <Button size="xs" variant="light" onClick={onEdit} disabled={isUpdating}>
                  {labels.edit}
                </Button>
              ) : (
                <Tooltip label={labels.edit}>
                  <ActionIcon
                    className={actionTargetClasses.root}
                    aria-label={labels.edit}
                    size="md"
                    variant="light"
                    onClick={onEdit}
                    disabled={isUpdating}
                  >
                    <IconEdit size="var(--mantine-font-size-md)" />
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
          {editor}
        </div>
      ) : (
        <Text
          size={width < 180 || height < 100 ? "xs" : "sm"}
          c={plainText ? undefined : "dimmed"}
          style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
          lineClamp={Math.max(2, Math.floor((height - 70) / 18))}
        >
          {plainText || labels.emptyContent}
        </Text>
      )}
    </Stack>
  );
}
