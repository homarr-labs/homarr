// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ActionButton,
  CustomJsxRenderer,
  CustomWidgetRuntimeProvider,
  parseRequestCapabilities,
  RefreshButton,
  SubFetch,
  ToggleSwitch,
} from "../runtime";
import { createCustomJsxComponents } from "../jsx";
import { MAX_REFRESH_INTERVAL_MS, MAX_REFRESH_INTERVAL_SECONDS, normalizeRefreshInterval } from "../runtime/sub-fetch";
import type {
  CustomJsxRendererMessages,
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

const rendererMessages = {
  noTemplate: "No template",
  templateWarnings: (count: number) => `${count} warnings`,
  bindingTypeConflict: (name: string, firstType: string, secondType: string) =>
    `Input ${name} conflicts between ${firstType} and ${secondType}`,
} satisfies CustomJsxRendererMessages;

it("normalizes request capabilities and drops malformed entries", () => {
  expect(
    parseRequestCapabilities([
      {
        id: "approve",
        kind: "action",
        method: "POST",
        trigger: "manual",
        minimumBoardPermission: "modify",
        confirmation: { title: "Approve", message: "Approve this request?" },
        invalidates: ["queue", 3],
      },
      {
        id: "malformed-confirmation",
        kind: "action",
        method: "POST",
        minimumBoardPermission: "modify",
        confirmation: { title: 3, message: "Approve this request?" },
      },
      { id: "unsafe", kind: "action", method: "TRACE", minimumBoardPermission: "full" },
    ]),
  ).toEqual([
    {
      id: "approve",
      kind: "action",
      method: "POST",
      trigger: "manual",
      minimumBoardPermission: "modify",
      confirmation: { title: "Approve", message: "Approve this request?" },
      invalidates: ["queue"],
    },
    {
      id: "malformed-confirmation",
      kind: "action",
      method: "POST",
      trigger: "manual",
      minimumBoardPermission: "modify",
      confirmation: undefined,
      invalidates: [],
    },
  ]);
});

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
  options?: { queryCacheKey?: string; queryClient?: QueryClient },
) {
  const queryClient = options?.queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root.render(
      <MantineProvider>
        <QueryClientProvider client={queryClient}>
          <CustomWidgetRuntimeProvider
            itemId="item-1"
            queryCacheKey={options?.queryCacheKey}
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
  it("clamps refresh intervals below the browser timer overflow boundary", () => {
    expect(normalizeRefreshInterval(MAX_REFRESH_INTERVAL_SECONDS)).toBe(MAX_REFRESH_INTERVAL_MS);
    expect(normalizeRefreshInterval(MAX_REFRESH_INTERVAL_SECONDS + 1)).toBe(MAX_REFRESH_INTERVAL_MS);
    expect(normalizeRefreshInterval(Number.MAX_VALUE)).toBe(MAX_REFRESH_INTERVAL_MS);
    expect(MAX_REFRESH_INTERVAL_MS).toBeLessThan(2 ** 31 - 1);
  });

  it("routes binding-construction failures through the runtime error display", async () => {
    await render(
      <CustomJsxRenderer
        template="<Text>Safe</Text>"
        data={{}}
        components={{ Text: (() => null) as never }}
        createBindings={() => {
          throw new RangeError("Response data exceeded the depth limit");
        }}
        messages={rendererMessages}
      />,
      createPort(),
    );

    expect(host.textContent).toContain("RUNTIME_RENDER_ERROR");
    expect(host.textContent).toContain("Response data exceeded the depth limit");
  });

  it("renders common safe collection and number formatting operations", async () => {
    const components = createCustomJsxComponents({
      TablerIcon: (() => null) as never,
      copyLabels: { copy: "Copy", copied: "Copied" },
    });
    await render(
      <CustomJsxRenderer
        template={
          '<Text>{[1, 2].concat([3]).flatMap(value => [value]).map(value => value.toLocaleString()).join(" · ")}</Text>'
        }
        data={{}}
        components={components}
        createBindings={() => ({})}
        messages={rendererMessages}
      />,
      createPort(),
    );
    expect(host.textContent).toContain("1 · 2 · 3");
  });

  it("removes unsafe dynamic link targets at runtime", async () => {
    const components = createCustomJsxComponents({
      TablerIcon: (() => null) as never,
      copyLabels: { copy: "Copy", copied: "Copied" },
    });
    await render(
      <CustomJsxRenderer
        template={"<Anchor href={data.url}>Unsafe</Anchor>"}
        data={{ url: "//example.com/escape" }}
        components={components}
        createBindings={(data) => ({ data })}
        messages={rendererMessages}
      />,
      createPort(),
    );

    expect(host.querySelector("a")?.hasAttribute("href")).toBe(false);
  });

  it("scopes authored radio names to the widget and preserves uncontrolled defaults", async () => {
    const components = createCustomJsxComponents({
      TablerIcon: (() => null) as never,
      copyLabels: { copy: "Copy", copied: "Copied" },
    });
    await render(
      <>
        <input aria-label="Outside" name="shared" type="radio" />
        <CustomJsxRenderer
          template={
            '<Radio.Group name="shared" defaultValue="inside"><Radio.Card value="inside"><Radio.Indicator /></Radio.Card><Radio.Card value="other"><Radio.Indicator /></Radio.Card></Radio.Group>'
          }
          data={{}}
          components={components}
          createBindings={() => ({})}
          messages={rendererMessages}
        />
      </>,
      createPort(),
    );
    await settle();

    const outside = host.querySelector<HTMLInputElement>('input[type="radio"]');
    const [inside, other] = [...host.querySelectorAll<HTMLButtonElement>('button[role="radio"]')];
    expect(outside?.name).toBe("shared");
    expect(inside?.name).toMatch(/^custom-widget-/u);
    expect(inside?.name).not.toBe(outside?.name);
    expect(other?.name).toBe(inside?.name);
    expect(inside?.getAttribute("aria-checked")).toBe("true");
    expect(other?.getAttribute("aria-checked")).toBe("false");
  });

  it("exposes temporary bindings through inputs without browser storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
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

  it("preserves input focus across temporary binding updates", async () => {
    const components = createCustomJsxComponents({
      TablerIcon: (() => null) as never,
      copyLabels: { copy: "Copy", copied: "Copied" },
    });
    await render(
      <CustomJsxRenderer
        template={'<Stack><TextInput bind="search"/><Text>{inputs.search}</Text></Stack>'}
        data={{}}
        components={components}
        createBindings={() => ({})}
        messages={rendererMessages}
      />,
      createPort(),
    );
    await settle();

    const input = host.querySelector("input") as HTMLInputElement;
    input.focus();
    await act(async () => {
      input.value = "p";
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "p", inputType: "insertText" }));
    });
    await settle();

    expect(input.isConnected).toBe(true);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("p");
    expect(host.textContent).toContain("p");
  });

  it("resets a dependent binding when its scalar reset key changes", async () => {
    const query = vi.fn<CustomWidgetRuntimePort["query"]>(async () => ({
      ok: true,
      status: 200,
      data: { name: "The Matrix" },
    }));
    const components = createCustomJsxComponents({
      TablerIcon: (() => null) as never,
      copyLabels: { copy: "Copy", copied: "Copied" },
    });
    await render(
      <CustomJsxRenderer
        template={
          '<Stack><TextInput bind="search" defaultValue="matrix" placeholder="Search"/><Pagination bind="page" resetKey={inputs.search} defaultValue={1} total={5}/><Text>search:{inputs.search}</Text><Text>page:{inputs.page}</Text><SubFetch requestId="search" trigger="manual" params={{ query: inputs.search, page: inputs.page ?? 1 }}>{(result) => <Text>{result.name}</Text>}</SubFetch></Stack>'
        }
        data={{}}
        components={components}
        createBindings={() => ({})}
        messages={rendererMessages}
      />,
      createPort({ query }),
    );
    await settle();

    const pageThree = [...host.querySelectorAll("button")].find((button) => button.textContent === "3");
    expect(pageThree).toBeTruthy();
    await act(async () => pageThree?.click());
    await settle();
    expect(host.textContent).toContain("page:3");

    const input = host.querySelector('input[placeholder="Search"]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "s");
      input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "s", inputType: "insertText" }));
    });
    await settle();

    expect(input.value).toBe("s");
    expect(host.textContent).toContain("search:s");
    expect(host.textContent).toContain("page:1");
    expect(query).not.toHaveBeenCalled();

    const load = [...host.querySelectorAll("button")].find((button) => button.textContent === "Load");
    expect(load).toBeTruthy();
    await act(async () => load?.click());
    await settle();

    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[0]).toMatchObject({
      requestId: "search",
      params: { query: "s", page: 1 },
    });
  });

  it("resets temporary bindings when the template changes", async () => {
    const components = createCustomJsxComponents({
      TablerIcon: (() => null) as never,
      copyLabels: { copy: "Copy", copied: "Copied" },
    });

    await render(
      <CustomJsxRenderer
        template={'<Stack><TextInput bind="shared" defaultValue="text"/><Text>{inputs.shared}</Text></Stack>'}
        data={{}}
        components={components}
        createBindings={() => ({})}
        messages={rendererMessages}
      />,
      createPort(),
    );
    await settle();
    expect(host.textContent).toContain("text");

    await render(
      <CustomJsxRenderer
        template={
          '<Stack><Switch bind="shared" defaultChecked/><Text>{inputs.shared ? "enabled" : "disabled"}</Text></Stack>'
        }
        data={{}}
        components={components}
        createBindings={() => ({})}
        messages={rendererMessages}
      />,
      createPort(),
    );
    await settle();
    expect(host.textContent).toContain("enabled");
    expect(host.textContent).not.toContain("BINDING_TYPE_CONFLICT");
  });

  it("preserves temporary bindings when data changes without changing the template", async () => {
    const components = createCustomJsxComponents({
      TablerIcon: (() => null) as never,
      copyLabels: { copy: "Copy", copied: "Copied" },
    });
    const template = '<Stack><Switch bind="shared"/><Text>{inputs.shared ? "enabled" : "disabled"}</Text></Stack>';

    await render(
      <CustomJsxRenderer
        template={template}
        data={{ version: 1 }}
        components={components}
        createBindings={(data) => ({ data })}
        messages={rendererMessages}
      />,
      createPort(),
    );
    await settle();
    await act(async () => (host.querySelector("input") as HTMLInputElement).click());
    await settle();
    expect(host.textContent).toContain("enabled");

    await render(
      <CustomJsxRenderer
        template={template}
        data={{ version: 2 }}
        components={components}
        createBindings={(data) => ({ data })}
        messages={rendererMessages}
      />,
      createPort(),
    );
    await settle();
    expect((host.querySelector("input") as HTMLInputElement).checked).toBe(true);
    expect(host.textContent).toContain("enabled");
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

  it("does not reuse a query result after the effective definition changes", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const port = createPort();
    await render(<SubFetch requestId="details" />, port, [], undefined, { queryCacheKey: "definition-a", queryClient });
    await settle();
    await render(<SubFetch requestId="details" />, port, [], undefined, { queryCacheKey: "definition-b", queryClient });
    await settle();

    expect(port.query).toHaveBeenCalledTimes(2);
  });

  it("uses a built-in manual trigger and passes successful request metadata to children", async () => {
    const port = createPort();
    await render(
      <SubFetch requestId="details" trigger="manual">
        {(data, metadata) => (
          <span>{`${(data as { name: string }).name}:${metadata.status}:${String(metadata.loading)}`}</span>
        )}
      </SubFetch>,
      port,
    );
    expect(port.query).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Load");

    await act(async () => (host.querySelector("button") as HTMLButtonElement).click());
    await settle();

    expect(port.query).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("Bulbasaur:200:false");
  });

  it("reruns a successful manual query through a targeted refresh button", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const query = vi.fn<CustomWidgetRuntimePort["query"]>(async () => ({
      ok: true,
      status: 200,
      data: { name: "Bulbasaur" },
    }));
    const invalidate = vi.fn<CustomWidgetRuntimePort["invalidate"]>(async ({ itemId, targets }) => {
      await queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          queryKey[0] === "custom-widget" &&
          queryKey[1] === "item" &&
          queryKey[2] === itemId &&
          (targets.includes("*") || targets.includes(String(queryKey[3]))),
      });
    });
    const port = createPort({ query, invalidate });
    await render(
      <SubFetch requestId="details" trigger="manual">
        {(data) => (
          <span>
            {(data as { name: string }).name}
            <RefreshButton requestId="details" label="Run details again" />
          </span>
        )}
      </SubFetch>,
      port,
      [],
      undefined,
      { queryClient },
    );

    await act(async () => (host.querySelector("button") as HTMLButtonElement).click());
    await settle();
    expect(query).toHaveBeenCalledOnce();

    const rerun = host.querySelector('button[aria-label="Run details again"]') as HTMLButtonElement;
    await act(async () => rerun.click());
    await settle();

    expect(invalidate).toHaveBeenCalledWith(expect.objectContaining({ targets: ["details"] }));
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("keeps an untargeted refresh global", async () => {
    const port = createPort();
    await render(<RefreshButton label="Refresh all" />, port);

    await act(async () => (host.querySelector("button") as HTMLButtonElement).click());
    await settle();

    expect(port.invalidate).toHaveBeenCalledWith(expect.objectContaining({ targets: ["parent", "*"] }));
  });

  it("returns to the manual trigger without fetching or showing stale results when params change", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const port = createPort();
    const renderSearch = (query: string) =>
      render(
        <SubFetch requestId="details" trigger="manual" params={{ query }}>
          {(data) => <span>{(data as { name: string }).name}</span>}
        </SubFetch>,
        port,
        [],
        undefined,
        { queryClient },
      );

    await renderSearch("bulbasaur");
    await act(async () => (host.querySelector("button") as HTMLButtonElement).click());
    await settle();
    expect(host.textContent).toContain("Bulbasaur");

    await renderSearch("ivysaur");
    await settle();

    expect(port.query).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("Load");
    expect(host.textContent).not.toContain("Bulbasaur");
  });

  it("keeps manual query results local instead of publishing a shared request slot", async () => {
    const port = createPort();
    const publish = vi.fn();
    await render(
      <SubFetch requestId="details" trigger="manual" triggerContent={<span>Bulbasaur card</span>}>
        {(data) => <span>{(data as { name: string }).name}</span>}
      </SubFetch>,
      port,
      [],
      publish,
    );

    await act(async () => (host.querySelector("button") as HTMLButtonElement).click());
    await settle();

    expect(port.query).toHaveBeenCalledOnce();
    expect(publish).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Bulbasaur");
  });

  it("runs a manual query from a custom accessible trigger", async () => {
    const port = createPort();
    await render(
      <SubFetch
        requestId="details"
        trigger="manual"
        triggerAriaLabel="Open Bulbasaur"
        triggerContent={<span>Bulbasaur card</span>}
      >
        {(data) => <span>{(data as { name: string }).name}</span>}
      </SubFetch>,
      port,
    );

    const trigger = host.querySelector("button") as HTMLButtonElement;
    expect(trigger.getAttribute("aria-label")).toBe("Open Bulbasaur");
    expect(host.textContent).toContain("Bulbasaur card");
    await act(async () => trigger.click());
    await settle();

    expect(port.query).toHaveBeenCalledOnce();
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
    await render(
      <ToggleSwitch requestId="toggle" enabledParams={{ enabled: true }} disabledParams={{ enabled: false }} />,
      port,
    );
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
      <ToggleSwitch requestId="delete-toggle" enabledParams={{ enabled: true }} disabledParams={{ enabled: false }} />,
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
