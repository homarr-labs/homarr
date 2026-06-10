import { JSONPath } from "jsonpath-plus";

type Config = Record<string, unknown>;
type Extractor = (json: unknown, config: Config) => unknown;

const query = (json: unknown, path: string) => JSONPath({ path, json: json as object, wrap: false });

const queryRows = (json: unknown, path: string): unknown[] => {
  const rows = JSONPath({ path, json: json as object, wrap: true }) as unknown[];
  const first = rows[0];
  if (Array.isArray(first)) return first as unknown[];
  return rows;
};

const toNumber = (value: unknown, fallback: number): number => {
  const num = Number(value);
  if (num) return num;
  return fallback;
};

const optionalMax = (max: unknown): number | undefined => {
  if (max === undefined) return undefined;
  return toNumber(max, 100);
};

const isGoodValue = (value: unknown, goodValues: string[]): boolean =>
  goodValues.some((gv) => String(value).toLowerCase() === gv.toLowerCase());

const extractors: Record<string, Extractor> = {
  singleValue: (json, c) => ({
    type: "singleValue",
    label: (c.label as string) ?? "",
    unit: (c.unit as string) ?? "",
    value: query(json, (c.jsonPath as string) ?? "$"),
    valueSize: c.valueSize ?? "lg",
    labelPosition: c.labelPosition ?? "below",
  }),
  keyValue: (json, c) => ({
    type: "keyValue",
    entries: ((c.mappings as Array<{ label: string; jsonPath: string; unit: string }>) ?? []).map((m) => ({
      label: m.label,
      unit: m.unit,
      value: query(json, m.jsonPath),
    })),
    layout: c.layout ?? "list",
    columns: c.columns ?? 2,
  }),
  table: (json, c) => {
    const columns = (c.columns as Array<{ header: string; jsonPath: string }>) ?? [];
    const flatRows = queryRows(json, (c.tablePath as string) ?? "$");
    return {
      type: "table",
      columns: columns.map((col) => col.header),
      rows: flatRows.map((row) => columns.map((col) => query(row, col.jsonPath))),
      striped: c.striped ?? true,
      compact: c.compact ?? false,
    };
  },
  statGrid: (json, c) => ({
    type: "statGrid",
    items: ((c.items as Array<{ label: string; jsonPath: string; unit: string; color?: string }>) ?? []).map(
      (item) => ({
        label: item.label,
        unit: item.unit,
        color: item.color ?? "blue",
        value: query(json, item.jsonPath),
      }),
    ),
    columns: c.columns ?? 2,
    cardStyle: c.cardStyle ?? "filled",
  }),
  progressBars: (json, c) => ({
    type: "progressBars",
    bars: (
      (c.bars as Array<{ label: string; valuePath: string; maxPath?: string; unit: string; color?: string }>) ?? []
    ).map((bar) => {
      const value = query(json, bar.valuePath);
      const max = bar.maxPath ? query(json, bar.maxPath) : undefined;
      return {
        label: bar.label,
        unit: bar.unit,
        color: bar.color ?? "blue",
        value: toNumber(value, 0),
        max: optionalMax(max),
      };
    }),
    showPercentage: c.showPercentage ?? true,
    barSize: c.barSize ?? "md",
  }),
  statusIndicator: (json, c) => ({
    type: "statusIndicator",
    items: ((c.items as Array<{ label: string; jsonPath: string; goodValues: string[] }>) ?? []).map((item) => {
      const value = query(json, item.jsonPath);
      return { label: item.label, value: String(value ?? "unknown"), isGood: isGoodValue(value, item.goodValues) };
    }),
    layout: c.layout ?? "list",
    dotSize: c.dotSize ?? "md",
  }),
  countGrid: (json, c) => ({
    type: "countGrid",
    items: ((c.items as Array<{ label: string; jsonPath: string; unit: string }>) ?? []).map((item) => ({
      label: item.label,
      unit: item.unit,
      value: query(json, item.jsonPath),
    })),
    columns: c.columns ?? 2,
    valueSize: c.valueSize ?? "md",
  }),
  raw: (json, c) => ({
    type: "raw",
    data: query(json, (c.jsonPath as string) ?? "$"),
    maxHeight: c.maxHeight ?? 300,
  }),
  actionButton: (_json, c) => ({
    type: "actionButton",
    buttonLabel: c.buttonLabel ?? "Execute",
    buttonColor: c.buttonColor ?? "blue",
    confirmText: c.confirmText ?? "",
    successMessage: c.successMessage ?? "",
  }),
  customJsx: (json, config) => ({
    type: "customJsx" as const,
    template: config.template as string,
    data: json,
  }),
};

export function extractDisplayData(json: unknown, displayType: string, displayConfig: Config): unknown {
  const type = (displayConfig.type as string) ?? displayType;
  const extractor = extractors[type];
  if (!extractor) {
    throw new Error(`Unknown display type: ${type}`);
  }
  return extractor(json, displayConfig);
}

export function extractDisplayDataWithFallback(json: unknown, displayType: string, displayConfig: Config): unknown {
  const type = (displayConfig.type as string) ?? displayType;
  const extractor = extractors[type] ?? extractors.singleValue;
  return extractor?.(json, displayConfig);
}

export function extractActionButtonDisplay(displayConfig: Config): unknown {
  return extractors.actionButton?.(null, displayConfig);
}
