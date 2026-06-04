"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "@mantine/core";

import { Link } from "@homarr/ui";

export const CommonNavLink = (props: ClientNavigationLink) =>
  "href" in props ? <NavLinkHref {...props} /> : <NavLinkWithItems {...props} />;

const NavLinkHref = (props: NavigationLinkHref) => {
  const pathname = usePathname();
  return props.external ? (
    <NavLink component="a" label={props.label} leftSection={props.icon} href={props.href} target="_blank" />
  ) : (
    <NavLink
      component={Link}
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      active={pathname === props.href}
    />
  );
};

const NavLinkWithItems = (props: NavigationLinkWithItems) => {
  const pathname = usePathname();
  const isActive = props.items.some((item) => item.href === pathname);
  return (
    <NavLink label={props.label} leftSection={props.icon} defaultOpened={isActive}>
      {props.items.map((item) => (
        <NavLinkHref key={item.label} {...item} />
      ))}
    </NavLink>
  );
};

interface CommonNavigationLinkProps {
  label: string;
  icon: ReactNode;
}

interface NavigationLinkHref extends CommonNavigationLinkProps {
  href: string;
  external?: boolean;
}
interface NavigationLinkWithItems extends CommonNavigationLinkProps {
  items: NavigationLinkHref[];
}

export type ClientNavigationLink = NavigationLinkHref | NavigationLinkWithItems;
