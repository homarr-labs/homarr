"use client";

import type { PropsWithChildren, MouseEvent } from "react";
import { useEffect, useState } from "react";
import { Box, Menu } from "@mantine/core";
import dynamic from "next/dynamic";
import { useOptionalBoardEditing } from "~/app/[locale]/boards/(content)/_editing-provider";

const BoardAddMenuItems = dynamic(() => import("./board-add-menu-items").then((module) => module.BoardAddMenuItems));
const occupiedSpaceSelector =
  '[data-grid-item-id], [data-editor-grid-entry], [data-item-id], button, a, input, textarea, select, [contenteditable], [role="button"], [role="menu"], [role="dialog"]';

export const BoardContextMenu = ({ children }: PropsWithChildren) => {
  const editing = useOptionalBoardEditing();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [position]);

  const openMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!editing?.hasChangeAccess || editing.isPending || event.defaultPrevented || event.shiftKey) return;
    if (!(event.target instanceof Element) || event.target.closest(occupiedSpaceSelector)) return;
    if (window.getSelection()?.toString()) return;
    event.preventDefault();
    event.stopPropagation();
    setPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <Box h="100%" onContextMenu={openMenu}>
      {children}
      <Menu
        opened={position !== null && Boolean(editing?.hasChangeAccess)}
        onChange={(opened) => {
          if (!opened) setPosition(null);
        }}
        position="bottom-start"
        offset={2}
        withinPortal
        withArrow={false}
        shadow="md"
      >
        <Menu.Target>
          <span
            aria-hidden
            style={{
              position: "fixed",
              left: position?.x ?? 0,
              top: position?.y ?? 0,
              width: 0,
              height: 0,
              pointerEvents: "none",
            }}
          />
        </Menu.Target>
        <Menu.Dropdown>{position && <BoardAddMenuItems />}</Menu.Dropdown>
      </Menu>
    </Box>
  );
};
