import { describe, expect, test } from "vitest";

import { buildDisplayConfigFromFormValues, buildDisplayFormValues, CUSTOM_JSX_STARTER } from "../core/display-form";
import { customWidgetDisplayTypes, displayConfigSchema } from "../core/schema";

const requiredFormValues = (displayType: string) => {
  const values = buildDisplayFormValues(displayType, {});
  values.label = "Value";
  values.mappings = [{ label: "CPU", jsonPath: "$.cpu", unit: "%" }];
  values.columns = [{ header: "Name", jsonPath: "$.name" }];
  values.statGridItems = [{ label: "CPU", jsonPath: "$.cpu", unit: "%", color: "blue" }];
  values.progressBars = [{ label: "Disk", valuePath: "$.used", maxPath: "$.total", unit: "GB", color: "blue" }];
  values.statusItems = [{ label: "Service", jsonPath: "$.status", goodValues: "online, true" }];
  values.countGridItems = [{ label: "Users", jsonPath: "$.users", unit: "" }];
  values.buttonLabel = "Execute";
  values.template = CUSTOM_JSX_STARTER;
  return values;
};

describe("custom-widget display form contracts", () => {
  test.each(customWidgetDisplayTypes)("round-trips the %s display through one canonical transform", (displayType) => {
    const initialForm = requiredFormValues(displayType);
    const config = buildDisplayConfigFromFormValues(initialForm);
    const parsed = displayConfigSchema.parse(config);
    const hydratedForm = buildDisplayFormValues(displayType, parsed);
    const rebuilt = buildDisplayConfigFromFormValues(hydratedForm);

    expect(rebuilt).toEqual(parsed);
  });

  test("preserves display-only v1 Custom JSX without adding network capabilities", () => {
    const values = requiredFormValues("customJsx");
    values.jsxApiVersion = "1";
    values.requestManifest = JSON.stringify([
      { id: "unsafe", kind: "action", method: "POST", pathTemplate: "/action" },
    ]);

    expect(buildDisplayConfigFromFormValues(values)).toEqual({
      type: "customJsx",
      template: CUSTOM_JSX_STARTER,
    });
  });

  test("validates the v2 request manifest while serializing form state", () => {
    const values = requiredFormValues("customJsx");
    values.jsxApiVersion = "2";
    values.requestManifest = JSON.stringify([
      {
        id: "status",
        kind: "query",
        method: "GET",
        pathTemplate: "/status/{id}",
        parameters: { id: "string" },
        auth: "none",
        minimumBoardPermission: "view",
      },
    ]);

    expect(buildDisplayConfigFromFormValues(values)).toMatchObject({
      type: "customJsx",
      jsxApiVersion: 2,
      requests: [{ id: "status", kind: "query", method: "GET" }],
    });
  });

  test("does not throw on invalid request manifest JSON while serializing v2 form state", () => {
    const values = requiredFormValues("customJsx");
    values.jsxApiVersion = "2";

    for (const invalidManifest of ["[invalid", "{not an array}", "", '{"id":1}', "null"]) {
      values.requestManifest = invalidManifest;
      expect(() => buildDisplayConfigFromFormValues(values)).not.toThrow();
      const config = buildDisplayConfigFromFormValues(values) as { requests?: unknown };
      expect(config.requests).toEqual([]);
    }
  });
});
