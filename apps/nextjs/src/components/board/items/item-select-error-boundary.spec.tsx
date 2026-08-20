// @vitest-environment jsdom

import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { Button, Center, MantineProvider } from "@mantine/core";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WidgetError } from "@homarr/widgets/errors";
import { NoIntegrationSelectedError } from "@homarr/widgets/errors/classes";

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) => {
    const translations: Record<string, string> = {
      "widget.common.error.noIntegration": "No integration selected for this widget",
      "common.error": "An unexpected error occurred",
      "common.action.retry": "Retry",
    };
    return translations[key] ?? key;
  },
  useScopedI18n: () => (key: string) => key,
}));

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

  // Suppress console.error during error boundary tests to avoid noisy output
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

const Throw = ({ when, error }: { when: boolean; error: Error }) => {
  if (when) throw error;
  return null;
};

// Simulates the Live Preview Error Boundary container from item-select-modal.tsx
const LivePreviewContainer = ({
  options,
  previewIntegrationIds,
  hasIntegrationSupport,
  integrationsRequired,
  onResetCallback,
  widgetComponent,
}: {
  options: Record<string, unknown>;
  previewIntegrationIds: string[];
  hasIntegrationSupport: boolean;
  integrationsRequired: boolean;
  onResetCallback?: () => void;
  widgetComponent: (props: { options: Record<string, unknown>; integrationIds: string[] }) => JSX.Element;
}) => {
  return (
    <div data-testid="outer-modal-pane">
      <div data-testid="outer-header">Add Widget Header</div>
      <div data-testid="live-preview-frame">
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              onReset={() => {
                reset();
                onResetCallback?.();
              }}
              resetKeys={[options, previewIntegrationIds]}
              fallbackRender={({ resetErrorBoundary, error }) => (
                <Center h="100%" p="md" data-testid="preview-error-fallback">
                  <WidgetError error={error} resetErrorBoundary={resetErrorBoundary} />
                </Center>
              )}
            >
              <Throw
                error={new NoIntegrationSelectedError()}
                when={hasIntegrationSupport && previewIntegrationIds.length === 0 && integrationsRequired}
              />
              {widgetComponent({ options, integrationIds: previewIntegrationIds })}
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
      <div data-testid="outer-footer">Add Widget Footer</div>
    </div>
  );
};

describe("Advanced Add App - Live Preview Error Boundary Isolation", () => {
  it("isolates runtime errors thrown inside the preview widget without crashing outer modal components", async () => {
    const BuggyWidget = () => {
      throw new Error("Widget rendering failure in preview");
    };

    await act(async () =>
      root.render(
        <MantineProvider>
          <LivePreviewContainer
            options={{ title: "Test" }}
            previewIntegrationIds={["integration-1"]}
            hasIntegrationSupport={true}
            integrationsRequired={true}
            widgetComponent={() => <BuggyWidget />}
          />
        </MantineProvider>,
      ),
    );

    // Outer components are preserved and not destroyed by the error
    expect(host.querySelector("[data-testid='outer-modal-pane']")).not.toBeNull();
    expect(host.querySelector("[data-testid='outer-header']")).not.toBeNull();
    expect(host.querySelector("[data-testid='outer-footer']")).not.toBeNull();

    // The error fallback is rendered inside the preview frame
    expect(host.querySelector("[data-testid='preview-error-fallback']")).not.toBeNull();
    expect(host.textContent).toContain("Widget rendering failure in preview");
  });

  it("throws and catches NoIntegrationSelectedError when integration is required and previewIntegrationIds is empty", async () => {
    const WorkingWidget = () => <div data-testid="widget-content">Healthy Widget</div>;

    await act(async () =>
      root.render(
        <MantineProvider>
          <LivePreviewContainer
            options={{}}
            previewIntegrationIds={[]}
            hasIntegrationSupport={true}
            integrationsRequired={true}
            widgetComponent={() => <WorkingWidget />}
          />
        </MantineProvider>,
      ),
    );

    // Error fallback is active
    expect(host.querySelector("[data-testid='preview-error-fallback']")).not.toBeNull();
    expect(host.textContent).toContain("No integration selected for this widget");
    expect(host.querySelector("[data-testid='widget-content']")).toBeNull();
  });

  it("renders healthy widget without throwing when integrationsRequired is false even if previewIntegrationIds is empty", async () => {
    const OptionalIntegrationWidget = ({ integrationIds }: { integrationIds: string[] }) => (
      <div data-testid="widget-content">Widget rendered with {integrationIds.length} integrations</div>
    );

    await act(async () =>
      root.render(
        <MantineProvider>
          <LivePreviewContainer
            options={{}}
            previewIntegrationIds={[]}
            hasIntegrationSupport={true}
            integrationsRequired={false}
            widgetComponent={({ integrationIds }) => <OptionalIntegrationWidget integrationIds={integrationIds} />}
          />
        </MantineProvider>,
      ),
    );

    expect(host.querySelector("[data-testid='preview-error-fallback']")).toBeNull();
    expect(host.querySelector("[data-testid='widget-content']")).not.toBeNull();
    expect(host.textContent).toContain("Widget rendered with 0 integrations");
  });

  it("renders healthy widget without throwing when widget has no integration support", async () => {
    const StandaloneWidget = () => <div data-testid="standalone-widget">Clock Widget</div>;

    await act(async () =>
      root.render(
        <MantineProvider>
          <LivePreviewContainer
            options={{}}
            previewIntegrationIds={[]}
            hasIntegrationSupport={false}
            integrationsRequired={false}
            widgetComponent={() => <StandaloneWidget />}
          />
        </MantineProvider>,
      ),
    );

    expect(host.querySelector("[data-testid='preview-error-fallback']")).toBeNull();
    expect(host.querySelector("[data-testid='standalone-widget']")).not.toBeNull();
    expect(host.textContent).toContain("Clock Widget");
  });

  it("automatically resets and recovers when previewIntegrationIds or options change via resetKeys", async () => {
    const DynamicWidget = ({ integrationIds }: { integrationIds: string[] }) => {
      return <div data-testid="healthy-widget">Active with: {integrationIds.join(", ")}</div>;
    };

    const TestHarness = () => {
      const [integrationIds, setIntegrationIds] = useState<string[]>([]);
      const [options, setOptions] = useState<Record<string, unknown>>({ query: "default" });

      return (
        <div>
          <button data-testid="connect-service-btn" onClick={() => setIntegrationIds(["new-service-id"])}>
            Connect
          </button>
          <button data-testid="change-options-btn" onClick={() => setOptions({ query: "updated" })}>
            Change Option
          </button>
          <LivePreviewContainer
            options={options}
            previewIntegrationIds={integrationIds}
            hasIntegrationSupport={true}
            integrationsRequired={true}
            widgetComponent={({ integrationIds: ids }) => <DynamicWidget integrationIds={ids} />}
          />
        </div>
      );
    };

    await act(async () =>
      root.render(
        <MantineProvider>
          <TestHarness />
        </MantineProvider>,
      ),
    );

    // Initial state: no integration -> error boundary is showing
    expect(host.querySelector("[data-testid='preview-error-fallback']")).not.toBeNull();
    expect(host.querySelector("[data-testid='healthy-widget']")).toBeNull();

    // Click connect button -> previewIntegrationIds updates -> error boundary automatically resets
    const connectBtn = host.querySelector("[data-testid='connect-service-btn']");
    await act(async () => {
      (connectBtn as HTMLButtonElement)?.click();
    });

    expect(host.querySelector("[data-testid='preview-error-fallback']")).toBeNull();
    expect(host.querySelector("[data-testid='healthy-widget']")).not.toBeNull();
    expect(host.textContent).toContain("Active with: new-service-id");
  });

  it("recovers from error state when user clicks retry button in WidgetError", async () => {
    let shouldFail = true;
    const onResetCallback = vi.fn();

    const FlakyWidget = () => {
      if (shouldFail) {
        throw new Error("Temporary network glitch");
      }
      return <div data-testid="recovered-widget">Recovered Content</div>;
    };

    await act(async () =>
      root.render(
        <MantineProvider>
          <LivePreviewContainer
            options={{}}
            previewIntegrationIds={["integration-1"]}
            hasIntegrationSupport={true}
            integrationsRequired={true}
            onResetCallback={onResetCallback}
            widgetComponent={() => <FlakyWidget />}
          />
        </MantineProvider>,
      ),
    );

    expect(host.querySelector("[data-testid='preview-error-fallback']")).not.toBeNull();
    expect(host.textContent).toContain("Temporary network glitch");

    // Heal the condition
    shouldFail = false;

    // Click the retry button rendered by BaseWidgetError
    const retryButton = Array.from(host.querySelectorAll("button")).find((btn) =>
      btn.textContent?.toLowerCase().includes("retry"),
    );
    expect(retryButton).toBeDefined();

    await act(async () => {
      retryButton?.click();
    });

    expect(onResetCallback).toHaveBeenCalledOnce();
    expect(host.querySelector("[data-testid='preview-error-fallback']")).toBeNull();
    expect(host.querySelector("[data-testid='recovered-widget']")).not.toBeNull();
  });
});
