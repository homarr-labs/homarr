"use client";

import { KeyboardEvent, useRef } from "react";
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

export default function HomePage() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hovered, { setHovered, resetHovered }] = useHovered();
  const [opened, { open, close, toggle }] = useDisclosure(false, {
    onOpen() {},
    onClose() {},
  });
  return (
    <Stack>
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
        <Popover.Target popupType="menu">
          <Button onClick={toggle}>Open popover</Button>
        </Popover.Target>
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
          {Array.from({ length: 5 }).map((_, index) => (
            <Item key={index} index={index} setHovered={setHovered} hovered={hovered} />
          ))}
        </Popover.Dropdown>
      </Popover>
    </Stack>
  );
}

interface ItemProps {
  index: number;
  setHovered: (index: number) => void;
  hovered: number | null;
}

const Item = ({ index, setHovered, hovered }: ItemProps) => {
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
    console.log("hi");
    if ((event.key === "ArrowRight" && dir === "ltr") || (event.key === "ArrowLeft" && dir === "rtl")) {
      console.log("hey");
      // childMenu.open();
      return;
    }

    // We don't want to handle keydown event if child menu is opened
    /*if (childMenu.opened) {
      console.log('hey');
      return;
    }*/

    console.log("hallo");
    scopedKeydownHandler(event);
  };

  const handleHoverOrFocus = () => {
    setHovered(index);
  };

  const handleMouseLeave = () => {
    setHovered(-1);
  };

  return (
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
};
