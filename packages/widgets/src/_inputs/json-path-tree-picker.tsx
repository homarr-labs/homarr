"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Combobox, Group, InputBase, ScrollArea, Text, useCombobox } from "@mantine/core";
import {
  IconBraces,
  IconChevronDown,
  IconCircleCheck,
  IconHash,
  IconLetterT,
  IconList,
  IconToggleLeft,
} from "@tabler/icons-react";

const VALUE_TRUNCATE_LENGTH = 80;
const LEVEL_OFFSET = 14;
const BASE_PADDING = 8;

const typeIcons: Record<string, typeof IconLetterT> = {
  string: IconLetterT,
  number: IconHash,
  boolean: IconToggleLeft,
  null: IconToggleLeft,
  object: IconBraces,
  array: IconList,
};

function getValueType(val: unknown): string {
  if (val === null) return "null";
  if (Array.isArray(val)) return "array";
  return typeof val;
}

function truncateValue(value: unknown): string {
  const str = value === null ? "null" : String(value);
  if (str.length <= VALUE_TRUNCATE_LENGTH) return str;
  return `${str.slice(0, VALUE_TRUNCATE_LENGTH)}…`;
}

function appendPath(prefix: string, segment: string): string {
  if (segment.startsWith("[")) return `${prefix}${segment}`;
  return prefix === "$" ? `$.${segment}` : `${prefix}.${segment}`;
}

function lastSegment(path: string): string {
  if (path === "$") return "$";
  const bracketMatch = path.match(/\[(\d+)\]$/);
  if (bracketMatch) return `[${bracketMatch[1]}]`;
  const dotIndex = path.lastIndexOf(".");
  return dotIndex === -1 ? path : path.slice(dotIndex + 1);
}

function getParentPath(path: string): string | null {
  if (path.length <= 1) return null;
  const cutIdx = Math.max(path.lastIndexOf("."), path.lastIndexOf("["));
  if (cutIdx <= 0) return null;
  return path.slice(0, cutIdx);
}

function isPrimitive(value: unknown): boolean {
  return value === null || (typeof value !== "object" && typeof value !== "function");
}

function formatObjectPreview(entries: [string, unknown][]): string {
  if (entries.length === 0) return "{}";
  const parts = entries.slice(0, 3).map(([k, v]) => `${k}: ${truncateValue(v)}`);
  const suffix = entries.length > 3 ? ", …" : "";
  return `{${parts.join(", ")}${suffix}}`;
}

interface FlatNode {
  path: string;
  label: string;
  preview: string | null;
  type: string;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

function flattenJson(
  json: unknown,
  prefix: string,
  depth: number,
  expanded: Record<string, boolean>,
  seen: WeakSet<object>,
  expandAll = false,
): FlatNode[] {
  if (isPrimitive(json)) {
    return [
      {
        path: prefix,
        label: lastSegment(prefix),
        preview: truncateValue(json),
        type: getValueType(json),
        depth,
        hasChildren: false,
        isExpanded: false,
      },
    ];
  }

  const obj = json as object;
  if (seen.has(obj)) return [];
  seen.add(obj);

  const nodes: FlatNode[] = [];

  if (Array.isArray(json)) {
    const isExpanded = expandAll || (expanded[prefix] ?? depth === 0);
    const preview = json.length === 0 ? "[]" : `${json.length} items`;
    nodes.push({
      path: prefix,
      label: lastSegment(prefix),
      preview,
      type: "array",
      depth,
      hasChildren: json.length > 0,
      isExpanded,
    });

    if (isExpanded) {
      for (let i = 0; i < json.length; i++) {
        const childPath = `${prefix}[${i}]`;
        nodes.push(...flattenJson(json[i], childPath, depth + 1, expanded, seen, expandAll));
      }
    }
    return nodes;
  }

  const entries = Object.entries(json as Record<string, unknown>);
  const isExpanded = expandAll || (expanded[prefix] ?? depth <= 1);
  if (depth > 0) {
    nodes.push({
      path: prefix,
      label: lastSegment(prefix),
      preview: formatObjectPreview(entries),
      type: "object",
      depth,
      hasChildren: entries.length > 0,
      isExpanded,
    });
  }

  if (isExpanded || depth === 0) {
    for (const [key, val] of entries) {
      const childPath = appendPath(prefix, key);
      if (isPrimitive(val)) {
        nodes.push({
          path: childPath,
          label: key,
          preview: truncateValue(val),
          type: getValueType(val),
          depth: depth + 1,
          hasChildren: false,
          isExpanded: false,
        });
      } else {
        nodes.push(...flattenJson(val, childPath, depth + 1, expanded, seen, expandAll));
      }
    }
  }

  return nodes;
}

const SEARCH_FIELDS = ["path", "label", "preview"] as const;

function matchesSearch(node: FlatNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return SEARCH_FIELDS.some((key) => node[key]?.toLowerCase().includes(q));
}

interface JsonPathTreePickerProps {
  value?: string;
  onChange: (path: string) => void;
  json: unknown | null;
  label?: string;
  description?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  noDataHint?: string;
  loadedHint?: string;
}

const isChildPath = (child: string, parent: string) =>
  child !== parent && (child.startsWith(`${parent}.`) || child.startsWith(`${parent}[`));

export function JsonPathTreePicker({
  value = "",
  onChange,
  json,
  label,
  description,
  required,
  error,
  placeholder,
  noDataHint = "Run a test to browse response fields",
  loadedHint = "Browsing live response",
}: JsonPathTreePickerProps) {
  const [search, setSearch] = useState(value);
  const [isTyping, setIsTyping] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isTyping) {
      setSearch(value || "");
    }
  }, [value, isTyping]);
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setIsTyping(false);
    },
  });

  const hasData = json != null;
  const searchQuery = isTyping ? search : "";
  const isSearching = !!searchQuery.trim();

  const flatNodes = useMemo(
    () => (hasData ? flattenJson(json, "$", 0, expanded, new WeakSet(), isSearching) : []),
    [json, expanded, hasData, isSearching],
  );

  const nodesByPath = useMemo(() => new Map(flatNodes.map((n) => [n.path, n])), [flatNodes]);

  const fieldCount = flatNodes.length;

  const visibleNodes = useMemo(() => {
    if (!isSearching) return flatNodes;
    const matchingPaths = new Set<string>();
    for (const n of flatNodes) {
      if (matchesSearch(n, searchQuery)) {
        matchingPaths.add(n.path);
        for (let parent = getParentPath(n.path); parent; parent = getParentPath(parent)) {
          matchingPaths.add(parent);
        }
      }
    }
    return flatNodes.filter((n) => matchingPaths.has(n.path));
  }, [flatNodes, searchQuery, isSearching]);

  const toggleExpand = (path: string) => {
    const childPaths = flatNodes.filter((n) => n.hasChildren && isChildPath(n.path, path)).map((n) => n.path);
    setExpanded((prev) => {
      const isCurrentlyExpanded = prev[path] ?? false;
      const next = { ...prev, [path]: !isCurrentlyExpanded };
      for (const cp of childPaths) {
        next[cp] = !isCurrentlyExpanded;
      }
      return next;
    });
  };

  return (
    <Combobox
      store={combobox}
      withinPortal
      width={560}
      onOptionSubmit={(path) => {
        const node = nodesByPath.get(path);
        if (node?.hasChildren) {
          toggleExpand(path);
          return;
        }
        onChange(path);
        setSearch(path);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <InputBase
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          value={search}
          onChange={(event) => {
            const val = event.currentTarget.value;
            setSearch(val);
            setIsTyping(true);
            combobox.openDropdown();
            combobox.updateSelectedOptionIndex();
          }}
          onClick={() => combobox.openDropdown()}
          onFocus={() => combobox.openDropdown()}
          onBlur={() => {
            combobox.closeDropdown();
            if (isTyping && search.trim()) {
              onChange(search);
            } else {
              setSearch(value || "");
            }
            setIsTyping(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && isTyping) {
              event.preventDefault();
              onChange(search);
              setIsTyping(false);
              combobox.closeDropdown();
            }
          }}
          label={label}
          description={description}
          error={error}
          required={required}
          placeholder={placeholder}
        />
      </Combobox.Target>

      <Combobox.Dropdown>
        {hasData && (
          <Combobox.Header>
            <Group gap="xs" px="xs" pt="xs" pb={4}>
              <Badge size="sm" color="teal" variant="light" leftSection={<IconCircleCheck size={12} />}>
                {loadedHint}
              </Badge>
              <Text size="xs" c="dimmed">
                {fieldCount} {fieldCount === 1 ? "field" : "fields"}
              </Text>
            </Group>
          </Combobox.Header>
        )}
        <Combobox.Options>
          <ScrollArea.Autosize mah={420} type="scroll">
            {!hasData && <Combobox.Empty>{noDataHint}</Combobox.Empty>}
            {hasData && visibleNodes.length === 0 && <Combobox.Empty>No matching paths</Combobox.Empty>}
            {visibleNodes.map((node) => (
              <TreeNodeOption key={node.path} node={node} selected={value === node.path} isSearching={isSearching} />
            ))}
          </ScrollArea.Autosize>
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

function TreeNodeOption({ node, selected, isSearching }: { node: FlatNode; selected: boolean; isSearching: boolean }) {
  const TypeIcon = typeIcons[node.type] ?? IconLetterT;
  const indent = isSearching ? 0 : (node.depth - 1) * LEVEL_OFFSET;

  return (
    <Combobox.Option
      value={node.path}
      active={selected}
      style={{
        paddingInlineStart: BASE_PADDING + Math.max(0, indent),
        paddingBlock: 4,
      }}
    >
      <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
        {node.hasChildren && (
          <IconChevronDown
            size={14}
            style={{
              flexShrink: 0,
              color: "var(--mantine-color-dimmed)",
              transform: node.isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
              transition: "transform 150ms ease",
            }}
          />
        )}
        <TypeIcon size={14} style={{ flexShrink: 0, opacity: 0.5 }} />
        <Text
          size="sm"
          fw={selected ? 600 : 400}
          c={selected ? "var(--mantine-color-primary-filled)" : undefined}
          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}
        >
          {node.label}
        </Text>
        {node.preview !== null && (
          <Text
            size="xs"
            c="dimmed"
            style={{ flexShrink: 0, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {node.preview}
          </Text>
        )}
      </Group>
    </Combobox.Option>
  );
}
