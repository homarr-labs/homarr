"use client";

import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ActionIcon,
  Box,
  Button,
  ColorPicker,
  ColorSwatch,
  Group,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Tooltip,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { getHotkeyHandler, useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import { RichTextEditor, useRichTextEditorContext } from "@mantine/tiptap";
import {
  IconCheck,
  IconCircleOff,
  IconDeviceFloppy,
  IconEdit,
  IconHighlight,
  IconIndentDecrease,
  IconIndentIncrease,
  IconLayoutGrid,
  IconLetterA,
  IconListCheck,
  IconPhoto,
  IconTextDirectionLtr,
  IconTextDirectionRtl,
  IconX,
} from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";

import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

import actionTargetClasses from "../common/action-target.module.css";
import type { getNotebookDisplay } from "./display";
import { setTextDirection } from "./text-direction";

import "@mantine/tiptap/styles.css";
import "./notebook.css";

const iconProps = {
  size: 30,
  stroke: 1.5,
};

const controlIconProps = {
  size: 20,
  stroke: 1.5,
};

export interface NotebookViewProps {
  editor: Editor | null;
  canChange: boolean;
  isEditing: boolean;
  isSaving: boolean;
  saveError: string | null;
  displayMode: "compact" | "advanced";
  renderedHeight: number;
  compactSurface: boolean;
  display: ReturnType<typeof getNotebookDisplay>;
  showDocumentStats: boolean;
  documentStats: { characters: number; words: number };
  primaryColor: string;
  saveHotkey: string;
  onDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onEditToggle: () => Promise<void>;
  discardAction: ReactNode;
}

export function NotebookView({
  editor,
  canChange,
  isEditing,
  isSaving,
  saveError,
  displayMode,
  renderedHeight,
  compactSurface,
  display,
  showDocumentStats,
  documentStats,
  primaryColor,
  saveHotkey,
  onDoubleClick,
  onEditToggle,
  discardAction,
}: NotebookViewProps) {
  const tControls = useI18n("widget.notebook.controls");
  const t = useI18n("widget.notebook");
  const tCommon = useI18n("common");

  return (
    <Box
      className="homarr-notebook"
      data-notebook-compact={(displayMode === "compact" && compactSurface) || undefined}
      h="100%"
      onDoubleClick={onDoubleClick}
      style={{ display: "flex", flexDirection: "column", minHeight: 0, position: "relative" }}
    >
      <RichTextEditor
        p={0}
        mt={0}
        h="auto"
        onKeyDown={isEditing && !isSaving ? getHotkeyHandler([[saveHotkey, () => void onEditToggle()]]) : undefined}
        editor={editor}
        labels={{
          detailsControlLabel: tControls("details"),
          tableInsertControlLabel: tControls("insertTable"),
          tableInsertLabel: (columns, rows) =>
            tControls("insertTableSize", { columns: columns.toString(), rows: rows.toString() }),
          tableDeleteControlLabel: tControls("deleteTable"),
          tableColumnBeforeControlLabel: tControls("addColumnLeft"),
          tableColumnAfterControlLabel: tControls("addColumnRight"),
          tableColumnDeleteControlLabel: tControls("deleteColumn"),
          tableRowBeforeControlLabel: tControls("addRowTop"),
          tableRowAfterControlLabel: tControls("addRowBelow"),
          tableRowDeleteControlLabel: tControls("deleteRow"),
          tableToggleHeaderRowControlLabel: tControls("toggleHeaderRow"),
          tableToggleHeaderColumnControlLabel: tControls("toggleHeaderColumn"),
          tableMergeCellsControlLabel: tControls("mergeCells"),
          tableSplitCellControlLabel: tControls("splitCell"),
        }}
        styles={() => ({
          root: {
            backgroundColor: "transparent",
            border: "none",
            borderRadius: "0.5rem",
            display: "flex",
            flexDirection: "column",
            flex: "1 1 auto",
            height: "auto",
            minHeight: 0,
          },
          toolbar: {
            backgroundColor: "transparent",
            borderColor: "rgb(from var(--mantine-color-default-border) r g b / calc(var(--opacity, 1) * 0.45))",
            padding: "0.5rem",
          },
          content: {
            backgroundColor: "transparent",
            fontSize: "var(--mantine-font-size-md)",
            padding: renderedHeight < 120 ? "0.25rem" : "0.5rem",
            height: "100%",
          },
          typographyStylesProvider: {
            height: "100%",
          },
        })}
      >
        <RichTextEditor.Toolbar
          style={{
            display: display.showToolbar ? "flex" : "none",
            maxHeight: display.toolbarMaxHeight,
            overflowY: display.toolbarMaxHeight === undefined ? undefined : "auto",
          }}
        >
          <RichTextEditor.ControlsGroup className="homarr-notebook-toolbar-group">
            <RichTextEditor.Bold title={tControls("bold")} />
            <RichTextEditor.Italic title={tControls("italic")} />
            <RichTextEditor.Strikethrough title={tControls("strikethrough")} />
            <RichTextEditor.Underline title={tControls("underline")} />
            <TextColorControl />
            <TextHighlightControl />
            <RichTextEditor.Code title={tControls("code")} />
            <RichTextEditor.ClearFormatting title={tControls("clear")} />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup className="homarr-notebook-toolbar-group">
            <RichTextEditor.H1 title={tControls("heading", { level: "1" })} />
            <RichTextEditor.H2 title={tControls("heading", { level: "2" })} />
            <RichTextEditor.H3 title={tControls("heading", { level: "3" })} />
            <RichTextEditor.H4 title={tControls("heading", { level: "4" })} />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup className="homarr-notebook-toolbar-group">
            <RichTextEditor.AlignLeft
              title={tControls("align", {
                position: t("align.left"),
              })}
            />
            <RichTextEditor.AlignCenter
              title={tControls("align", {
                position: t("align.center"),
              })}
            />
            <RichTextEditor.AlignRight
              title={tControls("align", {
                position: t("align.right"),
              })}
            />
            <RichTextEditor.Control
              title={tControls("directionLtr")}
              aria-label={tControls("directionLtr")}
              active={editor?.isActive({ dir: "ltr" })}
              onClick={() => editor && setTextDirection(editor, "ltr").run()}
            >
              <IconTextDirectionLtr {...controlIconProps} />
            </RichTextEditor.Control>
            <RichTextEditor.Control
              title={tControls("directionRtl")}
              aria-label={tControls("directionRtl")}
              active={editor?.isActive({ dir: "rtl" })}
              onClick={() => editor && setTextDirection(editor, "rtl").run()}
            >
              <IconTextDirectionRtl {...controlIconProps} />
            </RichTextEditor.Control>
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup className="homarr-notebook-toolbar-group">
            <RichTextEditor.Blockquote title={tControls("blockquote")} />
            <RichTextEditor.Hr title={tControls("horizontalLine")} />
            <RichTextEditor.Details title={tControls("details")} />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup className="homarr-notebook-toolbar-group">
            <RichTextEditor.BulletList title={tControls("bulletList")} />
            <RichTextEditor.OrderedList title={tControls("orderedList")} />
            <TaskListToggle />
            {(Boolean(editor?.isActive("taskList")) ||
              Boolean(editor?.isActive("bulletList")) ||
              Boolean(editor?.isActive("orderedList"))) && (
              <>
                <ListIndentIncrease />
                <ListIndentDecrease />
              </>
            )}
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup className="homarr-notebook-toolbar-group">
            <RichTextEditor.Link title={tControls("link")} />
            <RichTextEditor.Unlink title={tControls("unlink")} />
            <EmbedImage />
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup className="homarr-notebook-toolbar-group">
            {editor?.isActive("table") ? (
              <>
                <RichTextEditor.TableDelete title={tControls("deleteTable")} />
                <ColorCellControl />
                <RichTextEditor.TableColumnBefore title={tControls("addColumnLeft")} />
                <RichTextEditor.TableColumnAfter title={tControls("addColumnRight")} />
                <RichTextEditor.TableColumnDelete title={tControls("deleteColumn")} />
                <RichTextEditor.TableRowBefore title={tControls("addRowTop")} />
                <RichTextEditor.TableRowAfter title={tControls("addRowBelow")} />
                <RichTextEditor.TableRowDelete title={tControls("deleteRow")} />
                <RichTextEditor.TableToggleHeaderRow title={tControls("toggleHeaderRow")} />
                <RichTextEditor.TableToggleHeaderColumn title={tControls("toggleHeaderColumn")} />
                <RichTextEditor.TableMergeCells title={tControls("mergeCells")} />
                <RichTextEditor.TableSplitCell title={tControls("splitCell")} />
              </>
            ) : (
              <RichTextEditor.TableInsert title={tControls("insertTable")} withHeaderRow={false} />
            )}
          </RichTextEditor.ControlsGroup>

          <RichTextEditor.ControlsGroup className="homarr-notebook-toolbar-group">
            <RichTextEditor.Undo />
            <RichTextEditor.Redo />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        {editor && isEditing && !isSaving && (
          <BubbleMenu editor={editor}>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold title={tControls("bold")} />
              <RichTextEditor.Italic title={tControls("italic")} />
              <RichTextEditor.Link title={tControls("link")} />
            </RichTextEditor.ControlsGroup>
          </BubbleMenu>
        )}

        <ScrollArea
          pl={compactSurface ? 4 : 12}
          pt={compactSurface ? 4 : 12}
          styles={{
            root: {
              flex: "1 1 auto",
              height: "100%",
              minHeight: 0,
            },
            content: {
              height: "100%",
              minHeight: 0,
            },
          }}
        >
          <RichTextEditor.Content />
        </ScrollArea>
      </RichTextEditor>
      {(saveError || showDocumentStats) && (
        <Group
          w="100%"
          justify="flex-end"
          gap="xs"
          px={8}
          pb={4}
          style={{ flex: "0 0 auto", pointerEvents: saveError ? undefined : "none" }}
        >
          {saveError && (
            <Tooltip label={saveError} multiline>
              <Text
                size="xs"
                c="red"
                lineClamp={1}
                maw={320}
                tabIndex={0}
                aria-label={`${t("saveFailed")}. ${saveError}`}
              >
                {t("saveFailed")}
              </Text>
            </Tooltip>
          )}
          {showDocumentStats && (
            <Text size="xs" c="dimmed">
              {t("documentStats", documentStats)}
            </Text>
          )}
        </Group>
      )}
      {canChange && (
        <Stack pos="absolute" top={7} right={7} gap={7} style={{ zIndex: 1 }}>
          <ActionIcon
            className={`homarr-notebook-action ${actionTargetClasses.root}`}
            data-visible={isEditing || undefined}
            title={isEditing ? tCommon("action.save") : tCommon("action.edit")}
            aria-label={isEditing ? tCommon("action.save") : tCommon("action.edit")}
            color={primaryColor}
            variant="light"
            size={30}
            loading={isSaving}
            disabled={isSaving}
            onClick={() => void onEditToggle()}
          >
            {isEditing ? <IconDeviceFloppy {...iconProps} /> : <IconEdit {...iconProps} />}
          </ActionIcon>
          {isEditing && discardAction}
        </Stack>
      )}
    </Box>
  );
}

function TextHighlightControl() {
  const tControls = useI18n("widget.notebook.controls");
  const { editor } = useRichTextEditorContext();
  const defaultColor = "transparent";

  const getCurrent = useCallback(() => {
    const color: unknown = editor?.getAttributes("highlight").color;
    return typeof color === "string" ? color : undefined;
  }, [editor]);

  const update = useCallback(
    (value: string) => {
      if (value === defaultColor) {
        editor?.chain().focus().unsetHighlight().run();
        return;
      }
      editor?.chain().focus().setHighlight({ color: value }).run();
    },
    [editor, defaultColor],
  );

  return (
    <ColorControl
      defaultColor={defaultColor}
      getCurrent={getCurrent}
      update={update}
      icon={IconHighlight}
      ariaLabel={tControls("colorHighlight")}
    />
  );
}

function TextColorControl() {
  const tControls = useI18n("widget.notebook.controls");
  const { editor } = useRichTextEditorContext();
  const { black, colors } = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const defaultColor = colorScheme === "dark" ? colors.dark[0] : black;

  const getCurrent = useCallback(() => {
    const color: unknown = editor?.getAttributes("textStyle").color;
    return typeof color === "string" ? color : undefined;
  }, [editor]);

  const update = useCallback(
    (value: string) => {
      if (value === defaultColor) {
        editor?.chain().focus().unsetColor().run();
        return;
      }
      editor?.chain().focus().setColor(value).run();
    },
    [editor, defaultColor],
  );

  return (
    <ColorControl
      defaultColor={defaultColor}
      getCurrent={getCurrent}
      update={update}
      icon={IconLetterA}
      ariaLabel={tControls("colorText")}
    />
  );
}

function ColorCellControl() {
  const tControls = useI18n("widget.notebook.controls");
  const { editor } = useRichTextEditorContext();

  const getCurrent = useCallback(() => {
    const color: unknown = editor?.getAttributes("tableCell").backgroundColor;
    return typeof color === "string" ? color : undefined;
  }, [editor]);

  const update = useCallback(
    (value: string) => {
      editor?.chain().focus().setCellAttribute("backgroundColor", value).run();
    },
    [editor],
  );

  return (
    <ColorControl
      defaultColor="transparent"
      getCurrent={getCurrent}
      update={update}
      icon={IconLayoutGrid}
      ariaLabel={tControls("colorCell")}
    />
  );
}

interface ColorControlProps {
  defaultColor: string;
  getCurrent: () => string | undefined;
  update: (value: string) => void;
  icon: TablerIcon;
  ariaLabel: string;
}

const ColorControl = ({ defaultColor, getCurrent, update, icon: Icon, ariaLabel }: ColorControlProps) => {
  const { editor } = useRichTextEditorContext();
  const [color, setColor] = useState(defaultColor);
  const { colors, white } = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [opened, { close, toggle }] = useDisclosure(false);
  const tCommon = useI18n("common");
  const tNotebook = useI18n("widget.notebook");

  const palette = [
    "#000000",
    colors.dark[9],
    colors.dark[6],
    colors.dark[3],
    colors.dark[0],
    "#FFFFFF",
    colors.red[9],
    colors.pink[7],
    colors.grape[8],
    colors.violet[9],
    colors.indigo[9],
    colors.blue[5],
    colors.green[6],
    "#09D630",
    colors.lime[5],
    colors.yellow[5],
    "#EB8415",
    colors.orange[9],
  ];

  const onSelection = useCallback(() => {
    setColor(getCurrent() ?? defaultColor);
  }, [getCurrent, defaultColor, setColor]);

  useEffect(() => {
    editor?.on("selectionUpdate", onSelection);

    return () => {
      editor?.off("selectionUpdate", onSelection);
    };
  });

  const handleApplyColor = useCallback(() => {
    update(color);
    close();
  }, [color, update, close]);

  const handleClearColor = useCallback(() => {
    update(defaultColor);
    setColor(defaultColor);
    close();
  }, [update, setColor, close, defaultColor]);

  return (
    <Popover
      opened={opened}
      onChange={toggle}
      styles={{
        dropdown: {
          backgroundColor: colorScheme === "dark" ? colors.dark[7] : white,
        },
      }}
    >
      <Popover.Target>
        <RichTextEditor.Control onClick={toggle} title={ariaLabel}>
          <Group gap={3} px="0.2rem">
            <Icon {...controlIconProps} />
            <ColorSwatch size={14} color={color} />
          </Group>
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap={8}>
          <ColorPicker value={color} onChange={setColor} format="hexa" swatches={palette} swatchesPerRow={6} />
          <Group justify="right" gap={8}>
            <ActionIcon
              className={actionTargetClasses.root}
              title={tCommon("action.cancel")}
              aria-label={tCommon("action.cancel")}
              variant="default"
              onClick={close}
            >
              <IconX stroke={1.5} size="1rem" />
            </ActionIcon>
            <ActionIcon
              className={actionTargetClasses.root}
              title={tCommon("action.apply")}
              aria-label={tCommon("action.apply")}
              variant="default"
              onClick={handleApplyColor}
            >
              <IconCheck stroke={1.5} size="1rem" />
            </ActionIcon>
            <ActionIcon
              className={actionTargetClasses.root}
              title={tNotebook("popover.clearColor")}
              aria-label={tNotebook("popover.clearColor")}
              variant="default"
              onClick={handleClearColor}
            >
              <IconCircleOff stroke={1.5} size="1rem" />
            </ActionIcon>
          </Group>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};

function EmbedImage() {
  const tControls = useI18n("widget.notebook.controls");
  const t = useI18n("widget.notebook");
  const tCommon = useI18n("common");
  const { editor } = useRichTextEditorContext();
  const { colors, white } = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const [opened, { open, close, toggle }] = useDisclosure(false);
  const imageSource: unknown = editor?.getAttributes("image").src;
  const imageWidth: unknown = editor?.getAttributes("image").width;
  const form = useForm<{ src: unknown; width: unknown }>({
    initialValues: {
      src: imageSource ?? "",
      width: imageWidth ?? "",
    },
  });

  const handleOpen = useCallback(() => {
    form.reset();
    open();
  }, [form, open]);

  const handleSubmit = useCallback(
    (values: { src: unknown; width: unknown }) => {
      editor?.commands.insertContent({
        type: "paragraph",
        content: [
          {
            type: "image",
            attrs: values,
          },
        ],
      });
      close();
    },
    [editor, close],
  );

  return (
    <Popover
      opened={opened}
      onClose={close}
      onOpen={handleOpen}
      position="left"
      styles={{
        dropdown: {
          backgroundColor: colorScheme === "dark" ? colors.dark[7] : white,
        },
      }}
      trapFocus
    >
      <Popover.Target>
        <RichTextEditor.Control onClick={toggle} title={tControls("image")} active={editor?.isActive("image")}>
          <IconPhoto stroke={1.5} size="1rem" />
        </RichTextEditor.Control>
      </Popover.Target>
      <Popover.Dropdown>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap={5}>
            <TextInput label={t("popover.source")} placeholder="https://example.com/" {...form.getInputProps("src")} />
            <TextInput
              label={t("popover.width")}
              placeholder={t("popover.widthPlaceholder")}
              {...form.getInputProps("width")}
            />
            <Button type="submit" variant="default" mt={10} mb={5}>
              {tCommon("action.save")}
            </Button>
          </Stack>
        </form>
      </Popover.Dropdown>
    </Popover>
  );
}

function TaskListToggle() {
  const { editor } = useRichTextEditorContext();
  const tControls = useI18n("widget.notebook.controls");
  const handleToggleTaskList = useCallback(() => {
    editor?.chain().focus().toggleTaskList().run();
  }, [editor]);

  return (
    <RichTextEditor.Control
      title={tControls("checkList")}
      onClick={handleToggleTaskList}
      active={editor?.isActive("taskList")}
    >
      <IconListCheck stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function useActiveListItemType() {
  const { editor } = useRichTextEditorContext();
  const [itemType, setItemType] = useState("listItem");

  useEffect(() => {
    if (!editor) return;
    const updateItemType = () => setItemType(editor.isActive("taskItem") ? "taskItem" : "listItem");
    updateItemType();
    editor.on("selectionUpdate", updateItemType);
    return () => {
      editor.off("selectionUpdate", updateItemType);
    };
  }, [editor]);

  return { editor, itemType };
}

function ListIndentIncrease() {
  const { editor, itemType } = useActiveListItemType();
  const tControls = useI18n("widget.notebook.controls");
  const handleIncreaseIndent = useCallback(() => {
    editor?.chain().focus().sinkListItem(itemType).run();
  }, [editor, itemType]);

  return (
    <RichTextEditor.Control
      title={tControls("increaseIndent")}
      onClick={handleIncreaseIndent}
      interactive={editor?.can().sinkListItem(itemType)}
    >
      <IconIndentIncrease stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}

function ListIndentDecrease() {
  const { editor, itemType } = useActiveListItemType();
  const tControls = useI18n("widget.notebook.controls");

  const handleDecreaseIndent = useCallback(() => {
    editor?.chain().focus().liftListItem(itemType).run();
  }, [editor, itemType]);

  return (
    <RichTextEditor.Control
      title={tControls("decreaseIndent")}
      onClick={handleDecreaseIndent}
      interactive={editor?.can().liftListItem(itemType)}
    >
      <IconIndentDecrease stroke={1.5} size="1rem" />
    </RichTextEditor.Control>
  );
}
