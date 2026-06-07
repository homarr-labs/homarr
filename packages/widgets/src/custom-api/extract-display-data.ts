import { JSONPath } from "jsonpath-plus";

const extractors: Record<string, (json: unknown, config: Record<string, unknown>) => unknown> = {
  singleValue: (json, c) => ({
    type: "singleValue",
    label: (c.label as string) ?? "",
    unit: (c.unit as string) ?? "",
    value: JSONPath({ path: (c.jsonPath as string) ?? "$", json: json as object, wrap: false }),
    valueSize: c.valueSize ?? "lg",
    labelPosition: c.labelPosition ?? "below",
  }),
  keyValue: (json, c) => ({
    type: "keyValue",
    entries: ((c.mappings as Array<{ label: string; jsonPath: string; unit: string }>) ?? []).map((m) => ({
      label: m.label,
      unit: m.unit,
      value: JSONPath({ path: m.jsonPath, json: json as object, wrap: false }),
    })),
    layout: c.layout ?? "list",
    columns: c.columns ?? 2,
  }),
  table: (json, c) => {
    const tablePath = (c.tablePath as string) ?? "$";
    const columns = (c.columns as Array<{ header: string; jsonPath: string }>) ?? [];
    const rows = JSONPath({ path: tablePath, json: json as object, wrap: true }) as unknown[];
    const flatRows = Array.isArray(rows[0]) ? (rows[0] as unknown[]) : rows;
    return {
      type: "table",
      columns: columns.map((col) => col.header),
      rows: flatRows.map((row) => columns.map((col) => JSONPath({ path: col.jsonPath, json: row as object, wrap: false }))),
      striped: c.striped ?? true,
      compact: c.compact ?? false,
    };
  },
  statGrid: (json, c) => ({
    type: "statGrid",
    items: ((c.items as Array<{ label: string; jsonPath: string; unit: string; color?: string }>) ?? []).map((item) => ({
      label: item.label,
      unit: item.unit,
      color: item.color ?? "blue",
      value: JSONPath({ path: item.jsonPath, json: json as object, wrap: false }),
    })),
    columns: c.columns ?? 2,
    cardStyle: c.cardStyle ?? "filled",
  }),
  progressBars: (json, c) => ({
    type: "progressBars",
    bars: ((c.bars as Array<{ label: string; valuePath: string; maxPath?: string; unit: string; color?: string }>) ?? []).map((bar) => {
      const value = JSONPath({ path: bar.valuePath, json: json as object, wrap: false });
      const max = bar.maxPath ? JSONPath({ path: bar.maxPath, json: json as object, wrap: false }) : undefined;
      return { label: bar.label, unit: bar.unit, color: bar.color ?? "blue", value: Number(value) || 0, max: max !== undefined ? Number(max) || 100 : undefined };
    }),
    showPercentage: c.showPercentage ?? true,
    barSize: c.barSize ?? "md",
  }),
  statusIndicator: (json, c) => ({
    type: "statusIndicator",
    items: ((c.items as Array<{ label: string; jsonPath: string; goodValues: string[] }>) ?? []).map((item) => {
      const value = JSONPath({ path: item.jsonPath, json: json as object, wrap: false });
      const isGood = item.goodValues.some((gv) => String(value).toLowerCase() === gv.toLowerCase());
      return { label: item.label, value: String(value ?? "unknown"), isGood };
    }),
    layout: c.layout ?? "list",
    dotSize: c.dotSize ?? "md",
  }),
  countGrid: (json, c) => ({
    type: "countGrid",
    items: ((c.items as Array<{ label: string; jsonPath: string; unit: string }>) ?? []).map((item) => ({
      label: item.label,
      unit: item.unit,
      value: JSONPath({ path: item.jsonPath, json: json as object, wrap: false }),
    })),
    columns: c.columns ?? 2,
    valueSize: c.valueSize ?? "md",
  }),
  raw: (json, c) => ({
    type: "raw",
    data: JSONPath({ path: (c.jsonPath as string) ?? "$", json: json as object, wrap: false }),
    maxHeight: c.maxHeight ?? 300,
  }),
  actionButton: (_json, c) => ({
    type: "actionButton",
    buttonLabel: c.buttonLabel ?? "Execute",
    buttonColor: c.buttonColor ?? "blue",
    confirmText: c.confirmText ?? "",
    successMessage: c.successMessage ?? "",
  }),
};

export function extractDisplayData(
  json: unknown,
  displayType: string,
  displayConfig: Record<string, unknown>,
): unknown {
  const type = (displayConfig.type as string) ?? displayType;
  const extractor = extractors[type] ?? extractors.singleValue!;
  return extractor(json, displayConfig);
}
