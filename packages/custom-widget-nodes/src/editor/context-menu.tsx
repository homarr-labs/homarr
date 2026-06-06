"use client";

import { Menu } from "@mantine/core";
import { IconCloud, IconEye, IconTransform } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";

import type { TablerIcon } from "@tabler/icons-react";

interface ContextMenuProps {
  x: number;
  y: number;
  onAddNode: (type: string, position: { x: number; y: number }) => void;
  onClose: () => void;
}

const nodeMenuItems: Array<{ categoryKey: string; icon: TablerIcon; items: Array<{ type: string }> }> = [
  { categoryKey: "sources", icon: IconCloud, items: [{ type: "httpRequest" }] },
  {
    categoryKey: "transforms",
    icon: IconTransform,
    items: [{ type: "jsonPath" }, { type: "merge" }, { type: "template" }],
  },
  {
    categoryKey: "displays",
    icon: IconEye,
    items: [
      { type: "singleValue" },
      { type: "keyValue" },
      { type: "table" },
      { type: "lineChart" },
      { type: "areaChart" },
      { type: "barChart" },
      { type: "sparkline" },
    ],
  },
];

export function FlowContextMenu({ x, y, onAddNode, onClose }: ContextMenuProps) {
  const t = useScopedI18n("customWidget.flowEditor");

  return (
    <Menu opened position="bottom-start" onClose={onClose} withinPortal>
      <Menu.Target>
        <div style={{ position: "fixed", left: x, top: y, width: 1, height: 1 }} />
      </Menu.Target>
      <Menu.Dropdown>
        {nodeMenuItems.map((category) => (
          <div key={category.categoryKey}>
            <Menu.Label>{t(`category.${category.categoryKey}` as never)}</Menu.Label>
            {category.items.map((item) => (
              <Menu.Item
                key={item.type}
                leftSection={<category.icon size={14} />}
                onClick={() => {
                  onAddNode(item.type, { x, y });
                  onClose();
                }}
              >
                {t(`node.${item.type}` as never)}
              </Menu.Item>
            ))}
          </div>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
