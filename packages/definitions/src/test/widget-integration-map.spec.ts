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

  test("supports the mock integration for every integration-backed widget", () => {
    for (const capability of Object.values(nativeFeatureCapabilities)) {
      expect(capability.integrations).toContain("mock");
    }
  });

  test("derives optional connections and server selection limits", () => {
    expect(widgetKindsWithOptionalIntegrations).toEqual(new Set(["calendar"]));
    expect(widgetIntegrationLimits).toEqual({
      "smartHome-entityState": 1,
      "smartHome-executeAutomation": 1,
      mediaTranscoding: 1,
      "immich-serverStats": 1,
      "immich-albumCarousel": 1,
      paperlessNgx: 1,
      patchmon: 1,
      bazarr: 1,
      audioStats: 1,
      umami: 1,
      archiveTeamWarrior: 1,
      anchorNote: 1,
      wud: 1,
    });
  });
});
