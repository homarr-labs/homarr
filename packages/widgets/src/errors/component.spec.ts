// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, test, vi } from "vitest";

import { WidgetError } from "./component";

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) => key,
}));

vi.mock("@homarr/auth/client", () => ({
  useSession: () => ({ data: null }),
}));

const matchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});

describe("WidgetError", () => {
  let host: HTMLDivElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;

  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    host?.remove();
    vi.unstubAllGlobals();
  });

  test("never renders an unmapped backend error", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("matchMedia", matchMedia);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    const secret = "http://admin:password@private.local/path?token=secret";

    await act(async () =>
      root?.render(
        createElement(
          MantineProvider,
          null,
          createElement(WidgetError, {
            error: new Error(secret),
            resetErrorBoundary: vi.fn(),
          }),
        ),
      ),
    );

    expect(host.textContent).toContain("common.error");
    expect(host.textContent).not.toContain(secret);
    expect(host.textContent).not.toMatch(/password|private\.local|token=secret/);
  });
});
