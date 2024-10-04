import { useRef } from "react";
import type { Factory } from "@mantine/core";
import { factory, Popover } from "@mantine/core";
import { useMergedRef } from "@mantine/hooks";

import { useSectionMenuContext } from "./section-menu-context";

export type SectionMenuDropdownStylesNames = "dropdown";

export interface SectionMenuDropdownProps {
  childOpened: boolean;
  children: React.ReactNode;
}

export type SectionMenuDropdownFactory = Factory<{
  props: SectionMenuDropdownProps;
  ref: HTMLDivElement;
  stylesNames: SectionMenuDropdownStylesNames;
  compound: true;
}>;

export const SectionMenuDropdown = factory<SectionMenuDropdownFactory>(({ childOpened, children }, ref) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const ctx = useSectionMenuContext();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (childOpened) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      wrapperRef.current?.querySelectorAll<HTMLButtonElement>("[data-section-menu-item]:not(:disabled)")[0]?.focus();
    }
  };

  return (
    <Popover.Dropdown
      role="menu"
      aria-orientation="vertical"
      ref={useMergedRef(ref, wrapperRef)}
      {...ctx.getStyles("dropdown")}
      tabIndex={-1}
      data-section-menu-dropdown
      onKeyDown={handleKeyDown}
    >
      <div tabIndex={-1} data-autofocus data-mantine-stop-propagation style={{ outline: 0 }} />
      {children}
    </Popover.Dropdown>
  );
});
