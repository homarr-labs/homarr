"use client";

import type { MutableRefObject, PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Menu } from "@mantine/core";

import { useSession } from "@homarr/auth/client";
import { useSettings } from "@homarr/settings";
import type { WidgetDefinition } from "@homarr/widgets/definition";

import type { UseGridstackRefs } from "../sections/gridstack/use-gridstack";

import type { SectionItem } from "~/app/[locale]/boards/_types";
import { WidgetContextMenuDropdown } from "./widget-context-menu";

interface ActiveContextMenu {
  item: SectionItem;
  definition: WidgetDefinition;
  widgetStateRef: MutableRefObject<Record<string, unknown> | null>;
  /** Carried from the item's section, which the board-level menu is outside of. */
  gridstack: UseGridstackRefs["gridstack"];
  x: number;
  y: number;
}

interface WidgetContextMenuApi {
  /** Null when right-click menus are disabled, which lets items skip their handler. */
  open: ((menu: ActiveContextMenu) => void) | null;
}

const WidgetContextMenuContext = createContext<WidgetContextMenuApi>({ open: null });

export const useWidgetContextMenu = () => useContext(WidgetContextMenuContext);

/**
 * One context menu for the whole board instead of one per widget.
 *
 * Mantine's `Menu` mounts `Popover` + `PopoverDropdown` + several context providers
 * even while closed, so a menu per item cost ~13 fibers each for something almost
 * never opened — measured at 364 of 3,918 fibers (9%) on a 28-widget board, growing
 * with item count. Items now only carry a `contextmenu` listener and this single menu
 * is anchored to the cursor.
 */
export const WidgetContextMenuProvider = ({ children }: PropsWithChildren) => {
  const { data: session } = useSession();
  const settings = useSettings();
  const [active, setActive] = useState<ActiveContextMenu | null>(null);

  const isEnabled = Boolean(session) && settings.enableRightClickOnWidgets;
  const open = useCallback((menu: ActiveContextMenu) => setActive(menu), []);
  const api = useMemo<WidgetContextMenuApi>(() => ({ open: isEnabled ? open : null }), [isEnabled, open]);

  return (
    <WidgetContextMenuContext value={api}>
      {children}
      {active && (
        <Menu
          shadow="md"
          width={300}
          closeOnItemClick={false}
          position="right-start"
          offset={4}
          opened
          onChange={(opened) => {
            if (!opened) setActive(null);
          }}
        >
          {/* Zero-size anchor at the cursor so Mantine positions the dropdown there. */}
          <Menu.Target>
            <div
              style={{
                position: "fixed",
                left: active.x,
                top: active.y,
                width: 1,
                height: 1,
                pointerEvents: "none",
              }}
            />
          </Menu.Target>
          <Menu.Dropdown>
            <WidgetContextMenuDropdown
              item={active.item}
              definition={active.definition}
              widgetStateRef={active.widgetStateRef}
              settings={settings}
              gridstack={active.gridstack}
            />
          </Menu.Dropdown>
        </Menu>
      )}
    </WidgetContextMenuContext>
  );
};
