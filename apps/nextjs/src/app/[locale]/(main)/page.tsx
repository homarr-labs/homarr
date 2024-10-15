"use client";

import type { JSXElementConstructor, KeyboardEvent, ReactElement } from "react";
import { cloneElement, useRef } from "react";
import {
  Button,
  createScopedKeydownHandler,
  Popover,
  Stack,
  UnstyledButton,
  useDirection,
  useHovered,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { BoardDynamicSectionMenu } from "~/components/board/sections/dynamic/dynamic-menu";

export default function HomePage() {
  return (
    <Stack>
      <StackedMenu target={<Button>Open popover</Button>} items={[{ type: "section", id: "" }]} />
    </Stack>
  );
}

interface StackedMenuProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: ReactElement<any, string | JSXElementConstructor<any>>;
  items: { type: "section" | "item"; id: string }[];
}

const StackedMenu = ({ target, items }: StackedMenuProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hovered, { setHovered }] = useHovered();
  const [opened, { open, close, toggle }] = useDisclosure(false, {
    onOpen() {},
    onClose() {},
  });

  return (
    <Popover
      opened={opened}
      onChange={toggle}
      __staticSelector="StackedMenu"
      clickOutsideEvents={["mousedown", "touchstart", "keydown"]}
      withArrow
      withinPortal={false}
      trapFocus
      returnFocus
    >
      <Popover.Target popupType="menu">{cloneElement(target, { onClick: toggle })}</Popover.Target>
      <Popover.Dropdown
        ref={wrapperRef}
        role="menu"
        aria-orientation="vertical"
        tabIndex={-1}
        data-stacked-menu-dropdown
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;

          event.preventDefault();
          wrapperRef.current
            ?.querySelectorAll<HTMLButtonElement>("[data-stacked-menu-item]:not(:disabled)")[0]
            ?.focus();
        }}
      >
        <div tabIndex={-1} data-autofocus data-mantine-stop-propagation style={{ outline: 0 }} />
        {items.map(({ id, type }, index) => (
          <Item key={index} index={index} setHovered={setHovered} hovered={hovered} type={type} id={id} />
        ))}
      </Popover.Dropdown>
    </Popover>
  );
};

interface ItemProps {
  index: number;
  setHovered: (index: number) => void;
  hovered: number | null;
  type: "section" | "item";
  id: string; // id of item / section
}

const Item = ({ index, setHovered, hovered, type, id }: ItemProps) => {
  const [childMenuOpened, childMenuActions] = useDisclosure(false);

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
      childMenuActions.open();
      return;
    }

    // We don't want to handle keydown event if child menu is opened
    if (childMenuOpened) {
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
      w="100%"
      key={index}
      role="menuitem"
      data-stacked-menu-item
      data-hovered={hovered === index}
      data-mantine-stop-propagation
      onFocus={handleHoverOrFocus}
      onMouseEnter={handleHoverOrFocus}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
    >
      Item {index}
    </UnstyledButton>
  );

  if (type === "section") {
    return <BoardDynamicSectionMenu section={{ id }} target={target} withinPortal />;
  }

  return target;
};
