import { useEffect } from "react";
import type { RefObject } from "react";
import type { CustomWidgetFormDocumentStore } from "../_custom-widget-form-state";
import { readObject, record } from "./graph";

export function useWorkbenchKeybindings({
  store,
  selection,
  onDelete,
  returnFocus,
  onSelect,
  onClear,
  onCloseLibrary,
  onShowExecution,
}: {
  store: CustomWidgetFormDocumentStore;
  selection: string[];
  onDelete(): void;
  onSelect(id: string): void;
  onClear(): void;
  onCloseLibrary(): void;
  onShowExecution(): void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  useEffect(() => {
    const undo = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "z") return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-widget-workbench]")) return;
      if (
        target.closest(
          'input[type="password"], [data-workbench-credential], [data-workbench-local-input], [data-flow-preview], [data-flow-assistant]',
        )
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) store.redo();
      else store.undo();
    };
    const graph = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.defaultPrevented || !(target instanceof Element) || !target.closest("[data-widget-workbench]")) return;
      if (event.key === "Escape" && target.closest("[data-workbench-library]")) {
        event.preventDefault();
        onCloseLibrary();
        return;
      }
      if (
        target.closest(
          'input, textarea, [contenteditable="true"], [role="combobox"], [data-flow-preview], [data-flow-assistant]',
        )
      )
        return;
      if ((event.key === "Delete" || event.key === "Backspace") && selection.some((id) => id !== "widget")) {
        event.preventDefault();
        onDelete();
      }
      if (event.key === "Escape") {
        onClear();
        returnFocus.current?.focus();
      }
    };
    const inspect = (event: Event) => {
      const detail = (event as CustomEvent<{ fragment?: string }>).detail;
      let id = "widget";
      if (detail?.fragment) id = `fragment:${detail.fragment}`;
      onSelect(id);
    };
    const insert = () => onSelect("widget");
    const inspectRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ requestId?: unknown; field?: string }>).detail;
      if (typeof detail?.requestId !== "string") return;
      const requestId = detail.requestId;
      let id = `request:${requestId}`;
      if (Object.hasOwn(record(readObject(store.getValues().extensions).native), requestId)) id = `native:${requestId}`;
      else if (!Object.hasOwn(readObject(store.getValues().requests), requestId)) return;
      onSelect(id);
      if (detail.field === "path")
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(
              `[data-workbench-request="${CSS.escape(requestId)}"] [data-workbench-request-path]`,
            )
            ?.focus();
        });
    };
    window.addEventListener("homarr:widget-inspect", inspect);
    window.addEventListener("homarr:widget-code-insert", insert);
    window.addEventListener("homarr:widget-request-inspect", inspectRequest);
    window.addEventListener("homarr:widget-execution-panel", onShowExecution);
    document.addEventListener("keydown", undo, true);
    document.addEventListener("keydown", graph);
    return () => {
      window.removeEventListener("homarr:widget-inspect", inspect);
      window.removeEventListener("homarr:widget-code-insert", insert);
      window.removeEventListener("homarr:widget-request-inspect", inspectRequest);
      window.removeEventListener("homarr:widget-execution-panel", onShowExecution);
      document.removeEventListener("keydown", undo, true);
      document.removeEventListener("keydown", graph);
    };
  }, [store, selection, onDelete, returnFocus, onSelect, onClear, onCloseLibrary, onShowExecution]);
}
