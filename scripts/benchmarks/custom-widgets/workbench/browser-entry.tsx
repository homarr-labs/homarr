import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { MantineProvider } from "@mantine/core";
import { CustomWidgetCodeEditor } from "SOURCE/packages/custom-widgets/src/workbench/code-editor";
import { PreviewResponsePanel } from "SOURCE/packages/custom-widgets/src/workbench/preview-response-panel";
import { createCustomJsxCompletionSource } from "SOURCE/packages/custom-widgets/src/workbench/code-language";
import { CompletionContext } from "@codemirror/autocomplete";
import { useForm } from "@mantine/form";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { customJsxAuthoringCatalog } from "SOURCE/packages/custom-widgets/src/core/component-catalog";
import {
  createCustomWidgetFormDocumentStore,
  CustomWidgetFormDocumentProvider,
  useCustomWidgetFormDocumentField,
} from "SOURCE/apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-form-state";
import {
  CustomWidgetFormAnalysisProvider,
  useCustomWidgetFormAnalysisField,
} from "SOURCE/apps/nextjs/src/app/[locale]/manage/custom-widgets/_use-custom-widget-form-analysis";
import "@mantine/core/styles.css";

window.__counts = {};
const root = createRoot(document.getElementById("root"));
const messages = {
  languageJsx: "JSX",
  languageJson: "JSON",
  undo: "Undo",
  redo: "Redo",
  components: "Components",
  componentSearch: "Search",
  componentEmpty: "Empty",
  componentCount: (n) => `${n} components`,
  insertStarter: "Starter",
  format: "Format",
  copy: "Copy",
  copied: "Copied",
  schema: "Schema",
  schemaTab: "JSON Schema",
  minimalTab: "Minimal",
  fullTab: "Full",
  errors: (n) => `${n} errors`,
  warnings: (n) => `${n} warnings`,
  ready: "Ready",
  position: (p) => `${p.line}:${p.column}`,
  characters: (n) => `${n}`,
  diagnosticsTitle: "Diagnostics",
  diagnostic: (d) => d.code,
};
const referenceValue = Object.fromEntries(
  Array.from({ length: 300 }, (_, i) => [`field${i}`, { type: "string", description: "x".repeat(100) }]),
);
const reference = { schema: referenceValue, minimal: referenceValue, full: referenceValue };
const response = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`field${i}`, `value-${i}`]));
const stringify = JSON.stringify;
JSON.stringify = (value, ...arguments_) => {
  if (value === response) window.__counts.responseSerialization = (window.__counts.responseSerialization ?? 0) + 1;
  if (value === referenceValue)
    window.__counts.referenceSerialization = (window.__counts.referenceSerialization ?? 0) + 1;
  return stringify(value, ...arguments_);
};
const responseMessages = {
  empty: "Empty",
  sampleHint: "Sample",
  editSample: "Edit sample",
  addSample: "Add sample",
  copied: "Copied",
  copy: "Copy",
  sampleLabel: "Sample data",
  sampleDescription: "JSON",
  invalidSample: "Invalid JSON",
  cancelSample: "Cancel",
  applySample: "Apply",
  copyPath: "Copy path",
  pathCopied: "Copied",
  insertPath: "Insert path",
  openRaw: "Raw",
};
const values = {
  name: "Benchmark",
  description: "",
  iconUrl: "",
  sources: '{"default":{"name":"API","baseUrl":"https://example.com","auth":"none"}}',
  requests: "{}",
  options: "{}",
  template: "<Text>Hello</Text>",
  secrets: [],
};
function AnalysisPreview() {
  useCustomWidgetFormAnalysisField("previewCandidate");
  window.__counts.preview = (window.__counts.preview ?? 0) + 1;
  return null;
}
function AnalysisEditor({ field }) {
  useCustomWidgetFormDocumentField(field);
  window.__counts[field] = (window.__counts[field] ?? 0) + 1;
  return null;
}
function FormFixture() {
  window.__counts.form = (window.__counts.form ?? 0) + 1;
  const [store] = useState(() => createCustomWidgetFormDocumentStore(values));
  const form = useForm({ initialValues: values, mode: "uncontrolled", onValuesChange: store.setValues });
  window.editForm = (field, value) => flushSync(() => form.setFieldValue(field, value));
  return <FormFixtureView store={store} />;
}
const FormFixtureView = React.memo(function FormFixtureView({ store }) {
  return (
    <CustomWidgetFormDocumentProvider store={store}>
      <CustomWidgetFormAnalysisProvider>
        <AnalysisEditor field="template" />
        <AnalysisEditor field="requests" />
        <AnalysisPreview />
      </CustomWidgetFormAnalysisProvider>
    </CustomWidgetFormDocumentProvider>
  );
});
let setEditor;
function EditorFixture() {
  const [value, setValue] = useState("<Text>Hello</Text>");
  setEditor = setValue;
  return (
    <CustomWidgetCodeEditor
      id="editor"
      label="Template"
      language="jsx"
      value={value}
      onChange={setValue}
      messages={messages}
      reference={reference}
    />
  );
}
window.mount = (mode) => {
  window.__counts = {};
  flushSync(() =>
    root.render(
      <MantineProvider forceColorScheme="light">
        {mode === "form" ? (
          <FormFixture />
        ) : mode === "response" ? (
          <PreviewResponsePanel
            value={response}
            messages={responseMessages}
            onSampleDataChange={(v) => (window.applied = v)}
          />
        ) : (
          <EditorFixture />
        )}
      </MantineProvider>,
    ),
  );
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
window.runEditor = async () => {
  window.__counts = {};
  const samples = [];
  for (let i = 0; i < 25; i++) {
    const start = performance.now();
    flushSync(() => setEditor(`<Text>Hello ${i}</Text>`));
    samples.push(performance.now() - start);
    await wait(20);
  }
  return {
    samples: samples.slice(5),
    counts: { ...window.__counts },
    editors: document.querySelectorAll(".cm-editor").length,
  };
};
window.runResponse = async () => {
  Array.from(document.querySelectorAll("button"))
    .find((b) => b.textContent === "Edit sample")
    .click();
  await wait(300);
  window.__counts = {};
  const samples = [];
  for (let i = 0; i < 25; i++) {
    const textarea = document.querySelector("textarea");
    const start = performance.now();
    flushSync(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(
        textarea,
        JSON.stringify({ test: i }),
      );
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    samples.push(performance.now() - start);
    await wait(20);
  }
  return { samples: samples.slice(5), counts: { ...window.__counts } };
};
window.runOpenedReference = async () => {
  Array.from(document.querySelectorAll("button"))
    .find((button) => button.textContent === "Schema")
    .click();
  await wait(500);
  return await window.runEditor();
};
window.runCompletions = () => {
  const source = createCustomJsxCompletionSource([{ label: "data.test", type: "variable" }]);
  const state = EditorState.create({ doc: "<Text c" });
  const context = new CompletionContext(state, state.doc.length, true);
  window.__counts = {};
  const samples = [];
  let signature = "";
  for (let i = 0; i < 350; i++) {
    const start = performance.now();
    for (let j = 0; j < 20; j++)
      signature = source(context)
        .options.map((v) => v.label)
        .join("|");
    if (i >= 50) samples.push((performance.now() - start) / 20);
  }
  return { samples, counts: { ...window.__counts }, signature };
};
window.runForm = async () => {
  window.__counts = {};
  for (let i = 0; i < 10; i++) {
    window.editForm("template", `<Text>Hello ${i}</Text>`);
    await wait(10);
  }
  const immediate = { ...window.__counts };
  await wait(1200);
  const settled = { ...window.__counts };
  window.__counts = {};
  window.editForm(
    "requests",
    JSON.stringify({ test: { source: "default", kind: "query", trigger: "load", method: "GET", path: "/first" } }),
  );
  await wait(1200);
  window.__counts = {};
  window.editForm(
    "requests",
    JSON.stringify({ test: { source: "default", kind: "query", trigger: "load", method: "GET", path: "/second" } }),
  );
  await wait(1200);
  return { immediate, settled, requestBodyEdit: { ...window.__counts } };
};
window.ready = true;
window.getView = () => EditorView.findFromDOM(document.querySelector(".cm-editor"));
window.replaceEditor = (value) => flushSync(() => setEditor(value));
window.completionParity = async () => {
  const source = createCustomJsxCompletionSource([{ label: "data.example", type: "variable" }]);
  const names = [...customJsxAuthoringCatalog.components.map((component) => component.name), "Icon", "Unknown", ""];
  const signatures = [];
  for (const name of names) {
    const doc = name ? `<${name} c` : "data.";
    const state = EditorState.create({ doc });
    const result = source(new CompletionContext(state, doc.length, true));
    signatures.push(JSON.stringify(result));
    signatures.push(JSON.stringify(source(new CompletionContext(state, doc.length, true))));
  }
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(signatures.join("\n")));
  return {
    cases: signatures.length,
    sha256: Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join(""),
  };
};
