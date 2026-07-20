// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActionButton, CustomJsxRenderer, CustomWidgetRuntimeProvider, SubFetch, ToggleSwitch } from "../runtime";
import { createCustomJsxComponents } from "../jsx";
import type {
  CustomJsxRequestCapability,
  CustomWidgetPublishedQueryState,
  CustomWidgetRequestResult,
  CustomWidgetRuntimeMessages,
  CustomWidgetRuntimePort,
} from "../runtime";

const messages: CustomWidgetRuntimeMessages = {
  requestIdRequired: "Request ID required",
  unsavedPreview: "Unsaved",
  invalidParams: "Invalid params",
  loadRequest: "Load",
  requestFailed: "Failed",
  loading: "Loading",
  retry: "Retry",
  widgetItemUnavailable: "Unavailable",
  actionsDisabledEditMode: "Disabled",
  actionSimulated: "Simulated",
  actionCompleted: "Completed",
  confirmDelete: "Confirm delete",
  toggle: "Toggle",
  refresh: "Refresh",
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
  vi.restoreAllMocks();
});

function createPort(overrides: Partial<CustomWidgetRuntimePort> = {}): CustomWidgetRuntimePort {
  return {
    query: vi.fn(async () => ({ ok: true, status: 200, data: { name: "Bulbasaur" } })),
    executeAction: vi.fn(async () => ({ ok: true, status: 200, data: null })),
    invalidate: vi.fn(async () => undefined),
    confirm: vi.fn(async () => true),
    notify: vi.fn(),
    ...overrides,
  };
}

async function render(
  node: ReactNode,
  port: CustomWidgetRuntimePort,
  capabilities: readonly CustomJsxRequestCapability[] = [],
  setQueryState?: (requestId: string, value: CustomWidgetPublishedQueryState | null) => void,
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <CustomWidgetRuntimeProvider
            itemId="item-1"
            isEditMode={false}
            requestCapabilities={capabilities}
            port={port}
            messages={messages}
            setQueryState={setQueryState}
          >
            {node}
          </CustomWidgetRuntimeProvider>
        </QueryClientProvider>
      </MantineProvider>,
    );
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("Custom Widget runtime ports", () => {
  it("exposes temporary bindings through inputs without browser storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const rendererMessages = {
      noTemplate: "No template",
      templateWarnings: (count: number) => `${count} warnings`,
    };
    const components = createCustomJsxComponents({
      TablerIcon: (() => null) as never,
      copyLabels: { copy: "Copy", copied: "Copied" },
    });
    const widget = (
      <CustomJsxRenderer
        template={'<Stack><TextInput bind="search" defaultValue="containers"/><Text>{inputs.search}</Text></Stack>'}
        data={{}}
        components={components}
        createBindings={() => ({})}
        messages={rendererMessages}
      />
    );

    await render(widget, createPort());
    await settle();
    expect(host.textContent).toContain("containers");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("runs an automatic query once and publishes data to the declarative data root", async () => {
    const port = createPort();
    const publish = vi.fn();
    await render(<SubFetch requestId="details" />, port, [], publish);
    await settle();
    expect(port.query).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenLastCalledWith("details", {
      data: { name: "Bulbasaur" },
      status: expect.objectContaining({ loading: false, ok: true, status: 200 }),
    });
    expect(host.querySelector("button, p, code, [role='alert']")).toBeNull();
  });

  it("passes cancellation to the port when the component unmounts", async () => {
    let signal: AbortSignal | undefined;
    const port = createPort({
      query: vi.fn((_input, nextSignal) => {
        signal = nextSignal;
        return new Promise<CustomWidgetRequestResult>(() => undefined);
      }),
    });
    await render(<SubFetch requestId="slow" />, port);
    await act(() => root.unmount());
    expect(signal?.aborted).toBe(true);
    root = createRoot(host);
  });

  it("confirms DELETE actions, reports success, and invalidates declared targets", async () => {
    const port = createPort();
    await render(<ActionButton requestId="remove">Remove</ActionButton>, port, [
      {
        id: "remove",
        kind: "action",
        method: "DELETE",
        trigger: "manual",
        minimumBoardPermission: "full",
        invalidates: ["parent"],
      },
    ]);
    await act(async () => (host.querySelector("button") as HTMLButtonElement).click());
    await settle();
    expect(port.confirm).toHaveBeenCalledOnce();
    expect(port.executeAction).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true }));
    expect(port.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "success" }));
    expect(port.invalidate).toHaveBeenCalledWith(expect.objectContaining({ targets: ["parent"] }));
  });

  it("rolls a toggle back when its action fails", async () => {
    const port = createPort({
      executeAction: vi.fn(async () => ({ ok: false, status: 500, data: null, error: "Nope" })),
    });
    await render(<ToggleSwitch requestId="toggle" onParams={{ enabled: true }} offParams={{ enabled: false }} />, port);
    const input = host.querySelector("input") as HTMLInputElement;
    await act(async () => {
      input.click();
    });
    await settle();
    expect(input.checked).toBe(false);
    expect(port.notify).toHaveBeenCalledWith(expect.objectContaining({ kind: "error", message: "Nope" }));
    expect(port.invalidate).not.toHaveBeenCalled();
  });

  it("confirms a DELETE toggle before executing it", async () => {
    const port = createPort();
    await render(
      <ToggleSwitch requestId="delete-toggle" onParams={{ enabled: true }} offParams={{ enabled: false }} />,
      port,
      [
        {
          id: "delete-toggle",
          kind: "action",
          method: "DELETE",
          trigger: "manual",
          minimumBoardPermission: "full",
        },
      ],
    );
    await act(async () => (host.querySelector("input") as HTMLInputElement).click());
    await settle();
    expect(port.confirm).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    expect(port.executeAction).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true }));
  });
});
