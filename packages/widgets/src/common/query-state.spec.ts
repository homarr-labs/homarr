import { MantineProvider } from "@mantine/core";
import { createElement } from "react";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { hasWidgetDataWarning, throwOnInitialQueryError, WidgetDataState } from "./query-state";

vi.mock("@homarr/translation/client", () => ({
  useI18n: () => () => "Some widget data may be stale",
}));

describe("widget query state", () => {
  test.each([
    { error: new Error("refresh failed") },
    { failedIntegrationCount: 1 },
    { staleIntegrationCount: 1 },
    { expectedIntegrationCount: 2, receivedIntegrationCount: 1 },
  ])("warns when data provenance is incomplete or stale", (provenance) => {
    expect(hasWidgetDataWarning(provenance)).toBe(true);
  });

  test("does not warn for complete current data", () => {
    expect(
      hasWidgetDataWarning({
        failedIntegrationCount: 0,
        staleIntegrationCount: 0,
        expectedIntegrationCount: 2,
        receivedIntegrationCount: 2,
      }),
    ).toBe(false);
  });

  test("throws an initial query error", () => {
    const error = new Error("initial request failed");
    expect(() => throwOnInitialQueryError(error, false)).toThrow(error);
  });

  test("keeps cached data visible after a refresh error", () => {
    expect(() => throwOnInitialQueryError(new Error("refresh failed"), true)).not.toThrow();
  });

  test("places the warning after widget controls in keyboard focus order", () => {
    const markup = renderToStaticMarkup(
      createElement(
        MantineProvider,
        null,
        createElement(
          WidgetDataState,
          { hasWarning: true } as ComponentProps<typeof WidgetDataState>,
          createElement("button", { type: "button" }, "Widget action"),
        ),
      ),
    );
    const document = new DOMParser().parseFromString(markup, "text/html");
    const focusableElements = [...document.querySelectorAll("button, [tabindex='0']")];

    expect(focusableElements.map((element) => element.tagName)).toStrictEqual(["BUTTON", "OUTPUT"]);
  });
});
