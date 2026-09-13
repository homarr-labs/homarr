import { redactCustomWidgetCredentialLiterals } from "@homarr/custom-widgets/core";
import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";

export type CustomWidgetDocumentContent = Omit<CustomWidgetFormValues, "secrets">;
export interface CustomWidgetDocumentHistoryState {
  canUndo: boolean;
  canRedo: boolean;
}

const MAX_HISTORY_ENTRIES = 100;
const MAX_HISTORY_CHARACTERS = 2_000_000;
const COALESCE_DELAY = 600;
const typingFields = new Set(["name", "description", "iconUrl", "template"]);

export function getCustomWidgetDocumentContent(values: CustomWidgetFormValues): CustomWidgetDocumentContent {
  const { secrets: _secrets, ...content } = values;
  return content;
}

export function getCustomWidgetRecoveryContent(values: CustomWidgetFormValues): CustomWidgetDocumentContent {
  const content = getCustomWidgetDocumentContent(values);
  for (const key of Object.keys(content) as Array<keyof CustomWidgetDocumentContent>) {
    let value = content[key];
    for (const secret of values.secrets) {
      if (secret.value) value = value.replaceAll(secret.value, "[REDACTED]");
    }
    content[key] = redactCustomWidgetCredentialLiterals(value.replaceAll(/\b(https?:\/\/)[^\s/"'<>]+@/giu, "$1"));
  }
  return content;
}

export function createCustomWidgetDocumentHistory(initialValues: CustomWidgetFormValues) {
  const initial = getCustomWidgetDocumentContent(initialValues);
  let entries = [{ content: initial, size: JSON.stringify(initial).length }];
  let position = 0;
  let lastChangeAt = 0;
  let lastTypingField: string | undefined;
  let sameTurn = false;
  let state: CustomWidgetDocumentHistoryState = { canUndo: false, canRedo: false };

  const refreshState = () => {
    state = { canUndo: position > 0, canRedo: position < entries.length - 1 };
  };
  const stopCoalescing = () => {
    sameTurn = false;
    lastChangeAt = 0;
    lastTypingField = undefined;
  };

  return {
    getState: () => state,
    record(values: CustomWidgetFormValues) {
      const next = getCustomWidgetDocumentContent(values);
      const current = entries[position]?.content;
      const changed = (Object.keys(next) as Array<keyof CustomWidgetDocumentContent>).filter(
        (key) => next[key] !== current?.[key],
      );
      if (changed.length === 0) return;
      const now = Date.now();
      const field = changed[0];
      const isTyping = changed.length === 1 && field !== undefined && typingFields.has(field);
      const coalesce =
        position > 0 &&
        position === entries.length - 1 &&
        (sameTurn || (isTyping && field === lastTypingField && now - lastChangeAt < COALESCE_DELAY));
      entries = entries.slice(0, position + 1);
      const entry = { content: next, size: JSON.stringify(next).length };
      if (coalesce) entries[position] = entry;
      else {
        entries.push(entry);
        position += 1;
      }
      let size = entries.reduce((total, item) => total + item.size, 0);
      while (entries.length > 1 && (entries.length > MAX_HISTORY_ENTRIES || size > MAX_HISTORY_CHARACTERS)) {
        const removed = entries.shift();
        if (removed) size -= removed.size;
        position -= 1;
      }
      lastChangeAt = now;
      lastTypingField = undefined;
      if (isTyping) lastTypingField = field;
      sameTurn = true;
      queueMicrotask(() => {
        sameTurn = false;
      });
      refreshState();
    },
    undo() {
      if (position === 0) return null;
      position -= 1;
      stopCoalescing();
      refreshState();
      return entries[position]?.content ?? null;
    },
    redo() {
      if (position === entries.length - 1) return null;
      position += 1;
      stopCoalescing();
      refreshState();
      return entries[position]?.content ?? null;
    },
    stopCoalescing,
  };
}
