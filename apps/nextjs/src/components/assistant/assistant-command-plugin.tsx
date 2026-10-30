"use client";

import { useEffect } from "react";
import { unstable_useTriggerPopoverTriggers } from "@assistant-ui/react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, $isTextNode, $setSelection, HISTORY_PUSH_TAG } from "lexical";

import { useAssistantPrompts } from "./assistant-prompts";

export const AssistantCommandPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const trigger = unstable_useTriggerPopoverTriggers().get("/");
  const prompts = useAssistantPrompts();

  useEffect(() => {
    if (!trigger) return;
    return trigger.resource.registerSelectItemOverride((item) => {
      const prompt = prompts.find((entry) => entry.id === item.id)?.prompt;
      if (!prompt) return false;
      const replacement = editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;
        const node = selection.anchor.getNode();
        if (!$isTextNode(node)) return null;
        const text = node.getTextContent();
        const offset = selection.anchor.offset;
        const match = /(?:^|\s)(\/[^\s]*)$/u.exec(text.slice(0, offset));
        if (!match?.[1]) return null;
        const range = selection.clone();
        range.anchor.set(node.getKey(), offset - match[1].length, "text");
        return { range, trailingSpace: !text.slice(offset).startsWith(" ") };
      });
      if (!replacement) return false;
      editor.update(
        () => {
          $setSelection(replacement.range);
          replacement.range.insertText(prompt + (replacement.trailingSpace ? " " : ""));
        },
        { tag: HISTORY_PUSH_TAG },
      );
      return true;
    });
  }, [editor, prompts, trigger]);

  return null;
};
