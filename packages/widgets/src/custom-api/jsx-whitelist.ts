import type { ComponentType, ReactNode } from "react";
import { createElement, useEffect, useRef, useState } from "react";
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
  DataList,
  Divider,
  EmptyState,
  Fieldset,
  Flex,
  FloatingIndicator,
  Grid,
  Group,
  Highlight,
  HoverCard,
  Image,
  Indicator,
  Kbd,
  List,
  Loader,
  LoadingOverlay,
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
  Typography,
  VisuallyHidden,
} from "@mantine/core";
import {
  AreaChart,
  BarChart,
  BarsList,
  BubbleChart,
  ChartLegend,
  ChartTooltip,
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
import {
  IconActivity,
  IconAlertCircle,
  IconAlertTriangle,
  IconApi,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconBell,
  IconBluetooth,
  IconBolt,
  IconBookmark,
  IconBug,
  IconCalendar,
  IconCamera,
  IconChartBar,
  IconChartLine,
  IconChartPie,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCircleCheck,
  IconCircleX,
  IconClipboard,
  IconClock,
  IconCloud,
  IconCloudOff,
  IconCode,
  IconCompass,
  IconCopy,
  IconCpu,
  IconDatabase,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDownload,
  IconDroplet,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconFile,
  IconFlag,
  IconFlame,
  IconFolder,
  IconGauge,
  IconGitBranch,
  IconHeart,
  IconHistory,
  IconHome,
  IconInfoCircle,
  IconKey,
  IconLink,
  IconLoader,
  IconLock,
  IconLockOpen,
  IconMail,
  IconMap,
  IconMapPin,
  IconMinus,
  IconMoon,
  IconMusic,
  IconNetwork,
  IconPhoto,
  IconPin,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlayerStop,
  IconPlus,
  IconPower,
  IconProgress,
  IconHeartbeat,
  IconRefresh,
  IconReload,
  IconSearch,
  IconServer,
  IconSettings,
  IconShield,
  IconStar,
  IconSun,
  IconTerminal,
  IconThermometer,
  IconTrash,
  IconTrendingDown,
  IconTrendingUp,
  IconUpload,
  IconUser,
  IconUsers,
  IconVideo,
  IconVolume,
  IconVolume2,
  IconVolumeOff,
  IconWifi,
  IconWifiOff,
  IconWorld,
  IconX,
  IconSpeedboat,
} from "@tabler/icons-react";
import {
  Calendar,
  CalendarHeader,
  DatePicker,
  Day,
  DecadeLevel,
  DecadeLevelGroup,
  LevelsGroup,
  MiniCalendar,
  Month,
  MonthLevel,
  MonthLevelGroup,
  MonthPicker,
  MonthsList,
  PickerControl,
  TimeGrid,
  TimeValue,
  WeekdaysRow,
  YearLevel,
  YearLevelGroup,
  YearPicker,
  YearsList,
} from "@mantine/dates";

import { enabledCustomJsxComponents } from "@homarr/definitions";
import { useScopedI18n } from "@homarr/translation/client";

import { PaginatedList, TabsContainer, TabPanel, Collapsible, StatBar, TypeBadge } from "./jsx-interactive-components";
import { SubFetch, SubData, ActionButton, ToggleSwitch, RefreshButton } from "./jsx-sub-fetch";
import { createSafeCallable } from "./safe-bindings";
import { sanitizeCustomJsxProps } from "./safe-jsx-interpreter";

const SAFE_URL_PATTERN = /^https?:\/\//i;

function isSafeUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  return SAFE_URL_PATTERN.test(url) || url.startsWith("/") || url.startsWith("#");
}

function SafeAnchor(props: Record<string, unknown>) {
  const href = props.href;
  const safeHref = href && isSafeUrl(href) ? href : undefined;
  return createElement(Anchor as never, { ...sanitizeCustomJsxProps(props), href: safeHref });
}

function SafeNavLink(props: Record<string, unknown>) {
  const href = props.href;
  const safeHref = href && isSafeUrl(href) ? href : undefined;
  return createElement(NavLink as never, { ...sanitizeCustomJsxProps(props), href: safeHref });
}

function SafeButton(props: Record<string, unknown>) {
  return createElement(Button as never, sanitizeCustomJsxProps(props));
}

function SafeActionIcon(props: Record<string, unknown>) {
  return createElement(ActionIcon as never, sanitizeCustomJsxProps(props));
}

function SafeBurger(props: Record<string, unknown>) {
  return createElement(Burger as never, sanitizeCustomJsxProps(props));
}

function SafeCloseButton(props: Record<string, unknown>) {
  return createElement(CloseButton as never, sanitizeCustomJsxProps(props));
}

function SafeChip(props: Record<string, unknown>) {
  return createElement(Chip as never, sanitizeCustomJsxProps(props));
}

function SafeNotification(props: Record<string, unknown>) {
  return createElement(Notification as never, sanitizeCustomJsxProps(props));
}

function SafeRating(props: Record<string, unknown>) {
  return createElement(Rating as never, { ...sanitizeCustomJsxProps(props), readOnly: true });
}

function SafeSlider(props: Record<string, unknown>) {
  return createElement(Slider as never, { ...sanitizeCustomJsxProps(props), readOnly: true });
}

function SafeSwitch(props: Record<string, unknown>) {
  return createElement(Switch as never, { ...sanitizeCustomJsxProps(props), readOnly: true });
}

function SafeSegmentedControl(props: Record<string, unknown>) {
  return createElement(SegmentedControl as never, { ...sanitizeCustomJsxProps(props), readOnly: true });
}

function SafePagination(props: Record<string, unknown>) {
  return createElement(Pagination as never, { ...sanitizeCustomJsxProps(props), disabled: true });
}

function SafeStepper(props: Record<string, unknown>) {
  return createElement(Stepper as never, sanitizeCustomJsxProps(props));
}

function SafeCalendar(props: Record<string, unknown>) {
  return createElement(Calendar as never, { ...sanitizeCustomJsxProps(props), static: true });
}

function SafeMiniCalendar(props: Record<string, unknown>) {
  return createElement(MiniCalendar as never, { ...sanitizeCustomJsxProps(props), static: true });
}

function SafeTree(props: Record<string, unknown>) {
  return createElement(Tree as never, sanitizeCustomJsxProps(props));
}

function SafeDatePicker(props: Record<string, unknown>) {
  return createElement(DatePicker as never, { ...sanitizeCustomJsxProps(props), static: true });
}

function createSafeDateComponent(component: ComponentType<never>) {
  return function SafeDateComponent(props: Record<string, unknown>) {
    return createElement(component, { ...sanitizeCustomJsxProps(props), static: true } as never);
  };
}

function tablerIconExportToKey(exportName: string): string {
  return exportName
    .slice(4)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([A-Za-z])(\d)/g, "$1-$2")
    .toLowerCase();
}

const TABLER_ICON_IMPORTS = {
  IconCheck,
  IconX,
  IconPlus,
  IconMinus,
  IconArrowUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconChevronUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconHome,
  IconSettings,
  IconUser,
  IconUsers,
  IconSearch,
  IconBell,
  IconMail,
  IconHeart,
  IconStar,
  IconBookmark,
  IconFlag,
  IconPin,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconPlayerSkipForward,
  IconPlayerSkipBack,
  IconVolume,
  IconVolumeOff,
  IconVolume2,
  IconWifi,
  IconWifiOff,
  IconBluetooth,
  IconCloud,
  IconCloudOff,
  IconServer,
  IconDatabase,
  IconCpu,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconFolder,
  IconFile,
  IconDownload,
  IconUpload,
  IconRefresh,
  IconReload,
  IconPower,
  IconBolt,
  IconFlame,
  IconDroplet,
  IconSun,
  IconMoon,
  IconEye,
  IconEyeOff,
  IconLock,
  IconLockOpen,
  IconShield,
  IconKey,
  IconAlertTriangle,
  IconAlertCircle,
  IconInfoCircle,
  IconCircleCheck,
  IconCircleX,
  IconTrash,
  IconEdit,
  IconCopy,
  IconClipboard,
  IconExternalLink,
  IconLink,
  IconPhoto,
  IconCamera,
  IconMusic,
  IconVideo,
  IconCalendar,
  IconClock,
  IconHistory,
  IconMap,
  IconMapPin,
  IconCompass,
  IconTerminal,
  IconCode,
  IconBug,
  IconGitBranch,
  IconNetwork,
  IconWorld,
  IconApi,
  IconChartBar,
  IconChartLine,
  IconChartPie,
  IconTrendingUp,
  IconTrendingDown,
  IconActivity,
  IconProgress,
  IconLoader,
  IconThermometer,
  IconGauge,
  IconSpeedboat,
  IconHeartbeat,
} as const;

const TABLER_ICON_MAP: Record<string, ComponentType<never>> = {
  ...Object.fromEntries(
    Object.entries(TABLER_ICON_IMPORTS).map(([exportName, IconComponent]) => [
      tablerIconExportToKey(exportName),
      IconComponent,
    ]),
  ),
  pulse: IconHeartbeat,
};

function isValidIconProp(value: unknown): value is string | number {
  return typeof value === "number" || typeof value === "string";
}

function SafeTablerIcon(props: Record<string, unknown>) {
  const name = props.name;
  if (typeof name !== "string") return null;
  const IconComponent = TABLER_ICON_MAP[name];
  if (!IconComponent) return null;
  const iconProps: Record<string, unknown> = {};
  if (isValidIconProp(props.size)) iconProps.size = props.size;
  if (typeof props.color === "string") iconProps.color = props.color;
  if (isValidIconProp(props.stroke)) iconProps.stroke = props.stroke;
  return createElement(IconComponent as never, iconProps);
}

function SafeCopyButton({ value }: { value?: string; children?: ReactNode }) {
  const t = useScopedI18n("widget.customApi.customJsx");
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  const COPY_STATES = {
    idle: { variant: "light", color: "blue", label: t("copy") },
    copied: { variant: "filled", color: "teal", label: t("copied") },
  } as const;
  const state = COPY_STATES[copied ? "copied" : "idle"];
  return createElement(
    Button as never,
    { size: "xs", variant: state.variant, color: state.color, onClick: () => void handleCopy() },
    state.label,
  );
}

const RUNTIME_COMPONENTS: Record<string, ComponentType<never>> = {
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
  VisuallyHidden,
  Typography,
  FloatingIndicator,

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
  LoadingOverlay,
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
  ChartLegend,
  ChartTooltip,

  // Dates
  Calendar: SafeCalendar,
  MiniCalendar: SafeMiniCalendar,
  DatePicker: SafeDatePicker,
  Day: createSafeDateComponent(Day),
  WeekdaysRow: createSafeDateComponent(WeekdaysRow),
  Month: createSafeDateComponent(Month),
  CalendarHeader: createSafeDateComponent(CalendarHeader),
  YearPicker: createSafeDateComponent(YearPicker),
  MonthPicker: createSafeDateComponent(MonthPicker),
  TimeGrid: createSafeDateComponent(TimeGrid),
  PickerControl: createSafeDateComponent(PickerControl),
  YearsList: createSafeDateComponent(YearsList),
  MonthsList: createSafeDateComponent(MonthsList),
  DecadeLevel: createSafeDateComponent(DecadeLevel),
  YearLevel: createSafeDateComponent(YearLevel),
  MonthLevel: createSafeDateComponent(MonthLevel),
  LevelsGroup: createSafeDateComponent(LevelsGroup),
  DecadeLevelGroup: createSafeDateComponent(DecadeLevelGroup),
  YearLevelGroup: createSafeDateComponent(YearLevelGroup),
  MonthLevelGroup: createSafeDateComponent(MonthLevelGroup),
  TimeValue,

  // Custom interactive components (own state management)
  PaginatedList,
  TabsContainer,
  TabPanel,
  Collapsible,
  StatBar,
  TypeBadge,
  TablerIcon: SafeTablerIcon,

  // SubFetch — server-proxied HTTP from within templates
  SubFetch,
  SubData,
  ActionButton,
  ToggleSwitch,
  RefreshButton,
};

const enabledComponentNames = new Set(enabledCustomJsxComponents.map(({ name }) => name));

export const WHITELISTED_COMPONENTS: Record<string, ComponentType<never>> = Object.fromEntries(
  Object.entries(RUNTIME_COMPONENTS).filter(([name]) => enabledComponentNames.has(name)),
);

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
safeMath.round = createSafeCallable((v: number) => Math.round(v));
safeMath.floor = createSafeCallable((v: number) => Math.floor(v));
safeMath.ceil = createSafeCallable((v: number) => Math.ceil(v));
safeMath.abs = createSafeCallable((v: number) => Math.abs(v));
safeMath.min = createSafeCallable((...args: number[]) => Math.min(...args));
safeMath.max = createSafeCallable((...args: number[]) => Math.max(...args));
safeMath.pow = createSafeCallable((b: number, e: number) => Math.pow(b, e));
safeMath.sqrt = createSafeCallable((v: number) => Math.sqrt(v));
safeMath.PI = Math.PI;
Object.freeze(safeMath);

const safeJSON: Record<string, unknown> = Object.create(null);
safeJSON.stringify = createSafeCallable((v: unknown) => JSON.stringify(v));
Object.freeze(safeJSON);

const safeArray: Record<string, unknown> = Object.create(null);
safeArray.isArray = createSafeCallable((v: unknown) => Array.isArray(v));
safeArray.from = createSafeCallable((v: ArrayLike<unknown> | Iterable<unknown>) => Array.from(v).slice(0, 2_000));
Object.freeze(safeArray);

const safeObject: Record<string, unknown> = Object.create(null);
safeObject.keys = createSafeCallable((v: object) => Object.keys(v));
safeObject.values = createSafeCallable((v: object) => Object.values(v));
safeObject.entries = createSafeCallable((v: object) => Object.entries(v));
Object.freeze(safeObject);

const safeDate: Record<string, unknown> = Object.create(null);
safeDate.now = createSafeCallable(() => Date.now());
// Date helpers return primitives only; native Date instances never enter the interpreter.
safeDate.create = createSafeCallable((v?: string | number) => (v != null ? new Date(v).getTime() : Date.now()));
safeDate.toISOString = createSafeCallable((v: string | number) => new Date(v).toISOString());
safeDate.toLocaleDateString = createSafeCallable((v: string | number, locale?: string) =>
  new Date(v).toLocaleDateString(locale ?? "en-US"),
);
safeDate.toLocaleTimeString = createSafeCallable((v: string | number, locale?: string) =>
  new Date(v).toLocaleTimeString(locale ?? "en-US"),
);
safeDate.getTime = createSafeCallable((v: string | number) => new Date(v).getTime());
safeDate.getYear = createSafeCallable((v: string | number) => new Date(v).getFullYear());
safeDate.getMonth = createSafeCallable((v: string | number) => new Date(v).getMonth());
safeDate.getDay = createSafeCallable((v: string | number) => new Date(v).getDay());
Object.freeze(safeDate);

export const SAFE_BINDINGS = (apiData: unknown) => ({
  data: sanitizeData(apiData),
  String: createSafeCallable((v: unknown) => String(v)),
  Number: createSafeCallable((v: unknown) => Number(v)),
  Boolean: createSafeCallable((v: unknown) => Boolean(v)),
  Math: safeMath,
  JSON: safeJSON,
  Array: safeArray,
  Object: safeObject,
  Date: safeDate,
  parseInt: createSafeCallable((v: string, radix?: number) => parseInt(v, radix)),
  parseFloat: createSafeCallable((v: string) => parseFloat(v)),
  encodeURIComponent: createSafeCallable((v: string) => encodeURIComponent(v)),
  decodeURIComponent: createSafeCallable((v: string) => decodeURIComponent(v)),
  isNaN: createSafeCallable((v: unknown) => Number.isNaN(Number(v))),
  isFinite: createSafeCallable((v: unknown) => Number.isFinite(Number(v))),
});
