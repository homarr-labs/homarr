"use client";

import { forwardRef, useCallback } from "react";
import type { ActionIconProps } from "@mantine/core";
import { ActionIcon } from "@mantine/core";

import { Link } from "../../components/link";
import type { HeaderButtonProps } from "./contracts";

const headerButtonActionIconProps: ActionIconProps = {
  variant: "subtle",
  style: { border: "none" },
  color: "gray",
  size: "lg",
};

export const HeaderButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, HeaderButtonProps>((props, ref) => {
  const elementRef = useCallback(
    (element: HTMLButtonElement | HTMLAnchorElement | null) => {
      if (typeof ref === "function") return ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  if ("href" in props) {
    return (
      <ActionIcon ref={elementRef} component={Link} {...props} {...headerButtonActionIconProps}>
        {props.children}
      </ActionIcon>
    );
  }
  return (
    <ActionIcon ref={elementRef} {...props} {...headerButtonActionIconProps}>
      {props.children}
    </ActionIcon>
  );
});
