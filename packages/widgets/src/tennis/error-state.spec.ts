import { MantineProvider } from "@mantine/core";
import { TRPCClientError } from "@trpc/client";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import type { Root } from "react-dom/client";

import { WidgetError } from "../errors/component";

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => (key: string) => key,
  useScopedI18n: () => (key: string) => key,
}));

vi.mock("@homarr/ui", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  // The real Link is a Next.js navigation component and needs a router in context.
  Link: "a",
}));

/**
 * Renders the shared widget error boundary for the tennis widget.
 *
 * This exists because the unit tests around `isTennisApiKeyError` only prove the
 * predicate and the definition entry are correct. They do NOT prove a rejected
 * API key actually reaches the user as the configuration message — the widget
 * originally shipped claiming exactly that while rendering the generic empty
 * state, because the component ignored `error` entirely. This test asserts the
 * rendered output instead of the wiring, so that regression cannot return
 * silently.
 */
describe("tennis widget error boundary output", () => {
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

  const renderError = async (error: unknown) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(WidgetError, { kind: "tennis", error, resetErrorBoundary: () => undefined }),
        ),
      );
    });
  };

  const createClientError = (code: string) =>
    new TRPCClientError("Live Tennis request failed", {
      result: { error: { data: { code } } },
    } as never);

  test("renders the tennis API key state, not the generic permission message", async () => {
    await renderError(createClientError("UNAUTHORIZED"));

    // The widget definition's own message key, resolved ahead of the shared
    // UNAUTHORIZED handler that would otherwise claim a permissions problem.
    expect(container.textContent).toContain("widget.tennis.error.unauthorized");
    expect(container.textContent).not.toContain("You don't have permission");
  });

  test("suppresses the check-logs link, which cannot help with a misconfigured key", async () => {
    await renderError(createClientError("UNAUTHORIZED"));

    expect(container.textContent).not.toContain("common.action.checkLogs");
    // The retry affordance is still offered, so a corrected key can be picked up.
    expect(container.textContent).toContain("common.action.tryAgain");
  });
});
