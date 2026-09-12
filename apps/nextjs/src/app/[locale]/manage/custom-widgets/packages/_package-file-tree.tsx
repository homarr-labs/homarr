"use client";

import { useMemo } from "react";
import { Group, Text, Tree, useTree } from "@mantine/core";
import type { TreeNodeData } from "@mantine/core";
import { IconChevronRight, IconCode, IconFolder, IconFolderOpen } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

export function PackageFileTree({ files, selected, onSelect }: {
  files: Record<string, string>;
  selected: string;
  onSelect(path: string): void;
}) {
  const t = useI18n("customWidget.package");
  const data = useMemo(() => {
    const roots: TreeNodeData[] = [{ value: "/widget.json", label: t("manifestFile") }];
    for (const path of Object.keys(files).toSorted()) {
      const parts = path.split("/");
      let siblings = roots;
      let prefix = "";
      for (const [index, label] of parts.entries()) {
        prefix += label;
        if (index === parts.length - 1) {
          siblings.push({ value: path, label });
          break;
        }
        prefix += "/";
        let folder = siblings.find((node) => node.value === prefix);
        if (!folder) {
          folder = { value: prefix, label, children: [] };
          siblings.push(folder);
        }
        siblings = folder.children ?? [];
      }
    }
    return roots;
  }, [files, t]);
  const tree = useTree({
    selectedState: [selected],
    onSelectedStateChange: (values) => {
      const value = values[0];
      if (value && !value.endsWith("/")) onSelect(value);
    },
  });
  return (
    <Tree
      aria-label={t("files")}
      data={data}
      tree={tree}
      levelOffset={16}
      selectOnClick
      renderNode={({ node, expanded, hasChildren, elementProps }) => {
        let Icon = IconCode;
        if (hasChildren) Icon = IconFolder;
        if (hasChildren && expanded) Icon = IconFolderOpen;
        return (
          <Group {...elementProps} gap={6} wrap="nowrap" py={5} title={node.value}>
            {hasChildren && <IconChevronRight size={12} style={{ transform: `rotate(${expanded ? 90 : 0}deg)` }} />}
            <Icon size={16} style={{ flexShrink: 0 }} />
            <Text size="xs" truncate>
              {node.label}
            </Text>
          </Group>
        );
      }}
    />
  );
}
