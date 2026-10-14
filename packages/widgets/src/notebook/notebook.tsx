"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useMantineTheme } from "@mantine/core";
import { Link } from "@mantine/tiptap";
import { IconCheck, IconX } from "@tabler/icons-react";
import { Color } from "@tiptap/extension-color";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";

import { clientApi } from "@homarr/api/client";
import { useSession } from "@homarr/auth/client";
import { constructBoardPermissions } from "@homarr/auth/shared";
import { useRequiredBoard } from "@homarr/boards/context";
import { hotkeys } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { InlineConfirmActionIcon } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import actionTargetClasses from "../common/action-target.module.css";
import { createReadOnlyTaskItemTransaction, ReadOnlyTaskItem } from "./read-only-task-item";
import { getNotebookDisplay } from "./display";
import { NotebookTextDirection } from "./text-direction";
import { NotebookView } from "./native-view";

const iconProps = {
  size: 30,
  stroke: 1.5,
};

export function Notebook({
  options,
  setOptions,
  isEditMode,
  boardId,
  itemId,
  width,
  height,
  displayScale = 1,
  displayMode = "compact",
}: WidgetComponentProps<"notebook">) {
  const [content, setContent] = useState(options.content);
  const previousContentRef = useRef(options.content);
  const [saveError, setSaveError] = useState<string | null>(null);

  const board = useRequiredBoard();
  const { data: session } = useSession();
  const { hasChangeAccess } = constructBoardPermissions(board, session);

  const canChange = !isEditMode && hasChangeAccess;
  const [isEditing, setIsEditing] = useState(false);
  const canChangeRef = useRef(canChange);
  const allowReadOnlyCheckRef = useRef(options.allowReadOnlyCheck);
  const savingRef = useRef(false);
  const readOnlyCheckEventName = `homarr:notebook-read-only-check:${useId()}`;

  useEffect(() => {
    allowReadOnlyCheckRef.current = options.allowReadOnlyCheck;
  }, [options.allowReadOnlyCheck]);

  const { primaryColor } = useMantineTheme();
  const { mutateAsync, isPending: isSaving } = clientApi.widget.notebook.updateContent.useMutation({
    scope: { id: `notebook-content:${boardId ?? "preview"}:${itemId ?? "preview"}` },
  });

  useEffect(() => {
    canChangeRef.current = canChange && !isSaving;
  }, [canChange, isSaving]);

  const tControls = useI18n("widget.notebook.controls");
  const t = useI18n("widget.notebook");
  const tCommon = useI18n("common");

  const handleContentUpdate = useCallback(
    async (contentUpdate: string) => {
      savingRef.current = true;
      canChangeRef.current = false;
      setSaveError(null);

      try {
        if (boardId && itemId) {
          await mutateAsync({ boardId, itemId, content: contentUpdate });
        }
        previousContentRef.current = contentUpdate;
        setOptions({ newOptions: { content: contentUpdate } });
        return true;
      } catch {
        setSaveError(t("saveFailed"));
        return false;
      } finally {
        savingRef.current = false;
        canChangeRef.current = canChange;
      }
    },
    [boardId, canChange, itemId, mutateAsync, setOptions, t],
  );

  const editor = useEditor(
    {
      extensions: [
        Placeholder.configure({
          placeholder: `${t("placeholder")}…`,
        }),
        Color,
        Details.configure({
          renderToggleButton: ({ element, isOpen }) => {
            element.setAttribute("aria-label", tControls(isOpen ? "collapseDetails" : "expandDetails"));
          },
        }),
        DetailsSummary,
        DetailsContent,
        Highlight.configure({ multicolor: true }),
        Image.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              width: { default: null },
            };
          },
        }).configure({ inline: true }),
        Link.configure({
          openOnClick: true,
          validate(url) {
            return /^https?:\/\//.test(url);
          },
        }).extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              target: { default: null },
            };
          },
        }),
        StarterKit.configure({ link: false }),
        Table.configure({
          resizable: true,
          lastColumnResizable: false,
        }),
        TableCell.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              backgroundColor: {
                default: undefined,
                renderHTML: (attributes) => ({
                  style: attributes.backgroundColor ? `background-color: ${attributes.backgroundColor}` : undefined,
                }),
                parseHTML: (element) => element.style.backgroundColor || undefined,
              },
            };
          },
        }),
        TableHeader,
        TableRow,
        ReadOnlyTaskItem.configure({
          nested: true,
          onReadOnlyChecked: () => {
            if (!allowReadOnlyCheckRef.current) return false;
            if (!canChangeRef.current) return false;
            return true;
          },
          onReadOnlyCheckedAtPosition: (position, checked) => {
            if (!allowReadOnlyCheckRef.current) return;
            if (!canChangeRef.current) return;
            const event = new CustomEvent(readOnlyCheckEventName, {
              detail: { position, checked },
            });
            dispatchEvent(event);
          },
        }),
        TaskList.configure({ itemTypeName: "taskItem" }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        NotebookTextDirection,
        TextStyle,
      ],
      shouldRerenderOnTransaction: true,
      immediatelyRender: false,
      content,
      onUpdate: ({ editor }) => {
        setContent(editor.getHTML());
      },
      onCreate: ({ editor }) => {
        editor.setEditable(isEditing);
      },
    },
    [],
  );

  const handleOnReadOnlyCheck = useCallback(
    (event: Event) => {
      if (!allowReadOnlyCheckRef.current) return;
      if (!editor) return;
      const { detail } = event as CustomEvent<{ position: number; checked: boolean }>;
      const transaction = createReadOnlyTaskItemTransaction(editor.state, detail.position, detail.checked);
      if (!transaction) return;

      editor.view.dispatch(transaction);
      const nextContent = editor.getHTML();
      setContent(nextContent);
      void handleContentUpdate(nextContent).then((wasSaved) => {
        if (wasSaved) return;
        setContent(previousContentRef.current);
        editor.commands.setContent(previousContentRef.current);
      });
    },
    [editor, handleContentUpdate],
  );

  useEffect(() => {
    addEventListener(readOnlyCheckEventName, handleOnReadOnlyCheck);
    return () => removeEventListener(readOnlyCheckEventName, handleOnReadOnlyCheck);
  }, [handleOnReadOnlyCheck, readOnlyCheckEventName]);

  useEffect(() => {
    if (isEditing || !editor || options.content === previousContentRef.current) return;
    previousContentRef.current = options.content;
    setContent(options.content);
    editor.commands.setContent(options.content);
  }, [editor, isEditing, options.content]);

  const handleEditCancelCallback = useCallback(() => {
    if (savingRef.current) return true;
    if (!editor) return false;
    editor.setEditable(false);

    setContent(previousContentRef.current);
    editor.commands.setContent(previousContentRef.current);

    return false;
  }, [editor]);

  const handleEditCancel = useCallback(() => {
    if (savingRef.current) return;
    setIsEditing(handleEditCancelCallback);
  }, [setIsEditing, handleEditCancelCallback]);

  const handleEditToggle = useCallback(async () => {
    if (!editor || savingRef.current) return;
    if (!isEditing) {
      setSaveError(null);
      editor.setEditable(true);
      setIsEditing(true);
      return;
    }

    editor.setEditable(false);
    const wasSaved = await handleContentUpdate(content);
    if (!wasSaved) {
      editor.setEditable(true);
      return;
    }
    editor.setEditable(false);
    setIsEditing(false);
  }, [content, editor, handleContentUpdate, isEditing]);

  const handleDoubleClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!canChange || isEditing || savingRef.current) return;
      if (event.target instanceof Element && event.target.closest("button, a")) {
        return;
      }
      setSaveError(null);
      editor?.setEditable(true);
      setIsEditing(true);
    },
    [canChange, editor, isEditing],
  );

  const documentText = editor?.getText().trim() ?? "";
  const documentStats = {
    characters: documentText.length,
    words: documentText.length === 0 ? 0 : documentText.split(/\s+/).length,
  };
  let layoutScale = 1;
  if (displayMode !== "advanced" && Number.isFinite(displayScale) && displayScale > 0) {
    layoutScale = displayScale;
  }
  const renderedWidth = width * layoutScale;
  const renderedHeight = height * layoutScale;
  const compactSurface = renderedWidth < 280 || renderedHeight < 240;
  const display = getNotebookDisplay({
    height: renderedHeight,
    isAdvanced: displayMode === "advanced",
    isEditing,
    isSaving,
    showToolbar: options.showToolbar,
  });

  const showDocumentStats = display.showDocumentStats && (displayMode === "advanced" || renderedWidth >= 280);

  return (
    <NotebookView
      editor={editor}
      canChange={canChange}
      isEditing={isEditing}
      isSaving={isSaving}
      saveError={saveError}
      displayMode={displayMode}
      renderedHeight={renderedHeight}
      compactSurface={compactSurface}
      display={display}
      showDocumentStats={showDocumentStats}
      documentStats={documentStats}
      primaryColor={primaryColor}
      saveHotkey={hotkeys.saveNotebook}
      onDoubleClick={handleDoubleClick}
      onEditToggle={handleEditToggle}
      discardAction={
        canChange && isEditing ? (
          <InlineConfirmActionIcon
            className={`homarr-notebook-action ${actionTargetClasses.root}`}
            data-visible
            title={tCommon("action.cancel")}
            aria-label={tCommon("action.cancel")}
            confirmLabel={t("dismiss.message")}
            confirmationAriaLabel={t("dismiss.action.discard")}
            confirmationChildren={<IconCheck {...iconProps} />}
            onConfirm={handleEditCancel}
            color={primaryColor}
            variant="light"
            size={30}
            disabled={isSaving}
          >
            <IconX {...iconProps} />
          </InlineConfirmActionIcon>
        ) : null
      }
    />
  );
}
