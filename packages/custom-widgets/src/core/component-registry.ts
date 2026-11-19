import runtimeCatalogJson from "./component-catalog.runtime.generated.json";
import type { CustomJsxBindingDescriptor, CustomJsxComponentBlockedProp } from "./component-catalog-types";
import type { CustomJsxComponentDescriptor } from "./component-descriptor";
import type { CustomJsxComponentPackage, CustomJsxComponentSafety } from "./component-types";

interface RuntimeCatalogComponent {
  name: string;
  package: CustomJsxComponentPackage;
  safety: CustomJsxComponentSafety;
  props: readonly { name: string; required: boolean }[];
  blockedProps: readonly CustomJsxComponentBlockedProp[];
  bind?: CustomJsxBindingDescriptor;
  deniedReason?: string;
}

interface CustomJsxRuntimeCatalog {
  globalPropNames: readonly string[];
  components: readonly RuntimeCatalogComponent[];
}

const runtimeCatalog = runtimeCatalogJson as CustomJsxRuntimeCatalog;

const globalPropNames = runtimeCatalog.globalPropNames;

export const customJsxComponentRegistry: readonly CustomJsxComponentDescriptor[] = runtimeCatalog.components.map(
  (component) => ({
    name: component.name,
    package: component.package,
    safety: component.safety,
    supportedProps:
      component.safety === "denied"
        ? []
        : [
            ...new Set([
              ...globalPropNames.filter(
                (propName) => !component.blockedProps.some((blockedProp) => blockedProp.name === propName),
              ),
              ...component.props.map(({ name }) => name),
              ...(component.bind ? ["bind", component.bind.resetProp] : []),
            ]),
          ],
    blockedProps: component.blockedProps,
    ...(component.deniedReason ? { reason: component.deniedReason } : {}),
  }),
);

export const enabledCustomJsxComponents = customJsxComponentRegistry.filter(
  (component) => component.safety !== "denied",
);
export const customJsxComponentByName = new Map(customJsxComponentRegistry.map((entry) => [entry.name, entry]));
export const customJsxSupportedPropsByName = new Map(
  customJsxComponentRegistry.map((entry) => [entry.name, new Set(entry.supportedProps)]),
);
export const customJsxRequiredPropsByName: ReadonlyMap<string, readonly string[]> = new Map(
  runtimeCatalog.components.map((component) => [
    component.name,
    component.props.flatMap(({ name, required }) => (required ? [name] : [])),
  ]),
);

export function resolveCustomJsxComponentName(name: string): string {
  if (name === "Icon") return "TablerIcon";
  if (customJsxComponentByName.has(name)) return name;
  const flat = name.replaceAll(".", "");
  return customJsxComponentByName.has(flat) ? flat : name;
}

const catalogComponentsByName = new Map(runtimeCatalog.components.map((component) => [component.name, component]));

const multipleDateBindingComponents = new Set([
  "DatePicker",
  "DatePickerInput",
  "MonthPicker",
  "MonthPickerInput",
  "YearPicker",
  "YearPickerInput",
]);
const rangeDateBindingComponents = new Set(["DateTimePicker", "InlineDateTimePicker"]);

export const customJsxBindableComponentNames: ReadonlySet<string> = new Set(
  runtimeCatalog.components.flatMap((component) => (component.bind ? [component.name] : [])),
);

export type CustomJsxBindingType = CustomJsxBindingDescriptor["type"];

export function getCustomJsxBindingType(
  componentName: string,
  props: Readonly<Record<string, unknown>> = {},
): CustomJsxBindingType | null {
  componentName = resolveCustomJsxComponentName(componentName);
  const type = catalogComponentsByName.get(componentName)?.bind?.type;
  if (!type) return null;
  if (multipleDateBindingComponents.has(componentName) && ["multiple", "range"].includes(String(props.type))) {
    return "string[]";
  }
  if (rangeDateBindingComponents.has(componentName) && props.type === "range") return "string[]";
  if (componentName === "Accordion" && props.multiple === true) return "string[]";
  if (componentName === "TreeSelect" && ["multiple", "checkbox"].includes(String(props.mode))) return "string[]";
  if (["Chip.Group", "ChipGroup"].includes(componentName) && props.multiple === true) return "string[]";
  return type;
}
