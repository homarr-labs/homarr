import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement, memo, useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as interpreter from "__ROOT__/packages/custom-widgets/src/jsx/interpreter";
import { createCustomJsxBindings } from "__ROOT__/packages/custom-widgets/src/jsx/bindings";
import { createCustomJsxComponents } from "__ROOT__/packages/custom-widgets/src/jsx/runtime-components";
import { CustomJsxRenderer } from "__ROOT__/packages/custom-widgets/src/runtime/custom-jsx-renderer";
import {
  CustomWidgetRuntimeProvider,
  useCustomWidgetRuntime,
} from "__ROOT__/packages/custom-widgets/src/runtime/context";
import { BUNDLED_CUSTOM_WIDGETS } from "__ROOT__/packages/custom-widgets/src/core/bundled-widgets";
import CustomJsxDisplay from "__ROOT__/packages/widgets/src/custom-api/custom-jsx-display";
const label = process.env.LABEL;
const { renderSafeJsx, createSafeJsxRenderer } = interpreter;
const stats = (values) => {
  const ordered = [...values].sort((a, b) => a - b);
  return {
    median: ordered[Math.floor(ordered.length / 2)],
    p95: ordered[Math.floor(ordered.length * 0.95)],
    samples: values,
  };
};
const record = (name, value) => console.log(JSON.stringify({ label, name, ...value }));
const counts = () => {
  const previous = globalThis.__cw.counts;
  globalThis.__cw.counts = {};
  return previous;
};
function bench(name, callback, iterations = 300, warmup = 60) {
  for (let i = 0; i < warmup; i++) callback();
  counts();
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    callback();
    samples.push(performance.now() - start);
  }
  record(name, { ms: stats(samples), iterations, counts: counts() });
}
const rows = Array.from({ length: 2000 }, (_, index) => ({
  id: index,
  name: `Server ${index}`,
  value: index % 100,
  enabled: index % 2 === 0,
  details: { region: "EU", label: `Server status ${index}` },
}));
const payload = { first: { rows }, second: { value: 1 } };
const stub = (props) => createElement("span", null, props.children);
const simpleComponents = Object.fromEntries(
  ["Stack", "Text", "Box", "Badge", "Icon", "TablerIcon", "SubFetch"].map((name) => [name, stub]),
);
const list =
  "<Stack>{data.first.rows.filter(row => row.enabled).slice(0, 100).sort((left, right) => right.value - left.value).map(row => <Text key={row.id}>{row.name}: {row.value}</Text>)}</Stack>";
const staticTemplate = `<Stack>${Array.from({ length: 300 }, (_, i) => `<Text>${i}</Text>`).join("")}</Stack>`;
const messages = {
  noTemplate: "Empty",
  templateWarnings: (count) => `${count} warnings`,
  bindingTypeConflict: (name) => name,
};
const runtimeMessages = Object.fromEntries(
  [
    "requestIdRequired",
    "unsavedPreview",
    "invalidParams",
    "loadRequest",
    "requestFailed",
    "loading",
    "retry",
    "widgetItemUnavailable",
    "actionsDisabledEditMode",
    "actionSimulated",
    "actionCompleted",
    "confirmDelete",
    "toggle",
    "refresh",
  ].map((value) => [value, value]),
);
const capabilities = [];
const port = {
  query: async () => ({ ok: true, status: 200, data: { value: 1 } }),
  executeAction: async () => ({ ok: true, status: 200, data: null }),
  invalidate: async () => {},
  confirm: async () => true,
  notify: () => {},
};
function prepare(template) {
  if (createSafeJsxRenderer) return createSafeJsxRenderer(template);
  return (options) => renderSafeJsx({ template, ...options });
}
export async function run() {
  const bindings = { ...createCustomJsxBindings(payload), status: {}, options: {}, inputs: {} };
  bench("sanitize-2000-rows", () => createCustomJsxBindings(payload));
  bench("sanitize-small", () => createCustomJsxBindings({ value: 1 }), 1000);
  for (const [name, template] of [
    ["static-300", staticTemplate],
    ["filter-sort-map-2000", list],
    ["deep-24", "<Box>".repeat(24) + "<Text>Leaf</Text>" + "</Box>".repeat(24)],
    ["icons-300", `<Stack>${'<Icon name="server" />'.repeat(300)}</Stack>`],
    [
      "subfetch-100",
      `<Stack>${Array.from({ length: 100 }, (_, i) => `<SubFetch requestId="request${i}">{result => <Text>{result.value}</Text>}</SubFetch>`).join("")}</Stack>`,
    ],
  ]) {
    const renderer = prepare(template);
    bench(`interpreter-${name}`, () => renderer({ components: simpleComponents, bindings }));
  }
  for (const { id, widget } of BUNDLED_CUSTOM_WIDGETS) {
    const renderer = prepare(widget.template);
    const options = Object.fromEntries(
      Object.entries(widget.options ?? {}).map(([key, value]) => [key, value.default]),
    );
    const availableComponents = new Proxy(simpleComponents, { get: (target, key) => target[key] ?? stub });
    bench(
      `bundled-${id}`,
      () =>
        renderer({
          components: availableComponents,
          bindings: {
            ...bindings,
            data: {
              pokemon: { count: 2000, results: [{ name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" }] },
              fact: { data: [{ attributes: { body: "Dogs are good" } }] },
              rates: { rates: { USD: 1.1, EUR: 1 }, date: "2026-10-24" },
              forecast: {
                current: { temperature_2m: 20, apparent_temperature: 19, wind_speed_10m: 5 },
                daily: {
                  time: ["2026-10-24"],
                  temperature_2m_max: [22],
                  temperature_2m_min: [14],
                  precipitation_probability_max: [20],
                },
              },
            },
            options,
          },
        }),
      100,
    );
  }
  bench(
    "dates-explicit-zone-100",
    () =>
      renderSafeJsx({
        template:
          '<Text>{Array.from({length:100}).map((value, index) => Date.toLocaleString(1760000000000 + index, "en-US", "UTC")).join(",")}</Text>',
        components: simpleComponents,
        bindings,
      }),
    50,
    10,
  );
  bench(
    "array-from-2000",
    () =>
      renderSafeJsx({
        template: "<Text>{Array.from({length:2000}).length}</Text>",
        components: simpleComponents,
        bindings,
      }),
    100,
  );
  bench(
    "array-from-100000",
    () =>
      renderSafeJsx({
        template: "<Text>{Array.from({length:100000}).length}</Text>",
        components: simpleComponents,
        bindings,
      }),
    100,
    20,
  );
  if (global.gc) {
    global.gc();
    const start = process.memoryUsage().heapUsed;
    for (let i = 0; i < 20; i++) createCustomJsxBindings(payload);
    const delta = process.memoryUsage().heapUsed - start;
    global.gc();
    record("sanitize-memory", {
      heapDelta20: delta,
      retainedAfterGc: process.memoryUsage().heapUsed - start,
      payloadBytes: JSON.stringify(payload).length,
    });
  }
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  for (const name of [
    "window",
    "document",
    "HTMLElement",
    "Element",
    "Node",
    "Event",
    "MouseEvent",
    "getComputedStyle",
  ])
    Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true, writable: true });
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
  globalThis.cancelAnimationFrame = clearTimeout;
  window.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const wrap = (node) =>
    createElement(MantineProvider, null, createElement(QueryClientProvider, { client: queryClient }, node));
  let updateNode;
  function FixtureHost() {
    const [node, setNode] = useState(null);
    updateNode = setNode;
    return node;
  }
  await act(async () => root.render(wrap(createElement(FixtureHost))));
  async function render(node) {
    await act(async () => updateNode(node));
  }
  async function measure(name, makeNode, updates = 20) {
    await render(null);
    await render(makeNode(-1));
    for (let index = 0; index < 5; index++) await render(makeNode(-2 - index));
    counts();
    const samples = [];
    for (let index = 0; index < updates; index++) {
      const start = performance.now();
      await render(makeNode(index));
      samples.push(performance.now() - start);
    }
    assert(!host.textContent.includes("RUNTIME_RENDER_ERROR"), host.textContent.slice(0, 400));
    record(name, { ms: stats(samples), updates, counts: counts(), domNodes: host.querySelectorAll("*").length });
  }
  const componentMap = createCustomJsxComponents({ TablerIcon: stub, copyLabels: { copy: "Copy", copied: "Copied" } });
  const data = payload;
  const status = { first: { ok: true }, second: { ok: true } };
  const options = { label: "Initial" };
  const renderProps = {
    template:
      "<Stack><Text>{options.label}</Text>{data.first.rows.slice(0, 50).map(row => <Text key={row.id}>{row.name}</Text>)}</Stack>",
    data,
    status,
    options,
    components: componentMap,
    createBindings: createCustomJsxBindings,
    messages,
  };
  await measure("renderer-stable-parent", () => createElement(CustomJsxRenderer, renderProps));
  await measure("renderer-options-only", (index) =>
    createElement(CustomJsxRenderer, { ...renderProps, options: { label: `Value ${index}` } }),
  );
  await measure("renderer-status-only", (index) =>
    createElement(CustomJsxRenderer, { ...renderProps, status: { first: { ok: true, status: index } } }),
  );
  await measure("renderer-one-request-replacement", (index) =>
    createElement(CustomJsxRenderer, { ...renderProps, data: { ...data, second: { value: index } } }),
  );
  const displayData = {
    ...data,
    template: `<Stack>${"<Text>Static</Text>".repeat(40)}${'<Icon name="server"/>'.repeat(8)}<RefreshButton/><ActionButton requestId="action"/><ToggleSwitch requestId="action"/><SubFetch requestId="details" trigger="manual"/></Stack>`,
    data,
    status,
    options,
    widgetDefinitionId: "definition",
    widgetItemId: "widget-1",
    queriesDisabled: true,
  };
  await measure("adapter-stable-parent", () => createElement(CustomJsxDisplay, { data: { ...displayData } }));
  const iconData = { ...displayData, data: {}, template: `<Stack>${'<Icon name="server"/>'.repeat(300)}</Stack>` };
  await measure("adapter-300-icons-status-only", (index) =>
    createElement(CustomJsxDisplay, { data: { ...iconData, status: { changed: index } } }),
  );
  const helperData = {
    ...displayData,
    template: `<Stack>${Array.from({ length: 30 }, (_, index) => `<RefreshButton/><ActionButton requestId="action${index}"/><ToggleSwitch requestId="action${index}"/><SubFetch requestId="query${index}" trigger="manual"/>`).join("")}</Stack>`,
  };
  await measure(
    "adapter-120-helpers-stable-parent",
    () => createElement(CustomJsxDisplay, { data: { ...helperData } }),
    10,
  );
  const boardData = Array.from({ length: 20 }, (_, index) => ({
    ...displayData,
    widgetItemId: `board-widget-${index}`,
  }));
  const board = () =>
    createElement(
      "div",
      null,
      boardData.map((value) => createElement(CustomJsxDisplay, { key: value.widgetItemId, data: { ...value } })),
    );
  await measure("board-20-stable-parent", board, 10);
  await render(null);
  await render(board());
  counts();
  const samples = [];
  for (let index = 0; index < 20; index++) {
    const start = performance.now();
    await act(async () =>
      globalThis.__cw.publish["board-widget-0"]("details", {
        data: { value: index },
        status: { loading: false, ok: true, status: 200 },
      }),
    );
    samples.push(performance.now() - start);
  }
  record("board-20-one-widget-publish", { ms: stats(samples), updates: 20, counts: counts() });
  const largeDisplay = { ...displayData, data: payload };
  await render(null);
  await render(createElement(CustomJsxDisplay, { data: largeDisplay }));
  const publishedData = { value: "stable result" };
  await act(async () =>
    globalThis.__cw.publish["widget-1"]("details", {
      data: publishedData,
      status: { loading: false, ok: true, status: 200 },
    }),
  );
  counts();
  const publishTimes = [];
  for (let index = 0; index < 20; index++) {
    const start = performance.now();
    await act(async () =>
      globalThis.__cw.publish["widget-1"]("details", {
        data: publishedData,
        status: { loading: false, ok: true, status: index },
      }),
    );
    publishTimes.push(performance.now() - start);
  }
  record("adapter-published-status-only-2000-rows", { ms: stats(publishTimes), updates: 20, counts: counts() });
  const scopeData = {
    ...displayData,
    template:
      '<Stack><Text>{data.details?.value ?? "base"}</Text><Text>{status.details?.status ?? 0}</Text><Text>{options.label}</Text></Stack>',
  };
  await render(null);
  await render(createElement(CustomJsxDisplay, { data: scopeData }));
  await act(async () =>
    globalThis.__cw.publish["widget-1"]("details", {
      data: { value: "published" },
      status: { loading: false, ok: true, status: 201 },
    }),
  );
  assert(host.textContent.includes("published") && host.textContent.includes("201"));
  await act(async () => globalThis.__cw.publish["widget-1"]("details", null));
  assert(host.textContent.includes("base") && !host.textContent.includes("published"));
  await act(async () =>
    globalThis.__cw.publish["widget-1"]("details", {
      data: { value: "old scope" },
      status: { loading: false, ok: true, status: 202 },
    }),
  );
  await render(createElement(CustomJsxDisplay, { data: { ...scopeData, queryCacheKey: "new-scope" } }));
  assert(!host.textContent.includes("old scope") && host.textContent.includes("base"));
  record("publication-scope-validation", { passed: 3 });
  const actionData = {
    ...displayData,
    queriesDisabled: false,
    template: '<ActionButton requestId="action" confirmMessage="Confirm?">Run action</ActionButton>',
  };
  await render(null);
  await render(createElement(CustomJsxDisplay, { data: actionData }));
  await render(createElement(CustomJsxDisplay, { data: { ...actionData } }));
  await act(async () => host.querySelector("button").click());
  assert.equal(globalThis.__cw.confirmVersion, globalThis.__cw.confirmExpectedVersion);
  record("confirmation-callback-freshness", { passed: 1 });
  const queryWidgetId = "query-grid";
  const queryTemplate = `<Stack>${Array.from({ length: 50 }, (_, index) => `<SubFetch requestId="q${index}">{result => <Text>{result.value}</Text>}</SubFetch>`).join("")}</Stack>`;
  const queryKey = (index) => ["custom-widget", "item", queryWidgetId, `q${index}`, "{}", undefined];
  for (let index = 0; index < 50; index++)
    queryClient.setQueryData(queryKey(index), { ok: true, status: 200, data: { value: `initial-${index}` } });
  await render(null);
  await render(
    createElement(CustomJsxDisplay, {
      data: { ...displayData, template: queryTemplate, widgetItemId: queryWidgetId, queriesDisabled: false },
    }),
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  counts();
  const queryTimes = [];
  for (let index = 0; index < 10; index++) {
    const start = performance.now();
    await act(async () => {
      queryClient.setQueryData(queryKey(0), { ok: true, status: 200, data: { value: `updated-${index}` } });
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
    queryTimes.push(performance.now() - start);
  }
  assert(host.textContent.includes("updated-9"));
  record("subfetch-50-one-query-update", {
    ms: stats(queryTimes),
    updates: 10,
    counts: counts(),
    note: "includes 5ms query notification settling per update",
  });
  const inputsProps = {
    ...renderProps,
    template: '<Stack><Switch bind="flag"/><Text>{inputs.flag ? "enabled" : "disabled"}</Text></Stack>',
  };
  await render(null);
  await render(createElement(CustomJsxRenderer, inputsProps));
  counts();
  for (let index = 0; index < 10; index++) {
    await act(async () => host.querySelector("input").click());
    assert(host.textContent.includes(index % 2 === 0 ? "enabled" : "disabled"));
  }
  record("renderer-input-updates", { updates: 10, counts: counts() });
  let consumers = 0;
  const Consumer = memo(function Consumer() {
    useCustomWidgetRuntime();
    consumers++;
    return null;
  });
  const stableChildren = createElement(Consumer);
  await measure("runtime-provider-stable-parent", () =>
    createElement(
      CustomWidgetRuntimeProvider,
      { itemId: "item", isEditMode: false, requestCapabilities: capabilities, port, messages: runtimeMessages },
      stableChildren,
    ),
  );
  record("runtime-provider-consumer", { renders: consumers });
  await act(async () => root.unmount());
  queryClient.clear();
  dom.window.close();
}
