import { MantineProvider } from "@mantine/core";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import type { Root } from "react-dom/client";

import CustomJsxDisplay from "./custom-jsx-display";
import { SAFE_BINDINGS } from "./jsx-whitelist";

describe("CustomJsxDisplay", () => {
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
  });

  afterEach(() => {
    root?.unmount();
    container?.remove();
  });

  const renderDisplay = async (data: Record<string, unknown>) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(MantineProvider, null, createElement(CustomJsxDisplay, { data })));
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

  it("blocks script tags and event handlers", async () => {
    await renderDisplay({
      template: '<script>document.title = "hacked"</script><button onClick={() => {}}>Click</button><Text>Safe</Text>',
      data: {},
    });

    expect(document.title).not.toBe("hacked");
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("Safe");
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
