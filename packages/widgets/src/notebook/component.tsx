"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { showErrorNotification } from "@homarr/notifications";

import type { WidgetComponentProps } from "../definition";
import type { Notebook as NotebookEditorComponent } from "./notebook";
import dynamic from "next/dynamic";

const loadReadMode = () => import("./read-mode").then((module) => module.NotebookReadMode);
// Visible widget preloading should also start the read view's browser chunk.
if (typeof window !== "undefined") void loadReadMode().catch(() => undefined);
const NotebookReadMode = dynamic(loadReadMode, { ssr: false });

export default function NotebookWidget(props: WidgetComponentProps<"notebook">) {
  const [editor, setEditor] = useState<typeof NotebookEditorComponent | null>(null);
  const [isLoadingEditor, setIsLoadingEditor] = useState(false);
  const pendingRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleRequestEdit = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setIsLoadingEditor(true);
    void (async () => {
      try {
        const module = await import("./notebook");
        const Component = module.Notebook;
        if (!isMountedRef.current) return;
        pendingRef.current = false;
        setIsLoadingEditor(false);
        setEditor(() => Component);
      } catch (error) {
        if (!isMountedRef.current) return;
        pendingRef.current = false;
        setIsLoadingEditor(false);
        showErrorNotification({ message: error instanceof Error ? error.message : String(error) });
      }
    })();
  }, []);

  if (editor) {
    const Editor = editor;
    return <Editor {...props} autoEdit />;
  }

  return <NotebookReadMode {...props} isLoadingEditor={isLoadingEditor} onRequestEdit={handleRequestEdit} />;
}
