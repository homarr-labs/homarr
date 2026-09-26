import { describe, expect, test } from "vitest";

import { integrationKinds } from "../integration";
import {
  getWidgetKindsForIntegration,
  integrationWidgetSupport,
  widgetIntegrationConfigs,
  widgetIntegrationSupport,
} from "../widget-integration-map";

describe("widget integration config", () => {
  test("derives forward and reverse support without losing relationships", () => {
    for (const [widgetKind, capability] of Object.entries(widgetIntegrationConfigs)) {
      expect(widgetIntegrationSupport[widgetKind as keyof typeof widgetIntegrationSupport]).toEqual(
        capability.supportedIntegrations,
      );
      for (const integrationKind of capability.supportedIntegrations) {
        expect(integrationWidgetSupport[integrationKind]).toContain(widgetKind);
      }
    }

    for (const integrationKind of integrationKinds) {
      expect(getWidgetKindsForIntegration(integrationKind)).toEqual(integrationWidgetSupport[integrationKind]);
    }
  });

  test("supports the mock integration for every integration-backed widget", () => {
    for (const config of Object.values(widgetIntegrationConfigs)) {
      expect(config.supportedIntegrations).toContain("mock");
    }
  });
});
