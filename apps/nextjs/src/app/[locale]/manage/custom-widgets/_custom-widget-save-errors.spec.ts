import { describe, expect, it } from "vitest";

import { extractCustomWidgetSaveIssues } from "./_custom-widget-save-errors";

describe("extractCustomWidgetSaveIssues", () => {
  it("extracts every flattened server validation message", () => {
    expect(
      extractCustomWidgetSaveIssues({
        data: {
          zodError: {
            fieldErrors: {
              template: [
                "UNKNOWN_COMPONENT: 'Radio.Group' is not available. Did you mean 'RadioGroup'?",
                "UNKNOWN_COMPONENT: 'Radio.Card' is not available. Did you mean 'RadioCard'?",
              ],
            },
          },
        },
      }),
    ).toEqual([
      { path: "template", message: "UNKNOWN_COMPONENT: 'Radio.Group' is not available. Did you mean 'RadioGroup'?" },
      { path: "template", message: "UNKNOWN_COMPONENT: 'Radio.Card' is not available. Did you mean 'RadioCard'?" },
    ]);
  });

  it("extracts paths and messages from a serialized Zod issue list", () => {
    const message = JSON.stringify([
      {
        code: "custom",
        message: "UNKNOWN_COMPONENT: 'Radio.Indicator' is not available. Did you mean 'RadioIndicator'?",
        path: ["template"],
      },
    ]);

    expect(extractCustomWidgetSaveIssues({ message })).toEqual([
      {
        path: "template",
        message: "UNKNOWN_COMPONENT: 'Radio.Indicator' is not available. Did you mean 'RadioIndicator'?",
      },
    ]);
  });

  it("preserves array indexes in serialized Zod issue paths", () => {
    const message = JSON.stringify([
      {
        code: "custom",
        message: "A load parameter requires an explicit binding.",
        path: ["requests", "containers", "path"],
      },
    ]);

    expect(extractCustomWidgetSaveIssues({ message })).toEqual([
      {
        path: "requests.containers.path",
        message: "A load parameter requires an explicit binding.",
      },
    ]);
  });

  it("extracts root validation errors from the tRPC error shape", () => {
    expect(
      extractCustomWidgetSaveIssues({
        shape: {
          data: {
            zodError: {
              formErrors: ["The widget definition is invalid."],
              fieldErrors: {},
            },
          },
        },
      }),
    ).toEqual([{ message: "The widget definition is invalid." }]);
  });
});
