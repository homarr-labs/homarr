"use client";

import type { KeyboardEvent, MouseEvent, PointerEvent, PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import type { BoxProps } from "@mantine/core";
import { Box, Menu } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useEditMode } from "@homarr/boards/edit-mode";
import { useModalAction } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";

import type { DynamicSectionItem, Section } from "~/app/[locale]/boards/_types";
import { ItemSelectModal } from "../../items/item-select-modal";
import { useBoardPermissions } from "../../permissions/client";
import type { BoardPlacementHint } from "../../items/actions/create-item";
import type { UseGridstackRefs } from "./use-gridstack";
import classes from "./board-empty-space-context-menu.module.css";
import { hasExceededLongPressMoveTolerance } from "./long-press";

const suppressTouchCalloutClass = classes.suppressTouchCallout as string;

interface MenuState {
  x: number;
  y: number;
  placement: BoardPlacementHint;
}

interface Props extends BoxProps {
  section: Exclude<Section, { kind: "dynamic" }> | DynamicSectionItem;
  refs: UseGridstackRefs;
}

export const BoardEmptySpaceContextMenu = ({ section, refs, children, ...boxProps }: PropsWithChildren<Props>) => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const settings = useSettings();
  const t = useI18n();
  const { hasChangeAccess } = useBoardPermissions(board);
  const { openModal } = useModalAction(ItemSelectModal);
  const [isEditMode] = useEditMode();
  const [menu, setMenu] = useState<MenuState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressPointer = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const touchGuardElement = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const enabled = hasChangeAccess && settings.enableRightClickOnWidgets;
  const closeMenu = (afterFocusRestore?: (returnFocus: HTMLElement | null) => void) => {
    const returnFocus = returnFocusRef.current;
    returnFocusRef.current = null;
    setMenu(null);
    requestAnimationFrame(() => {
      returnFocus?.focus();
      afterFocusRestore?.(returnFocus);
    });
  };
  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchGuardElement.current?.classList.remove(suppressTouchCalloutClass);
    touchGuardElement.current = null;
    longPressPointer.current = null;
  };

  useEffect(
    () => () => {
      if (longPressTimer.current !== null) clearTimeout(longPressTimer.current);
      touchGuardElement.current?.classList.remove(suppressTouchCalloutClass);
    },
    [],
  );
  const resolvePlacement = (target: EventTarget | null, pageX: number, pageY: number) => {
    const wrapper = refs.wrapperElement.current;
    const gridstack = refs.gridstack.current;
    if (!(target instanceof Element) || !wrapper || !gridstack) return null;
    if (target.closest(".grid-stack") !== wrapper || target.closest(".grid-stack-item")) return null;

    const cell = gridstack.getCellFromPixel({ left: pageX, top: pageY }, true);
    const rowLimit = section.kind === "dynamic" ? section.height : undefined;
    if (
      cell.x < 0 ||
      cell.y < 0 ||
      cell.x >= gridstack.getColumn() ||
      (rowLimit !== undefined && cell.y >= rowLimit) ||
      !gridstack.isAreaEmpty(cell.x, cell.y, 1, 1)
    ) {
      return null;
    }

    return { sectionId: section.id, layoutId: currentLayoutId, xOffset: cell.x, yOffset: cell.y };
  };

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const placement = resolvePlacement(event.target, event.pageX, event.pageY);
    if (!placement) return;
    event.preventDefault();
    event.stopPropagation();
    returnFocusRef.current = event.currentTarget;
    setMenu({ x: event.clientX, y: event.clientY, placement });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled || event.pointerType !== "touch") return;
    const placement = resolvePlacement(event.target, event.pageX, event.pageY);
    if (!placement) return;
    const returnFocus = event.currentTarget;
    clearLongPress();
    longPressPointer.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    touchGuardElement.current = event.currentTarget;
    touchGuardElement.current.classList.add(suppressTouchCalloutClass);
    longPressTimer.current = setTimeout(() => {
      returnFocusRef.current = returnFocus;
      setMenu({ x: event.clientX, y: event.clientY, placement });
      navigator.vibrate?.(20);
    }, 500);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const pointer = longPressPointer.current;
    if (
      !pointer ||
      pointer.pointerId !== event.pointerId ||
      !hasExceededLongPressMoveTolerance(pointer, { x: event.clientX, y: event.clientY })
    ) {
      return;
    }
    clearLongPress();
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (longPressPointer.current?.pointerId === event.pointerId) clearLongPress();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      !enabled ||
      event.currentTarget !== event.target ||
      (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10"))
    ) {
      return;
    }
    const wrapper = event.currentTarget;
    const gridstack = refs.gridstack.current;
    if (!gridstack) return;

    const rowCount = Math.max(1, section.kind === "dynamic" ? section.height : gridstack.getRow() + 1);
    for (let yOffset = 0; yOffset < rowCount; yOffset++) {
      for (let xOffset = 0; xOffset < gridstack.getColumn(); xOffset++) {
        if (!gridstack.isAreaEmpty(xOffset, yOffset, 1, 1)) continue;
        const rect = wrapper.getBoundingClientRect();
        event.preventDefault();
        returnFocusRef.current = wrapper;
        setMenu({
          x: rect.left + 24,
          y: rect.top + 24,
          placement: { sectionId: section.id, layoutId: currentLayoutId, xOffset, yOffset },
        });
        return;
      }
    }
  };

  return (
    <>
      <Box
        {...boxProps}
        ref={refs.wrapper}
        tabIndex={enabled ? 0 : undefined}
        aria-label={enabled ? t("item.create.addAtPosition") : undefined}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
      >
        {children}
      </Box>
      <Menu
        opened={menu !== null}
        withInitialFocusPlaceholder={false}
        onChange={(opened) => {
          if (!opened) closeMenu();
        }}
        withinPortal
        position="bottom-start"
        returnFocus={false}
      >
        <Menu.Target>
          <Box pos="fixed" left={menu?.x ?? 0} top={menu?.y ?? 0} w={1} h={1} style={{ pointerEvents: "none" }} />
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item
            data-autofocus
            leftSection={<IconPlus size={18} />}
            onClick={() => {
              const placement = menu?.placement;
              closeMenu((returnFocus) => {
                if (!placement) return;
                openModal(
                  { placement, board, persistImmediately: !isEditMode },
                  {
                    onClose: () => {
                      requestAnimationFrame(() => {
                        if (returnFocus?.isConnected) returnFocus.focus();
                      });
                    },
                  },
                );
              });
            }}
          >
            {t("item.create.addAtPosition")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </>
  );
};
