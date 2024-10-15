"use client";

import type { Dispatch, JSXElementConstructor, KeyboardEvent, ReactElement } from "react";
import { cloneElement, useRef, useState } from "react";
import {
  createScopedKeydownHandler,
  Group,
  Popover,
  Text,
  UnstyledButton,
  useDirection,
  useHovered,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconBox, IconResize } from "@tabler/icons-react";
import { SetStateAction } from "jotai";

import { useEditMode } from "~/app/[locale]/boards/(content)/_context";
import { BoardDynamicSectionMenu } from "~/components/board/sections/dynamic/dynamic-menu";
import classes from "./stacked-menu.module.css";

interface StackedMenuProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: ReactElement<any, string | JSXElementConstructor<any>>;
  items: { type: "section" | "item"; id: string }[];
}

export const StackedMenu = ({ target, items }: StackedMenuProps) => {
  const [hovered, { setHovered }] = useHovered();
  const [openChildMenu, setOpenChildMenu] = useState<string | null>(null);
  const [opened, { toggle, open, close }] = useDisclosure(false, {
    onClose() {
      setHovered(null);
      setOpenChildMenu(null);
    },
  });
  const [isEditMode] = useEditMode();

  if (!isEditMode) return null;

  return (
    <Popover
      opened={opened}
      onChange={(opened) => {
        if (opened) {
          open();
        } else {
          close();
        }
      }}
      __staticSelector="StackedMenu"
      clickOutsideEvents={["mousedown", "touchstart", "keydown"]}
      withArrow
      trapFocus
      returnFocus
    >
      <Popover.Target popupType="menu">{cloneElement(target, { onClick: toggle })}</Popover.Target>
      <Dropdown
        items={items}
        openChildMenu={openChildMenu}
        setOpenChildMenu={setOpenChildMenu}
        opened={opened}
        hovered={hovered}
        setHovered={setHovered}
      />
    </Popover>
  );
};

interface DropdownProps {
  items: { type: "section" | "item"; id: string }[];
  openChildMenu: string | null;
  setOpenChildMenu: Dispatch<SetStateAction<string | null>>;
  opened: boolean;
  hovered: number | null;
  setHovered: (index: number) => void;
}

const Dropdown = ({ items, openChildMenu, setOpenChildMenu, opened, hovered, setHovered }: DropdownProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <Popover.Dropdown
      ref={wrapperRef}
      p={4}
      role="menu"
      aria-orientation="vertical"
      tabIndex={-1}
      data-stacked-menu-dropdown
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        if (openChildMenu) return;

        event.preventDefault();
        wrapperRef.current?.querySelectorAll<HTMLButtonElement>("[data-stacked-menu-item]:not(:disabled)")[0]?.focus();
      }}
    >
      <div tabIndex={-1} data-autofocus data-mantine-stop-propagation style={{ outline: 0 }} />
      {items.map(({ id, type }, index) => (
        <Item
          key={index}
          index={index}
          setHovered={(index) => {
            if (!opened) return;

            setHovered(index);
          }}
          hovered={hovered}
          type={type}
          id={id}
          opened={openChildMenu}
          onOpen={() => {
            setOpenChildMenu(id);
          }}
          onClose={(keepFocus) => {
            if (keepFocus) {
              setOpenChildMenu((previous) => (previous === id ? null : previous));
              wrapperRef.current
                ?.querySelectorAll<HTMLButtonElement>(`[data-stacked-menu-item][data-id='${id}']`)[0]
                ?.focus();
            } else {
              setOpenChildMenu(null);
            }
          }}
          onToggle={() => {
            setOpenChildMenu((previous) => (previous === id ? null : id));
          }}
        />
      ))}
    </Popover.Dropdown>
  );
};

interface ItemProps {
  index: number;
  setHovered: (index: number) => void;
  hovered: number | null;
  type: "section" | "item";
  id: string; // id of item / section
  opened: string | null;
  onOpen: () => void;
  onClose: (keepFocus: boolean) => void;
  onToggle: () => void;
}

const Item = ({ index, setHovered, hovered, type, id, opened, onOpen, onClose, onToggle }: ItemProps) => {
  const { dir } = useDirection();
  const scopedKeydownHandler = createScopedKeydownHandler({
    siblingSelector: "[data-stacked-menu-item]",
    parentSelector: "[data-stacked-menu-dropdown]",
    activateOnFocus: false,
    loop: true,
    dir,
    orientation: "vertical",
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === "ArrowRight" && dir === "ltr") || (event.key === "ArrowLeft" && dir === "rtl")) {
      onOpen();
      return;
    }

    // We don't want to handle keydown event if child menu is opened
    if (opened) {
      return;
    }

    scopedKeydownHandler(event);
  };

  const handleHoverOrFocus = () => {
    setHovered(index);
  };

  const handleMouseLeave = () => {
    setHovered(-1);
  };

  const target = (
    <UnstyledButton
      key={index}
      role="menuitem"
      data-stacked-menu-item
      mod={{
        hovered: hovered === index && !opened,
      }}
      data-id={id}
      data-mantine-stop-propagation
      onFocus={handleHoverOrFocus}
      onMouseEnter={handleHoverOrFocus}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      className={classes.item}
    >
      <Group align="center">
        {type === "section" ? <IconResize size="1rem" /> : <IconBox size="1rem" />}
        <Text size="sm">{`${type === "section" ? "Section" : "Item"} ${index + 1}`}</Text>
      </Group>
    </UnstyledButton>
  );

  if (type === "section") {
    return (
      <BoardDynamicSectionMenu
        withinPortal={false}
        opened={opened === id}
        onClose={() => onClose(false)}
        onToggle={onToggle}
        section={{ id }}
        target={target}
        onKeyDown={(event) => {
          if (dir === "ltr" && event.key === "ArrowLeft") {
            onClose(true);
          } else if (dir === "rtl" && event.key === "ArrowRight") {
            onClose(true);
          }
        }}
      />
    );
  }

  return target;
};
