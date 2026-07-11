import type { ComponentType, ReactNode } from "react";
import { createElement, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Anchor,
  AspectRatio,
  Avatar,
  BackgroundImage,
  Badge,
  Blockquote,
  Box,
  Breadcrumbs,
  Burger,
  Button,
  Card,
  Center,
  Chip,
  CloseButton,
  Code,
  Collapse,
  ColorSwatch,
  Container,
  CopyButton,
  DataList,
  Divider,
  EmptyState,
  Fieldset,
  Flex,
  Grid,
  Group,
  Highlight,
  HoverCard,
  Image,
  Indicator,
  Kbd,
  List,
  Loader,
  Mark,
  Marquee,
  Menu,
  NavLink,
  Notification,
  NumberFormatter,
  Overlay,
  Pagination,
  Paper,
  Pill,
  Progress,
  Rating,
  RingProgress,
  RollingNumber,
  ScrollArea,
  SegmentedControl,
  SemiCircleProgress,
  SimpleGrid,
  Skeleton,
  Slider,
  Space,
  Spoiler,
  Stack,
  Stepper,
  Switch,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Timeline,
  Title,
  Tooltip,
  Transition,
  Tree,
} from "@mantine/core";
import {
  AreaChart,
  BarChart,
  BarsList,
  BubbleChart,
  CompositeChart,
  DonutChart,
  FunnelChart,
  Heatmap,
  LineChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  SankeyChart,
  ScatterChart,
  Sparkline,
  Treemap,
} from "@mantine/charts";
import { Calendar, DatePicker, MiniCalendar, TimeValue } from "@mantine/dates";

import { PaginatedList, TabsContainer, TabPanel, Collapsible, StatBar, TypeBadge } from "./jsx-interactive-components";
import { SubFetch, SubData, ActionButton, ToggleSwitch, RefreshButton } from "./jsx-sub-fetch";

const SAFE_URL_PATTERN = /^https?:\/\//i;

function isSafeUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  return SAFE_URL_PATTERN.test(url) || url.startsWith("/") || url.startsWith("#");
}

function stripEventHandlers(props: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (/^on[A-Z]/.test(key)) continue;
    safe[key] = value;
  }
  return safe;
}

function SafeAnchor(props: Record<string, unknown>) {
  const href = props.href;
  const safeHref = href && isSafeUrl(href) ? href : undefined;
  return createElement(Anchor as never, { ...stripEventHandlers(props), href: safeHref });
}

function SafeNavLink(props: Record<string, unknown>) {
  const href = props.href;
  const safeHref = href && isSafeUrl(href) ? href : undefined;
  return createElement(NavLink as never, { ...stripEventHandlers(props), href: safeHref });
}

function SafeButton(props: Record<string, unknown>) {
  return createElement(Button as never, stripEventHandlers(props));
}

function SafeActionIcon(props: Record<string, unknown>) {
  return createElement(ActionIcon as never, stripEventHandlers(props));
}

function SafeBurger(props: Record<string, unknown>) {
  return createElement(Burger as never, stripEventHandlers(props));
}

function SafeCloseButton(props: Record<string, unknown>) {
  return createElement(CloseButton as never, stripEventHandlers(props));
}

function SafeChip(props: Record<string, unknown>) {
  return createElement(Chip as never, stripEventHandlers(props));
}

function SafeNotification(props: Record<string, unknown>) {
  return createElement(Notification as never, stripEventHandlers(props));
}

function SafeRating(props: Record<string, unknown>) {
  return createElement(Rating as never, { ...stripEventHandlers(props), readOnly: true });
}

function SafeSlider(props: Record<string, unknown>) {
  return createElement(Slider as never, { ...stripEventHandlers(props), readOnly: true });
}

function SafeSwitch(props: Record<string, unknown>) {
  return createElement(Switch as never, { ...stripEventHandlers(props), readOnly: true });
}

function SafeSegmentedControl(props: Record<string, unknown>) {
  return createElement(SegmentedControl as never, stripEventHandlers(props));
}

function SafePagination(props: Record<string, unknown>) {
  return createElement(Pagination as never, stripEventHandlers(props));
}

function SafeStepper(props: Record<string, unknown>) {
  return createElement(Stepper as never, stripEventHandlers(props));
}

function SafeCalendar(props: Record<string, unknown>) {
  return createElement(Calendar as never, { ...stripEventHandlers(props), static: true });
}

function SafeMiniCalendar(props: Record<string, unknown>) {
  return createElement(MiniCalendar as never, { ...stripEventHandlers(props), static: true });
}

function SafeTree(props: Record<string, unknown>) {
  return createElement(Tree as never, stripEventHandlers(props));
}

function SafeDatePicker(props: Record<string, unknown>) {
  return createElement(DatePicker as never, { ...stripEventHandlers(props), static: true });
}

function SafeCopyButton({ value }: { value?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!value) return;
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return createElement(Button as never, {
    size: "xs",
    variant: copied ? "filled" : "light",
    color: copied ? "teal" : "blue",
    onClick: handleCopy,
    children: copied ? "Copied!" : "Copy",
  });
}

export const WHITELISTED_COMPONENTS: Record<string, ComponentType<never>> = {
  // Layout
  Box,
  Stack,
  Group,
  Flex,
  Grid,
  "Grid.Col": Grid.Col,
  SimpleGrid,
  Center,
  Space,
  Container,
  AspectRatio,
  Overlay,
  ScrollArea,

  // Typography & text
  Text,
  Title,
  Code,
  Highlight,
  Mark,
  Kbd,
  Blockquote,
  Anchor: SafeAnchor,
  NumberFormatter,
  Marquee,
  RollingNumber,

  // Data display
  Badge,
  Card,
  "Card.Section": Card.Section,
  Paper,
  Alert,
  ThemeIcon,
  ColorSwatch,
  Table,
  "Table.Thead": Table.Thead,
  "Table.Tbody": Table.Tbody,
  "Table.Tfoot": Table.Tfoot,
  "Table.Caption": Table.Caption,
  "Table.Tr": Table.Tr,
  "Table.Th": Table.Th,
  "Table.Td": Table.Td,
  List,
  "List.Item": List.Item,
  Timeline,
  "Timeline.Item": Timeline.Item,
  Accordion,
  "Accordion.Item": Accordion.Item,
  "Accordion.Control": Accordion.Control,
  "Accordion.Panel": Accordion.Panel,
  Indicator,
  Pill,
  Spoiler,
  Progress,
  "Progress.Section": Progress.Section,
  RingProgress,
  SemiCircleProgress,
  Skeleton,
  Loader,
  Image,
  Avatar,
  "Avatar.Group": Avatar.Group,
  BackgroundImage,
  Tooltip,
  Divider,
  DataList,
  "DataList.Item": DataList.Item,
  "DataList.ItemLabel": DataList.ItemLabel,
  "DataList.ItemValue": DataList.ItemValue,
  EmptyState,
  "EmptyState.Indicator": EmptyState.Indicator,
  "EmptyState.Title": EmptyState.Title,
  "EmptyState.Description": EmptyState.Description,
  "EmptyState.Actions": EmptyState.Actions,
  Fieldset,
  Notification: SafeNotification,
  Rating: SafeRating,

  // Navigation & structure
  Breadcrumbs,
  NavLink: SafeNavLink,
  Stepper: SafeStepper,
  "Stepper.Step": Stepper.Step,
  Tabs,
  "Tabs.List": Tabs.List,
  "Tabs.Tab": Tabs.Tab,
  "Tabs.Panel": Tabs.Panel,
  Tree: SafeTree,

  // Interactive display (handlers stripped — wired via SubFetch separately)
  Button: SafeButton,
  ActionIcon: SafeActionIcon,
  Burger: SafeBurger,
  CloseButton: SafeCloseButton,
  Chip: SafeChip,
  "Chip.Group": Chip.Group,
  Pagination: SafePagination,
  SegmentedControl: SafeSegmentedControl,
  Slider: SafeSlider,
  Switch: SafeSwitch,

  // Hover overlays & menus
  HoverCard,
  "HoverCard.Target": HoverCard.Target,
  "HoverCard.Dropdown": HoverCard.Dropdown,
  Menu,
  "Menu.Target": Menu.Target,
  "Menu.Dropdown": Menu.Dropdown,
  "Menu.Item": Menu.Item,
  "Menu.Label": Menu.Label,
  "Menu.Divider": Menu.Divider,

  // Utility
  CopyButton: SafeCopyButton,
  Collapse,
  Transition,

  // Charts
  AreaChart,
  BarChart,
  LineChart,
  DonutChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  Sparkline,
  BubbleChart,
  CompositeChart,
  FunnelChart,
  Heatmap,
  ScatterChart,
  SankeyChart,
  Treemap,
  BarsList,

  // Dates
  Calendar: SafeCalendar,
  MiniCalendar: SafeMiniCalendar,
  DatePicker: SafeDatePicker,
  TimeValue,

  // Custom interactive components (own state management)
  PaginatedList,
  TabsContainer,
  TabPanel,
  Collapsible,
  StatBar,
  TypeBadge,

  // SubFetch — server-proxied HTTP from within templates
  SubFetch,
  SubData,
  ActionButton,
  ToggleSwitch,
  RefreshButton,
};

function sanitizeData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeData);

  const safe: Record<string, unknown> = Object.create(null);
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "constructor" || key === "__proto__" || key === "prototype") continue;
    safe[key] = sanitizeData(value);
  }
  return safe;
}

const safeMath: Record<string, unknown> = Object.create(null);
safeMath.round = (v: number) => Math.round(v);
safeMath.floor = (v: number) => Math.floor(v);
safeMath.ceil = (v: number) => Math.ceil(v);
safeMath.abs = (v: number) => Math.abs(v);
safeMath.min = (...args: number[]) => Math.min(...args);
safeMath.max = (...args: number[]) => Math.max(...args);
safeMath.pow = (b: number, e: number) => Math.pow(b, e);
safeMath.sqrt = (v: number) => Math.sqrt(v);
safeMath.PI = Math.PI;
Object.freeze(safeMath);

const safeJSON: Record<string, unknown> = Object.create(null);
safeJSON.stringify = (v: unknown) => JSON.stringify(v);
Object.freeze(safeJSON);

const safeArray: Record<string, unknown> = Object.create(null);
safeArray.isArray = (v: unknown) => Array.isArray(v);
safeArray.from = <T>(v: ArrayLike<T> | Iterable<T>) => Array.from(v);
Object.freeze(safeArray);

const safeObject: Record<string, unknown> = Object.create(null);
safeObject.keys = (v: object) => Object.keys(v);
safeObject.values = (v: object) => Object.values(v);
safeObject.entries = (v: object) => Object.entries(v);
Object.freeze(safeObject);

const safeDate: Record<string, unknown> = Object.create(null);
safeDate.now = () => Date.now();
safeDate.create = (v?: string | number) => (v != null ? new Date(v) : new Date());
safeDate.toISOString = (v: string | number) => new Date(v).toISOString();
safeDate.toLocaleDateString = (v: string | number, locale?: string) =>
  new Date(v).toLocaleDateString(locale ?? "en-US");
safeDate.toLocaleTimeString = (v: string | number, locale?: string) =>
  new Date(v).toLocaleTimeString(locale ?? "en-US");
safeDate.getTime = (v: string | number) => new Date(v).getTime();
safeDate.getYear = (v: string | number) => new Date(v).getFullYear();
safeDate.getMonth = (v: string | number) => new Date(v).getMonth();
safeDate.getDay = (v: string | number) => new Date(v).getDate();
Object.freeze(safeDate);

export const SAFE_BINDINGS = (apiData: unknown) => ({
  data: sanitizeData(apiData),
  String: (v: unknown) => String(v),
  Number: (v: unknown) => Number(v),
  Boolean: (v: unknown) => Boolean(v),
  Math: safeMath,
  JSON: safeJSON,
  Array: safeArray,
  Object: safeObject,
  Date: safeDate,
  parseInt: (v: string, radix?: number) => parseInt(v, radix),
  parseFloat: (v: string) => parseFloat(v),
  encodeURIComponent: (v: string) => encodeURIComponent(v),
  decodeURIComponent: (v: string) => decodeURIComponent(v),
  isNaN: (v: unknown) => Number.isNaN(Number(v)),
  isFinite: (v: unknown) => Number.isFinite(Number(v)),
});
