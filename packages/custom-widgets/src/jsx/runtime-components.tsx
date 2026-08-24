import type { ComponentType, ReactNode } from "react";
import { createContext, createElement, useContext, useEffect, useId, useRef, useState } from "react";
import * as Core from "@mantine/core";
import * as Charts from "@mantine/charts";
import * as Dates from "@mantine/dates";

import {
  customJsxBindableComponentNames,
  enabledCustomJsxComponents,
  getCustomJsxBindingType,
} from "../core/component-registry";
import type { CustomJsxBindingType } from "../core/component-registry";
import { ActionButton, ToggleSwitch } from "../runtime/actions";
import { SubData } from "../runtime/data";
import { RefreshButton } from "../runtime/refresh-button";
import { SubFetch } from "../runtime/sub-fetch";
import { Collapsible, PaginatedList, StatBar, TabPanel, TabsContainer, TypeBadge } from "./interactive-components";
import { getScopedCustomJsxControlName, isSafeCustomJsxUrl } from "./runtime-component-policy";
import { sanitizeCustomJsxProps } from "./safe-properties";

type Namespace = object;

function resolveExport(namespace: Namespace, name: string): ComponentType<never> | undefined {
  let value: unknown = namespace;
  for (const segment of name.split(".")) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || !Object.hasOwn(value, segment)) {
      return undefined;
    }
    value = Reflect.get(value, segment);
  }
  return typeof value === "function" || (typeof value === "object" && value !== null)
    ? (value as ComponentType<never>)
    : undefined;
}

export type WidgetInputValue = string | number | boolean | string[] | number[];
export type WidgetInputType = CustomJsxBindingType;
interface CustomJsxInputsContextValue {
  scopeId: string;
  inputs: Record<string, WidgetInputValue>;
  inputTypes: Record<string, WidgetInputType>;
  registerInput(name: string, type: WidgetInputType, initialValue: WidgetInputValue): () => void;
  setInputValue(name: string, type: WidgetInputType, value: WidgetInputValue): void;
}

const CustomJsxInputsContext = createContext<CustomJsxInputsContextValue | null>(null);

export function CustomJsxInputsProvider({
  children,
  scopeId,
  inputs,
  inputTypes,
  registerInput,
  setInputValue,
}: CustomJsxInputsContextValue & { children: ReactNode }) {
  return (
    <CustomJsxInputsContext.Provider value={{ scopeId, inputs, inputTypes, registerInput, setInputValue }}>
      {children}
    </CustomJsxInputsContext.Provider>
  );
}

const checkedComponents = new Set(["Checkbox", "Switch"]);
const openedComponents = new Set(["Menu", "Popover"]);
const activeComponents = new Set(["Stepper"]);
const comboboxComponents = new Set(["Autocomplete", "MultiSelect", "Select", "TagsInput", "TreeSelect"]);
const popoverInputComponents = new Set([
  "ColorInput",
  "DateInput",
  "DatePickerInput",
  "DateTimePicker",
  "MonthPickerInput",
  "TimePicker",
  "YearPickerInput",
]);
const modalPickerComponents = new Set(["DatePickerInput", "DateTimePicker", "MonthPickerInput", "YearPickerInput"]);
const namedRadioComponents = new Set(["Radio", "Radio.Card", "Radio.Group", "RadioCard", "RadioGroup"]);
const buttonRootComponents = new Set(["ActionIcon", "Burger", "Button", "CloseButton", "UnstyledButton"]);

function extractEventValue(value: unknown, checked: boolean): WidgetInputValue | null {
  if (value && typeof value === "object" && "currentTarget" in value) {
    const target = (value as { currentTarget?: { checked?: unknown; value?: unknown } }).currentTarget;
    const result = checked ? target?.checked : target?.value;
    return typeof result === "string" || typeof result === "number" || typeof result === "boolean" ? result : null;
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) return value;
  if (Array.isArray(value) && value.every((entry) => typeof entry === "string" || entry === null)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (Array.isArray(value) && value.every((entry) => typeof entry === "number")) return value;
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null
    ? value
    : null;
}

function useBoundProps(componentName: string, props: Record<string, unknown>): Record<string, unknown> {
  const detachedScopeId = useId();
  const binding = typeof props.bind === "string" ? props.bind : undefined;
  const context = useContext(CustomJsxInputsContext);
  const sanitized = sanitizeCustomJsxProps(props, componentName);
  if (namedRadioComponents.has(componentName) && typeof sanitized.name === "string") {
    sanitized.name = getScopedCustomJsxControlName(context?.scopeId ?? detachedScopeId, sanitized.name);
  }
  delete sanitized.bind;
  const inputType = getCustomJsxBindingType(componentName, sanitized);
  const initialValue = getInitialInputValue(inputType, sanitized);
  const serializedInitialValue = JSON.stringify(initialValue);
  const isBound = Boolean(binding && context && inputType && customJsxBindableComponentNames.has(componentName));
  const registerInput = context?.registerInput;
  useEffect(() => {
    if (!isBound || !binding || !registerInput || !inputType || serializedInitialValue === undefined) return;
    return registerInput(binding, inputType, JSON.parse(serializedInitialValue) as WidgetInputValue);
  }, [binding, inputType, isBound, registerInput, serializedInitialValue]);
  if (!isBound || !binding || !context || !inputType) return sanitized;
  delete sanitized.defaultValue;
  delete sanitized.defaultChecked;
  let currentValue = initialValue;
  if (context.inputTypes[binding] === inputType && Object.hasOwn(context.inputs, binding)) {
    const storedValue = context.inputs[binding];
    if (storedValue !== undefined) currentValue = storedValue;
  }

  const update = (value: unknown, checked = false) => {
    const extracted = extractEventValue(value, checked);
    context.setInputValue(binding, inputType, extracted ?? emptyInputValue(inputType));
  };
  if (checkedComponents.has(componentName)) {
    return {
      ...sanitized,
      checked: Boolean(currentValue),
      onChange: (event: unknown) => update(event, true),
    };
  }
  if (openedComponents.has(componentName)) {
    return { ...sanitized, opened: Boolean(currentValue), onChange: update, withinPortal: false };
  }
  if (activeComponents.has(componentName)) {
    return { ...sanitized, active: Number(currentValue), onStepClick: update };
  }
  return { ...sanitized, value: currentValue, onChange: update };
}

function getInitialInputValue(type: WidgetInputType | null, props: Record<string, unknown>): WidgetInputValue {
  if (!type) return "";
  const candidate = type === "boolean" ? props.defaultChecked : props.defaultValue;
  if (type === "boolean" && typeof candidate === "boolean") return candidate;
  if (type === "number" && typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  if (type === "string" && typeof candidate === "string") return candidate;
  if (type === "string[]" && Array.isArray(candidate) && candidate.every((item) => typeof item === "string"))
    return candidate;
  if (
    type === "number[]" &&
    Array.isArray(candidate) &&
    candidate.every((item) => typeof item === "number" && Number.isFinite(item))
  )
    return candidate;
  return emptyInputValue(type);
}

function emptyInputValue(type: WidgetInputType): WidgetInputValue {
  if (type.endsWith("[]")) return [];
  if (type === "number") return 0;
  if (type === "boolean") return false;
  return "";
}

function wrap(componentName: string, component: ComponentType<never>, additions: Record<string, unknown> = {}) {
  return function SafeComponent(props: Record<string, unknown>) {
    const bound = useBoundProps(componentName, props);
    const scoped = { ...bound, ...additions };
    if (comboboxComponents.has(componentName)) scoped.comboboxProps = scopeOverlayProps(bound.comboboxProps);
    if (popoverInputComponents.has(componentName)) scoped.popoverProps = scopeOverlayProps(bound.popoverProps);
    return createElement(component, scoped as never, props.children as ReactNode);
  };
}

function scopeOverlayProps(value: unknown) {
  const candidate =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? sanitizeCustomJsxProps(value as Record<string, unknown>)
      : {};
  return { ...candidate, withinPortal: false };
}

function SafeLink({ component, props }: { component: ComponentType<never>; props: Record<string, unknown> }) {
  const sanitized = sanitizeCustomJsxProps(props);
  const target = sanitized.target === "_blank" || sanitized.target === "_self" ? sanitized.target : undefined;
  return createElement(
    component,
    {
      ...sanitized,
      href: isSafeCustomJsxUrl(props.href) ? props.href : undefined,
      target,
      rel: target === "_blank" ? "noopener noreferrer" : sanitized.rel,
    } as never,
    props.children as ReactNode,
  );
}

function createCopyButton(labels: { copy: string; copied: string }) {
  return function SafeCopyButton({ value }: { value?: string; children?: ReactNode }) {
    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    useEffect(() => () => clearTimeout(timer.current), []);
    const copy = async () => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 2_000);
      } catch {
        setCopied(false);
      }
    };
    return (
      <Core.Button
        size="xs"
        variant={copied ? "filled" : "light"}
        color={copied ? "teal" : "blue"}
        onClick={() => void copy()}
      >
        {copied ? labels.copied : labels.copy}
      </Core.Button>
    );
  };
}

export interface CustomJsxComponentAdapters {
  TablerIcon: ComponentType<never>;
  copyLabels: { copy: string; copied: string };
}

export function createCustomJsxComponents(adapters: CustomJsxComponentAdapters): Record<string, ComponentType<never>> {
  const namespaces: Record<string, Namespace> = {
    "@mantine/core": Core,
    "@mantine/charts": Charts,
    "@mantine/dates": Dates,
  };
  const components: Record<string, ComponentType<never>> = {};
  for (const descriptor of enabledCustomJsxComponents) {
    const namespace = namespaces[descriptor.package];
    const component = namespace ? resolveExport(namespace, descriptor.name) : undefined;
    if (component) {
      const additions: Record<string, unknown> = {};
      if (
        ["HoverCard", "Menu", "Popover", "Tooltip", "Tooltip.Floating", "TooltipFloating"].includes(descriptor.name)
      ) {
        additions.withinPortal = false;
      }
      if (modalPickerComponents.has(descriptor.name)) additions.dropdownType = "popover";
      if (buttonRootComponents.has(descriptor.name)) additions.type = "button";
      components[descriptor.name] = wrap(descriptor.name, component, additions);
    }
  }
  const core: Namespace = Core;
  for (const name of [
    "Notification",
    "LoadingOverlay",
    "Overlay",
    "Breadcrumbs",
    "Stepper",
    "Tree",
    "Button",
    "ActionIcon",
    "Burger",
    "CloseButton",
    "Chip",
  ] as const) {
    const component = resolveExport(core, name);
    if (component) components[name] = wrap(name, component, buttonRootComponents.has(name) ? { type: "button" } : {});
  }
  const anchor = resolveExport(core, "Anchor");
  const navLink = resolveExport(core, "NavLink");
  if (anchor) components.Anchor = (props) => <SafeLink component={anchor} props={props} />;
  if (navLink) components.NavLink = (props) => <SafeLink component={navLink} props={props} />;
  Object.assign(components, {
    CopyButton: createCopyButton(adapters.copyLabels),
    PaginatedList,
    TabsContainer,
    TabPanel,
    Collapsible,
    StatBar,
    TypeBadge,
    TablerIcon: adapters.TablerIcon,
    SubFetch,
    SubData,
    ActionButton,
    ToggleSwitch,
    RefreshButton,
  });
  return components;
}
