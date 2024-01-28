import type { ForwardedRef, ReactNode } from "react";
import { forwardRef } from "react";
import Link from "next/link";

import type { ActionIconProps } from "@homarr/ui";
import { ActionIcon } from "@homarr/ui";

type HeaderButtonProps = (
  | {
      onClick: () => void;
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

// eslint-disable-next-line react/display-name
export const HeaderButton = forwardRef<HTMLButtonElement, HeaderButtonProps>(
  (props, ref) => {
    if ("onClick" in props) {
      return (
        <ActionIcon ref={ref} {...props} {...headerButtonActionIconProps}>
          {props.children}
        </ActionIcon>
      );
    }
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
  },
);
