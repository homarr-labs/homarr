// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { AssistantDotMatrix, assistantDotMatrixStates } from "./assistant-dot-matrix";

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

  test("renders an accessible deterministic 5 by 5 loading matrix", async () => {
    await act(async () => root.render(createElement(AssistantDotMatrix, { label: "Loading response" })));

    const matrix = host.querySelector<HTMLElement>("[data-slot='assistant-dot-matrix']");
    expect(matrix?.dataset.state).toBe("loading");
    expect(matrix?.tagName).toBe("OUTPUT");
    expect(matrix?.textContent).toBe("Loading response");
    expect(matrix?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(matrix?.querySelectorAll("[data-slot='assistant-dot-matrix-dot']")).toHaveLength(25);
  });

  test("switches from the thinking wave to the streaming wave without changing its structure", async () => {
    await act(async () => root.render(createElement(AssistantDotMatrix, { state: "thinking", label: "Thinking" })));
    const matrix = host.querySelector<HTMLElement>("[data-slot='assistant-dot-matrix']");
    const firstDot = matrix?.querySelector<SVGCircleElement>("[data-slot='assistant-dot-matrix-dot']");
    expect(matrix?.dataset.state).toBe("thinking");
    expect(firstDot?.style.animationDuration).toBe("1.2s");

    await act(async () =>
      root.render(createElement(AssistantDotMatrix, { state: "streaming", label: "Writing response" })),
    );
    const updatedMatrix = host.querySelector<HTMLElement>("[data-slot='assistant-dot-matrix']");
    const updatedFirstDot = updatedMatrix?.querySelector<SVGCircleElement>("[data-slot='assistant-dot-matrix-dot']");
    expect(updatedMatrix).toBe(matrix);
    expect(updatedMatrix?.dataset.state).toBe("streaming");
    expect(updatedMatrix?.textContent).toBe("Writing response");
    expect(updatedFirstDot?.style.animationDuration).toBe("0.9s");
    expect(updatedMatrix?.querySelectorAll("[data-slot='assistant-dot-matrix-dot']")).toHaveLength(25);
  });

  test("supports every documented assistant-ui matrix state", async () => {
    expect(assistantDotMatrixStates).toEqual([
      "idle",
      "loading",
      "thinking",
      "streaming",
      "searching",
      "syncing",
      "connecting",
      "waiting",
      "uploading",
      "downloading",
      "listening",
      "speaking",
      "recording",
      "success",
      "error",
      "warning",
      "info",
      "paused",
      "stopped",
      "offline",
    ]);

    for (const state of assistantDotMatrixStates) {
      await act(async () => root.render(createElement(AssistantDotMatrix, { state })));
      expect(host.querySelector("[data-slot='assistant-dot-matrix']")?.getAttribute("data-state")).toBe(state);
    }
  });
});
