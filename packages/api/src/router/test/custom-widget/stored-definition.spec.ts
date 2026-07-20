import { parse as parseSuperJson, stringify as stringifySuperJson } from "superjson";
import { describe, expect, test } from "vitest";

import { BUNDLED_CUSTOM_WIDGETS, CUSTOM_WIDGET_STARTER } from "@homarr/custom-widgets/core";

import {
  safeParseStoredCustomWidgetDefinition,
  serializeCustomWidgetDefinition,
} from "../../custom-widget/stored-definition";

describe("stored custom widget definitions", () => {
  test("parses a valid stored definition", () => {
    const result = safeParseStoredCustomWidgetDefinition(serializeCustomWidgetDefinition(CUSTOM_WIDGET_STARTER));

    expect(result).toMatchObject({ success: true, widget: { $schema: "homarr-custom-widget-v2" } });
  });

  test("returns all useful issues for a stale load request instead of throwing", () => {
    const currency = BUNDLED_CUSTOM_WIDGETS.find(({ id }) => id === "seed-currency-exchange");
    if (!currency) throw new Error("Currency Exchange bundled widget is missing");

    const stored = serializeCustomWidgetDefinition(currency.widget);
    const requests = parseSuperJson(stored.requests) as Array<Record<string, unknown>>;
    delete requests[0]?.optionsBinding;

    const result = safeParseStoredCustomWidgetDefinition({
      ...stored,
      requests: stringifySuperJson(requests),
    });

    expect(result).toEqual({
      success: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ path: "requests.0.optionsBinding.from" }),
        expect.objectContaining({ path: "requests.0.optionsBinding.to" }),
        expect.objectContaining({ path: "requests.0.optionsBinding.amount" }),
      ]),
    });
  });

  test("contains malformed serialized data", () => {
    const stored = serializeCustomWidgetDefinition(CUSTOM_WIDGET_STARTER);

    expect(safeParseStoredCustomWidgetDefinition({ ...stored, requests: "not-json" })).toEqual({
      success: false,
      issues: [{ message: "Stored widget data could not be read" }],
    });
  });
});
