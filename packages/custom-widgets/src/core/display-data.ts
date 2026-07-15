import { JSONPath } from "jsonpath-plus";

import type { DisplayConfig } from "./display-config-schema";
import type { CustomWidgetDisplayType } from "./schema-types";

export type ExtractedDisplayData = Record<string, unknown>;

const query = (json: unknown, path: string) => JSONPath({ path, json: json as object, wrap: false }) as unknown;

const queryRows = (json: unknown, path: string): unknown[] => {
  const rows = JSONPath({ path, json: json as object, wrap: true }) as unknown[];
  return Array.isArray(rows[0]) ? (rows[0] as unknown[]) : rows;
};

const toNumber = (value: unknown, fallback: number): number => Number(value) || fallback;

export function extractDisplayData(
  json: unknown,
  _displayType: CustomWidgetDisplayType,
  config: DisplayConfig,
): ExtractedDisplayData {
  switch (config.type) {
    case "singleValue":
      return {
        ...config,
        value: query(json, config.jsonPath),
        valueSize: config.valueSize ?? "lg",
        labelPosition: config.labelPosition ?? "below",
      };
    case "keyValue":
      return {
        type: config.type,
        entries: config.mappings.map((mapping) => ({ ...mapping, value: query(json, mapping.jsonPath) })),
        layout: config.layout ?? "list",
        columns: config.columns ?? 2,
      };
    case "table": {
      const rows = queryRows(json, config.tablePath);
      return {
        type: config.type,
        columns: config.columns.map((column) => column.header),
        rows: rows.map((row) => config.columns.map((column) => query(row, column.jsonPath))),
        striped: config.striped ?? true,
        compact: config.compact ?? false,
      };
    }
    case "statGrid":
      return {
        type: config.type,
        items: config.items.map((item) => ({
          ...item,
          color: item.color ?? "blue",
          value: query(json, item.jsonPath),
        })),
        columns: config.columns ?? 2,
        cardStyle: config.cardStyle ?? "filled",
      };
    case "progressBars":
      return {
        type: config.type,
        bars: config.bars.map((bar) => ({
          ...bar,
          color: bar.color ?? "blue",
          value: toNumber(query(json, bar.valuePath), 0),
          max: bar.maxPath ? toNumber(query(json, bar.maxPath), 100) : undefined,
        })),
        showPercentage: config.showPercentage ?? true,
        barSize: config.barSize ?? "md",
      };
    case "statusIndicator":
      return {
        type: config.type,
        items: config.items.map((item) => {
          const value = query(json, item.jsonPath);
          return {
            label: item.label,
            value: String(value ?? "unknown"),
            isGood: item.goodValues.some((good) => String(value).toLowerCase() === good.toLowerCase()),
          };
        }),
        layout: config.layout ?? "list",
        dotSize: config.dotSize ?? "md",
      };
    case "countGrid":
      return {
        type: config.type,
        items: config.items.map((item) => ({ ...item, value: query(json, item.jsonPath) })),
        columns: config.columns ?? 2,
        valueSize: config.valueSize ?? "md",
      };
    case "raw":
      return { type: config.type, data: query(json, config.jsonPath), maxHeight: config.maxHeight ?? 300 };
    case "actionButton":
      return {
        ...config,
        buttonColor: config.buttonColor ?? "blue",
        confirmText: config.confirmText ?? "",
        successMessage: config.successMessage ?? "",
      };
    case "customJsx":
      return {
        type: config.type,
        template: config.template,
        data: json,
        jsxApiVersion: "jsxApiVersion" in config ? config.jsxApiVersion : 1,
        requestCapabilities: Array.isArray(config.requests)
          ? config.requests.map(({ id, kind, method, minimumBoardPermission }) => ({
              id,
              kind,
              method,
              minimumBoardPermission,
            }))
          : [],
      };
  }
}

export const extractDisplayDataWithFallback = extractDisplayData;

export function extractActionButtonDisplay(config: DisplayConfig): ExtractedDisplayData {
  if (config.type !== "actionButton") throw new Error("Display configuration is not an action button");
  return extractDisplayData(null, "actionButton", config);
}
