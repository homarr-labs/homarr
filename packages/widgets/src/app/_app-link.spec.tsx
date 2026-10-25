/// <reference types="vitest/jsdom" />
// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { AppLink } from "./_app-link";

const protocolLinks = [
  "microsoft-edge:https://example.com",
  "MICROSOFT-EDGE:http://example.com",
  "ssh://server.example.com",
  "sftp://server.example.com/path",
  "ftp://server.example.com/path",
  "ftps://server.example.com/path",
  "winscp-ftp://server.example.com/path",
  "vscode://file/example.ts",
  "mailto:contact@example.com",
  "brave://settings",
  "web+homarr:launch",
];

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  // MouseEvent.view requires jsdom's Window rather than Vitest's global proxy.
  vi.stubGlobal("window", jsdom.window);
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
  vi.unstubAllGlobals();
});

async function renderLink(openIn: "currentTab" | "newTab" | "newWindow", href = "https://example.com") {
  await act(async () =>
    root.render(
      <MantineProvider>
        <AppLink href={href} openIn={openIn} enabled>
          Open app
        </AppLink>
      </MantineProvider>,
    ),
  );
  const link = host.querySelector("a");
  if (!link) throw new Error("Expected an app link");
  return link;
}

// Observe events after React handles them, then prevent jsdom navigation.
async function clickLink(link: HTMLAnchorElement, init: MouseEventInit = {}) {
  const events: { shiftKey: boolean; defaultPrevented: boolean }[] = [];
  const observe = (event: MouseEvent) => {
    events.push({ shiftKey: event.shiftKey, defaultPrevented: event.defaultPrevented });
    event.preventDefault();
  };
  document.addEventListener("click", observe);
  try {
    await act(async () => link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...init })));
  } finally {
    document.removeEventListener("click", observe);
  }
  return events;
}

describe("AppLink opening modes", () => {
  test.each(["currentTab", "newTab", "newWindow"] as const)("preserves safe anchor semantics for %s", async (mode) => {
    const link = await renderLink(mode);
    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.getAttribute("target")).toBe(mode === "currentTab" ? null : "_blank");
    expect(link.getAttribute("rel")).toBe(mode === "currentTab" ? null : "noopener noreferrer");
  });

  test("requests one Shift-click and cancels the original click for a new window", async () => {
    const link = await renderLink("newWindow");
    expect(await clickLink(link)).toEqual([
      { shiftKey: true, defaultPrevented: false },
      { shiftKey: false, defaultPrevented: true },
    ]);
  });

  test.each(protocolLinks)("handles %s natively without an intermediate window in window mode", async (href) => {
    const link = await renderLink("newWindow", href);
    expect(link.getAttribute("href")).toBe(href);
    expect(link.getAttribute("target")).toBeNull();
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(await clickLink(link)).toEqual([{ shiftKey: false, defaultPrevented: false }]);
  });

  test.each(["currentTab", "newTab"] as const)("preserves %s behavior for all protocols", async (mode) => {
    for (const href of protocolLinks) {
      const link = await renderLink(mode, href);
      expect(link.getAttribute("href")).toBe(href);
      expect(link.getAttribute("target")).toBe(mode === "currentTab" ? null : "_blank");
      expect(link.getAttribute("rel")).toBe(mode === "currentTab" ? null : "noopener noreferrer");
      expect(await clickLink(link)).toEqual([{ shiftKey: false, defaultPrevented: false }]);
    }
  });

  test.each([
    "http://example.com",
    "HTTPS://example.com",
    "/boards/home",
    "./relative",
    "../relative",
    "#section",
    "?next=microsoft-edge:https://example.com",
  ])("keeps separate-window behavior for web navigation %s", async (href) => {
    const link = await renderLink("newWindow", href);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(await clickLink(link)).toEqual([
      { shiftKey: true, defaultPrevented: false },
      { shiftKey: false, defaultPrevented: true },
    ]);
  });

  test.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])(
    "preserves modified clicks %j for protocol links in window mode",
    async (init) => {
      for (const href of protocolLinks) {
        const link = await renderLink("newWindow", href);
        expect(await clickLink(link, init)).toEqual([{ shiftKey: "shiftKey" in init, defaultPrevented: false }]);
      }
    },
  );

  test.each(["currentTab", "newTab"] as const)("leaves native navigation intact for %s", async (mode) => {
    expect(await clickLink(await renderLink(mode))).toEqual([{ shiftKey: false, defaultPrevented: false }]);
  });

  test.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])(
    "preserves a modified click %j in window mode",
    async (init) => {
      expect(await clickLink(await renderLink("newWindow"), init)).toEqual([
        { shiftKey: "shiftKey" in init, defaultPrevented: false },
      ]);
    },
  );

  test("does not reopen a link whose click was already cancelled", async () => {
    const link = await renderLink("newWindow");
    link.addEventListener("click", (event) => event.preventDefault());
    expect(await clickLink(link)).toEqual([{ shiftKey: false, defaultPrevented: true }]);
  });

  test("does not render a navigable link when disabled in edit mode", async () => {
    await act(async () =>
      root.render(
        <MantineProvider>
          <AppLink href="https://example.com" openIn="newWindow" enabled={false}>
            Open app
          </AppLink>
        </MantineProvider>,
      ),
    );
    expect(host.querySelector("a")).toBeNull();
    expect(host.textContent).toContain("Open app");
  });
});
