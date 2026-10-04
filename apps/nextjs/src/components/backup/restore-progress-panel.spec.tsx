// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@homarr/translation/client", () => {
  const translations: Record<string, string> = {
    "management.page.tool.backup.restore.progress.title": "Restoring database...",
    "management.page.tool.backup.restore.progress.restarting": "Restarting server",
    "management.page.tool.backup.restore.timeout.title": "Server did not come back online",
    "management.page.tool.backup.restore.timeout.message": "Retry the connection check or refresh this page manually.",
    "common.action.tryAgain": "Try again",
    "common.action.refresh": "Refresh",
  };
  return {
    useI18n: (namespace?: string) => (key: string) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return translations[fullKey] ?? key;
    },
  };
});

import { RestoreProgressPanel } from "./restore-progress-panel";

describe("RestoreProgressPanel", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  const renderPanel = async (
    status: "restoring" | "restarting" | "timedOut",
    onRetry = vi.fn(),
    onReload = vi.fn(),
  ) => {
    await act(async () =>
      root.render(
        createElement(
          MantineProvider,
          null,
          createElement(RestoreProgressPanel, { active: true, status, onRetry, onReload }),
        ),
      ),
    );
    return { onRetry, onReload };
  };

  it("announces real restore and restart state without a motion-only cue", async () => {
    await renderPanel("restoring");
    const output = host.querySelector("output");
    expect(output?.getAttribute("aria-live")).toBe("polite");
    expect(output?.getAttribute("aria-busy")).toBe("true");
    expect(output?.textContent).toContain("Restoring database...");
    expect(output?.querySelector("svg")).not.toBeNull();

    await renderPanel("restarting");
    expect(output?.getAttribute("aria-busy")).toBe("true");
    expect(output?.textContent).toContain("Restarting server");
  });

  it("exposes keyboard-native retry and manual refresh actions after timeout", async () => {
    const { onRetry, onReload } = await renderPanel("timedOut");
    const output = host.querySelector("output");
    const buttons = Array.from(host.querySelectorAll("button"));

    expect(output?.getAttribute("aria-busy")).toBe("false");
    expect(output?.textContent).toContain("Server did not come back online");
    expect(output?.textContent).toContain("Retry the connection check or refresh this page manually.");
    expect(buttons.map((button) => button.textContent)).toEqual(["Try again", "Refresh"]);

    buttons[0]?.click();
    buttons[1]?.click();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(onReload).toHaveBeenCalledOnce();
  });
});
