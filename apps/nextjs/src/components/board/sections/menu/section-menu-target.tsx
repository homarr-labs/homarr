import { cloneElement, forwardRef } from "react";
import { createEventHandler, isElement, Popover, useProps } from "@mantine/core";

import { useSectionMenuContext } from "./section-menu-context";

export interface SectionMenuTargetProps {
  /** Target element */
  children: React.ReactNode;

  /** Key of the prop that should be used to get element ref */
  refProp?: string;
}

const defaultProps: Partial<SectionMenuTargetProps> = {
  refProp: "ref",
};

export const SectionMenuTarget = forwardRef<HTMLElement, SectionMenuTargetProps>((props, ref) => {
  const { children, refProp, ...others } = useProps("SectionMenuTarget", defaultProps, props);

  if (!isElement(children)) {
    throw new Error(
      "SectionMenu.Target component children should be an element or a component that accepts ref. Fragments, strings, numbers and other primitive values are not supported",
    );
  }

  const ctx = useSectionMenuContext();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  const onClick = createEventHandler(children.props.onClick, () => {
    ctx.toggleDropdown();
  });

  return (
    <Popover.Target refProp={refProp} popupType="menu" ref={ref} {...others}>
      {cloneElement(children, {
        onClick,
        "data-expanded": ctx.opened ? true : undefined,
      })}
    </Popover.Target>
  );
});
