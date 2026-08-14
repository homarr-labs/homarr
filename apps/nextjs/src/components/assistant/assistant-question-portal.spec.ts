// @vitest-environment jsdom

import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";

import { AssistantPendingQuestionPortal, AssistantQuestionPortalProvider } from "./assistant-question-portal";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const containers: HTMLDivElement[] = [];

afterEach(() => {
  for (const container of containers.splice(0)) container.remove();
});

const QuestionSurface = () => {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  return createElement(
    AssistantQuestionPortalProvider,
    { target },
    createElement(
      "div",
      { "data-testid": "transcript" },
      createElement(AssistantPendingQuestionPortal, null, "Question"),
    ),
    createElement("div", { "data-testid": "dock", ref: setTarget }),
  );
};

describe("AssistantPendingQuestionPortal", () => {
  test("keeps the question visible when a surface has no composer dock", async () => {
    const container = document.createElement("div");
    containers.push(container);
    document.body.append(container);
    const root = createRoot(container);

    await act(async () =>
      root.render(
        createElement(
          AssistantQuestionPortalProvider,
          { target: null },
          createElement(AssistantPendingQuestionPortal, null, "Question"),
        ),
      ),
    );

    expect(container.textContent).toBe("Question");

    await act(async () => root.unmount());
  });

  test("moves one pending question from the transcript into the composer dock", async () => {
    const container = document.createElement("div");
    containers.push(container);
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(createElement(QuestionSurface)));

    expect(container.querySelector('[data-testid="transcript"]')?.textContent).toBe("");
    expect(container.querySelector('[data-testid="dock"]')?.textContent).toBe("Question");

    await act(async () => root.unmount());
  });
});
