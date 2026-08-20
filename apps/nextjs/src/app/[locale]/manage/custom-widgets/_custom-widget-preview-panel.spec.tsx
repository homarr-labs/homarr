// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { BUNDLED_CUSTOM_WIDGETS, customWidgetDefinitionSchema } from "@homarr/custom-widgets/core";

import { CustomWidgetPreviewPanel } from "./_custom-widget-preview-panel";

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    customWidget: {
      setPreviewLiveActions: { useMutation: () => ({ isPending: false, mutate: vi.fn() }) },
      previewJournal: { useQuery: () => ({ data: [] }) },
    },
  },
}));
vi.mock("@homarr/translation/client", () => ({ useI18n: () => (key: string) => key }));
vi.mock("@homarr/notifications", () => ({ showErrorNotification: vi.fn() }));
const rendererAttempt = vi.hoisted(() => vi.fn());
const codeEditorProps = vi.hoisted(() => vi.fn());

vi.mock("@homarr/widgets/custom-api/custom-jsx-display", () => ({
  default: ({ data }: { data: Record<string, unknown> }) => {
    rendererAttempt(data);
    if ((data.options as Record<string, unknown> | undefined)?.throwPreview === true) {
      throw new Error("authored widget failed");
    }
    return <div>widget-renderer</div>;
  },
}));
vi.mock("./_code-editor", () => ({
  CodeEditor: (props: { label: string; readOnly?: boolean }) => {
    codeEditorProps(props);
    return <div>{props.label}</div>;
  },
}));
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
  test("inherits the application theme instead of forcing a reload-sensitive preview theme", () => {
    const source = readFileSync(
      `${process.cwd()}/apps/nextjs/src/app/[locale]/manage/custom-widgets/_custom-widget-preview-panel.tsx`,
      "utf8",
    );

    expect(source).not.toContain("forceColorScheme");
    expect(source).not.toContain("onThemeChange");
  });

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
            optionsSnapshot={{}}
            onOptionsChange={vi.fn()}
            onLiveActionsChange={vi.fn()}
          />
        </MantineProvider>,
      );
    });

    const previewCanvas = host.querySelector('[class*="previewCanvas"]');
    expect(previewCanvas?.textContent).toContain("invalid");
    for (const tab of ["widget", "data", "options", "actions", "diagnostics"]) {
      expect(host.textContent).toContain(`tab.${tab}`);
    }

    const dataTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((element) =>
      element.textContent?.includes("tab.data"),
    );
    await act(async () => dataTab?.click());
    expect(host.textContent).toContain("requestData");
    expect(codeEditorProps).toHaveBeenCalledWith(expect.objectContaining({ label: "requestData", readOnly: true }));
    expect(host.textContent).not.toContain("invalid");

    const optionsTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((element) =>
      element.textContent?.includes("tab.options"),
    );
    await act(async () => optionsTab?.click());
    expect(host.textContent).toContain("instanceOptions");
    expect(host.textContent).not.toContain("invalid");

    const actionsTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((element) =>
      element.textContent?.includes("tab.actions"),
    );
    await act(async () => actionsTab?.click());
    expect(host.textContent).toContain("liveActions");
    expect(host.textContent).not.toContain("invalid");

    const diagnosticsTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((element) =>
      element.textContent?.includes("tab.diagnostics"),
    );
    expect(diagnosticsTab).toBeDefined();
    await act(async () => diagnosticsTab?.click());

    expect(host.textContent).toContain("sources.0.baseUrl");
    expect(host.textContent).toContain("Enter a complete URL.");
    expect(host.textContent).not.toContain("sessionActive");
    expect(host.textContent).not.toContain("simulationPending");
  });

  test("contains renderer failures inside the widget tab and keeps the inspection tabs usable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    rendererAttempt.mockClear();
    const bundledWidget = BUNDLED_CUSTOM_WIDGETS.at(0);
    if (!bundledWidget) throw new Error("Expected at least one bundled Custom Widget");
    const candidate = customWidgetDefinitionSchema.parse(bundledWidget.widget);
    const preview = { data: {}, status: {}, session: null, outcome: "idle" } as const;
    const failingOptions = { throwPreview: true };

    await act(async () => {
      root.render(
        <MantineProvider>
          <CustomWidgetPreviewPanel
            candidate={{
              ...candidate,
              requests: Object.fromEntries(
                Object.entries(candidate.requests).map(([id, request]) => [id, { ...request }]),
              ),
            }}
            validationIssues={[]}
            preview={preview}
            size="standard"
            onSizeChange={vi.fn()}
            optionsSnapshot={{ ...failingOptions }}
            onOptionsChange={vi.fn()}
            onLiveActionsChange={vi.fn()}
          />
        </MantineProvider>,
      );
    });

    expect(host.textContent).toContain("title");
    expect(host.querySelector('[class*="previewCanvas"]')?.textContent).toContain("title");
    for (const tab of ["widget", "data", "options", "actions", "diagnostics"]) {
      expect(host.textContent).toContain(`tab.${tab}`);
    }
    const attemptsAfterFailure = rendererAttempt.mock.calls.length;

    await act(async () => {
      root.render(
        <MantineProvider>
          <CustomWidgetPreviewPanel
            candidate={candidate}
            validationIssues={[]}
            preview={preview}
            size="standard"
            onSizeChange={vi.fn()}
            optionsSnapshot={failingOptions}
            onOptionsChange={vi.fn()}
            onLiveActionsChange={vi.fn()}
          />
        </MantineProvider>,
      );
    });
    expect(rendererAttempt).toHaveBeenCalledTimes(attemptsAfterFailure);

    const dataTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((element) =>
      element.textContent?.includes("tab.data"),
    );
    await act(async () => dataTab?.click());
    expect(host.textContent).toContain("requestData");

    const diagnosticsTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((element) =>
      element.textContent?.includes("tab.diagnostics"),
    );
    await act(async () => diagnosticsTab?.click());
    expect(host.textContent).toContain("validation.title");

    const widgetTab = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].find((element) =>
      element.textContent?.includes("tab.widget"),
    );
    await act(async () => widgetTab?.click());
    await act(async () => {
      root.render(
        <MantineProvider>
          <CustomWidgetPreviewPanel
            candidate={candidate}
            validationIssues={[]}
            preview={preview}
            size="standard"
            onSizeChange={vi.fn()}
            optionsSnapshot={{}}
            onOptionsChange={vi.fn()}
            onLiveActionsChange={vi.fn()}
          />
        </MantineProvider>,
      );
    });
    expect(host.textContent).toContain("widget-renderer");
  });
});
