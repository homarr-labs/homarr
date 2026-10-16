"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Box, ScrollArea, Stack, Typography, useMantineTheme } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useRequiredBoard } from "@homarr/boards/context";
import { useI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import type { WidgetComponentProps } from "../definition";
import { updateNotebookTaskChecked } from "./canonical-task";
import { getNotebookDisplay } from "./display";
import { getNotebookSurface, NotebookSurface, NotebookFooter } from "./surface";
import { getNotebookText, sanitizeNotebookHtml } from "./sanitize-content";
import "./notebook.css";

const iconProps = { size: 30, stroke: 1.5 };

const applyTaskInteractivity = (container: HTMLDivElement, enabled: boolean) => {
  for (const input of container.querySelectorAll("input")) input.disabled = !enabled;
};

export const NotebookReadMode = ({
  options,
  setOptions,
  isEditMode,
  boardId,
  itemId,
  width,
  height,
  displayScale = 1,
  displayMode = "compact",
  onRequestEdit,
  isLoadingEditor = false,
}: WidgetComponentProps<"notebook"> & { onRequestEdit: () => void; isLoadingEditor?: boolean }) => {
  const board = useRequiredBoard();
  const { data: session } = useSession();
  const { hasChangeAccess } = constructBoardPermissions(board, session);
  const { primaryColor } = useMantineTheme();
  const t = useI18n("widget.notebook");
  const tCommon = useI18n("common");

  const canChange = !isEditMode && hasChangeAccess;
  const canCheck = canChange && options.allowReadOnlyCheck && !isLoadingEditor;

  const contentRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const canCheckRef = useRef(canCheck);
  const operationTokenRef = useRef(0);
  const renderedCanonicalRef = useRef(options.content);
  const listenerAttachedRef = useRef(false);
  const handlerRef = useRef<(event: Event) => void>(() => undefined);
  const [initialHtml] = useState(() => sanitizeNotebookHtml(options.content, true));
  const initialInnerHtml = useMemo(() => ({ __html: initialHtml }), [initialHtml]);
  const [pendingTaskCommit, setPendingTaskCommit] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { mutateAsync, isPending: isSaving } = clientApi.widget.notebook.updateContent.useMutation({
    scope: { id: `notebook-content:${boardId ?? "preview"}:${itemId ?? "preview"}` },
  });

  useEffect(() => {
    canCheckRef.current = canCheck && !isSaving;
  }, [canCheck, isSaving]);

  useLayoutEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    if (options.content !== renderedCanonicalRef.current) {
      operationTokenRef.current += 1;
      savingRef.current = false;
      canCheckRef.current = canCheck;
      setPendingTaskCommit(false);
      setSaveError(null);
      renderedCanonicalRef.current = options.content;
      container.innerHTML = sanitizeNotebookHtml(options.content, true);
    }
    if (listenerAttachedRef.current) applyTaskInteractivity(container, canCheck);
  }, [canCheck, options.content]);

  useEffect(() => {
    if (!pendingTaskCommit || options.content !== renderedCanonicalRef.current) return;
    savingRef.current = false;
    canCheckRef.current = canCheck;
    setPendingTaskCommit(false);
  }, [canCheck, options.content, pendingTaskCommit]);

  const notebookText = useMemo(() => getNotebookText(options.content), [options.content]);

  const handleContentChange = useCallback(
    (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "checkbox") return;
      const container = contentRef.current;
      const taskItem = target.closest('li[data-type="taskItem"]');
      if (!container || !(taskItem instanceof HTMLElement)) return;
      if (savingRef.current || !canCheckRef.current) {
        target.checked = !target.checked;
        return;
      }
      const taskIndex = Array.from(container.querySelectorAll('li[data-type="taskItem"]')).indexOf(taskItem);
      if (taskIndex < 0) {
        target.checked = !target.checked;
        return;
      }
      const checked = target.checked;
      const previousCanonical = renderedCanonicalRef.current;
      const nextCanonical = updateNotebookTaskChecked(previousCanonical, taskIndex, checked);
      taskItem.setAttribute("data-checked", String(checked));
      if (nextCanonical === previousCanonical) return;
      const operationToken = operationTokenRef.current;
      renderedCanonicalRef.current = nextCanonical;
      savingRef.current = true;
      canCheckRef.current = false;
      setPendingTaskCommit(true);
      setSaveError(null);
      void (async () => {
        try {
          if (boardId && itemId) await mutateAsync({ boardId, itemId, content: nextCanonical });
          if (operationTokenRef.current !== operationToken) return;
          setOptions({ newOptions: { content: nextCanonical } });
        } catch {
          if (operationTokenRef.current !== operationToken) return;
          renderedCanonicalRef.current = previousCanonical;
          taskItem.setAttribute("data-checked", String(!checked));
          target.checked = !checked;
          savingRef.current = false;
          canCheckRef.current = canCheck;
          setPendingTaskCommit(false);
          setSaveError(t("saveFailed"));
        }
      })();
    },
    [boardId, canCheck, itemId, mutateAsync, setOptions, t],
  );

  useEffect(() => {
    handlerRef.current = handleContentChange;
  }, [handleContentChange]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const listener = (event: Event) => handlerRef.current(event);
    container.addEventListener("change", listener);
    listenerAttachedRef.current = true;
    applyTaskInteractivity(container, canCheck);
    return () => {
      container.removeEventListener("change", listener);
      listenerAttachedRef.current = false;
      applyTaskInteractivity(container, false);
    };
  }, [canCheck]);

  const editBlocked = pendingTaskCommit || isSaving || isLoadingEditor;
  const handleRequestEdit = useCallback(() => {
    if (savingRef.current || pendingTaskCommit || isSaving || isLoadingEditor) return;
    onRequestEdit();
  }, [isLoadingEditor, isSaving, onRequestEdit, pendingTaskCommit]);

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!canChange) return;
      if (event.target instanceof Element && event.target.closest("button, a")) return;
      handleRequestEdit();
    },
    [canChange, handleRequestEdit],
  );

  const { renderedWidth, renderedHeight, compactSurface, compact } = getNotebookSurface({
    width,
    height,
    displayMode,
    displayScale,
  });
  const display = getNotebookDisplay({
    height: renderedHeight,
    isAdvanced: displayMode === "advanced",
    isEditing: false,
    isSaving,
    showToolbar: options.showToolbar,
  });
  const showDocumentStats = display.showDocumentStats && (displayMode === "advanced" || renderedWidth >= 280);
  return (
    <NotebookSurface compact={compact} onDoubleClick={handleDoubleClick}>
      <Box
        style={{
          backgroundColor: "transparent",
          border: "none",
          borderRadius: "0.5rem",
          display: "flex",
          flexDirection: "column",
          flex: "1 1 auto",
          height: "auto",
          minHeight: 0,
        }}
      >
        <ScrollArea
          pl={compactSurface ? 4 : 12}
          pt={compactSurface ? 4 : 12}
          styles={{
            root: { flex: "1 1 auto", height: "100%", minHeight: 0 },
            content: { height: "100%", minHeight: 0 },
          }}
        >
          <Typography style={{ height: "100%" }}>
            <div
              style={{
                backgroundColor: "transparent",
                height: "100%",
                padding: renderedHeight < 120 ? "0.25rem" : "0.5rem",
              }}
            >
              <div
                ref={contentRef}
                className="tiptap ProseMirror"
                style={{
                  backgroundColor: "transparent",
                  fontSize: "var(--mantine-font-size-md)",
                  height: "100%",
                  padding: "var(--mantine-spacing-md)",
                }}
                dangerouslySetInnerHTML={initialInnerHtml}
              />
            </div>
          </Typography>
        </ScrollArea>
      </Box>
      <NotebookFooter saveError={saveError} showDocumentStats={showDocumentStats} text={notebookText} />
      {canChange && (
        <Stack pos="absolute" top={7} right={7} gap={7} style={{ zIndex: 1 }}>
          <ActionIcon
            className={`homarr-notebook-action ${actionTargetClasses.root}`}
            title={tCommon("action.edit")}
            aria-label={tCommon("action.edit")}
            color={primaryColor}
            variant="light"
            size={30}
            disabled={editBlocked}
            loading={isLoadingEditor}
            onClick={handleRequestEdit}
          >
            <IconEdit {...iconProps} />
          </ActionIcon>
        </Stack>
      )}
    </NotebookSurface>
  );
};
