// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CustomWidgetCodeEditor, PreviewHeader, PreviewResponsePanel, ResponseTree } from "../workbench";
import type { CustomWidgetEditorMessages } from "../workbench";

vi.mock("../workbench/direct-code-mirror", () => ({
  default: ({ id, label, labelledBy }: { id: string; label: string; labelledBy: string }) => (
    <textarea id={id} aria-label={label} aria-labelledby={labelledBy} />
  ),
}));

const editorMessages: CustomWidgetEditorMessages = {
  languageJsx: "JSX",
  languageJson: "JSON",
  undo: "Undo",
  redo: "Redo",
  components: "Components",
  componentSearch: "Search components",
  componentEmpty: "No components",
  componentCount: (count) => `${count} components`,
  insertStarter: "Insert starter",
  format: "Format",
  copy: "Copy",
  copied: "Copied",
  schema: "Schema",
  schemaTab: "JSON Schema",
  minimalTab: "Minimal",
  fullTab: "Full",
  errors: (count) => `${count} errors`,
  warnings: (count) => `${count} warnings`,
  ready: "Ready",
  position: ({ line, column }) => `${line}:${column}`,
  characters: (count) => `${count}`,
  diagnosticsTitle: "Diagnostics",
  diagnostic: (diagnostic) => diagnostic.code,
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
});

async function render(node: ReactNode) {
  await act(async () => root.render(<MantineProvider>{node}</MantineProvider>));
}

describe("Custom Widget workbench UI", () => {
  test("associates the visible label with the editable CodeMirror control", async () => {
    await render(
      <CustomWidgetCodeEditor
        id="template-editor"
        label="Template"
        language="jsx"
        value="<Text>Hello</Text>"
        messages={editorMessages}
        onChange={vi.fn()}
      />,
    );
    await act(async () => Promise.resolve());

    const label = host.querySelector('#template-editor-label[for="template-editor"]');
    expect(label).not.toBeNull();
    expect(host.querySelector("#template-editor")?.getAttribute("aria-label")).toBe("Template");
    expect(host.querySelector("#template-editor")?.getAttribute("aria-labelledby")).toBe("template-editor-label");
  }, 15_000);

  test("renders response data through the Mantine Tree with accessible path actions", async () => {
    await render(
      <ResponseTree
        value={{ service: { name: "Homarr", online: true } }}
        labels={{ copyPath: "Copy path", pathCopied: "Path copied", insertPath: "Insert path" }}
        onInsertDataPath={vi.fn()}
      />,
    );
    expect(host.querySelector('[role="tree"]')).not.toBeNull();
    expect(host.textContent).toContain("service");
    expect(host.querySelector('button[aria-label="Copy path"]')).not.toBeNull();
    expect(host.querySelector('button[aria-label="Insert path"]')).not.toBeNull();
  });

  test("keeps mutation preview execution disabled without a network-capability badge", async () => {
    await render(
      <PreviewHeader
        method="POST"
        url="https://example.com"
        isTesting={false}
        isSampleStale={false}
        onTest={vi.fn()}
        messages={{
          title: "Preview",
          test: "Test",
          mutationDisabled: "Mutations are disabled",
          staleTitle: "Stale",
          staleDescription: "Run again",
        }}
      />,
    );
    const testButton = [...host.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Test");
    expect(testButton?.disabled).toBe(true);
    expect(host.textContent).toContain("Mutations are disabled");
    expect(host.textContent).not.toContain("Interactive");
  });

  test("shows an empty response state without exposing a raw JSON toggle", async () => {
    await render(
      <PreviewResponsePanel
        value={null}
        messages={{
          empty: "No response",
          sampleHint: "Add sample data",
          editSample: "Edit sample",
          addSample: "Add sample",
          copied: "Copied",
          copy: "Copy",
          sampleLabel: "Sample",
          sampleDescription: "JSON",
          invalidSample: "Invalid JSON",
          cancelSample: "Cancel",
          applySample: "Apply",
          copyPath: "Copy path",
          pathCopied: "Path copied",
          insertPath: "Insert path",
          openRaw: "Open raw response",
        }}
      />,
    );
    expect(host.textContent).toContain("No response");
    expect(host.textContent).not.toContain("View raw JSON");
  });
});
