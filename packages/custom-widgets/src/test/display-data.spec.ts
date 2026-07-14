import { describe, expect, test } from "vitest";

import { extractDisplayData } from "../core/display-data";
import type { DisplayConfig } from "../core/schema";

const response = {
  value: 42,
  status: "online",
  total: 100,
  rows: [
    { name: "Alpha", count: 2 },
    { name: "Beta", count: 3 },
  ],
};

const extract = (config: DisplayConfig) => extractDisplayData(response, config.type, config);

describe("display data extraction", () => {
  test("extracts a single value", () => {
    expect(extract({ type: "singleValue", jsonPath: "$.value", label: "Value", unit: "%" })).toMatchObject({
      type: "singleValue",
      value: 42,
      valueSize: "lg",
      labelPosition: "below",
    });
  });

  test("extracts key-value mappings", () => {
    expect(
      extract({
        type: "keyValue",
        mappings: [
          { label: "Value", jsonPath: "$.value", unit: "%" },
          { label: "Status", jsonPath: "$.status", unit: "" },
        ],
      }),
    ).toMatchObject({ entries: [{ value: 42 }, { value: "online" }], layout: "list", columns: 2 });
  });

  test("extracts table rows", () => {
    expect(
      extract({
        type: "table",
        tablePath: "$.rows",
        columns: [
          { header: "Name", jsonPath: "$.name" },
          { header: "Count", jsonPath: "$.count" },
        ],
      }),
    ).toMatchObject({
      columns: ["Name", "Count"],
      rows: [
        ["Alpha", 2],
        ["Beta", 3],
      ],
    });
  });

  test("extracts stat cards", () => {
    expect(
      extract({ type: "statGrid", items: [{ label: "Value", jsonPath: "$.value", unit: "", color: "red" }] }),
    ).toMatchObject({ items: [{ value: 42, color: "red" }], columns: 2, cardStyle: "filled" });
  });

  test("extracts progress values and maxima", () => {
    expect(
      extract({
        type: "progressBars",
        bars: [{ label: "Usage", valuePath: "$.value", maxPath: "$.total", unit: "%" }],
      }),
    ).toMatchObject({ bars: [{ value: 42, max: 100, color: "blue" }], showPercentage: true, barSize: "md" });
  });

  test("classifies status values", () => {
    expect(
      extract({
        type: "statusIndicator",
        items: [{ label: "Service", jsonPath: "$.status", goodValues: ["ONLINE"] }],
      }),
    ).toMatchObject({ items: [{ value: "online", isGood: true }], layout: "list", dotSize: "md" });
  });

  test("extracts count grids", () => {
    expect(extract({ type: "countGrid", items: [{ label: "Count", jsonPath: "$.value", unit: "" }] })).toMatchObject({
      items: [{ value: 42 }],
      columns: 2,
      valueSize: "md",
    });
  });

  test("extracts raw paths", () => {
    expect(extract({ type: "raw", jsonPath: "$.rows", maxHeight: 200 })).toEqual({
      type: "raw",
      data: response.rows,
      maxHeight: 200,
    });
  });

  test("normalizes action button defaults", () => {
    expect(extract({ type: "actionButton", buttonLabel: "Run" })).toEqual({
      type: "actionButton",
      buttonLabel: "Run",
      buttonColor: "blue",
      confirmText: "",
      successMessage: "",
    });
  });

  test("passes Custom JSX data and capabilities through", () => {
    expect(
      extract({
        type: "customJsx",
        jsxApiVersion: 2,
        template: "<Text>{data.value}</Text>",
        networkScope: "public",
        requests: [
          {
            id: "detail",
            kind: "query",
            method: "GET",
            pathTemplate: "/detail",
            parameters: {},
            auth: "none",
            minimumBoardPermission: "view",
          },
        ],
      }),
    ).toMatchObject({
      type: "customJsx",
      data: response,
      jsxApiVersion: 2,
      requestCapabilities: [{ id: "detail", kind: "query", method: "GET", minimumBoardPermission: "view" }],
    });
  });
});
