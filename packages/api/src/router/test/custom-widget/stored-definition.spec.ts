import { stringify as stringifySuperJson } from "superjson";
import { describe, expect, test } from "vitest";

import {
  BUNDLED_CUSTOM_WIDGETS,
  CUSTOM_WIDGET_STARTER,
  customWidgetDefinitionSchema,
} from "@homarr/custom-widgets/core";

import {
  safeParseStoredCustomWidgetDefinition,
  serializeCustomWidgetDefinition,
} from "../../custom-widget/stored-definition";

describe("stored custom widget definitions", () => {
  test("parses a valid stored definition", () => {
    const result = safeParseStoredCustomWidgetDefinition(
      serializeCustomWidgetDefinition(customWidgetDefinitionSchema.parse(CUSTOM_WIDGET_STARTER)),
    );

    expect(result).toMatchObject({ success: true, widget: { $schema: "homarr-custom-widget-v2" } });
  });

  test("returns useful issues for an invalid stored request instead of throwing", () => {
    const currency = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-currency-exchange");
    if (!currency) throw new Error("Currency Exchange bundled widget is missing");

    const stored = serializeCustomWidgetDefinition(customWidgetDefinitionSchema.parse(currency.widget));
    const result = safeParseStoredCustomWidgetDefinition({
      ...stored,
      requests: stringifySuperJson({ rates: { path: "/latest/{option:missing}" } }),
    });

    expect(result).toEqual({
      success: false,
      issues: expect.arrayContaining([expect.objectContaining({ path: "requests.rates" })]),
    });
  });

  test("contains malformed serialized data", () => {
    const stored = serializeCustomWidgetDefinition(customWidgetDefinitionSchema.parse(CUSTOM_WIDGET_STARTER));

    expect(safeParseStoredCustomWidgetDefinition({ ...stored, requests: "not-json" })).toEqual({
      success: false,
      issues: [{ message: "Stored widget data could not be read" }],
    });
  });
});
