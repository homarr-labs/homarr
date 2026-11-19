"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader, Overlay, Paper, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconLink } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useI18n } from "@homarr/translation/client";

import { hasRoomForItem } from "./items/actions/create-item";
import { useItemActions } from "./items/item-actions";

// Firefox sends text/x-moz-url (the url, then the page title on the next line) instead of text/uri-list.
const urlTypes = ["text/uri-list", "text/x-moz-url"];

// Files are not excluded: Edge adds an internet shortcut file to address bar drags.
// Dropped files without a http(s) url are ignored by getDroppedUrl.
const isUrlDrag = (dataTransfer: DataTransfer | null) =>
  Boolean(dataTransfer?.types.some((type) => urlTypes.includes(type)));

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']") !==
    null;

const getDroppedUrl = (dataTransfer: DataTransfer) => {
  const candidate = urlTypes
    .flatMap((type) => dataTransfer.getData(type).split(/\r?\n/))
    .find((line) => line.trim() !== "" && !line.startsWith("#"))
    ?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

/**
 * Lets users drop a URL (e.g. from the browser address bar) onto a board in edit mode
 * to create an app from the page title and favicon and add it to the board.
 */
export const BoardAppUrlDrop = () => {
  const [isEditMode] = useEditMode();
  const { data: session } = useSession();
  const canCreateApp = session?.user.permissions.includes("app-create") ?? false;
  const board = useRequiredBoard();
  const [isDragging, setIsDragging] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  // Counts drops still in flight, so the overlay only hides once all of them are done
  // instead of whichever drop happens to resolve first.
  const pendingDropCountRef = useRef(0);
  const dropQueueRef = useRef(Promise.resolve());
  const editSessionRef = useRef<symbol | null>(null);
  const { createItem } = useItemActions();
  const utils = clientApi.useUtils();
  const { mutateAsync: detectMetadataAsync } = clientApi.app.detectMetadata.useMutation();
  const { mutateAsync: createAppAsync } = clientApi.app.create.useMutation();
  const t = useI18n();
  const isEnabled = isEditMode && canCreateApp;

  useEffect(() => {
    editSessionRef.current = isEnabled ? Symbol() : null;
    return () => {
      editSessionRef.current = null;
    };
  }, [board.name, isEnabled]);

  const addAppFromUrlAsync = useCallback(
    async (url: string) => {
      const editSession = editSessionRef.current;
      if (editSession === null) return;
      pendingDropCountRef.current++;
      setIsResolving(true);

      // Serialize placement so two drops cannot both pass a capacity check for the
      // same last position. Always inspect the current cache, not the render snapshot.
      const pendingDrop = dropQueueRef.current.then(async () => {
        if (editSessionRef.current !== editSession) return;
        const checkCapacity = () => {
          const currentBoard = utils.board.getBoardByName.getData({ name: board.name });
          if (currentBoard && hasRoomForItem(currentBoard, "app")) return true;
          showErrorNotification({
            title: t("common.notification.create.error"),
            message: t("board.urlDrop.notification.full.message"),
          });
          return false;
        };

        if (!checkCapacity()) return;
        const metadata = await detectMetadataAsync({ href: url });
        if (editSessionRef.current !== editSession || !checkCapacity()) return;
        const app = await createAppAsync({ ...metadata, href: url, description: null, pingUrl: "" });
        void utils.app.invalidate();
        // Saving, cancelling or navigating must not place a late result on another
        // board or in a newer edit session.
        if (editSessionRef.current !== editSession) return;
        createItem({ kind: "app", options: { appId: app.id } });
        showSuccessNotification({
          title: t("common.notification.create.success"),
          message: t("board.urlDrop.notification.success.message", { name: app.name }),
        });
      });
      dropQueueRef.current = pendingDrop.catch(() => undefined);

      try {
        await pendingDrop;
      } catch {
        showErrorNotification({
          title: t("common.notification.create.error"),
          message: t("app.page.create.notification.error.message"),
        });
      } finally {
        pendingDropCountRef.current--;
        if (pendingDropCountRef.current === 0) setIsResolving(false);
      }
    },
    [board.name, createAppAsync, createItem, detectMetadataAsync, t, utils],
  );

  useEffect(() => {
    if (!isEnabled) return;

    // Drags that start inside Homarr (links, images) are not URLs to add.
    let isInternalDrag = false;
    let enterCount = 0;
    const handleDragStart = () => (isInternalDrag = true);
    const handleDragEnd = () => (isInternalDrag = false);
    const handleDragEnter = (event: DragEvent) => {
      if (isInternalDrag || !isUrlDrag(event.dataTransfer)) return;
      enterCount++;
      setIsDragging(!event.defaultPrevented && !isEditableTarget(event.target));
    };
    const handleDragLeave = (event: DragEvent) => {
      if (isInternalDrag || !isUrlDrag(event.dataTransfer)) return;
      enterCount = Math.max(0, enterCount - 1);
      if (enterCount === 0) setIsDragging(false);
    };
    const handleDragOver = (event: DragEvent) => {
      if (isInternalDrag || !isUrlDrag(event.dataTransfer) || !event.dataTransfer) return;
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    };
    const handleDrop = (event: DragEvent) => {
      if (isInternalDrag || !isUrlDrag(event.dataTransfer) || !event.dataTransfer) return;
      enterCount = 0;
      setIsDragging(false);
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      event.preventDefault();
      const url = getDroppedUrl(event.dataTransfer);
      if (url) void addAppFromUrlAsync(url);
    };

    window.addEventListener("dragstart", handleDragStart);
    window.addEventListener("dragend", handleDragEnd);
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("drop", handleDrop);
    return () => {
      setIsDragging(false);
      window.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("drop", handleDrop);
    };
  }, [addAppFromUrlAsync, isEnabled]);

  if (!isDragging && !isResolving) return null;

  return (
    <Overlay
      fixed
      center
      blur={2}
      backgroundOpacity={0.35}
      zIndex={300}
      style={{ pointerEvents: isResolving ? "auto" : "none" }}
    >
      <Paper withBorder shadow="md" radius="md" p="lg">
        <Stack align="center" gap="xs">
          {isResolving ? (
            <Loader size="md" />
          ) : (
            <ThemeIcon variant="light" size="xl" radius="xl">
              <IconLink size={24} />
            </ThemeIcon>
          )}
          <Text fw={500}>{t(isResolving ? "board.urlDrop.resolving" : "board.urlDrop.hint")}</Text>
        </Stack>
      </Paper>
    </Overlay>
  );
};
