import { MantineProvider } from "@mantine/core";
import * as MantineCharts from "@mantine/charts";
import * as MantineCore from "@mantine/core";
import * as MantineDates from "@mantine/dates";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import type { Root } from "react-dom/client";

import { customJsxComponentRegistry, enabledCustomJsxComponents } from "@homarr/custom-widgets/catalog";
import {
  BUNDLED_CUSTOM_WIDGETS,
  customJsxExamples,
  customJsxTablerIconNames,
  getCustomWidgetDefaultOptions,
} from "@homarr/custom-widgets/core";
import { renderSafeJsx, SafeJsxError, sanitizeCustomJsxProps } from "@homarr/custom-widgets/jsx";

import CustomJsxDisplay from "./custom-jsx-display";
import { createCustomWidgetComponents, SAFE_BINDINGS } from "./jsx-components";
import { SAFE_TABLER_ICON_NAMES } from "./jsx-icon-adapter";

const CUSTOM_WIDGET_COMPONENTS = createCustomWidgetComponents({ copy: "Copy", copied: "Copied" });

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string, params?: Record<string, string>) =>
    key === "templateWarnings" ? `${params?.count ?? "0"} template warning(s):` : key,
}));

const isComponentLikeExport = ([name, value]: [string, unknown]): boolean => {
  if (!/^[A-Z][A-Za-z0-9]*$/.test(name) || name.endsWith("Context")) return false;
  if (typeof value === "function") return true;
  if (!value || typeof value !== "object") return false;
  const reactType = (value as { $$typeof?: unknown }).$$typeof;
  return reactType === Symbol.for("react.forward_ref") || reactType === Symbol.for("react.memo");
};

describe("CustomJsxDisplay", () => {
  it("keeps safe Tabler icon metadata synchronized with the runtime", () => {
    expect(SAFE_TABLER_ICON_NAMES).toEqual(customJsxTablerIconNames);
  });

  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, writable: true });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    Object.defineProperty(globalThis, "ResizeObserver", {
      writable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
  });

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove();
  });

  const renderDisplay = async (data: Record<string, unknown>) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await act(async () => {
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(QueryClientProvider, { client: queryClient }, createElement(CustomJsxDisplay, { data })),
        ),
      );
    });
  };

  it("renders Mantine components with data bindings", async () => {
    await renderDisplay({
      template: "<Stack><Title order={3}>{data.name}</Title><Badge>{data.count}</Badge></Stack>",
      data: { name: "Server A", count: "3" },
    });

    expect(container.textContent).toContain("Server A");
    expect(container.textContent).toContain("3");
  });

  it("keeps runtime components inside an inert provider before a preview session exists", async () => {
    await renderDisplay({ template: '<RefreshButton label="Refresh" />', data: {} });

    expect(container.querySelector('button[aria-label="Refresh"]')).not.toBeNull();
    expect(container.textContent).not.toContain("RUNTIME_RENDER_ERROR");
    expect(container.querySelector("button")?.disabled).toBe(true);
  });

  it("renders the bundled Pokédex list without a widget-wide runtime failure", async () => {
    const pokedex = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-pokedex")?.widget;
    expect(pokedex).toBeDefined();
    await renderDisplay({
      template: pokedex?.template,
      data: {
        pokemon: {
          count: 2,
          results: [
            { name: "bulbasaur", url: "https://pokeapi.co/api/v2/pokemon/1/" },
            { name: "pikachu", url: "https://pokeapi.co/api/v2/pokemon/25/" },
          ],
        },
      },
      status: { pokemon: { loading: false, ok: true, status: 200 } },
      options: getCustomWidgetDefaultOptions(pokedex?.options ?? {}),
    });

    expect(container.textContent).toContain("bulbasaur");
    expect(container.textContent).toContain("pikachu");
    expect(
      container.querySelector('img[src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/1.png"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('img[src="https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/25.png"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll("img.mantine-Image-root")).toHaveLength(2);
    expect(container.querySelectorAll(".mantine-Card-root")).toHaveLength(2);
    expect(container.textContent).not.toContain("RUNTIME_RENDER_ERROR");
  });

  it("recovers when preview data arrives after an initial render error", async () => {
    const template = "<Stack>{data.items.map((item) => <Text key={item}>{item}</Text>)}</Stack>";
    await renderDisplay({ template, data: {} });
    expect(container.textContent).toContain("RUNTIME_RENDER_ERROR");

    await act(async () => {
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(CustomJsxDisplay, { data: { template, data: { items: ["Bulbasaur", "Pikachu"] } } }),
        ),
      );
    });

    expect(container.textContent).toContain("Bulbasaur");
    expect(container.textContent).toContain("Pikachu");
    expect(container.textContent).not.toContain("RUNTIME_RENDER_ERROR");
  });

  it("blocks script tags and event handlers", async () => {
    await renderDisplay({
      template: '<script>document.title = "hacked"</script><button onClick={() => {}}>Click</button><Text>Safe</Text>',
      data: {},
    });

    expect(document.title).not.toBe("hacked");
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("Safe");
  });

  it("supports bounded collection callbacks and safe string helpers", async () => {
    await renderDisplay({
      template:
        '<Stack>{data.items.filter((item) => item.enabled).slice(0, 2).map((item, i) => <Text key={i}>{String(i + 1) + ". " + item.name.toUpperCase()}</Text>)}</Stack>',
      data: {
        items: [
          { name: "alpha", enabled: true },
          { name: "hidden", enabled: false },
          { name: "beta", enabled: true },
          { name: "gamma", enabled: true },
        ],
      },
    });

    expect(container.textContent).toContain("1. ALPHA");
    expect(container.textContent).toContain("2. BETA");
    expect(container.textContent).not.toContain("GAMMA");
  });

  it("blocks reflective properties assembled with string concatenation", async () => {
    await renderDisplay({
      template: '<Text>{data["con" + "structor"]}</Text>',
      data: { value: 1 },
    });

    expect(container.textContent).toContain("reflective property");
  });

  it.each([
    '<Text>{data["constr\\u0075ctor"]}</Text>',
    '<Text>{data["__pro" + "to__"]}</Text>',
    '<Text>{String["b" + "ind"](null)}</Text>',
    "<Text>{data.items.map.call(null, (item) => item)}</Text>",
    "<Text>{data.items.map.apply(null, [])}</Text>",
  ])("blocks Unicode, computed, and call/apply reflective escapes", (template) => {
    expect(() =>
      renderSafeJsx({
        template,
        components: { Text: (() => null) as never },
        bindings: SAFE_BINDINGS({ items: [1] }),
      }),
    ).toThrow(/reflective property/);
  });

  it("never resolves inherited data properties", () => {
    const inherited = Object.create({ secret: "leak" }) as Record<string, unknown>;
    inherited.visible = "safe";
    const bindings = SAFE_BINDINGS(inherited);
    const data = bindings.data as Record<string, unknown>;

    expect(data.visible).toBe("safe");
    expect(data.secret).toBeUndefined();
    expect(Object.getPrototypeOf(data)).toBeNull();
  });

  it("blocks direct global calls but allows benign text containing fetch", async () => {
    await renderDisplay({ template: "<Text>fetch is available through controlled requests</Text>", data: {} });
    expect(container.textContent).toContain("fetch is available through controlled requests");

    await act(async () => {
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(CustomJsxDisplay, { data: { template: '<Text>{fetch("/private")}</Text>', data: {} } }),
        ),
      );
    });
    expect(container.textContent).toContain("Unknown binding: fetch");
  });

  it("strips polymorphic, callback, unsafe URL, and escaping style props", () => {
    const props = sanitizeCustomJsxProps({
      component: "iframe",
      renderRoot: "iframe",
      withinPortal: true,
      onClick: () => undefined,
      href: "javascript:alert(1)",
      style: { position: "fixed", zIndex: 999_999, flex: 1, color: "red" },
    });

    expect(props).toEqual({ style: { flex: 1, color: "red" } });
  });

  it("enforces collection and template length budgets", () => {
    const bindings = SAFE_BINDINGS({ items: [1, 2, 3] });

    expect(() =>
      renderSafeJsx({
        template: "<Stack>{data.items.map((item) => <Text>{item}</Text>)}</Stack>",
        components: {
          Text: ((props: { children?: unknown }) => props.children) as never,
          Stack: (() => null) as never,
        },
        bindings,
        budgets: { maxCollectionItems: 2 },
      }),
    ).toThrow(/collection limit/);

    expect(() => renderSafeJsx({ template: " ".repeat(50_001), components: {}, bindings: {} })).toThrow(
      new SafeJsxError("Template exceeds the 50000 character limit"),
    );

    expect(() =>
      renderSafeJsx({
        template: '<Text>{"x".padStart(1000, "x")}</Text>',
        components: { Text: (() => null) as never },
        bindings: {},
        budgets: { maxStringLength: 10 },
      }),
    ).toThrow(/string length limit/);

    expect(() =>
      renderSafeJsx({
        template: "<B/>".repeat(10_000),
        components: { B: (() => null) as never },
        bindings: {},
      }),
    ).toThrow("Template exceeded the rendered node limit (10000)");
  });

  describe("safe bindings security", () => {
    it("exposes wrapper functions, not native constructors", () => {
      const bindings = SAFE_BINDINGS({ value: 7 });

      expect(typeof bindings.String).toBe("function");
      expect(bindings.String(42)).toBe("42");
      expect(typeof bindings.Number).toBe("function");
      expect(bindings.Number("42")).toBe(42);
      expect(typeof bindings.Boolean).toBe("function");
      expect(bindings.Boolean(1)).toBe(true);

      expect(bindings.String).not.toBe(String);
      expect(bindings.Number).not.toBe(Number);
      expect(bindings.Boolean).not.toBe(Boolean);
    });

    it("uses null-prototype objects for Math/JSON/Array/Object helpers", () => {
      const bindings = SAFE_BINDINGS({});

      expect(Object.getPrototypeOf(bindings.Math)).toBeNull();
      expect(Object.getPrototypeOf(bindings.JSON)).toBeNull();
      expect(Object.getPrototypeOf(bindings.Array)).toBeNull();
      expect(Object.getPrototypeOf(bindings.Object)).toBeNull();
    });

    it("sanitizes data to strip constructor/__proto__/prototype keys", () => {
      const maliciousData = {
        name: "safe",
        constructor: "should be stripped",
        __proto__: "should be stripped",
        prototype: "should be stripped",
        nested: {
          value: 1,
          constructor: "also stripped",
        },
        list: [{ constructor: "stripped", val: 2 }],
      };

      const bindings = SAFE_BINDINGS(maliciousData);
      const data = bindings.data as Record<string, unknown>;

      expect(data.name).toBe("safe");
      expect("constructor" in data).toBe(false);
      expect("__proto__" in data).toBe(false);
      expect("prototype" in data).toBe(false);

      const nested = data.nested as Record<string, unknown>;
      expect(nested.value).toBe(1);
      expect("constructor" in nested).toBe(false);

      const list = data.list as Array<Record<string, unknown>>;
      const firstItem = list[0] as Record<string, unknown>;
      expect(firstItem.val).toBe(2);
      expect("constructor" in firstItem).toBe(false);
    });

    it("data object has no prototype chain to Function", () => {
      const bindings = SAFE_BINDINGS({ value: 1 });
      const data = bindings.data as Record<string, unknown>;

      expect(Object.getPrototypeOf(data)).toBeNull();
      expect("constructor" in data).toBe(false);
    });

    it("does not expose eval, Function, fetch, window, document", () => {
      const bindings = SAFE_BINDINGS({});

      expect("eval" in bindings).toBe(false);
      expect("Function" in bindings).toBe(false);
      expect("fetch" in bindings).toBe(false);
      expect("window" in bindings).toBe(false);
      expect("document" in bindings).toBe(false);
    });

    it("Math helpers work correctly", () => {
      const bindings = SAFE_BINDINGS({});
      const math = bindings.Math as {
        round: (v: number) => number;
        floor: (v: number) => number;
        ceil: (v: number) => number;
        abs: (v: number) => number;
      };

      expect(math.round(3.7)).toBe(4);
      expect(math.floor(3.7)).toBe(3);
      expect(math.ceil(3.2)).toBe(4);
      expect(math.abs(-5)).toBe(5);
    });

    it("Date helpers only return primitives and getDay returns the weekday", () => {
      const bindings = SAFE_BINDINGS({});
      const date = bindings.Date as {
        create: (value: string) => number;
        getDay: (value: string) => number;
      };

      expect(typeof date.create("2024-01-07T12:00:00Z")).toBe("number");
      expect(date.getDay("2024-01-07T12:00:00Z")).toBe(0);
    });

    it("JSON.stringify works correctly", () => {
      const bindings = SAFE_BINDINGS({});
      const json = bindings.JSON as { stringify: (v: unknown) => string };

      expect(json.stringify({ a: 1 })).toBe('{"a":1}');
    });

    it("Object/Array helpers work correctly", () => {
      const bindings = SAFE_BINDINGS({});
      const obj = bindings.Object as {
        keys: (v: object) => string[];
        values: (v: object) => unknown[];
        entries: (v: object) => [string, unknown][];
      };
      const arr = bindings.Array as { isArray: (v: unknown) => boolean };

      expect(obj.keys({ a: 1, b: 2 })).toEqual(["a", "b"]);
      expect(obj.values({ a: 1 })).toEqual([1]);
      expect(arr.isArray([1, 2])).toBe(true);
      expect(arr.isArray("not array")).toBe(false);
    });
  });
});
describe("Custom JSX component registry", () => {
  it.each([
    ["@mantine/core", MantineCore],
    ["@mantine/charts", MantineCharts],
    ["@mantine/dates", MantineDates],
  ] as const)("classifies every component-like %s export", (packageName, moduleExports) => {
    const classified = new Set(
      customJsxComponentRegistry
        .filter((component) => component.package === packageName)
        .flatMap(({ name }) => [name, name.replaceAll(".", "")]),
    );
    const unclassified = Object.entries(moduleExports)
      .filter(isComponentLikeExport)
      .map(([name]) => name)
      .filter((name) => !classified.has(name));

    expect(unclassified, `Unclassified ${packageName} component exports`).toEqual([]);
  });

  it("has a runtime implementation for every enabled registry component", () => {
    const missing = enabledCustomJsxComponents
      .map(({ name }) => name)
      .filter((name) => !Object.hasOwn(CUSTOM_WIDGET_COMPONENTS, name));

    expect(missing, "Enabled components without a runtime implementation").toEqual([]);
  });
});

const renderTemplate = (template: string, data: Record<string, unknown> = {}) =>
  renderSafeJsx({ template, components: CUSTOM_WIDGET_COMPONENTS, bindings: SAFE_BINDINGS(data) });

describe("new collection/string methods", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove();
  });

  const renderAndGetText = async (template: string, data: Record<string, unknown> = {}) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(MantineProvider, null, createElement(CustomJsxDisplay, { data: { template, data } })));
    });
    return container.textContent ?? "";
  };

  it("find returns the first matching item", async () => {
    const text = await renderAndGetText(`<Text>{data.items.find((x) => x.id === 2).name}</Text>`, {
      items: [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ],
    });
    expect(text).toContain("b");
  });

  it("findIndex returns correct index", async () => {
    const text = await renderAndGetText(`<Text>{data.items.findIndex((x) => x > 5)}</Text>`, { items: [1, 3, 7, 9] });
    expect(text).toContain("2");
  });

  it("some returns boolean", async () => {
    const text = await renderAndGetText(`<Text>{data.items.some((x) => x > 5) ? "yes" : "no"}</Text>`, {
      items: [1, 2, 3],
    });
    expect(text).toContain("no");
  });

  it("every returns boolean", async () => {
    const text = await renderAndGetText(`<Text>{data.items.every((x) => x > 0) ? "all" : "nope"}</Text>`, {
      items: [1, 2, 3],
    });
    expect(text).toContain("all");
  });

  it("sort with comparator returns stable order on NaN", async () => {
    const text = await renderAndGetText(
      `<Text>{data.items.sort((a, b) => a.v - b.v).map((x) => x.n).join(",")}</Text>`,
      { items: [{ n: "b", v: 2 }, { n: "a", v: 1 }, { n: "c" }] },
    );
    expect(text).toContain("a,");
    expect(text).toContain("b");
  });

  it("reduce accumulates values", async () => {
    const text = await renderAndGetText(`<Text>{data.nums.reduce((acc, n) => acc + n, 0)}</Text>`, {
      nums: [1, 2, 3],
    });
    expect(text).toContain("6");
  });

  it("at returns element by negative index", async () => {
    const text = await renderAndGetText(`<Text>{data.items.at(-1)}</Text>`, { items: ["a", "b", "c"] });
    expect(text).toContain("c");
  });

  it("flat(2) throws SafeJsxError", () => {
    expect(() => renderTemplate(`<Text>{data.items.flat(2)}</Text>`, { items: [[1, [2]]] })).toThrow(SafeJsxError);
  });

  it("flat(1) flattens one level", async () => {
    const text = await renderAndGetText(`<Text>{data.items.flat().join(",")}</Text>`, { items: [[1, 2], [3]] });
    expect(text).toContain("1,2,3");
  });

  it("reverse returns reversed copy", async () => {
    const text = await renderAndGetText(`<Text>{data.items.reverse().join(",")}</Text>`, { items: [1, 2, 3] });
    expect(text).toContain("3,2,1");
  });

  it("string replaceAll works", async () => {
    const text = await renderAndGetText(`<Text>{data.s.replaceAll("o", "0")}</Text>`, { s: "foobar" });
    expect(text).toContain("f00bar");
  });

  it("string replaceAll with empty search is a no-op", async () => {
    const text = await renderAndGetText(`<Text>{data.s.replaceAll("", "x")}</Text>`, { s: "abc" });
    expect(text).toContain("abc");
  });

  it("string repeat caps at budget", async () => {
    const text = await renderAndGetText(`<Text>{data.s.repeat(3)}</Text>`, { s: "hi" });
    expect(text).toContain("hihihi");
  });

  it("string indexOf and lastIndexOf return positions", async () => {
    const text = await renderAndGetText(`<Text>{data.s.indexOf("l")}-{data.s.lastIndexOf("l")}</Text>`, {
      s: "hello",
    });
    expect(text).toContain("2-3");
  });

  it("string trimStart and trimEnd work", async () => {
    const text = await renderAndGetText(`<Text>{data.s.trimStart().trimEnd()}</Text>`, { s: "  hi  " });
    expect(text).toContain("hi");
  });

  it("filter(Boolean) removes falsy values", async () => {
    const text = await renderAndGetText(`<Text>{data.items.filter(Boolean).join(",")}</Text>`, {
      items: ["a", "", "b", null, "c"],
    });
    expect(text).toContain("a,b,c");
  });

  it("pop returns last element", async () => {
    const text = await renderAndGetText(`<Text>{data.url.split("/").filter(Boolean).pop()}</Text>`, {
      url: "https://pokeapi.co/api/v2/pokemon/1/",
    });
    expect(text).toContain("1");
  });

  it("String(n).padStart works for number formatting", async () => {
    const text = await renderAndGetText(`<Text>{String(data.n + 1).padStart(4, "0")}</Text>`, { n: 5 });
    expect(text).toContain("0006");
  });

  it("number arithmetic in string concatenation", async () => {
    const text = await renderAndGetText(`<Text>{"https://example.com/" + (data.index + 1) + ".png"}</Text>`, {
      index: 3,
    });
    expect(text).toContain("https://example.com/4.png");
  });
});

describe("shared Custom JSX examples", () => {
  const sampleData: Record<string, unknown> = {
    name: "Server A",
    status: "online",
    value: 42,
    count: 1351,
    results: [{ name: "bulbasaur" }, { name: "ivysaur" }],
    holdings: [{ symbol: "HOMR", price: 42.5, change: 1.2, history: [38, 40, 42.5] }],
    timeline: [
      { date: "2026-07-11", value: 40 },
      { date: "2026-07-12", value: 42.5 },
    ],
    albumArt: "https://example.com/cover.jpg",
    album: "Album",
    title: "Track",
    artist: "Artist",
    progress: 55,
    playing: true,
    shuffle: false,
    state: "on",
  };

  it.each(customJsxExamples)("parses and creates the $id renderer tree", (example) => {
    const rendered = renderSafeJsx({
      template: example.widget.template,
      components: CUSTOM_WIDGET_COMPONENTS,
      bindings: {
        ...SAFE_BINDINGS(sampleData),
        status: {},
        options: getCustomWidgetDefaultOptions(example.widget.options ?? {}),
        inputs: {},
      },
    });

    expect(rendered.warnings).toEqual([]);
    expect(rendered.node).not.toBeNull();
  });
});
