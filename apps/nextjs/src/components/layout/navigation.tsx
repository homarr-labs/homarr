import Link from "next/link";

import {
  AppShellNavbar,
  AppShellSection,
  NavLink,
  ScrollArea,
} from "@homarr/ui";
import type { TablerIconsProps } from "@homarr/ui";

interface MainNavigationProps {
  headerSection?: JSX.Element;
  footerSection?: JSX.Element;
  links: NavigationLink[];
}

export const MainNavigation = ({
  headerSection,
  footerSection,
  links,
}: MainNavigationProps) => {
  return (
    <AppShellNavbar p="md">
      {headerSection && <AppShellSection>{headerSection}</AppShellSection>}
      <AppShellSection
        grow
        mt={headerSection ? "md" : undefined}
        mb={footerSection ? "md" : undefined}
        component={ScrollArea}
      >
        {links.map((link) => (
          <CommonNavLink key={link.label} {...link} />
        ))}
      </AppShellSection>
      {footerSection && <AppShellSection>{footerSection}</AppShellSection>}
    </AppShellNavbar>
  );
};

const CommonNavLink = (props: NavigationLink) =>
  "href" in props ? (
    <NavLinkHref {...props} />
  ) : (
    <NavLinkWithItems {...props} />
  );

const NavLinkHref = (props: NavigationLinkHref) =>
  props.external ? (
    <NavLink
      component="a"
      label={props.label}
      leftSection={<props.icon size={20} stroke={1.5} />}
      href={props.href}
      target="_blank"
    />
  ) : (
    <NavLink
      component={Link}
      label={props.label}
      leftSection={<props.icon size={20} stroke={1.5} />}
      href={props.href}
    />
  );

const NavLinkWithItems = (props: NavigationLinkWithItems) => (
  <NavLink
    label={props.label}
    leftSection={<props.icon size={20} stroke={1.5} />}
  >
    {props.items.map((item) => (
      <NavLinkHref key={item.label} {...item} />
    ))}
  </NavLink>
);

interface CommonNavigationLinkProps {
  label: string;
  icon: (props: TablerIconsProps) => JSX.Element;
}

interface NavigationLinkHref extends CommonNavigationLinkProps {
  href: string;
  external?: boolean;
}
interface NavigationLinkWithItems extends CommonNavigationLinkProps {
  items: NavigationLinkHref[];
}
export type NavigationLink = NavigationLinkHref | NavigationLinkWithItems;
