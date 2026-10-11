import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { Color } from "@tiptap/extension-color";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { StarterKit } from "@tiptap/starter-kit";
import { TaskList } from "@tiptap/extension-task-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";

import { defaultContent } from "../../../packages/widgets/src/notebook/default-content";
import {
  createReadOnlyTaskItemTransaction,
  ReadOnlyTaskItem,
} from "../../../packages/widgets/src/notebook/read-only-task-item";
import { NotebookTextDirection } from "../../../packages/widgets/src/notebook/text-direction";

type Variant = "baseline" | "candidate";
type SizeName = "small" | "representative" | "large";

interface Metrics {
  serializationCalls: number;
  serializedUtf16Units: number;
  serializationMs: number[];
  editCommandMs: number[];
  renderCount: number;
  saveCalls: number;
  failedSaves: number;
  taskCommits: number;
  editorInstancesCreated: number;
  editorInstancesDestroyed: number;
}

declare global {
  interface Window {
    __notebookMeasure?: {
      runEdits: (count: number) => Promise<number[]>;
      save: (succeeds?: boolean) => Promise<string | undefined>;
      startEditing: () => void;
      cancel: () => Promise<void>;
      externalRefresh: (html: string) => Promise<void>;
      toggleTask: (succeeds?: boolean) => Promise<void>;
      remount: () => Promise<void>;
      snapshot: () => Record<string, unknown>;
      currentHtml: () => string;
      currentText: () => string;
      initialRawHtml: () => string;
      clearTelemetry: () => void;
      repeatLifecycle: (cycles: number) => Promise<void>;
  };
  __setNotebookMounted?: (mounted: boolean) => void;
  __fixtureOptions?: { variant?: string; size?: string };
  }
}

const params = new URLSearchParams(location.search);
const variant = (window.__fixtureOptions?.variant ?? params.get("variant") ?? "baseline") as Variant;
const sizeName = (window.__fixtureOptions?.size ?? params.get("size") ?? "small") as SizeName;
const taskHtml = '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Toggle-me task</p></div></li></ul><p>Editable trailing paragraph.</p>';
const repeatText = "Representative notebook paragraph for measuring editor transactions. ".repeat(3);

function getInitialHtml(size: SizeName) {
  if (size === "small") return `${defaultContent}${taskHtml}`;
  const repetitions = size === "representative" ? 256 : 2048;
  const paragraphs = Array.from({ length: repetitions }, (_, index) => `<p>${index}: ${repeatText}</p>`).join("");
  return `<h2>Notebook ${size} fixture</h2>${paragraphs}${taskHtml}`;
}

const initialHtml = getInitialHtml(sizeName);
const metrics: Metrics = {
  serializationCalls: 0,
  serializedUtf16Units: 0,
  serializationMs: [],
  editCommandMs: [],
  renderCount: 0,
  saveCalls: 0,
  failedSaves: 0,
  taskCommits: 0,
  editorInstancesCreated: 0,
  editorInstancesDestroyed: 0,
};

function App() {
  const [mounted, setMounted] = useState(true);
  useEffect(() => {
    window.__setNotebookMounted = setMounted;
    return () => {
      delete window.__setNotebookMounted;
    };
  }, []);
  return mounted ? (
    <NotebookHarness key={`${variant}-${sizeName}-${metrics.renderCount}`} />
  ) : null;
}

function NotebookHarness() {
  const [content, setContent] = useState(variant === "baseline" ? initialHtml : "");
  const previousContentRef = useRef(initialHtml);
  const expectedNormalizedHtmlRef = useRef<string | null>(null);
  const variantRef = useRef(variant);
  const readOnlyEventName = "notebook-measure:read-only-check";
  metrics.renderCount += 1;

  const serialize = (editor: NonNullable<ReturnType<typeof useEditor>>) => {
    const startedAt = performance.now();
    const html = editor.getHTML();
    metrics.serializationMs.push(performance.now() - startedAt);
    metrics.serializationCalls += 1;
    metrics.serializedUtf16Units += html.length;
    return html;
  };

  const editor = useEditor(
    {
      extensions: [
        Placeholder.configure({ placeholder: "Notebook measurement fixture" }),
        Color,
        Details,
        DetailsSummary,
        DetailsContent,
        Highlight.configure({ multicolor: true }),
        Image.extend({
          addAttributes() {
            return { ...this.parent?.(), width: { default: null } };
          },
        }).configure({ inline: true }),
        Link.configure({ openOnClick: true, validate: (url) => /^https?:\/\//.test(url) }).extend({
          addAttributes() {
            return { ...this.parent?.(), target: { default: null } };
          },
        }),
        StarterKit.configure({ link: false }),
        Table.configure({ resizable: true, lastColumnResizable: false }),
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
          onReadOnlyChecked: () => true,
          onReadOnlyCheckedAtPosition: (position, checked) => {
            window.dispatchEvent(new CustomEvent(readOnlyEventName, { detail: { position, checked } }));
          },
        }),
        TaskList.configure({ itemTypeName: "taskItem" }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        NotebookTextDirection,
        TextStyle,
      ],
      content: initialHtml,
      shouldRerenderOnTransaction: true,
      immediatelyRender: false,
      onUpdate: ({ editor: updatedEditor }) => {
        // Mirrors notebook.tsx:235. The candidate keeps Tiptap transactions but defers HTML serialization.
        if (variantRef.current === "baseline") setContent(serialize(updatedEditor));
      },
      onCreate: ({ editor: createdEditor }) => {
        metrics.editorInstancesCreated += 1;
        if (metrics.editorInstancesCreated === 1) expectedNormalizedHtmlRef.current = createdEditor.getHTML();
        createdEditor.setEditable(true);
      },
      onDestroy: () => {
        metrics.editorInstancesDestroyed += 1;
      },
    },
    [],
  );
  useEffect(() => {
    if (!editor) return;
    const handleReadOnlyCheck = async (event: Event) => {
      const { position, checked } = (event as CustomEvent<{ position: number; checked: boolean }>).detail;
      const transaction = createReadOnlyTaskItemTransaction(editor.state, position, checked);
      if (!transaction) return;
      editor.view.dispatch(transaction);
      const nextContent = serialize(editor);
      if (variant === "baseline") setContent(nextContent);
      metrics.taskCommits += 1;
      const success = (window as Window & { __taskSaveSucceeds?: boolean }).__taskSaveSucceeds !== false;
      metrics.saveCalls += 1;
      await Promise.resolve();
      if (success) {
        previousContentRef.current = nextContent;
        return;
      }
      metrics.failedSaves += 1;
      if (variant === "baseline") setContent(previousContentRef.current);
      editor.commands.setContent(previousContentRef.current);
    };
    window.addEventListener(readOnlyEventName, handleReadOnlyCheck);
    return () => window.removeEventListener(readOnlyEventName, handleReadOnlyCheck);
  }, [editor]);

  const actions = useRef<{
    runEdits: (count: number) => Promise<number[]>;
    save: (succeeds?: boolean) => Promise<string | undefined>;
    startEditing: () => void;
    cancel: () => Promise<void>;
    externalRefresh: (html: string) => Promise<void>;
    toggleTask: (succeeds?: boolean) => Promise<void>;
  }>(null!);
  const runEdits = async (count: number) => {
    if (!editor) return [];
    const durations: number[] = [];
    for (let index = 0; index < count; index += 1) {
      const startedAt = performance.now();
      editor.commands.insertContentAt(editor.state.doc.content.size - 1, "x");
      durations.push(performance.now() - startedAt);
    }
    metrics.editCommandMs.push(...durations);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return durations;
  };
  const save = async (succeeds = true) => {
    if (!editor) return undefined;
    const serialized = variant === "baseline" ? content : serialize(editor);
    metrics.saveCalls += 1;
    await Promise.resolve();
    if (!succeeds) {
      metrics.failedSaves += 1;
      editor.setEditable(true);
      return undefined;
    }
    previousContentRef.current = serialized;
    if (variant === "baseline") setContent(serialized);
    editor.setEditable(false);
    return serialized;
  };
  const startEditing = () => editor?.setEditable(true);
  const cancel = async () => {
    if (!editor) return;
    editor.setEditable(false);
    if (variant === "baseline") setContent(previousContentRef.current);
    editor.commands.setContent(previousContentRef.current);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  };
  const externalRefresh = async (html: string) => {
    if (!editor) return;
    previousContentRef.current = html;
    if (variant === "baseline") setContent(html);
    editor.commands.setContent(html);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  };
  const toggleTask = async (succeeds = true) => {
    if (!editor) return;
    const taskItem = [...document.querySelectorAll<HTMLElement>('.ProseMirror li')].find((item) =>
      item.textContent?.includes("Toggle-me task"),
    );
    const checkbox = taskItem?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (!checkbox) throw new Error("Task checkbox nodeview was not mounted");
    checkbox.checked = !checkbox.checked;
    (window as Window & { __taskSaveSucceeds?: boolean }).__taskSaveSucceeds = succeeds;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  };
  actions.current = { runEdits, save, startEditing, cancel, externalRefresh, toggleTask };

  useEffect(() => {
    if (!editor) return;
    window.__notebookMeasure = {
      runEdits: (count) => actions.current.runEdits(count),
      save: (succeeds) => actions.current.save(succeeds),
      startEditing: () => actions.current.startEditing(),
      cancel: () => actions.current.cancel(),
      externalRefresh: (html) => actions.current.externalRefresh(html),
      toggleTask: (succeeds) => actions.current.toggleTask(succeeds),
      remount: async () => {
        flushSync(() => window.__setNotebookMounted?.(false));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        flushSync(() => window.__setNotebookMounted?.(true));
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      },
      snapshot: () => ({
        variant,
        sizeName,
        initialHtmlUtf16Units: initialHtml.length,
        initialHtmlUtf8Bytes: new TextEncoder().encode(initialHtml).length,
        initialNormalizedHtmlUtf16Units: expectedNormalizedHtmlRef.current?.length ?? 0,
        serializationCalls: metrics.serializationCalls,
        serializedUtf16Units: metrics.serializedUtf16Units,
        serializationMs: [...metrics.serializationMs],
        editCommandMs: [...metrics.editCommandMs],
        renderCount: metrics.renderCount,
        saveCalls: metrics.saveCalls,
        failedSaves: metrics.failedSaves,
        taskCommits: metrics.taskCommits,
        editorInstancesCreated: metrics.editorInstancesCreated,
        editorInstancesDestroyed: metrics.editorInstancesDestroyed,
        domEditorCount: document.querySelectorAll(".ProseMirror").length,
        domNodeCount: document.querySelectorAll("*").length,
        editorDestroyed: editor.isDestroyed,
      }),
      currentHtml: () => editor.getHTML(),
      currentText: () => editor.getText(),
      initialRawHtml: () => initialHtml,
      clearTelemetry: () => {
        metrics.serializationCalls = 0;
        metrics.serializedUtf16Units = 0;
        metrics.serializationMs = [];
        metrics.editCommandMs = [];
        metrics.saveCalls = 0;
        metrics.failedSaves = 0;
        metrics.taskCommits = 0;
      },
      repeatLifecycle: async (cycles: number) => {
        for (let index = 0; index < cycles; index += 1) {
          const active = window.__notebookMeasure;
          if (!active) throw new Error("Harness missing during lifecycle cycle");
          await active.cancel();
          await active.runEdits(1);
          await active.cancel();
          await window.__notebookMeasure?.remount();
        }
      },
    };
    return () => {
      if (window.__notebookMeasure) delete window.__notebookMeasure;
    };
  }, [editor]);

  return <EditorContent editor={editor} />;
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Fixture root missing");
createRoot(rootElement).render(<App />);
