import type { FocusEventHandler, ForwardedRef, PointerEventHandler, ReactNode } from "react";
import { forwardRef } from "react";
import type { ActionIconProps } from "@mantine/core";
import { ActionIcon } from "@mantine/core";

import { Link } from "@homarr/ui";

type HeaderButtonProps = (
  | {
      onClick?: () => void;
      onFocus?: FocusEventHandler<HTMLButtonElement>;
      onPointerEnter?: PointerEventHandler<HTMLButtonElement>;
    }
  | {
      href: string;
    }
) & {
  children: ReactNode;
} & Partial<ActionIconProps>;

const headerButtonActionIconProps: ActionIconProps = {
  variant: "subtle",
  style: { border: "none" },
  color: "gray",
  size: "lg",
};

export const HeaderButton = forwardRef<HTMLButtonElement, HeaderButtonProps>((props, ref) => {
  if ("href" in props) {
    return (
      <ActionIcon
        ref={ref as ForwardedRef<HTMLAnchorElement>}
        component={Link}
        {...props}
        {...headerButtonActionIconProps}
      >
        {props.children}
      </ActionIcon>
    );
  }
  return (
    <ActionIcon ref={ref} {...props} {...headerButtonActionIconProps}>
      {props.children}
    </ActionIcon>
  );
});
