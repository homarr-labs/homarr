import { useState } from "react";
import type { Factory, PopoverStylesNames } from "@mantine/core";
import { getContextItemIndex, Popover, useHovered, useStyles } from "@mantine/core";
import { useDidUpdate, useUncontrolled } from "@mantine/hooks";

import { SectionMenuContextProvider } from "./section-menu-context";
import classes from "./SectionMenu.module.css";

export type SectionMenuStylesNames = "item" | "itemLabel" | "itemSection" | "label" | "divider" | PopoverStylesNames;

export type SectionMenuFactory = Factory<{
  props: SectionMenuProps;
  ref: HTMLDivElement;
  stylesNames: SectionMenuStylesNames;
}>;

export interface SectionMenuProps {
  /** Menu content */
  children?: React.ReactNode;

  /** Controlled menu opened state */
  opened?: boolean;

  /** Called when Menu is opened */
  onOpen?: () => void;

  /** Called when Menu is closed */
  onClose?: () => void;
}

export function SectionMenu(props: SectionMenuProps) {
  const { children, onOpen, onClose, opened, ...others } = props;

  const getStyles = useStyles<SectionMenuFactory>({
    name: "SectionMenu",
    classes,
    props,
    classNames: [],
    styles: {},
    unstyled: false,
  });

  const [hovered, { setHovered, resetHovered }] = useHovered();
  const [_opened, setOpened] = useUncontrolled({
    value: opened,
    defaultValue: false,
    finalValue: false,
    onChange: () => undefined,
  });
  const [openedViaClick, setOpenedViaClick] = useState(false);

  const close = () => {
    setOpened(false);
    setOpenedViaClick(false);
    if (_opened) {
      onClose?.();
    }
  };

  const open = () => {
    setOpened(true);
    if (!_opened) {
      onOpen?.();
    }
  };

  const toggleDropdown = () => {
    if (_opened) {
      close();
    } else {
      open();
    }
  };

  const getItemIndex = (node: HTMLButtonElement) =>
    getContextItemIndex("[data-section-menu-item]", "[data-section-menu-dropdown]", node);

  useDidUpdate(() => {
    resetHovered();
  }, [_opened]);

  return (
    <SectionMenuContextProvider
      value={{
        getStyles,
        opened: _opened,
        toggleDropdown,
        getItemIndex,
        hovered,
        setHovered,
        openedViaClick,
        setOpenedViaClick,
        closeOnItemClick: false,
        closeDropdown: close,
        openDropdown: open,
        closeDropdownImmediately: close,
        loop: true,
        trigger: "click",
        unstyled: false,
        menuItemTabIndex: -1,
      }}
    >
      <Popover
        {...others}
        opened={_opened}
        onChange={toggleDropdown}
        __staticSelector="SectionMenu"
        clickOutsideEvents={["mousedown", "touchstart", "keydown"]}
        withArrow
        withinPortal={false}
        returnFocus
      >
        {children}
      </Popover>
    </SectionMenuContextProvider>
  );
}
