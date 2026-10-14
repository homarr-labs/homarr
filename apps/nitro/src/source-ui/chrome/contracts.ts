import type { ComponentType, PropsWithChildren, ReactNode } from "react";
import type { IconProps } from "@tabler/icons-react";

import type { HeaderDisplay, ShellViewProps } from "@homarr/ui/source-views/chrome";
import type { HeaderBuiltinItemId, HeaderItem, HeaderPreferences } from "@homarr/validation/header-preferences";

export type ChromeAction =
  | { readonly kind: "available"; readonly run: () => void }
  | { readonly kind: "unavailable"; readonly reason: string };

export type BoardSwitcherControls =
  | {
      readonly kind: "available";
      readonly open: () => void;
      readonly preload: () => void;
      readonly hotkey: string;
    }
  | { readonly kind: "unavailable"; readonly reason: string };

export interface HeaderBoard {
  readonly id: string;
  readonly name: string;
  readonly logoImageUrl: string | null;
}

export interface HeaderAssistant {
  readonly enabled: boolean;
  readonly isRunning: boolean;
  readonly unreadCount: number;
  readonly open: () => void;
}

export type ChromeTourTarget = ComponentType<{ readonly id: string; readonly children: ReactNode }>;

export interface HeaderResources {
  readonly logo: ReactNode;
  readonly logoWithTitle: ReactNode;
  readonly logoHref: string;
  readonly boardEditAction?: ReactNode;
  readonly boardSettingsAction?: ReactNode;
  readonly boards: readonly HeaderBoard[];
  readonly userId: string | null;
  readonly userMenu: ReactNode;
  readonly desktopSearchInput: ReactNode;
  readonly renderMobileSearchButton: (alwaysVisible: boolean) => ReactNode;
  readonly boardSwitcher: BoardSwitcherControls;
  readonly assistant: HeaderAssistant | null;
  readonly docker: ChromeAction | null;
  readonly themeToggle: ChromeAction;
  readonly TourTarget: ChromeTourTarget;
  readonly label: (key: HeaderBuiltinItemId) => string;
  readonly boardUnavailableLabel: string;
  readonly dockerLabel: string;
}

export interface ConfigurableHeaderProps extends HeaderResources {
  readonly headerPreferences: HeaderPreferences;
  readonly hasNavigation: boolean;
  readonly burger: ReactNode;
  readonly spotlight: ReactNode;
  readonly actions?: ReactNode;
}

export interface HeaderItemProps extends HeaderResources {
  readonly item: HeaderItem;
  readonly display: HeaderDisplay;
  readonly board: HeaderBoard | undefined;
}

interface CommonNavigationLinkProps {
  readonly label: string;
  readonly icon: ComponentType<IconProps> | string;
  readonly iconProps?: IconProps;
  readonly hidden?: boolean;
  readonly "data-onboarding-tour-id"?: string;
}

export interface NavigationLinkHref extends CommonNavigationLinkProps {
  readonly href: string;
  readonly external?: boolean;
  readonly exact?: boolean;
}

export interface NavigationLinkWithItems extends CommonNavigationLinkProps {
  readonly items: readonly NavigationLinkHref[];
}

export type NavigationLink = NavigationLinkHref | NavigationLinkWithItems;

export interface MainNavigationProps {
  readonly headerSection?: ReactNode;
  readonly footerSection?: ReactNode;
  readonly links: readonly NavigationLink[];
  readonly collapseNavigation: () => void;
  readonly TourTarget: ChromeTourTarget;
}

export type ClientShellProps = Omit<ShellViewProps, "headerHeight"> & {
  readonly headerVisible: boolean;
};

export type SourceChromeProps = PropsWithChildren<{
  readonly collapsed: boolean;
  readonly onToggleNavigation: () => void;
  readonly backgroundProps: ShellViewProps["backgroundProps"];
  readonly header: Omit<ConfigurableHeaderProps, "burger" | "hasNavigation">;
  readonly navigation?: ReactNode;
  readonly mainId?: string;
  readonly direction?: "ltr" | "rtl";
  readonly sessionBlocked?: boolean;
}>;

export type UserMenuSession =
  | { readonly status: "authenticated"; readonly userId: string }
  | { readonly status: "unauthenticated" }
  | { readonly status: "unavailable"; readonly reason: string };

export interface UserMenuLabels {
  readonly open: string;
  readonly homeBoard: string;
  readonly boardSettings: string;
  readonly boardSwitcher: string;
  readonly modifier: string;
  readonly assistant: string;
  readonly assistantThinking: string;
  readonly assistantHotkey: string;
  readonly preferences: string;
  readonly management: string;
  readonly docker: string;
  readonly logout: string;
  readonly login: string;
}

export interface UserButtonProps {
  readonly avatar: ReactNode;
  readonly updateIndicator: ComponentType<PropsWithChildren>;
  readonly updatesMenuItem: ReactNode;
  readonly colorSchemeCombobox: ReactNode;
  readonly languageCombobox: ReactNode;
  readonly boardSettingsHref: string | null;
  readonly boardSwitcher: BoardSwitcherControls;
  readonly assistant: HeaderAssistant | null;
  readonly docker: ChromeAction | null;
  readonly session: UserMenuSession;
  readonly signOut: ChromeAction;
  readonly labels: UserMenuLabels;
}
