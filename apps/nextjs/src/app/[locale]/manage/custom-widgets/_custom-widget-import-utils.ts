export interface ImportReview {
  name: string;
  origin: string;
  authType: string;
  networkScope: string;
  methods: string[];
  permissions: string[];
  hasActions: boolean;
}

export function parseCustomWidgetClipboard(text: string): Record<string, unknown> | null {
  try {
    const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/iu)?.[1];
    const jsxBlock = text.match(/```(?:jsx|tsx)\s*([\s\S]*?)```/iu)?.[1]?.trim();
    const value: unknown = JSON.parse(jsonBlock ?? text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const widget = value as Record<string, unknown>;
    if (
      typeof widget.name !== "string" ||
      typeof widget.url !== "string" ||
      typeof widget.displayType !== "string" ||
      !widget.displayConfig ||
      typeof widget.displayConfig !== "object" ||
      Array.isArray(widget.displayConfig)
    ) {
      return null;
    }
    if (jsxBlock && widget.displayType === "customJsx") {
      const displayConfig = widget.displayConfig as Record<string, unknown>;
      if (displayConfig.template === "__HOMARR_TEMPLATE__" || !displayConfig.template) {
        displayConfig.template = jsxBlock;
      }
    }
    return widget;
  } catch {
    return null;
  }
}

export function getImportReview(value: Record<string, unknown> | null): ImportReview | null {
  if (!value) return null;
  const displayConfig = value.displayConfig as Record<string, unknown>;
  const requests = Array.isArray(displayConfig.requests)
    ? displayConfig.requests.filter(
        (request): request is Record<string, unknown> =>
          request !== null && typeof request === "object" && !Array.isArray(request),
      )
    : [];
  const baseMethod = typeof value.method === "string" ? value.method : "GET";
  const methods = [
    ...new Set([
      baseMethod,
      ...requests.map((request) => request.method).filter((method): method is string => typeof method === "string"),
    ]),
  ];
  const permissions = [
    ...new Set(
      requests
        .map((request) => request.minimumBoardPermission)
        .filter(
          (permission): permission is string =>
            permission === "view" || permission === "modify" || permission === "full",
        ),
    ),
  ];
  if (permissions.length === 0) permissions.push(baseMethod === "GET" ? "view" : "modify");

  let origin = value.url;
  try {
    origin = new URL(value.url as string).origin;
  } catch {
    // The server returns the localized validation error after confirmation.
  }

  return {
    name: value.name as string,
    origin: String(origin),
    authType: typeof value.authType === "string" ? value.authType : "none",
    networkScope: typeof displayConfig.networkScope === "string" ? displayConfig.networkScope : "legacy",
    methods,
    permissions,
    hasActions: methods.some((method) => method !== "GET"),
  };
}

export function buildDisplayFormValues(displayType: string, config: Record<string, unknown>) {
  const base = {
    displayType,
    jsonPath: "$",
    label: "",
    unit: "",
    valueSize: "lg",
    labelPosition: "below",
    mappings: [{ label: "", jsonPath: "$", unit: "" }],
    kvLayout: "list",
    kvColumns: 2,
    tablePath: "$",
    columns: [{ header: "", jsonPath: "$" }],
    striped: true,
    compact: false,
    statGridItems: [{ label: "", jsonPath: "$", unit: "", color: "blue" }],
    statGridColumns: 2,
    cardStyle: "filled",
    progressBars: [{ label: "", valuePath: "$", maxPath: "", unit: "", color: "blue" }],
    showPercentage: true,
    barSize: "md",
    statusItems: [{ label: "", jsonPath: "$", goodValues: "online,true" }],
    statusLayout: "list",
    dotSize: "md",
    countGridItems: [{ label: "", jsonPath: "$", unit: "" }],
    countGridColumns: 2,
    countValueSize: "md",
    rawJsonPath: "$",
    rawMaxHeight: 300,
    buttonLabel: "Execute",
    buttonColor: "blue",
    confirmText: "",
    successMessage: "",
    template: CUSTOM_JSX_STARTER,
    jsxApiVersion: "2",
    networkScope: "public",
    requestManifest: "[]",
  };

  const typeOverrides: Record<string, () => Record<string, unknown>> = {
    singleValue: () => ({
      jsonPath: (config.jsonPath as string) ?? "$",
      label: (config.label as string) ?? "",
      unit: (config.unit as string) ?? "",
      valueSize: (config.valueSize as string) ?? "lg",
      labelPosition: (config.labelPosition as string) ?? "below",
    }),
    keyValue: () => ({
      mappings: (config.mappings as typeof base.mappings) ?? base.mappings,
      kvLayout: (config.layout as string) ?? "list",
      kvColumns: (config.columns as number) ?? 2,
    }),
    table: () => ({
      tablePath: (config.tablePath as string) ?? "$",
      columns: (config.columns as typeof base.columns) ?? base.columns,
      striped: (config.striped as boolean) ?? true,
      compact: (config.compact as boolean) ?? false,
    }),
    statGrid: () => ({
      statGridItems: (config.items as typeof base.statGridItems) ?? base.statGridItems,
      statGridColumns: (config.columns as number) ?? 2,
      cardStyle: (config.cardStyle as string) ?? "filled",
    }),
    progressBars: () => ({
      progressBars: (
        (config.bars as Array<{ label: string; valuePath: string; maxPath?: string; unit: string; color?: string }>) ??
        []
      ).map((bar) => ({ ...bar, maxPath: bar.maxPath ?? "", color: bar.color ?? "blue" })),
      showPercentage: (config.showPercentage as boolean) ?? true,
      barSize: (config.barSize as string) ?? "md",
    }),
    statusIndicator: () => ({
      statusItems: ((config.items as Array<{ label: string; jsonPath: string; goodValues: string[] }>) ?? []).map(
        (item) => ({ ...item, goodValues: item.goodValues.join(", ") }),
      ),
      statusLayout: (config.layout as string) ?? "list",
      dotSize: (config.dotSize as string) ?? "md",
    }),
    countGrid: () => ({
      countGridItems: (config.items as typeof base.countGridItems) ?? base.countGridItems,
      countGridColumns: (config.columns as number) ?? 2,
      countValueSize: (config.valueSize as string) ?? "md",
    }),
    raw: () => ({
      rawJsonPath: (config.jsonPath as string) ?? "$",
      rawMaxHeight: (config.maxHeight as number) ?? 300,
    }),
    actionButton: () => ({
      buttonLabel: (config.buttonLabel as string) ?? "Execute",
      buttonColor: (config.buttonColor as string) ?? "blue",
      confirmText: (config.confirmText as string) ?? "",
      successMessage: (config.successMessage as string) ?? "",
    }),
    customJsx: () => ({
      template:
        typeof config.template === "string" && config.template.trim().length > 0 ? config.template : CUSTOM_JSX_STARTER,
      jsxApiVersion: String((config.jsxApiVersion as number | undefined) ?? 1),
      networkScope: (config.networkScope as string) ?? "public",
      requestManifest: JSON.stringify((config.requests as unknown[] | undefined) ?? [], null, 2),
    }),
  };

  return { ...base, ...typeOverrides[displayType]?.() };
}
import { customJsxExamples } from "@homarr/definitions";

export const CUSTOM_JSX_STARTER =
  customJsxExamples.find((example) => example.id === "simple-metric")?.template ??
  '<Stack align="center" justify="center" h="100%"><Text size="xs" c="dimmed">Connect data to begin</Text></Stack>';
