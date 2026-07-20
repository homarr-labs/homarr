// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CustomWidgetPreviewPanel } from "./_custom-widget-preview-panel";

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    customWidget: {
      setPreviewLiveActions: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      previewJournal: { useQuery: () => ({ data: [] }) },
    },
  },
}));
vi.mock("@homarr/translation/client", () => ({ useScopedI18n: () => (key: string) => key }));
vi.mock("@homarr/notifications", () => ({ showErrorNotification: vi.fn() }));
vi.mock("@homarr/widgets/custom-api/custom-jsx-display", () => ({ default: () => <div>widget-renderer</div> }));
vi.mock("./_code-editor", () => ({ CodeEditor: ({ label }: { label: string }) => <div>{label}</div> }));
vi.mock("./_custom-widget-preview-action", () => ({ PreviewActionControl: () => <div>action-control</div> }));

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
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
  vi.unstubAllGlobals();
});

describe("Custom Widget preview panel", () => {
  test("contains invalid definitions inside the widget canvas while keeping every inspection tab", async () => {
    await act(async () => {
      root.render(
        <MantineProvider>
          <CustomWidgetPreviewPanel
            candidate={null}
            validationIssues={[{ path: "sources.0.baseUrl", message: "Enter a complete URL." }]}
            preview={{ data: { previous: true }, status: {}, session: null, outcome: "idle" }}
            size="standard"
            onSizeChange={vi.fn()}
            theme="dark"
            onThemeChange={vi.fn()}
            optionsSnapshot={{}}
            onOptionsChange={vi.fn()}
            onLiveActionsChange={vi.fn()}
          />
        </MantineProvider>,
      );
    });

    expect(host.textContent).toContain("invalid");
    for (const tab of ["widget", "data", "options", "actions", "diagnostics"]) {
      expect(host.textContent).toContain(`tab.${tab}`);
    }

    const diagnosticsTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((element) =>
      element.textContent?.includes("tab.diagnostics"),
    );
    expect(diagnosticsTab).toBeDefined();
    await act(async () => diagnosticsTab?.click());

    expect(host.textContent).toContain("sources.0.baseUrl");
    expect(host.textContent).toContain("Enter a complete URL.");
  });
});
