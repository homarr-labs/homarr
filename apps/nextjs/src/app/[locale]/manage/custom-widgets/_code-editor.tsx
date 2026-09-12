"use client";
import { useSyncExternalStore, useState, useEffect, useCallback, useMemo } from "react";
import type { ComponentProps } from "react";
import { CodeEditor as SharedCodeEditor } from "~/components/custom-widgets/code-editor";
import { useOptionalCustomWidgetFormDocumentStore } from "./_custom-widget-form-state";
const subscribeEmpty = () => () => undefined;
const zero = () => 0;
export function CodeEditor({
  localHistory = false,
  ...props
}: ComponentProps<typeof SharedCodeEditor> & { localHistory?: boolean }) {
  const [insert, setInsert] = useState<{ text: string; key: number }>();
  const [reveal, setReveal] = useState<{ index: number; key: number }>();
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ editorId: string; index: number }>).detail;
      if (detail.editorId === props.id) setReveal({ index: detail.index, key: Date.now() });
    };
    const receiveInsert = (event: Event) => {
      const detail = (event as CustomEvent<{ editorId: string; text: string }>).detail;
      if (detail.editorId === props.id && !props.readOnly) setInsert({ text: detail.text, key: Date.now() });
    };
    window.addEventListener("homarr:widget-code-insert", receiveInsert);
    window.addEventListener("homarr:widget-code-reveal", receive);
    return () => {
      window.removeEventListener("homarr:widget-code-reveal", receive);
      window.removeEventListener("homarr:widget-code-insert", receiveInsert);
    };
  }, [props.id, props.readOnly]);
  const store = useOptionalCustomWidgetFormDocumentStore();
  const getHistoryState = useCallback(() => {
    if (!store) return 0;
    return Number(store.canUndo()) + 2 * Number(store.canRedo());
  }, [store]);
  const historyState = useSyncExternalStore(store?.subscribeEditor ?? subscribeEmpty, getHistoryState, zero);
  const history = useMemo(() => {
    if (!store || localHistory || props.readOnly || props.id.startsWith("preview-")) return undefined;
    return {
      canUndo: Boolean(historyState & 1),
      canRedo: Boolean(historyState & 2),
      undo: store.undo,
      redo: store.redo,
    };
  }, [store, localHistory, props.readOnly, props.id, historyState]);
  return (
    <div data-workbench-local-input={localHistory || undefined}>
      <SharedCodeEditor
        {...props}
        history={history}
        insertText={insert?.text ?? props.insertText}
        insertKey={insert?.key ?? props.insertKey}
        revealIndex={reveal?.index}
        revealKey={reveal?.key ?? props.revealKey}
      />
    </div>
  );
}
