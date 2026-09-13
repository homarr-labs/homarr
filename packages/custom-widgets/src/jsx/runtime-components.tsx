import type { ComponentType, ReactNode } from "react";
import { createElement } from "react";
import * as Core from "@mantine/core";
import * as Charts from "@mantine/charts";
import * as Dates from "@mantine/dates";

import { enabledCustomJsxComponents } from "../core/component-registry";
import { WidgetModal, WidgetDrawer, AppEmbed } from "../runtime/detail-views";
import { useWidgetOverlayProps, WidgetNestedOverlayContext } from "../runtime/overlay-scope";
import { ContentSaveButton, ContentResetButton } from "../runtime/shared-content";
import { NativeQuery, NativeActionButton } from "../runtime/native";
import { ActionButton, ToggleSwitch } from "../runtime/actions";
import { SubData } from "../runtime/data";
import { RefreshButton } from "../runtime/refresh-button";
import { SubFetch } from "../runtime/sub-fetch";
import { createCopyButton } from "./copy-button";
import { Collapsible, PaginatedList, StatBar, TabPanel, TabsContainer, TypeBadge } from "./interactive-components";
import { isSafeCustomJsxUrl } from "./runtime-component-policy";
import { useBoundCustomJsxProps } from "./input-bindings";
export { CustomJsxInputsProvider } from "./input-bindings";
export type { WidgetInputType, WidgetInputValue } from "./input-bindings";
import { sanitizeCustomJsxProps } from "./safe-properties";
import { trustedTargetProps } from "./trusted-target-props";

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
const buttonRootComponents = new Set(["ActionIcon", "Burger", "Button", "CloseButton", "UnstyledButton"]);
const overlayComponents = new Set(["HoverCard", "Menu", "Popover", "Tooltip", "Tooltip.Floating", "TooltipFloating"]);
const nestedOverlayComponents = new Set(["HoverCard.Dropdown", "Menu.Dropdown", "Popover.Dropdown"]);

function wrap(componentName: string, component: ComponentType<never>, additions: Record<string, unknown> = {}) {
  return function SafeComponent(props: Record<string, unknown>) {
    const bound = useBoundCustomJsxProps(componentName, props);
    const overlayProps = useWidgetOverlayProps();
    const scoped = { ...bound, ...additions, ...trustedTargetProps(props) };
    if (comboboxComponents.has(componentName))
      scoped.comboboxProps = { ...scopeOverlayProps(bound.comboboxProps), ...overlayProps };
    if (popoverInputComponents.has(componentName))
      scoped.popoverProps = { ...scopeOverlayProps(bound.popoverProps), ...overlayProps };
    if (overlayComponents.has(componentName)) Object.assign(scoped, overlayProps);
    const rendered = createElement(component, scoped as never, props.children as ReactNode);
    if (nestedOverlayComponents.has(componentName))
      return <WidgetNestedOverlayContext.Provider value>{rendered}</WidgetNestedOverlayContext.Provider>;
    return rendered;
  };
}

function scopeOverlayProps(value: unknown) {
  const candidate =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? sanitizeCustomJsxProps(value as Record<string, unknown>)
      : {};
  return candidate;
}

function SafeLink({ component, props }: { component: ComponentType<never>; props: Record<string, unknown> }) {
  const sanitized = sanitizeCustomJsxProps(props);
  const target = sanitized.target === "_blank" || sanitized.target === "_self" ? sanitized.target : undefined;
  return createElement(
    component,
    {
      ...sanitized,
      ...trustedTargetProps(props),
      href: isSafeCustomJsxUrl(props.href) ? props.href : undefined,
      target,
      rel: target === "_blank" ? "noopener noreferrer" : sanitized.rel,
    } as never,
    props.children as ReactNode,
  );
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
    WidgetModal,
    WidgetDrawer,
    AppEmbed,
    NativeQuery,
    NativeActionButton,
    ContentSaveButton,
    ContentResetButton,
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
