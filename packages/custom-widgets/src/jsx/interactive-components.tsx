"use client";

import type { ReactNode } from "react";
import { Children, isValidElement, useEffect, useRef, useState } from "react";
import { ActionIcon, Badge, Collapse, Group, Stack, Tabs, Text, UnstyledButton } from "@mantine/core";
import { IconChevronDown, IconChevronLeft, IconChevronRight, IconChevronUp } from "@tabler/icons-react";

interface PaginatedListProps {
  children: ReactNode;
  pageSize?: number;
}

export function PaginatedList({ children, pageSize = 6 }: PaginatedListProps) {
  const items = Children.toArray(children);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);
  const prevCountRef = useRef(items.length);

  useEffect(() => {
    if (items.length !== prevCountRef.current) {
      setPage(0);
      prevCountRef.current = items.length;
    }
  }, [items.length]);

  const clampedPage = Math.min(page, totalPages - 1);
  const start = clampedPage * pageSize;
  const visible = items.slice(start, start + pageSize);

  return (
    <Stack gap="xs">
      <div>{visible}</div>
      {totalPages > 1 && (
        <Group justify="center" gap="xs">
          <ActionIcon
            variant="subtle"
            size="sm"
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <IconChevronLeft size={14} />
          </ActionIcon>
          <Text size="xs" c="dimmed">
            {clampedPage + 1} / {totalPages}
          </Text>
          <ActionIcon
            variant="subtle"
            size="sm"
            disabled={clampedPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            <IconChevronRight size={14} />
          </ActionIcon>
        </Group>
      )}
    </Stack>
  );
}

interface TabsContainerProps {
  children: ReactNode;
  defaultTab?: string;
}

function isTabPanel(child: ReactNode): child is React.ReactElement<TabPanelProps> {
  return isValidElement<TabPanelProps>(child) && child.type === TabPanel && typeof child.props.value === "string";
}

export function TabsContainer({ children, defaultTab }: TabsContainerProps) {
  const panels = Children.toArray(children).filter(isTabPanel);
  const firstPanel = panels[0];
  const panelValues = new Set(panels.map((p) => p.props.value));
  const resolvedDefault = defaultTab && panelValues.has(defaultTab) && defaultTab;
  const initialTab = resolvedDefault || firstPanel?.props.value || null;
  const [activeTab, setActiveTab] = useState<string | null>(initialTab);

  return (
    <Tabs value={activeTab} onChange={setActiveTab}>
      <Tabs.List>
        {panels.map((panel) => (
          <Tabs.Tab key={panel.props.value} value={panel.props.value}>
            {panel.props.label ?? panel.props.value}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {panels.map((panel) => (
        <Tabs.Panel key={panel.props.value} value={panel.props.value} pt="sm">
          {panel.props.children}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

interface TabPanelProps {
  children: ReactNode;
  value: string;
  label?: string;
}

export function TabPanel({ children }: TabPanelProps) {
  return <>{children}</>;
}

interface CollapsibleProps {
  children: ReactNode;
  title: string;
  defaultOpen?: boolean;
}

const COLLAPSE_CHEVRONS = {
  closed: IconChevronDown,
  open: IconChevronUp,
} as const;

const COLLAPSE_STATE: Record<0 | 1, keyof typeof COLLAPSE_CHEVRONS> = {
  0: "closed",
  1: "open",
};

export function Collapsible({ children, title, defaultOpen = false }: CollapsibleProps) {
  const [opened, setOpened] = useState(defaultOpen);
  const Chevron = COLLAPSE_CHEVRONS[COLLAPSE_STATE[Number(opened) as 0 | 1]];

  return (
    <Stack gap={0}>
      <UnstyledButton onClick={() => setOpened((o) => !o)} py={4}>
        <Group gap="xs" wrap="nowrap">
          <Chevron size={14} />
          <Text size="sm" fw={600}>
            {title}
          </Text>
        </Group>
      </UnstyledButton>
      <Collapse expanded={opened}>{children}</Collapse>
    </Stack>
  );
}

interface StatBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
}

function calcPct(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min((value / max) * 100, 100);
}

export function StatBar({ value, max = 100, label, color = "blue" }: StatBarProps) {
  const pct = calcPct(value, max);

  return (
    <Group gap="xs" wrap="nowrap">
      {label && (
        <Text size="xs" w={80} ta="right" c="dimmed">
          {label}
        </Text>
      )}
      <div
        style={{
          flex: 1,
          height: 8,
          borderRadius: 4,
          background: "var(--mantine-color-default-border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 4,
            background: `var(--mantine-color-${color}-6)`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <Text size="xs" w={30} c="dimmed">
        {value}
      </Text>
    </Group>
  );
}

interface TypeBadgeProps {
  type: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const TYPE_COLORS: Record<string, string> = {
  normal: "gray",
  fire: "red",
  water: "blue",
  electric: "yellow",
  grass: "green",
  ice: "cyan",
  fighting: "orange",
  poison: "grape",
  ground: "yellow",
  flying: "indigo",
  psychic: "pink",
  bug: "lime",
  rock: "orange",
  ghost: "violet",
  dragon: "indigo",
  dark: "dark",
  steel: "gray",
  fairy: "pink",
};

function normalizeType(type: unknown): string {
  if (typeof type === "string") return type;
  if (type == null) return "";
  return String(type);
}

export function TypeBadge({ type, size = "sm" }: TypeBadgeProps) {
  const typeStr = normalizeType(type);
  const color = TYPE_COLORS[typeStr.toLowerCase()] ?? "gray";
  return (
    <Badge color={color} size={size} variant="filled" tt="capitalize">
      {typeStr}
    </Badge>
  );
}
