import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Drawer, Menu } from "@mantine/core";
import { useFocusReturn } from "@mantine/hooks";

import { useIsMobile } from "@homarr/ui/hooks";

import classes from "./widget-context-menu.module.css";

interface ItemMenuDropdownProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export const ItemMenuDropdown = ({ opened, onClose, title, children }: ItemMenuDropdownProps) => {
  const isMobile = useIsMobile();

  return (
    <>
      {(!isMobile || !opened) && <Menu.Dropdown>{children}</Menu.Dropdown>}
      {isMobile && (
        <ItemMenuDrawer opened={opened} onClose={onClose} title={title}>
          {children}
        </ItemMenuDrawer>
      )}
    </>
  );
};

const ItemMenuDrawer = ({ opened, onClose, title, children }: ItemMenuDropdownProps) => {
  const [mounted, setMounted] = useState(false);
  const drawerOpened = opened && mounted;
  useFocusReturn({ opened: drawerOpened });

  useEffect(() => {
    if (opened) setMounted(true);
  }, [opened]);

  if (!opened && !mounted) return null;

  return (
    <Drawer
      opened={drawerOpened}
      onClose={onClose}
      onExitTransitionEnd={() => setMounted(false)}
      returnFocus={false}
      position="bottom"
      size="min(80dvh, 40rem)"
      title={title}
      classNames={{ content: classes.mobileDrawerContent, body: classes.mobileDrawerBody }}
    >
      <div className={classes.mobileActionList} role="menu" aria-orientation="vertical" data-menu-dropdown>
        {children}
      </div>
    </Drawer>
  );
};
