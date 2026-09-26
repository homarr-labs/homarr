// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { AssistantDotMatrix } from "./assistant-dot-matrix";

describe("AssistantDotMatrix", () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  test("announces loading with a decorative glyph hidden from assistive technology", async () => {
    await act(async () => root.render(createElement(AssistantDotMatrix, { label: "Loading response" })));

    const matrix = host.querySelector<HTMLElement>("[data-slot='assistant-dot-matrix']");
    expect(matrix?.tagName).toBe("OUTPUT");
    expect(matrix?.textContent).toBe("Loading response");
    expect(matrix?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
