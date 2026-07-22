// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { PreviewHeader, PreviewResponsePanel, ResponseTree } from "../workbench";

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
