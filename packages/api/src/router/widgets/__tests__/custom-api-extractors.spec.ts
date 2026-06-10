import { describe, expect, it } from "vitest";
import { JSONPath } from "jsonpath-plus";

import {
  sonarrResponse,
  sonarrStatGridConfig,
  proxmoxResponse,
  proxmoxProgressBarsConfig,
  diskUsageResponse,
  diskTableConfig,
  piholeResponse,
  piholeStatusIndicatorConfig,
  piholeCountGridConfig,
  radarrResponse,
  radarrStatGridConfig,
  jellyfinItemCountsResponse,
  jellyfinCountGridConfig,
} from "./custom-api-fixtures";

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
      rows: flatRows.map((row) =>
        columns.map((col) => JSONPath({ path: col.jsonPath, json: row as object, wrap: false })),
      ),
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
        value: JSONPath({ path: item.jsonPath, json: json as object, wrap: false }),
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
      const value = JSONPath({ path: bar.valuePath, json: json as object, wrap: false });
      const max = bar.maxPath ? JSONPath({ path: bar.maxPath, json: json as object, wrap: false }) : undefined;
      return {
        label: bar.label,
        unit: bar.unit,
        color: bar.color ?? "blue",
        value: Number(value) || 0,
        max: max !== undefined ? Number(max) || 100 : undefined,
      };
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
  customJsx: (json, config) => ({
    type: "customJsx" as const,
    template: config.template as string,
    data: json,
  }),
};

function extract(type: string, json: unknown, config: Record<string, unknown>) {
  const fn = extractors[type];
  if (!fn) throw new Error(`No extractor for type: ${type}`);
  return fn(json, config);
}

describe("custom-api extractors", () => {
  it("sonarr statGrid extracts missing and queue counts", () => {
    const result = extract("statGrid", sonarrResponse, sonarrStatGridConfig) as {
      type: string;
      items: Array<{ label: string; value: unknown; color: string }>;
    };

    expect(result.type).toBe("statGrid");
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.value).toBe(42);
    expect(result.items[0]?.label).toBe("Missing");
    expect(result.items[0]?.color).toBe("red");
    expect(result.items[1]?.value).toBe(5);
  });

  it("proxmox progressBars extracts memory and disk usage", () => {
    const result = extract("progressBars", proxmoxResponse, proxmoxProgressBarsConfig) as {
      type: string;
      bars: Array<{ label: string; value: number; max: number }>;
    };

    expect(result.type).toBe("progressBars");
    expect(result.bars).toHaveLength(2);
    expect(result.bars[0]?.value).toBe(12_884_901_888);
    expect(result.bars[0]?.max).toBe(34_359_738_368);
    expect(result.bars[1]?.label).toBe("Disk");
  });

  it("disk table extracts filesystem rows", () => {
    const result = extract("table", diskUsageResponse, diskTableConfig) as {
      type: string;
      columns: string[];
      rows: unknown[][];
    };

    expect(result.type).toBe("table");
    expect(result.columns).toEqual(["Mount", "Size", "Used"]);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]?.[0]).toBe("/");
    expect(result.rows[2]?.[2]).toBe("95%");
  });

  it("pihole statusIndicator detects enabled state", () => {
    const result = extract("statusIndicator", piholeResponse, piholeStatusIndicatorConfig) as {
      type: string;
      items: Array<{ label: string; value: string; isGood: boolean }>;
    };

    expect(result.type).toBe("statusIndicator");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.isGood).toBe(true);
    expect(result.items[0]?.value).toBe("enabled");
  });

  it("pihole countGrid extracts all 4 stats", () => {
    const result = extract("countGrid", piholeResponse, piholeCountGridConfig) as {
      type: string;
      items: Array<{ label: string; value: unknown; unit: string }>;
    };

    expect(result.type).toBe("countGrid");
    expect(result.items).toHaveLength(4);
    expect(result.items[0]?.value).toBe(12_847);
    expect(result.items[1]?.value).toBe(48_291);
    expect(result.items[2]?.value).toBe(26.6);
    expect(result.items[2]?.unit).toBe("%");
    expect(result.items[3]?.value).toBe(14);
  });

  it("radarr statGrid with outline card style", () => {
    const result = extract("statGrid", radarrResponse, radarrStatGridConfig) as {
      type: string;
      items: Array<{ label: string; value: unknown }>;
      cardStyle: string;
    };

    expect(result.type).toBe("statGrid");
    expect(result.cardStyle).toBe("outline");
    expect(result.items[0]?.value).toBe(15);
    expect(result.items[1]?.value).toBe(3);
  });

  it("raw extractor returns raw data at path", () => {
    const result = extract("raw", piholeResponse, { type: "raw", jsonPath: "$.status", maxHeight: 200 }) as {
      type: string;
      data: unknown;
      maxHeight: number;
    };

    expect(result.type).toBe("raw");
    expect(result.data).toBe("enabled");
    expect(result.maxHeight).toBe(200);
  });

  it("customJsx passes full JSON and template through", () => {
    const json = { title: "Status", items: [{ name: "CPU", value: 42 }] };
    const config = {
      type: "customJsx" as const,
      template: "<Stack><Title>{data.title}</Title></Stack>",
    };

    const result = extract("customJsx", json, config) as {
      type: string;
      template: string;
      data: typeof json;
    };

    expect(result.type).toBe("customJsx");
    expect(result.template).toBe(config.template);
    expect(result.data).toEqual(json);
  });

  it("jellyfin countGrid extracts movies/series/episodes/songs in 4-column grid", () => {
    const result = extract("countGrid", jellyfinItemCountsResponse, jellyfinCountGridConfig) as {
      type: string;
      items: Array<{ label: string; value: unknown; unit: string }>;
      columns: number;
      valueSize: string;
    };

    expect(result.type).toBe("countGrid");
    expect(result.columns).toBe(4);
    expect(result.valueSize).toBe("lg");
    expect(result.items).toHaveLength(4);
    expect(result.items[0]).toEqual({ label: "Movies", value: 185, unit: "" });
    expect(result.items[1]).toEqual({ label: "Series", value: 38, unit: "" });
    expect(result.items[2]).toEqual({ label: "Episodes", value: 770, unit: "" });
    expect(result.items[3]).toEqual({ label: "Songs", value: 0, unit: "" });
  });
});
