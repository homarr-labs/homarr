import { describe, expect, test } from "vitest";

import { integrationKinds } from "../integration";
import {
  getWidgetKindsForIntegration,
  integrationWidgetSupport,
  nativeFeatureCapabilities,
  widgetIntegrationLimits,
  widgetIntegrationSupport,
  widgetKindsWithOptionalIntegrations,
} from "../widget-integration-map";

describe("native feature capability descriptor", () => {
  test("derives forward and reverse support without losing relationships", () => {
    for (const [widgetKind, capability] of Object.entries(nativeFeatureCapabilities)) {
      expect(widgetIntegrationSupport[widgetKind as keyof typeof widgetIntegrationSupport]).toEqual(
        capability.integrations,
      );
      for (const integrationKind of capability.integrations) {
        expect(integrationWidgetSupport[integrationKind]).toContain(widgetKind);
      }
    }

    for (const integrationKind of integrationKinds) {
      expect(getWidgetKindsForIntegration(integrationKind)).toEqual(integrationWidgetSupport[integrationKind]);
    }
  });

  test("derives optional connections and server selection limits", () => {
    expect(widgetKindsWithOptionalIntegrations).toEqual(new Set(["calendar"]));
    expect(widgetIntegrationLimits).toEqual({ audioStats: 1 });
  });
});
