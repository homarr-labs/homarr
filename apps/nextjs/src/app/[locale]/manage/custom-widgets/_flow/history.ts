import type { CustomWidgetFormValues } from "@homarr/custom-widgets/workbench";
import type { CustomWidgetEditorLayout } from "@homarr/custom-widgets/core";

export type DocumentContent = Omit<CustomWidgetFormValues, "secrets">;
export interface EditorSnapshot {
  content: DocumentContent;
  layout: CustomWidgetEditorLayout;
  sourceBindings: Record<string, string>;
  requestBindings: Record<string, string>;
}
export function withoutCredentials({ secrets: _secrets, ...content }: CustomWidgetFormValues): DocumentContent {
  return content;
}

/** Semantic history never captures credentials, network results, or viewport state. */
export function createEditorHistory() {
  const past: EditorSnapshot[] = [];
  const future: EditorSnapshot[] = [];
  let lastGroup = "";
  let lastTime = 0;
  return {
    record(previous: EditorSnapshot, group: string) {
      const now = Date.now();
      if (!group || group !== lastGroup || now - lastTime > 750) {
        past.push(previous);
        if (past.length > 80) past.shift();
      }
      lastGroup = group;
      lastTime = now;
      future.length = 0;
    },
    undo(current: EditorSnapshot) {
      const previous = past.pop();
      if (previous) future.push(current);
      lastGroup = "";
      return previous;
    },
    redo(current: EditorSnapshot) {
      const next = future.pop();
      if (next) past.push(current);
      lastGroup = "";
      return next;
    },
    get canUndo() {
      return past.length > 0;
    },
    get canRedo() {
      return future.length > 0;
    },
  };
}
