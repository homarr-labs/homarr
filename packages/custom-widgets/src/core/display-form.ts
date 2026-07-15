import { customJsxExamples } from "./examples";
import { customJsxRequestSchema, displayConfigSchema } from "./schema";
import type { DisplayConfig } from "./schema";
import type { CustomWidgetDisplayType } from "./schema";

function hydrateDisplayFormValues(displayType: string, config: Record<string, unknown>) {
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
const starterExample = customJsxExamples.find((example) => example.id === "simple-metric");
if (!starterExample) throw new Error("The simple-metric Custom JSX fixture is required");
export const CUSTOM_JSX_STARTER = starterExample.template;

export type CustomWidgetDisplayFormValues = ReturnType<typeof hydrateDisplayFormValues>;

const displayConfigBuilders: Record<string, (values: CustomWidgetDisplayFormValues) => Record<string, unknown>> = {
  singleValue: (values) => ({
    type: "singleValue",
    jsonPath: values.jsonPath,
    label: values.label,
    unit: values.unit,
    valueSize: values.valueSize,
    labelPosition: values.labelPosition,
  }),
  keyValue: (values) => ({
    type: "keyValue",
    mappings: values.mappings,
    layout: values.kvLayout,
    columns: values.kvColumns,
  }),
  table: (values) => ({
    type: "table",
    tablePath: values.tablePath,
    columns: values.columns,
    striped: values.striped,
    compact: values.compact,
  }),
  statGrid: (values) => ({
    type: "statGrid",
    items: values.statGridItems,
    columns: values.statGridColumns,
    cardStyle: values.cardStyle,
  }),
  progressBars: (values) => ({
    type: "progressBars",
    bars: values.progressBars.map((bar) => ({ ...bar, maxPath: bar.maxPath || undefined })),
    showPercentage: values.showPercentage,
    barSize: values.barSize,
  }),
  statusIndicator: (values) => ({
    type: "statusIndicator",
    items: values.statusItems.map((item) => ({
      ...item,
      goodValues: item.goodValues
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    })),
    layout: values.statusLayout,
    dotSize: values.dotSize,
  }),
  countGrid: (values) => ({
    type: "countGrid",
    items: values.countGridItems,
    columns: values.countGridColumns,
    valueSize: values.countValueSize,
  }),
  raw: (values) => ({ type: "raw", jsonPath: values.rawJsonPath, maxHeight: values.rawMaxHeight }),
  actionButton: (values) => ({
    type: "actionButton",
    buttonLabel: values.buttonLabel,
    buttonColor: values.buttonColor,
    confirmText: values.confirmText || undefined,
    successMessage: values.successMessage || undefined,
  }),
  customJsx: (values) =>
    values.jsxApiVersion === "2"
      ? {
          type: "customJsx",
          jsxApiVersion: 2,
          template: values.template.trim() || CUSTOM_JSX_STARTER,
          networkScope: values.networkScope,
          requests: parseRequestManifest(values.requestManifest),
        }
      : { type: "customJsx", template: values.template.trim() || CUSTOM_JSX_STARTER },
};

export type CustomWidgetDisplayIcon =
  | "action"
  | "code"
  | "count"
  | "grid"
  | "json"
  | "keyValue"
  | "number"
  | "progress"
  | "status"
  | "table";

export interface CustomWidgetDisplayDescriptor {
  type: CustomWidgetDisplayType;
  icon: CustomWidgetDisplayIcon;
  supportsActions: boolean;
  supportsNamedRequests: boolean;
  defaults(): CustomWidgetDisplayFormValues;
  hydrate(config: Record<string, unknown>): CustomWidgetDisplayFormValues;
  serialize(values: CustomWidgetDisplayFormValues): DisplayConfig;
  validate(config: unknown): DisplayConfig;
}

const descriptorMetadata = [
  ["singleValue", "number", false, false],
  ["keyValue", "keyValue", false, false],
  ["table", "table", false, false],
  ["statGrid", "grid", false, false],
  ["progressBars", "progress", false, false],
  ["statusIndicator", "status", false, false],
  ["countGrid", "count", false, false],
  ["raw", "json", false, false],
  ["actionButton", "action", true, false],
  ["customJsx", "code", true, true],
] as const satisfies readonly [CustomWidgetDisplayType, CustomWidgetDisplayIcon, boolean, boolean][];

export const customWidgetDisplayDescriptors: readonly CustomWidgetDisplayDescriptor[] = descriptorMetadata.map(
  ([type, icon, supportsActions, supportsNamedRequests]) => ({
    type,
    icon,
    supportsActions,
    supportsNamedRequests,
    defaults: () => hydrateDisplayFormValues(type, {}),
    hydrate: (config) => hydrateDisplayFormValues(type, config),
    serialize: (values) => {
      const build = displayConfigBuilders[type];
      if (!build) throw new Error(`Unsupported custom-widget display type: ${type}`);
      return displayConfigSchema.parse(build(values));
    },
    validate: (config) => displayConfigSchema.parse(config),
  }),
);

export function getCustomWidgetDisplayDescriptor(type: string): CustomWidgetDisplayDescriptor {
  const descriptor = customWidgetDisplayDescriptors.find((candidate) => candidate.type === type);
  if (!descriptor) throw new Error(`Unsupported custom-widget display type: ${type}`);
  return descriptor;
}

export function buildDisplayFormValues(displayType: string, config: Record<string, unknown>) {
  return getCustomWidgetDisplayDescriptor(displayType).hydrate(config);
}

export function buildDisplayConfigFromFormValues(values: CustomWidgetDisplayFormValues): DisplayConfig {
  return getCustomWidgetDisplayDescriptor(values.displayType).serialize(values);
}

function parseRequestManifest(value: string) {
  const parsed: unknown = JSON.parse(value);
  return customJsxRequestSchema.array().parse(parsed);
}
