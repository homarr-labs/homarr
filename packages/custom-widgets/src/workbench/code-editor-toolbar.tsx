import { Button, Group, Text } from "@mantine/core";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconCode,
  IconCopy,
  IconFileCode,
  IconSchema,
  IconWand,
} from "@tabler/icons-react";

import { ComponentReference } from "./component-reference";
import type { CustomWidgetCodeEditorProps } from "./code-editor-types";
import classes from "./code-editor.module.css";

interface CodeEditorToolbarProps {
  props: CustomWidgetCodeEditorProps;
  editorCreated: boolean;
  historyDepth: { undo: number; redo: number };
  formattedValue: string;
  copied: boolean;
  referenceOpened: boolean;
  onReferenceToggle(): void;
  onCopy(): void;
  onUndo(): void;
  onRedo(): void;
  onFormat(): void;
}

export function CodeEditorToolbar({
  props,
  editorCreated,
  historyDepth,
  formattedValue,
  copied,
  referenceOpened,
  onReferenceToggle,
  onCopy,
  onUndo,
  onRedo,
  onFormat,
}: CodeEditorToolbarProps) {
  const starter = props.starter;
  return (
    <Group className={classes.toolbar} justify="space-between" gap="xs" wrap="wrap">
      <Group gap={6}>
        <IconCode size={16} aria-hidden />
        <Text size="xs" fw={600}>
          {props.language === "jsx"
            ? props.messages.languageJsx
            : props.language === "css"
              ? "CSS"
              : props.messages.languageJson}
        </Text>
      </Group>
      <Group gap={6}>
        {!props.readOnly && (
          <>
            <Button
              type="button"
              size="compact-xs"
              variant="subtle"
              leftSection={<IconArrowBackUp size={14} />}
              onClick={onUndo}
              disabled={!editorCreated || historyDepth.undo === 0}
              aria-keyshortcuts="Control+Z Meta+Z"
            >
              {props.messages.undo}
            </Button>
            <Button
              type="button"
              size="compact-xs"
              variant="subtle"
              leftSection={<IconArrowForwardUp size={14} />}
              onClick={onRedo}
              disabled={!editorCreated || historyDepth.redo === 0}
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z"
            >
              {props.messages.redo}
            </Button>
          </>
        )}
        {!props.readOnly && props.language === "jsx" && (
          <ComponentReference
            messages={{
              action: props.messages.components,
              search: props.messages.componentSearch,
              empty: props.messages.componentEmpty,
              count: props.messages.componentCount,
            }}
          />
        )}
        {!props.readOnly && starter && props.value.trim().length === 0 && (
          <Button
            type="button"
            size="compact-xs"
            variant="subtle"
            leftSection={<IconFileCode size={14} />}
            onClick={() => props.onChange(starter)}
          >
            {props.messages.insertStarter}
          </Button>
        )}
        {!props.readOnly && (
          <Button
            type="button"
            size="compact-xs"
            variant="subtle"
            leftSection={<IconWand size={14} />}
            onClick={onFormat}
            disabled={props.language !== "jsx" && formattedValue === props.value}
          >
            {props.messages.format}
          </Button>
        )}
        {props.reference && (
          <Button
            type="button"
            size="compact-xs"
            variant={referenceOpened ? "light" : "subtle"}
            leftSection={<IconSchema size={14} />}
            onClick={onReferenceToggle}
          >
            {props.messages.schema}
          </Button>
        )}
        {props.readOnly && (
          <Button
            type="button"
            size="compact-xs"
            variant="subtle"
            leftSection={<IconCopy size={14} />}
            onClick={onCopy}
          >
            {copied ? props.messages.copied : props.messages.copy}
          </Button>
        )}
      </Group>
    </Group>
  );
}
