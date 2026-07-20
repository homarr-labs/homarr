// @vitest-environment jsdom

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CUSTOM_WIDGET_OFFLINE_BUNDLE_SENTINEL } from "@homarr/custom-widgets/authoring-prompt";
import { showSuccessNotification } from "@homarr/notifications";

import { CopyAiPromptButton } from "./_copy-ai-prompt-button";

vi.mock("@homarr/translation/client", () => ({
  useScopedI18n: () => (key: string, values?: { count?: number }) =>
    values?.count === undefined ? key : `${key}:${values.count}`,
}));
vi.mock("@homarr/notifications", () => ({
  showErrorNotification: vi.fn(),
  showSuccessNotification: vi.fn(),
}));

let root: Root;
let host: HTMLDivElement;
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
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
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("CopyAiPromptButton", () => {
  test("keeps the normal prompt lightweight and the embedded module lazy", async () => {
    const source = await readFile(
      resolve(process.cwd(), "apps/nextjs/src/app/[locale]/manage/custom-widgets/_copy-ai-prompt-button.tsx"),
      "utf8",
    );
    expect(source).toContain('from "@homarr/custom-widgets/authoring-prompt"');
    expect(source).toContain('await import("@homarr/custom-widgets/embedded-authoring-prompt")');
    expect(source).not.toMatch(/^import .*@homarr\/custom-widgets\/embedded-authoring-prompt/mu);

    await act(async () => {
      root.render(
        <MantineProvider>
          <CopyAiPromptButton request="Create a Pokédex" />
        </MantineProvider>,
      );
    });

    const copyButton = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "action.copyAiPrompt",
    );
    expect(copyButton).toBeDefined();
    await act(async () => copyButton?.click());
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());

    const prompt = writeText.mock.calls[0]?.[0] as string;
    expect(prompt.length).toBeLessThanOrEqual(8_000);
    expect(prompt).not.toContain("--- BEGIN SKILL FILE:");
    expect(showSuccessNotification).toHaveBeenCalledWith({
      title: "action.copyAiPrompt",
      message: `notification.aiPromptCopiedWithCount:${prompt.length}`,
    });
  });

  test("copies the complete offline bundle and reports its exact character count", async () => {
    await act(async () => {
      root.render(
        <MantineProvider>
          <CopyAiPromptButton request="Create a Pokédex" />
        </MantineProvider>,
      );
    });

    const menuTarget = host.querySelector<HTMLButtonElement>('[aria-label="action.copyAiPromptWithSkill"]');
    expect(menuTarget).not.toBeNull();
    await act(async () => {
      menuTarget?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });

    const embeddedSkillItem = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((element) =>
      element.textContent?.includes("action.copyAiPromptWithSkill"),
    );
    expect(embeddedSkillItem).toBeDefined();
    await act(async () => embeddedSkillItem?.click());
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledOnce());

    const prompt = writeText.mock.calls[0]?.[0] as string;
    expect(prompt.startsWith("Please create this Homarr Custom JSX v2 widget:\n\nCreate a Pokédex")).toBe(true);
    expect(prompt.endsWith(`${CUSTOM_WIDGET_OFFLINE_BUNDLE_SENTINEL}\nCharacters: ${prompt.length}`)).toBe(true);
    expect(showSuccessNotification).toHaveBeenCalledWith({
      title: "action.copyAiPrompt",
      message: `notification.aiPromptCopiedWithCount:${prompt.length}`,
    });
  });
});
