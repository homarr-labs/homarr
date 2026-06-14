import type { ComponentType } from "react";
import { createElement } from "react";
import {
  Stack,
  Group,
  Flex,
  Grid,
  SimpleGrid,
  Center,
  Space,
  Container,
  AspectRatio,
  Text,
  Title,
  Code,
  Highlight,
  Mark,
  Kbd,
  Blockquote,
  Anchor,
  NumberFormatter,
  Badge,
  Card,
  Paper,
  Alert,
  ThemeIcon,
  ColorSwatch,
  Table,
  List,
  Timeline,
  Accordion,
  Indicator,
  Pill,
  Spoiler,
  Progress,
  RingProgress,
  Skeleton,
  Loader,
  Image,
  Avatar,
  BackgroundImage,
  Tooltip,
  Divider,
  ScrollArea,
} from "@mantine/core";
import {
  AreaChart,
  BarChart,
  LineChart,
  DonutChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  Sparkline,
} from "@mantine/charts";

import { PaginatedList, TabsContainer, TabPanel, Collapsible, StatBar, TypeBadge } from "./jsx-interactive-components";

const SAFE_URL_PATTERN = /^https?:\/\//i;

function isSafeUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  return SAFE_URL_PATTERN.test(url) || url.startsWith("/") || url.startsWith("#");
}

function SafeAnchor(props: Record<string, unknown>) {
  const href = props.href;
  const safeHref = href && isSafeUrl(href) ? href : undefined;
  return createElement(Anchor as never, { ...props, href: safeHref });
}

export const WHITELISTED_COMPONENTS: Record<string, ComponentType<never>> = {
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
  Text,
  Title,
  Code,
  Highlight,
  Mark,
  Kbd,
  Blockquote,
  Anchor: SafeAnchor,
  NumberFormatter,
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
  Skeleton,
  Loader,
  Image,
  Avatar,
  "Avatar.Group": Avatar.Group,
  BackgroundImage,
  Tooltip,
  Divider,
  ScrollArea,
  AreaChart,
  BarChart,
  LineChart,
  DonutChart,
  PieChart,
  RadarChart,
  RadialBarChart,
  Sparkline,
  PaginatedList,
  TabsContainer,
  TabPanel,
  Collapsible,
  StatBar,
  TypeBadge,
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
Object.freeze(safeArray);

const safeObject: Record<string, unknown> = Object.create(null);
safeObject.keys = (v: object) => Object.keys(v);
safeObject.values = (v: object) => Object.values(v);
safeObject.entries = (v: object) => Object.entries(v);
Object.freeze(safeObject);

export const SAFE_BINDINGS = (apiData: unknown) => ({
  data: sanitizeData(apiData),
  String: (v: unknown) => String(v),
  Number: (v: unknown) => Number(v),
  Boolean: (v: unknown) => Boolean(v),
  Math: safeMath,
  JSON: safeJSON,
  Array: safeArray,
  Object: safeObject,
});
