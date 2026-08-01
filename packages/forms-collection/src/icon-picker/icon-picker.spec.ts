import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { MantineProvider } from "@mantine/core";

import type { Root } from "react-dom/client";

const { findIconsQuery } = vi.hoisted(() => ({
  findIconsQuery: vi.fn(() => ({
    data: { icons: [], countIcons: 0 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  })),
}));

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    icon: {
      findIcons: {
        useQuery: findIconsQuery,
      },
    },
  },
}));

vi.mock("@homarr/auth/client", () => ({
  useSession: () => ({ data: { user: { permissions: [] } } }),
}));

vi.mock("@homarr/translation", () => ({ supportedLanguages: [] }));
vi.mock("@homarr/translation/client", () => ({
  useScopedI18n: () => (key: string, values?: Record<string, string>) =>
    values ? `${key}:${values.countIcons ?? values.search}` : key,
}));
vi.mock("../upload-media/upload-media", () => ({ UploadMedia: () => null }));

import { isDirectIconUrl } from "./icon-url";
import { IconPicker } from "./icon-picker";

const directIconUrl = "https://cdn.example.com/shopify.svg";

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("Input value setter was not found");
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("IconPicker", () => {
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

  beforeEach(() => {
    findIconsQuery.mockClear();
  });

  const renderPicker = async (onChange: (value: string) => void) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(MantineProvider, null, createElement(IconPicker, { value: "", onChange })));
    });
  };

  const getInput = () => {
    const input = container.querySelector("input");
    if (!input) throw new Error("Icon picker input was not rendered");
    return input;
  };

  test("stores a direct URL and does not search for it", async () => {
    const onChange = vi.fn();
    await renderPicker(onChange);

    const input = getInput();

    await act(async () => {
      setInputValue(input, directIconUrl);
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(onChange).toHaveBeenCalledWith(directIconUrl);
    expect(findIconsQuery.mock.calls.some(([query]) => query.searchText === directIconUrl)).toBe(false);
  });

  test("keeps normal icon names in search mode", async () => {
    const onChange = vi.fn();
    await renderPicker(onChange);

    const input = getInput();

    await act(async () => {
      setInputValue(input, "shopify");
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("shopify");
    expect(findIconsQuery.mock.calls.some(([query]) => query.searchText === "shopify")).toBe(true);
  });
});

describe("isDirectIconUrl", () => {
  test.each([
    { value: directIconUrl, expected: true },
    { value: "HTTP://cdn.example.com/shopify.svg", expected: true },
    { value: "https://", expected: false },
    { value: "http://", expected: false },
    { value: "shopify", expected: false },
    { value: "/icons/shopify.svg", expected: false },
  ])("returns $expected for $value", ({ value, expected }) => {
    expect(isDirectIconUrl(value)).toBe(expected);
  });
});
