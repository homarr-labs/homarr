import type { ComponentType, ReactNode } from "react";
import { createContext, createElement, useContext, useEffect, useRef, useState } from "react";
import * as Core from "@mantine/core";
import * as Charts from "@mantine/charts";
import * as Dates from "@mantine/dates";

import { customJsxBindableComponentNames, enabledCustomJsxComponents } from "../core/component-registry";
import { ActionButton, ToggleSwitch } from "../runtime/actions";
import { SubData } from "../runtime/data";
import { RefreshButton } from "../runtime/refresh-button";
import { SubFetch } from "../runtime/sub-fetch";
import { Collapsible, PaginatedList, StatBar, TabPanel, TabsContainer, TypeBadge } from "./interactive-components";
import { sanitizeCustomJsxProps } from "./safe-properties";

type Namespace = Readonly<Record<string, unknown>>;

function resolveExport(namespace: Namespace, name: string): ComponentType<never> | undefined {
  let value: unknown = namespace;
  for (const segment of name.split(".")) {
    if (!value || (typeof value !== "object" && typeof value !== "function") || !Object.hasOwn(value, segment)) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return typeof value === "function" || (typeof value === "object" && value !== null)
    ? (value as ComponentType<never>)
    : undefined;
}

function safeUrl(value: unknown) {
  return typeof value === "string" && (/^https?:\/\//iu.test(value) || value.startsWith("/") || value.startsWith("#"));
}

type WidgetStateValue = string | number | boolean | string[] | number[];
interface CustomJsxStateContextValue {
  state: Record<string, WidgetStateValue>;
  stateSchema: Record<string, string>;
  setStateValue(name: string, value: WidgetStateValue): void;
}

const CustomJsxStateContext = createContext<CustomJsxStateContextValue | null>(null);

export function CustomJsxStateProvider({
  children,
  state,
  stateSchema,
  setStateValue,
}: CustomJsxStateContextValue & { children: ReactNode }) {
  return (
    <CustomJsxStateContext.Provider value={{ state, stateSchema, setStateValue }}>
      {children}
    </CustomJsxStateContext.Provider>
  );
}

const checkedComponents = new Set(["Checkbox", "Switch"]);
const openedComponents = new Set(["HoverCard", "Menu", "Popover"]);
const activeComponents = new Set(["Stepper"]);
const comboboxComponents = new Set(["Autocomplete", "MultiSelect", "Select", "TagsInput", "TreeSelect"]);
const popoverInputComponents = new Set([
  "ColorInput",
  "DateInput",
  "DatePickerInput",
  "DateTimePicker",
  "MonthPickerInput",
  "YearPickerInput",
]);
const buttonRootComponents = new Set(["ActionIcon", "Burger", "Button", "CloseButton", "UnstyledButton"]);

function extractEventValue(value: unknown, checked: boolean): WidgetStateValue | null {
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
  const binding = typeof props.bind === "string" ? props.bind : undefined;
  const context = useContext(CustomJsxStateContext);
  const sanitized = sanitizeCustomJsxProps(props);
  delete sanitized.bind;
  if (!binding || !context || !customJsxBindableComponentNames.has(componentName)) return sanitized;
  const stateType = context.stateSchema[binding];
  if (!stateType) return sanitized;

  const update = (value: unknown, checked = false) => {
    const extracted = extractEventValue(value, checked);
    context.setStateValue(binding, extracted ?? emptyStateValue(stateType));
  };
  if (componentName === "Calendar") {
    return { ...sanitized, date: context.state[binding], onDateChange: update };
  }
  if (checkedComponents.has(componentName)) {
    return {
      ...sanitized,
      checked: Boolean(context.state[binding]),
      onChange: (event: unknown) => update(event, true),
    };
  }
  if (openedComponents.has(componentName)) {
    return { ...sanitized, opened: Boolean(context.state[binding]), onChange: update, withinPortal: false };
  }
  if (activeComponents.has(componentName)) {
    return { ...sanitized, active: Number(context.state[binding] ?? 0), onStepClick: update };
  }
  return { ...sanitized, value: context.state[binding], onChange: update };
}

function emptyStateValue(type: string): WidgetStateValue {
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
      href: safeUrl(props.href) ? props.href : undefined,
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
    "@mantine/core": Core as unknown as Namespace,
    "@mantine/charts": Charts as unknown as Namespace,
    "@mantine/dates": Dates as unknown as Namespace,
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
      if (buttonRootComponents.has(descriptor.name)) additions.type = "button";
      components[descriptor.name] = wrap(descriptor.name, component, additions);
    }
  }
  const core = Core as unknown as Namespace;
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
  const dates = Dates as unknown as Namespace;
  for (const descriptor of enabledCustomJsxComponents.filter(
    (item) => item.package === "@mantine/dates" && item.safety === "wrapped",
  )) {
    const component = resolveExport(dates, descriptor.name);
    if (component) components[descriptor.name] = wrap(descriptor.name, component);
  }
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
