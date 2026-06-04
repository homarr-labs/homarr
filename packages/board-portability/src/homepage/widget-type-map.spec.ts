import { describe, expect, test } from "vitest";

import { integrationDefs, integrationKinds } from "@homarr/definitions";

import { homepageWidgetMap } from "./widget-type-map";

describe("homepageWidgetMap", () => {
  test("returns mapping for known homepage widget types", () => {
    const sonarr = homepageWidgetMap.sonarr;
    expect(sonarr).toMatchObject({
      integrationKind: "sonarr",
      widgetKind: "downloads",
      secretFieldMap: { key: "apiKey" },
    });
  });

  test("returns null for unknown widget types", () => {
    expect(homepageWidgetMap.unknownservice).toBeUndefined();
    expect(homepageWidgetMap.bazarr).toBeNull();
    expect(homepageWidgetMap.tautulli).toBeNull();
  });

  test("only maps integration kinds that exist in integrationDefs", () => {
    const invalidKinds: string[] = [];

    for (const mapping of Object.values(homepageWidgetMap)) {
      if (!mapping) {
        continue;
      }

      if (!integrationKinds.includes(mapping.integrationKind)) {
        invalidKinds.push(mapping.integrationKind);
      }

      expect(integrationDefs[mapping.integrationKind]).toBeDefined();
    }

    expect(invalidKinds).toEqual([]);
  });
});
