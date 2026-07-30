import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import * as Charts from "@mantine/charts";
import * as Core from "@mantine/core";
import * as Dates from "@mantine/dates";
import ts from "typescript";

import {
  CUSTOM_JSX_AUTHORING_CATALOG_SCHEMA_VERSION,
  CUSTOM_WIDGET_AUTHORING_VERSION,
} from "../src/core/component-catalog-types";
import type {
  CustomJsxAuthoringCatalog,
  CustomJsxBlockedCapability,
  CustomJsxCatalogBindingType,
  CustomJsxComponentApi,
  CustomJsxLiteralValue,
  CustomJsxPropDescriptor,
  CustomJsxPropSource,
} from "../src/core/component-catalog-types";
import { getCatalogBlockedComponentProps, getCatalogDeniedComponentReason } from "../src/core/component-catalog-policy";
import { commonSafeProps } from "../src/core/component-props";
import { accessibilityByCategory, documentationUrl, subcomponentsByName } from "../src/core/component-descriptor";
import { discoveredMantineComponents, discoveredSubcomponentsByName } from "../src/core/component-discovery";
import type {
  CustomJsxComponentCategory,
  CustomJsxComponentPackage,
  CustomJsxComponentSafety,
} from "../src/core/component-types";
import {
  CUSTOM_JSX_BLOCKED_PROPERTIES,
  CUSTOM_JSX_BLOCKED_PROPS,
  CUSTOM_JSX_BLOCKED_STYLE_KEYS,
  isBlockedCustomJsxProp,
} from "../src/jsx/policy";

void [Core, Dates, Charts];

const packageRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(packageRoot, "../..");
const configPath = resolve(packageRoot, "tsconfig.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, packageRoot);
const program = ts.createProgram({ rootNames: [...config.fileNames, import.meta.filename], options: config.options });
const checker = program.getTypeChecker();
const source = program.getSourceFile(import.meta.filename);
if (!source) throw new Error("Unable to inspect the component catalog generator");

const moduleSymbols = new Map<string, ts.Symbol>();
for (const declaration of source.statements) {
  if (!ts.isImportDeclaration(declaration) || !ts.isStringLiteral(declaration.moduleSpecifier)) continue;
  const moduleName = declaration.moduleSpecifier.text;
  if (!moduleName.startsWith("@mantine/")) continue;
  const symbol = checker.getSymbolAtLocation(declaration.moduleSpecifier);
  if (symbol) moduleSymbols.set(moduleName, symbol);
}

type UninternedPropDescriptor = Omit<CustomJsxPropDescriptor, "typeRef"> & { type: string };
type UninternedComponentApi = Omit<CustomJsxComponentApi, "props"> & { props: UninternedPropDescriptor[] };

interface InspectedProp extends UninternedPropDescriptor {
  global: boolean;
}

interface InspectedComponent {
  description?: string;
  props: InspectedProp[];
}

interface CatalogSourceComponent {
  name: string;
  package: CustomJsxComponentPackage;
  category: CustomJsxComponentCategory;
  safety: CustomJsxComponentSafety;
  subcomponents: readonly string[];
  accessibilityRequirements: readonly string[];
  documentationUrl: string;
  reason?: string;
}

const commonPropNames = new Set<string>(commonSafeProps);
const inspectedComponents = new Map<string, InspectedComponent>();
const globalCandidates = new Map<string, UninternedPropDescriptor[]>();

async function generateCatalog() {
  const sourceComponents = createSourceComponents();
  for (const component of sourceComponents) {
    if (component.package === "@homarr/widgets" || component.safety === "denied") continue;
    const inspected = inspectMantineComponent(component);
    inspectedComponents.set(component.name, inspected);
    for (const prop of inspected.props) {
      if (!prop.global) continue;
      const candidates = globalCandidates.get(prop.name) ?? [];
      const { global: _global, ...descriptor } = prop;
      candidates.push({ ...descriptor, source: "global" });
      globalCandidates.set(prop.name, candidates);
    }
  }

  for (const name of commonSafeProps) {
    const candidates = globalCandidates.get(name) ?? [];
    if (candidates.length === 0) candidates.push(createFallbackProp(name, "global"));
    globalCandidates.set(name, candidates);
  }

  const uninternedGlobalProps = [...globalCandidates.entries()]
    .map(([name, candidates]) => mergeGlobalProp(name, candidates))
    .toSorted((left, right) => compareStrings(left.name, right.name));
  const globalPropsByName = new Map(uninternedGlobalProps.map((prop) => [prop.name, prop]));

  const uninternedComponents = sourceComponents
    .map((component) => buildComponentApi(component, globalPropsByName))
    .toSorted((left, right) => compareStrings(left.name, right.name));
  const types = [
    ...new Set([
      ...uninternedGlobalProps.map(({ type }) => type),
      ...uninternedComponents.flatMap(({ props }) => props.map(({ type }) => type)),
    ]),
  ].toSorted(compareStrings);
  const typeReferences = new Map(types.map((type, index) => [type, index]));
  const internProp = ({ type, ...prop }: UninternedPropDescriptor): CustomJsxPropDescriptor => {
    const typeRef = typeReferences.get(type);
    if (typeRef === undefined) throw new Error(`Unable to intern prop type '${type}'`);
    return { ...prop, typeRef };
  };
  const globalProps = uninternedGlobalProps.map(internProp);
  const components = uninternedComponents.map(
    (component): CustomJsxComponentApi => ({ ...component, props: component.props.map(internProp) }),
  );

  const mantineVersions = await Promise.all(
    ["core", "dates", "charts"].map((packageName) =>
      readPackageVersion(resolve(repositoryRoot, `node_modules/@mantine/${packageName}/package.json`)),
    ),
  );
  if (new Set(mantineVersions).size !== 1) {
    throw new Error(`Mantine package versions must match: ${mantineVersions.join(", ")}`);
  }
  const mantineVersion = mantineVersions[0];
  if (!mantineVersion) throw new Error("Unable to determine the installed Mantine version");

  const catalog: CustomJsxAuthoringCatalog = {
    schemaVersion: CUSTOM_JSX_AUTHORING_CATALOG_SCHEMA_VERSION,
    mantineVersion,
    customWidgetVersion: CUSTOM_WIDGET_AUTHORING_VERSION,
    types,
    globalProps,
    blockedCapabilities: createBlockedCapabilities(),
    components,
  };

  const serialized = `${JSON.stringify(catalog)}\n`;
  await Promise.all([
    writeFile(resolve(packageRoot, "src/core/component-catalog.generated.json"), serialized),
    writeFile(resolve(repositoryRoot, "apps/docs/static/custom-widgets/component-catalog-v1.json"), serialized),
  ]);
}

function inspectMantineComponent(component: CatalogSourceComponent): InspectedComponent {
  const moduleSymbol = moduleSymbols.get(component.package);
  const rootName = component.name.split(".")[0];
  let symbol =
    moduleSymbol && checker.getExportsOfModule(moduleSymbol).find((candidate) => candidate.name === rootName);
  let location = symbol?.valueDeclaration ?? symbol?.declarations?.[0] ?? source;
  let type = symbol && checker.getTypeOfSymbolAtLocation(symbol, location);
  for (const segment of component.name.split(".").slice(1)) {
    symbol = type?.getProperty(segment);
    if (!symbol) break;
    location = symbol.valueDeclaration ?? symbol.declarations?.[0] ?? location;
    type = checker.getTypeOfSymbolAtLocation(symbol, location);
  }

  const signature = type?.getCallSignatures()[0] ?? type?.getConstructSignatures()[0];
  const parameter = signature?.parameters[0];
  const propType = parameter && checker.getTypeOfSymbolAtLocation(parameter, parameter.valueDeclaration ?? location);
  const props = propType
    ? checker
        .getPropertiesOfType(propType)
        .flatMap((prop): InspectedProp[] => {
          const declaration = prop.valueDeclaration ?? prop.declarations?.[0] ?? location;
          const resolvedType = checker.getTypeOfSymbolAtLocation(prop, declaration);
          if (prop.name === "bind" || isBlockedCustomJsxProp(prop.name) || isCallableType(resolvedType)) return [];
          const global = isGlobalProp(prop);
          return [createPropDescriptor(prop, resolvedType, declaration, global ? "global" : "component", global)];
        })
        .toSorted((left, right) => compareStrings(left.name, right.name))
    : [];
  return {
    description: normalizeDescription(symbol && ts.displayPartsToString(symbol.getDocumentationComment(checker))),
    props,
  };
}

function createSourceComponents(): CatalogSourceComponent[] {
  const mantineComponents = discoveredMantineComponents.map((component): CatalogSourceComponent => {
    const reason = getCatalogDeniedComponentReason(component.name);
    const category = reason ? ("blocked" as const) : component.category;
    return {
      name: component.name,
      package: component.package,
      category,
      safety: reason ? "denied" : "wrapped",
      subcomponents: discoveredSubcomponentsByName[component.name] ?? subcomponentsByName[component.name] ?? [],
      accessibilityRequirements: accessibilityByCategory[category],
      documentationUrl: documentationUrl(component.package, component.name),
      ...(reason ? { reason } : {}),
    };
  });
  const homarrComponents = HOMARR_COMPONENT_DEFINITIONS.map(
    ({ name, category, safety }): CatalogSourceComponent => ({
      name,
      package: "@homarr/widgets",
      category,
      safety,
      subcomponents: [],
      accessibilityRequirements: accessibilityByCategory[category],
      documentationUrl: documentationUrl("@homarr/widgets", name),
    }),
  );
  return [...mantineComponents, ...homarrComponents];
}

function buildComponentApi(
  component: CatalogSourceComponent,
  globalPropsByName: ReadonlyMap<string, UninternedPropDescriptor>,
): UninternedComponentApi {
  const blockedProps = getCatalogBlockedComponentProps(component.name);
  const blockedPropNames = new Set(blockedProps.map(({ name }) => name));
  const globalNames = new Set(globalPropsByName.keys());
  const inspected = inspectedComponents.get(component.name);
  const componentProps = new Map<string, UninternedPropDescriptor>();
  for (const prop of inspected?.props ?? []) {
    if (blockedPropNames.has(prop.name)) continue;
    const { global: _global, ...descriptor } = prop;
    const componentDescriptor = { ...descriptor, source: "component" as const };
    const globalProp = globalNames.has(prop.name) ? globalPropsByName.get(prop.name) : undefined;
    if (globalProp && samePropMetadata(globalProp, componentDescriptor)) continue;
    componentProps.set(prop.name, componentDescriptor);
  }
  if (component.safety !== "denied" && component.package === "@homarr/widgets") {
    const homarrProps = HOMARR_COMPONENT_PROPS[component.name];
    if (!homarrProps) throw new Error(`Homarr component '${component.name}' requires explicit catalog prop metadata`);
    for (const [propName, metadata] of Object.entries(homarrProps)) {
      const globalProp = globalPropsByName.get(propName);
      if (globalProp && samePropMetadata(globalProp, metadata)) continue;
      if (isBlockedCustomJsxProp(propName)) continue;
      componentProps.set(propName, { name: propName, source: "component", ...metadata });
    }
  }

  const bindType = component.safety !== "denied" ? CUSTOM_JSX_BINDING_TYPES[component.name] : undefined;
  const description = inspected?.description ?? HOMARR_COMPONENT_DESCRIPTIONS[component.name];
  return {
    name: component.name,
    package: component.package,
    category: component.category,
    safety: component.safety,
    ...(description ? { description } : {}),
    documentationUrl: component.documentationUrl,
    props: [...componentProps.values()].toSorted((left, right) => compareStrings(left.name, right.name)),
    blockedProps: [...blockedProps].toSorted((left, right) => compareStrings(left.name, right.name)),
    subcomponents: [...component.subcomponents].toSorted(),
    ...(bindType
      ? {
          bind: {
            type: bindType,
            initialProp: bindType === "boolean" ? ("defaultChecked" as const) : ("defaultValue" as const),
          },
        }
      : {}),
    accessibilityRequirements: [...component.accessibilityRequirements],
    ...(component.safety === "denied" && component.reason ? { deniedReason: component.reason } : {}),
  };
}

function createPropDescriptor(
  prop: ts.Symbol,
  type: ts.Type,
  declaration: ts.Node,
  sourceKind: CustomJsxPropSource,
  global: boolean,
): InspectedProp {
  const literalValues = getLiteralValues(type);
  const description = normalizeDescription(ts.displayPartsToString(prop.getDocumentationComment(checker)));
  return {
    name: prop.name,
    type: simplifyType(type, declaration),
    required: (prop.flags & ts.SymbolFlags.Optional) === 0 && !containsUndefined(type),
    source: sourceKind,
    ...(literalValues ? { literalValues } : {}),
    ...(description ? { description } : {}),
    global,
  };
}

function createFallbackProp(name: string, sourceKind: CustomJsxPropSource): UninternedPropDescriptor {
  const literalValues = FALLBACK_LITERAL_VALUES[name];
  return {
    name,
    type: FALLBACK_PROP_TYPES[name] ?? inferFallbackType(name),
    required: false,
    source: sourceKind,
    ...(literalValues ? { literalValues: [...literalValues] } : {}),
    ...(FALLBACK_PROP_DESCRIPTIONS[name] ? { description: FALLBACK_PROP_DESCRIPTIONS[name] } : {}),
  };
}

function mergeGlobalProp(name: string, candidates: UninternedPropDescriptor[]): UninternedPropDescriptor {
  const fallback = createFallbackProp(name, "global");
  const type = mostFrequent(candidates.map((candidate) => candidate.type)) ?? fallback.type;
  const descriptions = candidates.flatMap(({ description }) => (description ? [description] : []));
  const literalValues = uniqueLiterals(candidates.flatMap(({ literalValues }) => literalValues ?? []));
  return {
    name,
    type,
    required: false,
    source: "global",
    ...(literalValues.length > 0 ? { literalValues } : {}),
    ...((mostFrequent(descriptions) ?? fallback.description)
      ? { description: mostFrequent(descriptions) ?? fallback.description }
      : {}),
  };
}

function samePropMetadata(globalProp: UninternedPropDescriptor, componentProp: HomarrPropMetadata): boolean {
  return (
    globalProp.type === componentProp.type &&
    globalProp.required === componentProp.required &&
    JSON.stringify(globalProp.literalValues ?? []) === JSON.stringify(componentProp.literalValues ?? [])
  );
}

function isCallableType(type: ts.Type): boolean {
  if (type.getCallSignatures().length > 0) return true;
  return type.isUnionOrIntersection() && type.types.some(isCallableType);
}

function isGlobalProp(prop: ts.Symbol): boolean {
  if (commonPropNames.has(prop.name)) return true;
  return (prop.declarations ?? []).some((declaration) => {
    const path = declaration.getSourceFile().fileName.replaceAll("\\", "/");
    return path.includes("/node_modules/@types/react/") || path.includes("/@mantine/core/lib/core/Box/");
  });
}

function containsUndefined(type: ts.Type): boolean {
  if ((type.flags & ts.TypeFlags.Undefined) !== 0) return true;
  return type.isUnion() && type.types.some(containsUndefined);
}

function simplifyType(type: ts.Type, declaration: ts.Node): string {
  const withoutUndefined = type.isUnion()
    ? type.types.filter((part) => (part.flags & ts.TypeFlags.Undefined) === 0)
    : [type];
  const simplified = withoutUndefined.map(simpleTypeName);
  if (simplified.every((value): value is string => value !== null)) return [...new Set(simplified)].join(" | ");

  const rendered = checker
    .typeToString(type, declaration, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope)
    .replace(/\s+/gu, " ")
    .replace(/\s*\|\s*undefined\b/gu, "")
    .trim();
  if (rendered.length <= 240) return rendered === "any" ? "unknown" : rendered;
  const alias = type.aliasSymbol?.name;
  if (alias && !alias.startsWith("__")) return alias;
  return inferWideType(type);
}

function simpleTypeName(type: ts.Type): string | null {
  if ((type.flags & ts.TypeFlags.String) !== 0) return "string";
  if ((type.flags & ts.TypeFlags.Number) !== 0) return "number";
  if ((type.flags & ts.TypeFlags.Boolean) !== 0) return "boolean";
  if ((type.flags & ts.TypeFlags.Null) !== 0) return "null";
  if ((type.flags & ts.TypeFlags.StringLiteral) !== 0) return JSON.stringify((type as ts.StringLiteralType).value);
  if ((type.flags & ts.TypeFlags.NumberLiteral) !== 0) return String((type as ts.NumberLiteralType).value);
  if ((type.flags & ts.TypeFlags.BooleanLiteral) !== 0)
    return (type as ts.Type & { intrinsicName?: string }).intrinsicName ?? "boolean";
  return null;
}

function inferWideType(type: ts.Type): string {
  const parts = type.isUnionOrIntersection() ? type.types : [type];
  const kinds = new Set(
    parts.map((part) => {
      if ((part.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLiteral)) !== 0) return "string";
      if ((part.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral)) !== 0) return "number";
      if ((part.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) !== 0) return "boolean";
      if ((part.flags & ts.TypeFlags.Null) !== 0) return "null";
      return "object";
    }),
  );
  return [...kinds].toSorted().join(" | ") || "unknown";
}

function getLiteralValues(type: ts.Type): CustomJsxLiteralValue[] | undefined {
  const values: CustomJsxLiteralValue[] = [];
  let hasNonLiteralValue = false;
  const visit = (candidate: ts.Type) => {
    if (candidate.isUnion()) {
      candidate.types.forEach(visit);
      return;
    }
    if ((candidate.flags & ts.TypeFlags.StringLiteral) !== 0) values.push((candidate as ts.StringLiteralType).value);
    else if ((candidate.flags & ts.TypeFlags.NumberLiteral) !== 0)
      values.push((candidate as ts.NumberLiteralType).value);
    else if ((candidate.flags & ts.TypeFlags.BooleanLiteral) !== 0)
      values.push((candidate as ts.Type & { intrinsicName?: string }).intrinsicName === "true");
    else if ((candidate.flags & ts.TypeFlags.Null) !== 0) values.push(null);
    else if ((candidate.flags & ts.TypeFlags.Undefined) === 0) hasNonLiteralValue = true;
  };
  visit(type);
  const unique = uniqueLiterals(values);
  if (hasNonLiteralValue && unique.every((value) => value === null || typeof value === "boolean")) return undefined;
  return unique.length > 0 && unique.length <= 64 ? unique : undefined;
}

function uniqueLiterals(values: CustomJsxLiteralValue[]): CustomJsxLiteralValue[] {
  return [...new Map(values.map((value) => [`${typeof value}:${String(value)}`, value])).values()].toSorted(
    (left, right) => compareStrings(String(left), String(right)),
  );
}

function normalizeDescription(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/gu, " ").trim();
  return normalized || undefined;
}

function mostFrequent(values: string[]): string | undefined {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].toSorted(
    ([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || leftValue.length - rightValue.length || compareStrings(leftValue, rightValue),
  )[0]?.[0];
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function inferFallbackType(name: string): string {
  if (/^(?:is|has|with|allow|disabled|readOnly|loading|opened|checked|multiple|grow|wrap|striped|animated)/u.test(name))
    return "boolean";
  if (/^(?:count|index|max|min|offset|order|page|pageSize|size|span|step|total|value)$/u.test(name)) return "number";
  if (/^(?:colors|values|sections|data)$/u.test(name)) return "unknown[]";
  if (/^(?:children|description|fallback|icon|label|leftSection|rightSection|title)$/u.test(name)) return "ReactNode";
  if (/^(?:params|enabledParams|disabledParams|style|styles)$/u.test(name)) return "Record<string, unknown>";
  return "string | number | boolean";
}

function createBlockedCapabilities(): CustomJsxBlockedCapability[] {
  const exactNames = new Set([
    ...CUSTOM_JSX_BLOCKED_PROPS,
    ...CUSTOM_JSX_BLOCKED_STYLE_KEYS,
    ...[...CUSTOM_JSX_BLOCKED_PROPERTIES].filter((name) => name !== "bind"),
  ]);
  return [
    ...[...exactNames].toSorted().map(
      (name): CustomJsxBlockedCapability => ({
        kind: "prop",
        name,
        reason: blockedPropReason(name),
      }),
    ),
    {
      kind: "prop-pattern",
      name: "on*",
      reason: "Authored event callbacks can execute code outside the declarative runtime.",
    },
    {
      kind: "prop-pattern",
      name: "*Ref",
      reason: "Refs expose underlying React components and DOM nodes.",
    },
    {
      kind: "prop-pattern",
      name: "__*",
      reason: "Private and prototype-related properties are outside the supported authoring surface.",
    },
  ];
}

function blockedPropReason(name: string): string {
  if (["component", "renderRoot"].includes(name))
    return "Polymorphic roots can replace the Homarr-owned element boundary.";
  if (["portalProps", "popoverTarget", "popoverTargetAction", "withinPortal"].includes(name))
    return "Portal targeting can render or interact outside the widget root.";
  if (["dangerouslySetInnerHTML", "srcDoc"].includes(name))
    return "Raw HTML injection is not available to authored widgets.";
  if (["className", "classNames", "classes"].includes(name))
    return "Unscoped class injection can escape widget CSS isolation.";
  if (name === "children") return "Children must be expressed as interpreted JSX, not passed as a raw prop.";
  if (name.toLowerCase().includes("ref")) return "Refs expose underlying React components and DOM nodes.";
  if (name.startsWith("form")) return "External form submission is outside the named-request security boundary.";
  return "This capability is blocked by the Custom JSX safety boundary.";
}

async function readPackageVersion(path: string): Promise<string> {
  const parsed = JSON.parse(await readFile(path, "utf8")) as { version?: unknown };
  if (typeof parsed.version !== "string") throw new Error(`Package at ${path} does not declare a version`);
  return parsed.version;
}

const HOMARR_COMPONENT_DEFINITIONS = [
  { name: "PaginatedList", category: "interaction", safety: "allowed" },
  { name: "TabsContainer", category: "interaction", safety: "allowed" },
  { name: "TabPanel", category: "interaction", safety: "allowed" },
  { name: "Collapsible", category: "interaction", safety: "allowed" },
  { name: "StatBar", category: "interaction", safety: "allowed" },
  { name: "TypeBadge", category: "interaction", safety: "allowed" },
  { name: "SubFetch", category: "network", safety: "wrapped" },
  { name: "SubData", category: "network", safety: "wrapped" },
  { name: "ActionButton", category: "network", safety: "wrapped" },
  { name: "ToggleSwitch", category: "network", safety: "wrapped" },
  { name: "RefreshButton", category: "network", safety: "wrapped" },
  { name: "TablerIcon", category: "content", safety: "wrapped" },
] as const satisfies readonly {
  name: string;
  category: CustomJsxComponentCategory;
  safety: CustomJsxComponentSafety;
}[];

const stringBindingComponents = [
  "Accordion",
  "Autocomplete",
  "Chip.Group",
  "ChipGroup",
  "ColorInput",
  "ColorPicker",
  "DateInput",
  "DatePicker",
  "DatePickerInput",
  "DateTimePicker",
  "InlineDateTimePicker",
  "JsonInput",
  "MaskInput",
  "MiniCalendar",
  "MonthPicker",
  "MonthPickerInput",
  "NativeSelect",
  "PasswordInput",
  "PinInput",
  "Radio.Group",
  "RadioGroup",
  "SegmentedControl",
  "Select",
  "Tabs",
  "TextInput",
  "Textarea",
  "TimeInput",
  "TimePicker",
  "TreeSelect",
  "YearPicker",
  "YearPickerInput",
] as const;

const CUSTOM_JSX_BINDING_TYPES: Readonly<Record<string, CustomJsxCatalogBindingType>> = {
  ...Object.fromEntries(stringBindingComponents.map((name) => [name, "string"] as const)),
  Checkbox: "boolean",
  Menu: "boolean",
  Popover: "boolean",
  Switch: "boolean",
  NumberInput: "number",
  Pagination: "number",
  Rating: "number",
  Slider: "number",
  Stepper: "number",
  "Checkbox.Group": "string[]",
  CheckboxGroup: "string[]",
  MultiSelect: "string[]",
  "Switch.Group": "string[]",
  SwitchGroup: "string[]",
  TagsInput: "string[]",
  RangeSlider: "number[]",
};

const HOMARR_COMPONENT_DESCRIPTIONS: Readonly<Record<string, string>> = {
  PaginatedList: "Renders a bounded page of collection items.",
  TabsContainer: "Renders a declarative tab container.",
  TabPanel: "Renders content for one declarative tab.",
  Collapsible: "Shows and hides a bounded content section.",
  StatBar: "Displays a compact labeled statistic and progress value.",
  TypeBadge: "Displays a compact semantic type badge.",
  SubFetch: "Runs a named manual query with invocation-time parameters.",
  SubData: "Reads a nested value from a named manual-query result.",
  ActionButton: "Runs a named user-triggered action.",
  ToggleSwitch: "Runs named actions for the enabled and disabled states.",
  RefreshButton: "Refreshes load-triggered widget queries.",
  TablerIcon: "Resolves an installed Tabler icon by its safe name.",
};

type HomarrPropMetadata = Omit<UninternedPropDescriptor, "name" | "source">;

const optionalProp = (
  type: string,
  literalValues?: CustomJsxLiteralValue[],
  description?: string,
): HomarrPropMetadata => ({
  type,
  required: false,
  ...(literalValues ? { literalValues } : {}),
  ...(description ? { description } : {}),
});
const requiredProp = (
  type: string,
  literalValues?: CustomJsxLiteralValue[],
  description?: string,
): HomarrPropMetadata => ({
  type,
  required: true,
  ...(literalValues ? { literalValues } : {}),
  ...(description ? { description } : {}),
});

const HOMARR_COMPONENT_PROPS: Readonly<Record<string, Readonly<Record<string, HomarrPropMetadata>>>> = {
  PaginatedList: { pageSize: optionalProp("number") },
  TabsContainer: { defaultTab: optionalProp("string") },
  TabPanel: { value: requiredProp("string"), label: optionalProp("string") },
  Collapsible: { title: requiredProp("string"), defaultOpen: optionalProp("boolean") },
  StatBar: {
    value: requiredProp("number"),
    max: optionalProp("number"),
    label: optionalProp("string"),
    color: optionalProp("string"),
  },
  TypeBadge: {
    type: requiredProp("string"),
    size: optionalProp("'xs' | 'sm' | 'md' | 'lg' | 'xl'", ["xs", "sm", "md", "lg", "xl"]),
  },
  SubFetch: {
    requestId: optionalProp("string", undefined, "Identifier of the named Custom Widget query."),
    params: optionalProp("Record<string, string | number | boolean>"),
    refreshInterval: optionalProp("number"),
    loadingLabel: optionalProp("string"),
    errorMessage: optionalProp("string"),
    fallback: optionalProp("ReactNode"),
    triggerContent: optionalProp("ReactNode", undefined, "Custom accessible trigger shown before a manual query runs."),
    triggerAriaLabel: optionalProp("string", undefined, "Accessible label for a custom manual-query trigger."),
    path: optionalProp("string"),
    as: optionalProp("'json' | 'text'", ["json", "text"]),
    trigger: optionalProp("'auto' | 'manual'", ["auto", "manual"]),
  },
  SubData: {
    path: optionalProp("string"),
    as: optionalProp("'Text' | 'Title' | 'Badge' | 'Code' | 'Image'", ["Text", "Title", "Badge", "Code", "Image"]),
    order: optionalProp("1 | 2 | 3 | 4 | 5 | 6", [1, 2, 3, 4, 5, 6]),
    size: optionalProp("string"),
    color: optionalProp("string"),
    variant: optionalProp("string"),
    fw: optionalProp("number"),
    c: optionalProp("string"),
    alt: optionalProp("string"),
    fit: optionalProp("string"),
    w: optionalProp("string | number"),
    h: optionalProp("string | number"),
    radius: optionalProp("string | number"),
  },
  ActionButton: {
    requestId: optionalProp("string", undefined, "Identifier of the named Custom Widget action."),
    params: optionalProp("Record<string, string | number | boolean>"),
    label: optionalProp("string"),
    color: optionalProp("string"),
    variant: optionalProp("string"),
    size: optionalProp("string"),
    confirmMessage: optionalProp("string"),
    successMessage: optionalProp("string"),
    errorMessage: optionalProp("string"),
    icon: optionalProp("string"),
    disabled: optionalProp("boolean | string"),
    fullWidth: optionalProp("boolean | string"),
  },
  ToggleSwitch: {
    requestId: optionalProp("string", undefined, "Identifier of the named Custom Widget action."),
    enabledParams: optionalProp("Record<string, string | number | boolean>"),
    disabledParams: optionalProp("Record<string, string | number | boolean>"),
    initialValue: optionalProp("boolean | string"),
    label: optionalProp("string"),
    color: optionalProp("string"),
    size: optionalProp("string"),
    errorMessage: optionalProp("string"),
    disabled: optionalProp("boolean | string"),
  },
  RefreshButton: {
    label: optionalProp("string"),
    color: optionalProp("string"),
    variant: optionalProp("string"),
    size: optionalProp("string"),
  },
  TablerIcon: {
    name: requiredProp("string"),
    size: optionalProp("string | number"),
    color: optionalProp("string"),
    stroke: optionalProp("string | number"),
  },
};

const FALLBACK_PROP_TYPES: Readonly<Record<string, string>> = {
  key: "string | number",
  id: "string",
  style: "CSSProperties",
  title: "string",
  role: "AriaRole",
  "aria-label": "string",
  "aria-describedby": "string",
  "aria-hidden": "boolean | 'true' | 'false'",
  tabIndex: "number",
  requestId: "string",
  refreshInterval: "number",
  path: "string",
  name: "string",
  color: "MantineColor",
  radius: "MantineRadius",
  variant: "string",
  size: "MantineSize | string | number",
  defaultValue: "unknown",
  defaultChecked: "boolean",
};

const FALLBACK_LITERAL_VALUES: Readonly<Record<string, readonly CustomJsxLiteralValue[]>> = {
  target: ["_blank", "_parent", "_self", "_top"],
  orientation: ["horizontal", "vertical"],
};

const FALLBACK_PROP_DESCRIPTIONS: Readonly<Record<string, string>> = {
  key: "Stable identity used by React when rendering collections.",
  requestId: "Identifier of the named Custom Widget request.",
  bind: "Name of the temporary in-memory input value.",
};

await generateCatalog();
