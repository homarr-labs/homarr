import { describe, expect, test } from "vitest";

import {
  throwIfCustomWidgetBoardDuplicationForbidden,
  throwIfCustomWidgetPlacementChangeForbidden,
} from "../custom-widget-placement-access";

const placement = {
  id: "widget-1",
  kind: "customApi",
  options: {
    definitionId: "definition-1",
    refreshInterval: 30,
    configuration: { server: "primary" },
  },
};

describe("Custom Widget placement access", () => {
  test("non-admins cannot add a Custom Widget placement", () => {
    expect(() =>
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: false,
        customWidgetsEnabled: true,
        submittedItems: [{ ...placement, options: { ...placement.options, configurationVersion: 1 } }],
        storedItems: [],
      }),
    ).toThrowError("Only administrators can add or configure Custom Widgets");
  });

  test.each([
    ["definition", { ...placement, options: { ...placement.options, definitionId: "definition-2" } }],
    ["refresh interval", { ...placement, options: { ...placement.options, refreshInterval: 60 } }],
    [
      "option configuration",
      { ...placement, options: { ...placement.options, configuration: { server: "secondary" } } },
    ],
    ["widget kind", { ...placement, kind: "weather" }],
  ])("non-admins cannot change an existing Custom Widget %s", (_label, submitted) => {
    expect(() =>
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: false,
        customWidgetsEnabled: true,
        submittedItems: [submitted],
        storedItems: [placement],
      }),
    ).toThrowError("Only administrators can add or configure Custom Widgets");
  });

  test("non-admins may move, resize and change presentation for an existing placement", () => {
    const submitted = {
      ...placement,
      layouts: [{ xOffset: 2, yOffset: 4, width: 6, height: 3 }],
      advancedOptions: { title: "Status", customCssClasses: ["wide"], borderColor: "#fff" },
    };
    expect(() =>
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: false,
        customWidgetsEnabled: true,
        submittedItems: [submitted],
        storedItems: [placement],
      }),
    ).not.toThrow();
  });

  test("non-admins may remove an existing placement", () => {
    expect(() =>
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: false,
        customWidgetsEnabled: true,
        submittedItems: [],
        storedItems: [placement],
      }),
    ).not.toThrow();
  });

  test("admins may create and reconfigure placements", () => {
    expect(() =>
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: true,
        customWidgetsEnabled: true,
        submittedItems: [{ ...placement, options: { definitionId: "definition-2" } }],
        storedItems: [],
      }),
    ).not.toThrow();
  });

  test("duplicating a board with Custom Widgets requires admin", () => {
    expect(() => throwIfCustomWidgetBoardDuplicationForbidden(false, true, [placement])).toThrowError(
      "Only administrators can add or configure Custom Widgets",
    );
    expect(() => throwIfCustomWidgetBoardDuplicationForbidden(true, true, [placement])).not.toThrow();
    expect(() => throwIfCustomWidgetBoardDuplicationForbidden(false, true, [{ kind: "weather" }])).not.toThrow();
  });

  test("treats missing persisted v2 defaults as equivalent during presentation-only edits", () => {
    expect(() =>
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: false,
        customWidgetsEnabled: true,
        submittedItems: [placement],
        storedItems: [
          {
            id: placement.id,
            kind: placement.kind,
            options: {
              definitionId: placement.options.definitionId,
              refreshInterval: placement.options.refreshInterval,
              configuration: placement.options.configuration,
            },
          },
        ],
      }),
    ).not.toThrow();
  });

  test("blocks authoring but still allows removal while the emergency switch is off", () => {
    expect(() =>
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: true,
        customWidgetsEnabled: false,
        submittedItems: [placement],
        storedItems: [],
      }),
    ).toThrowError("temporarily disabled");
    expect(() =>
      throwIfCustomWidgetPlacementChangeForbidden({
        isAdmin: false,
        customWidgetsEnabled: false,
        submittedItems: [],
        storedItems: [placement],
      }),
    ).not.toThrow();
    expect(() => throwIfCustomWidgetBoardDuplicationForbidden(true, false, [placement])).toThrowError(
      "temporarily disabled",
    );
  });
});
