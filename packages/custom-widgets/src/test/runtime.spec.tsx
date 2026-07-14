// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ActionButton, CustomWidgetRuntimeProvider, SubFetch, ToggleSwitch } from "../runtime";
import type {
  CustomJsxRequestCapability,
  CustomWidgetRequestResult,
  CustomWidgetRuntimeMessages,
  CustomWidgetRuntimePort,
} from "../runtime";

const messages: CustomWidgetRuntimeMessages = {
  migrationRequired: "Migration required",
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
  it("runs an automatic query once and exposes data to a render child", async () => {
    const port = createPort();
    await render(
      <SubFetch requestId="details" render={(data) => <span>{(data as { name: string }).name}</span>} />,
      port,
    );
    await settle();
    expect(port.query).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("Bulbasaur");
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
    await render(<ActionButton requestId="remove" label="Remove" invalidate={["parent"]} />, port, [
      { id: "remove", kind: "action", method: "DELETE", minimumBoardPermission: "full" },
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
});
