import { describe, expect, test } from "vitest";

import {
  getEditableCanvasAttributes,
  getEditableGridCellAttributes,
  getReadonlyCanvasAttributes,
  getReadonlyGridItemAttributes,
} from "../index";

describe("dashboard layout semantics", () => {
  const placement = { id: "weather", x: 1, y: 2, w: 3, h: 2 };

  test("keeps read-only mode a native labelled region", () => {
    expect(getReadonlyCanvasAttributes({ label: "Home dashboard" })).toEqual({
      role: "region",
      "aria-label": "Home dashboard",
      "data-grid-readonly": "true",
    });
    expect(getReadonlyGridItemAttributes(placement)).toEqual({
      "data-grid-id": "weather",
      "data-grid-x": 1,
      "data-grid-y": 2,
      "data-grid-w": 3,
      "data-grid-h": 2,
    });
  });

  test("keeps edit mode a labelled region with spatial item metadata", () => {
    expect(
      getEditableCanvasAttributes({
        label: "Edit home dashboard",
        columnCount: 12,
        rowCount: 8,
      }),
    ).toEqual({
      role: "region",
      "aria-label": "Edit home dashboard",
      "data-grid-editable": "true",
    });

    expect(
      getEditableGridCellAttributes({
        label: "Weather widget",
        placement,
      }),
    ).toEqual({
      role: "group",
      "aria-label": "Weather widget",
      tabIndex: 0,
      "data-grid-id": "weather",
      "data-grid-x": 1,
      "data-grid-y": 2,
      "data-grid-w": 3,
      "data-grid-h": 2,
    });
  });
});
