import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  customJsxBindableComponentNames,
  customJsxComponentRegistry,
  customJsxRequiredPropsByName,
  getCustomJsxBindingType,
  resolveCustomJsxComponentName,
} from "../../packages/custom-widgets/src/core/component-registry.ts";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const beforeCatalogPath = resolve(
  repositoryRoot,
  "audit-evidence/2026-10-11/overview_a-before/component-catalog.generated.json",
);
const baseline = JSON.parse(await readFile(beforeCatalogPath, "utf8")) as {
  globalProps: Array<{ name: string }>;
  components: Array<{
    name: string;
    package: string;
    safety: string;
    props: Array<{ name: string; required: boolean }>;
    blockedProps: Array<{ name: string; reason: string }>;
    bind?: { type: string; initialProp: string; resetProp: string };
    deniedReason?: string;
  }>;
};

const globalPropNames = baseline.globalProps.map(({ name }) => name);
const expectedRegistry = baseline.components.map((component) => ({
  name: component.name,
  package: component.package,
  safety: component.safety,
  supportedProps:
    component.safety === "denied"
      ? []
      : [
          ...new Set([
            ...globalPropNames.filter((propName) => !component.blockedProps.some((blockedProp) => blockedProp.name === propName)),
            ...component.props.map(({ name }) => name),
            ...(component.bind ? ["bind", component.bind.resetProp] : []),
          ]),
        ],
  blockedProps: component.blockedProps,
  ...(component.deniedReason ? { reason: component.deniedReason } : {}),
}));

assert.deepStrictEqual(customJsxComponentRegistry, expectedRegistry, "Every runtime descriptor must match the baseline");
assert.deepStrictEqual(
  [...customJsxBindableComponentNames].toSorted(),
  baseline.components.filter(({ bind }) => bind).map(({ name }) => name).toSorted(),
  "The bindable component set must match the baseline",
);
assert.deepStrictEqual(
  [...customJsxRequiredPropsByName.entries()],
  baseline.components.map(({ name, props }) => [name, props.filter(({ required }) => required).map(({ name: propName }) => propName)]),
  "Every required prop declaration must match the baseline",
);

const namesToResolve = new Set<string>(["Icon", "UnknownCustomComponent"]);
for (const { name } of baseline.components) {
  namesToResolve.add(name);
  namesToResolve.add(name.replaceAll(".", ""));
}
const baselineNames = new Set(baseline.components.map(({ name }) => name));
const resolveFromBaseline = (name: string) => {
  if (name === "Icon") return "TablerIcon";
  if (baselineNames.has(name)) return name;
  const flat = name.replaceAll(".", "");
  return baselineNames.has(flat) ? flat : name;
};
for (const name of namesToResolve) {
  assert.equal(resolveCustomJsxComponentName(name), resolveFromBaseline(name), `Resolved component name: ${name}`);
}

const bindingProps = [
  {},
  { type: "multiple" },
  { type: "range" },
  { type: "single" },
  { multiple: true },
  { multiple: false },
  { mode: "multiple" },
  { mode: "checkbox" },
  { mode: "default" },
] as const;
const baselineByName = new Map(baseline.components.map((component) => [component.name, component]));
const bindingNames = new Set(namesToResolve);
for (const { name } of baseline.components) bindingNames.add(name);
for (const name of bindingNames) {
  const componentName = resolveFromBaseline(name);
  const baselineType = baselineByName.get(componentName)?.bind?.type ?? null;
  for (const props of bindingProps) {
    let expected = baselineType;
    if (
      ["DatePicker", "DatePickerInput", "MonthPicker", "MonthPickerInput", "YearPicker", "YearPickerInput"].includes(
        componentName,
      ) && ["multiple", "range"].includes(String(props.type))
    ) {
      expected = "string[]";
    }
    if (["DateTimePicker", "InlineDateTimePicker"].includes(componentName) && props.type === "range") {
      expected = "string[]";
    }
    if (componentName === "Accordion" && props.multiple === true) expected = "string[]";
    if (componentName === "TreeSelect" && ["multiple", "checkbox"].includes(String(props.mode))) expected = "string[]";
    if (["Chip.Group", "ChipGroup"].includes(componentName) && props.multiple === true) expected = "string[]";
    assert.equal(
      getCustomJsxBindingType(name, props),
      expected,
      `Binding type for ${name} with ${JSON.stringify(props)}`,
    );
  }
}

console.log(
  `Runtime projection matches baseline: ${expectedRegistry.length} descriptors, ${namesToResolve.size} resolved names, ${bindingNames.size * bindingProps.length} binding cases.`,
);
