import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { MantineProvider } from "@mantine/core";

import type { Root } from "react-dom/client";
import type { IconGroup } from "./icon-picker.utils";

const { findIconsQuery, refetch, uploadSelection, sessionPermissions } = vi.hoisted(() => ({
  findIconsQuery: vi.fn(),
  refetch: vi.fn(),
  uploadSelection: vi.fn(),
  sessionPermissions: { current: [] as string[] },
}));

interface QueryData {
  icons: IconGroup[];
  countIcons: number;
}

const emptyResult: QueryData = { icons: [], countIcons: 11_000 };
let queryResult: {
  data?: QueryData;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
};

vi.mock("@homarr/api/client", () => ({
  clientApi: {
    icon: {
      findIcons: {
        useQuery: (input: { searchText: string; limitPerGroup: number }, options: { enabled: boolean }) => {
          findIconsQuery(input, options);
          return { ...queryResult, refetch };
        },
      },
    },
  },
}));
vi.mock("@homarr/auth/client", () => ({
  useSession: () => ({ data: { user: { permissions: sessionPermissions.current } } }),
}));
vi.mock("@homarr/translation", () => ({ supportedLanguages: [] }));
vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string, params?: Record<string, string>) =>
    params ? `${key}:${Object.values(params).join(",")}` : key,
}));
vi.mock("../upload-media/upload-media", () => ({
  UploadMedia: ({
    children,
    onSuccess,
  }: {
    children: (props: object) => unknown;
    onSuccess: (medias: unknown) => void;
  }) =>
    children({
      loading: false,
      onClick: () => {
        uploadSelection();
        onSuccess([{ id: "uploaded", url: "/api/user-medias/uploaded" }]);
      },
    }),
}));

import { IconPicker } from "./icon-picker";

const directImageUrl = "https://cdn.example.com/shopify.svg";

const iconGroups = [
  {
    id: "remote",
    slug: "dashboard-icons",
    icons: [
      { id: "png", name: "shopify.png", url: "https://cdn.example.com/shopify.png" },
      { id: "svg", name: "shopify.svg", url: "https://cdn.example.com/shopify.svg" },
    ],
  },
  {
    id: "local",
    slug: "local",
    icons: [{ id: "local-icon", name: "my-shop.png", url: "/api/user-medias/local-icon" }],
  },
];

const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (!setter) throw new Error("Input value setter was not found");
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

const pressKey = (input: HTMLInputElement, key: string, init?: KeyboardEventInit) => {
  input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
};

const focusInput = async (input: HTMLInputElement) => {
  await act(async () => input.focus());
};

const advanceDebounce = async () => {
  await act(async () => vi.advanceTimersByTimeAsync(300));
};

describe("IconPicker", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, writable: true });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (media: string) => ({
        matches: false,
        media,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { value: () => undefined, writable: true });
  });

  beforeEach(() => {
    vi.useFakeTimers();
    findIconsQuery.mockClear();
    refetch.mockClear();
    uploadSelection.mockClear();
    sessionPermissions.current = [];
    queryResult = { data: emptyResult, isLoading: false, isFetching: false, isError: false };
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.querySelectorAll("[data-combobox-dropdown]").forEach((element) => element.remove());
    vi.useRealTimers();
  });

  const renderPicker = async (
    onChange: (value: string) => void,
    props: Partial<React.ComponentProps<typeof IconPicker>> = {},
  ) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(createElement(MantineProvider, null, createElement(IconPicker, { value: "", onChange, ...props })));
    });
    const input = container.querySelector("input");
    if (!input) throw new Error("Icon picker input was not rendered");
    return input;
  };

  test("clears an existing value without restoring it", async () => {
    const onChange = vi.fn();
    const input = await renderPicker(onChange, { value: directImageUrl });

    await act(async () => setInputValue(input, ""));

    expect(onChange).toHaveBeenCalledWith("");
    expect(input.value).toBe("");
  });

  test.each([{ metaKey: true }, { ctrlKey: true }])(
    "clears the entire value with a line-delete shortcut",
    async (modifier) => {
      const onChange = vi.fn();
      const input = await renderPicker(onChange, { value: directImageUrl });

      await act(async () => pressKey(input, "Backspace", modifier));

      expect(onChange).toHaveBeenCalledWith("");
      expect(input.value).toBe("");
    },
  );

  test("debounces repository searches", async () => {
    const input = await renderPicker(vi.fn());
    findIconsQuery.mockClear();

    await act(async () => setInputValue(input, "shopify"));
    expect(findIconsQuery.mock.calls.some(([query]) => query.searchText === "shopify")).toBe(false);

    await advanceDebounce();
    expect(findIconsQuery.mock.calls.some(([query]) => query.searchText === "shopify")).toBe(true);
  });

  test("pre-searches the suggested app name when opened", async () => {
    const input = await renderPicker(vi.fn(), { suggestedSearch: "Jellyfin" });

    await focusInput(input);
    expect(input.value).toBe("Jellyfin");
    await advanceDebounce();

    expect(findIconsQuery.mock.calls.some(([query]) => query.searchText === "Jellyfin")).toBe(true);
  });

  test("shows local images before SVG and raster library images", async () => {
    queryResult = { data: { icons: iconGroups, countIcons: 3 }, isLoading: false, isFetching: false, isError: false };
    const input = await renderPicker(vi.fn());

    await focusInput(input);
    const content = document.body.textContent ?? "";

    expect(document.body.querySelector('[role="listbox"]')?.getAttribute("aria-label")).toBe("iconPicker.results");
    expect(content.indexOf("iconPicker.localImages")).toBeLessThan(content.indexOf("iconPicker.svgIcons"));
    expect(content.indexOf("iconPicker.svgIcons")).toBeLessThan(content.indexOf("iconPicker.otherImages"));
  });

  test("selects a library image with a pointer", async () => {
    queryResult = { data: { icons: iconGroups, countIcons: 3 }, isLoading: false, isFetching: false, isError: false };
    const onChange = vi.fn();
    const input = await renderPicker(onChange);
    await focusInput(input);

    const option = document.body.querySelector<HTMLElement>(
      '[data-combobox-option][value="/api/user-medias/local-icon"]',
    );
    if (!option) throw new Error("Local image option was not rendered");
    await act(async () => option.click());

    expect(onChange).toHaveBeenCalledWith("/api/user-medias/local-icon");
    expect(input.value).toBe("/api/user-medias/local-icon");
  });

  test("selects a library image with the keyboard", async () => {
    queryResult = { data: { icons: iconGroups, countIcons: 3 }, isLoading: false, isFetching: false, isError: false };
    const onChange = vi.fn();
    const input = await renderPicker(onChange);
    await focusInput(input);

    await act(async () => pressKey(input, "ArrowDown"));
    await act(async () => pressKey(input, "Enter"));

    expect(onChange).toHaveBeenCalledWith("/api/user-medias/local-icon");
  });

  test("keeps a direct URL visible and reports a successful preview", async () => {
    const onChange = vi.fn();
    const input = await renderPicker(onChange);

    await act(async () => setInputValue(input, directImageUrl));

    expect(onChange).toHaveBeenCalledWith(directImageUrl);
    expect(input.value).toBe(directImageUrl);
    expect(findIconsQuery.mock.calls.at(-1)?.[1]).toMatchObject({ enabled: false });
    expect(document.body.textContent).toContain("iconPicker.urlLoading");

    const preview = document.body.querySelector('[data-testid="direct-url-preview"]');
    if (!preview) throw new Error("Direct URL preview was not rendered");
    await act(async () => preview.dispatchEvent(new Event("load")));
    expect(document.body.textContent).toContain("iconPicker.urlReady");
  });

  test("keeps a failed direct URL editable and shows an error", async () => {
    const input = await renderPicker(vi.fn());
    await act(async () => setInputValue(input, "https://invalid.example/image.png"));

    const preview = document.body.querySelector('[data-testid="direct-url-preview"]');
    if (!preview) throw new Error("Direct URL preview was not rendered");
    await act(async () => preview.dispatchEvent(new Event("error")));

    expect(input.value).toBe("https://invalid.example/image.png");
    expect(document.body.textContent).toContain("iconPicker.urlError");
  });

  test("restores the committed value when an unfinished search is cancelled", async () => {
    const input = await renderPicker(vi.fn(), { value: directImageUrl });

    await act(async () => setInputValue(input, "unfinished search"));
    await act(async () => pressKey(input, "Escape"));

    expect(input.value).toBe(directImageUrl);
  });

  test("offers retry when the repository search fails", async () => {
    queryResult = { data: undefined, isLoading: false, isFetching: false, isError: true };
    const input = await renderPicker(vi.fn());
    await focusInput(input);

    const retry = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent === "action.tryAgain",
    );
    if (!retry) throw new Error("Retry button was not rendered");
    await act(async () => retry.click());

    expect(refetch).toHaveBeenCalledOnce();
  });

  test("selects an uploaded local image when the user has permission", async () => {
    sessionPermissions.current = ["media-upload"];
    const onChange = vi.fn();
    await renderPicker(onChange);

    const upload = container.querySelector<HTMLButtonElement>('[aria-label="iconPicker.uploadImage"]');
    if (!upload) throw new Error("Upload button was not rendered");
    await act(async () => upload.click());

    expect(uploadSelection).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("/api/user-medias/uploaded");
  });
});
