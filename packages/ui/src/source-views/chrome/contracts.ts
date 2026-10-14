import type { FocusEventHandler, PointerEventHandler, PropsWithChildren, ReactNode } from "react";
import type { ActionIconProps, AppShellProps } from "@mantine/core";

export type ShellViewProps = PropsWithChildren<{
  hasHeader?: boolean;
  hasNavigation?: boolean;
  collapsed: boolean;
  backgroundProps: Pick<AppShellProps, "bg" | "bgp" | "bgsz" | "bgr" | "bga">;
  headerHeight: number;
}>;

export interface HeaderDisplay {
  search: "input" | "icon";
  logo: "logo" | "logoAndText";
}

export interface ConfigurableHeaderViewProps<TItem> {
  visible: boolean;
  zones: { left: TItem[]; center: TItem[]; right: TItem[] };
  desktopDisplay: HeaderDisplay;
  getItemKey: (item: TItem) => string;
  renderItem: (item: TItem, display: HeaderDisplay) => ReactNode;
  hasNavigation: boolean;
  burger: ReactNode;
  floatingUser: ReactNode;
  spotlight: ReactNode;
  actions?: ReactNode;
}

export type HeaderButtonProps = (
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
  onFocus?: () => void;
  onPointerDown?: () => void;
  onPointerEnter?: () => void;
} & Partial<ActionIconProps>;

export interface HeaderLogoViewProps {
  href: string;
  display: "logo" | "logoAndText";
  logo: ReactNode;
  logoWithTitle: ReactNode;
  label: string;
}
