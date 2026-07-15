import type { ComponentType, ReactNode } from "react";
import { createElement, useEffect, useRef, useState } from "react";
import * as Core from "@mantine/core";
import * as Charts from "@mantine/charts";
import * as Dates from "@mantine/dates";

import { enabledCustomJsxComponents } from "../core/component-registry";
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

function wrap(component: ComponentType<never>, additions: Record<string, unknown> = {}) {
  return function SafeComponent(props: Record<string, unknown>) {
    return createElement(component, { ...sanitizeCustomJsxProps(props), ...additions } as never);
  };
}

function SafeLink({ component, props }: { component: ComponentType<never>; props: Record<string, unknown> }) {
  const sanitized = sanitizeCustomJsxProps(props);
  return createElement(component, {
    ...sanitized,
    href: safeUrl(props.href) ? props.href : undefined,
    rel: sanitized.target === "_blank" ? "noopener noreferrer" : sanitized.rel,
  } as never);
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
    if (component) components[descriptor.name] = component;
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
    if (component) components[name] = wrap(component);
  }
  const anchor = resolveExport(core, "Anchor");
  const navLink = resolveExport(core, "NavLink");
  if (anchor) components.Anchor = (props) => <SafeLink component={anchor} props={props} />;
  if (navLink) components.NavLink = (props) => <SafeLink component={navLink} props={props} />;
  for (const [name, additions] of Object.entries({
    Rating: { readOnly: true },
    Slider: { readOnly: true },
    Switch: { readOnly: true },
    SegmentedControl: { readOnly: true },
    Pagination: { disabled: true },
  })) {
    const component = resolveExport(core, name);
    if (component) components[name] = wrap(component, additions);
  }
  const dates = Dates as unknown as Namespace;
  for (const descriptor of enabledCustomJsxComponents.filter(
    (item) => item.package === "@mantine/dates" && item.safety === "wrapped",
  )) {
    const component = resolveExport(dates, descriptor.name);
    if (component) components[descriptor.name] = wrap(component, { static: true });
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
