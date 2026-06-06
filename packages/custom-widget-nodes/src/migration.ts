import type { FlowGraph } from "./types";

interface FlatDefinition {
  baseUrl: string;
  endpoint: string;
  method: string;
  authType: string;
  headerName?: string | null;
  displayType: string;
  displayConfig: string;
}

interface FlatDisplayConfig {
  type: string;
  jsonPath?: string;
  label?: string;
  unit?: string;
  mappings?: Array<{ label: string; jsonPath: string; unit: string }>;
  tablePath?: string;
  columns?: Array<{ header: string; jsonPath: string }>;
}

const displayNodeBuilders: Record<
  string,
  (config: FlatDisplayConfig) => { type: string; data: Record<string, unknown> }
> = {
  singleValue: (config) => ({
    type: "singleValue",
    data: {
      label: config.label ?? "",
      unit: config.unit ?? "",
    },
  }),
  keyValue: (config) => ({
    type: "keyValue",
    data: {
      labels: (config.mappings ?? []).map((m) => m.label),
      units: (config.mappings ?? []).map((m) => m.unit),
    },
  }),
  table: (config) => ({
    type: "table",
    data: {
      columns: (config.columns ?? []).map((c) => ({
        header: c.header,
        accessor: c.jsonPath,
      })),
    },
  }),
};

export const flatDefinitionToFlowGraph = (def: FlatDefinition): FlowGraph => {
  let parsedConfig: FlatDisplayConfig;
  try {
    const parsed = JSON.parse(def.displayConfig);
    parsedConfig = parsed.json ?? parsed;
  } catch {
    parsedConfig = { type: def.displayType };
  }

  const httpNodeId = "http_1";
  const jsonPathNodeId = "jsonpath_1";
  const displayNodeId = "display_1";

  const fullUrl = new URL(def.endpoint, def.baseUrl).toString();

  const httpNode = {
    id: httpNodeId,
    type: "httpRequest",
    position: { x: 250, y: 50 },
    data: {
      label: "HTTP Request",
      url: fullUrl,
      method: def.method,
      authType: def.authType,
      headerName: def.headerName ?? undefined,
    } as Record<string, unknown>,
  };

  const jsonPathExpression = parsedConfig.jsonPath ?? parsedConfig.tablePath ?? "$";
  const jsonPathNode = {
    id: jsonPathNodeId,
    type: "jsonPath",
    position: { x: 250, y: 200 },
    data: {
      label: "JSONPath Extract",
      expression: jsonPathExpression,
      wrap: def.displayType === "table",
    } as Record<string, unknown>,
  };

  const displayBuilder = displayNodeBuilders[def.displayType] ?? displayNodeBuilders.singleValue!;
  const displayDef = displayBuilder!(parsedConfig);
  const displayNode = {
    id: displayNodeId,
    type: displayDef.type,
    position: { x: 250, y: 350 },
    data: { label: displayDef.type, ...displayDef.data },
  };

  return {
    nodes: [httpNode, jsonPathNode, displayNode],
    edges: [
      {
        id: "edge_1",
        source: httpNodeId,
        target: jsonPathNodeId,
        sourceHandle: "response",
        targetHandle: "json",
      },
      {
        id: "edge_2",
        source: jsonPathNodeId,
        target: displayNodeId,
        sourceHandle: "value",
        targetHandle: def.displayType === "table" ? "rows" : def.displayType === "keyValue" ? "entries" : "value",
      },
    ],
  };
};
