import type { GetStylesApi } from "@mantine/core";
import { createSafeContext } from "@mantine/core";

import type { SectionMenuFactory } from "./section-menu";

interface SectionMenuContext {
  toggleDropdown: () => void;
  closeDropdownImmediately: () => void;
  closeDropdown: () => void;
  openDropdown: () => void;
  getItemIndex: (node: HTMLButtonElement) => number | null;
  setHovered: (index: number | null) => void;
  hovered: number | null;
  closeOnItemClick: boolean | undefined;
  loop: boolean | undefined;
  trigger: "click" | "hover" | "click-hover" | undefined;
  opened: boolean;
  unstyled: boolean | undefined;
  getStyles: GetStylesApi<SectionMenuFactory>;
  menuItemTabIndex: -1 | 0 | undefined;
  openedViaClick: boolean;
  setOpenedViaClick: (value: boolean) => void;
}

export const [SectionMenuContextProvider, useSectionMenuContext] = createSafeContext<SectionMenuContext>(
  "SectionMenu component was not found in the tree",
);
