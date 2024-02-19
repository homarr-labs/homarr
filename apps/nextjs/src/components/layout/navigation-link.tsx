"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NavLink } from "@homarr/ui";

export const CommonNavLink = (props: ClientNavigationLink) =>
  "href" in props ? (
    <NavLinkHref {...props} />
  ) : (
    <NavLinkWithItems {...props} />
  );

const NavLinkHref = (props: NavigationLinkHref) => {
  const pathname = usePathname();
  return props.external ? (
    <NavLink
      component="a"
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      style={{
        borderRadius: 5,
      }}
      target="_blank"
    />
  ) : (
    <NavLink
      component={Link}
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      active={pathname === props.href}
      style={{
        borderRadius: 5,
      }}
    />
  );
};

const NavLinkWithItems = (props: NavigationLinkWithItems) => (
  <NavLink
    style={{
      borderRadius: 5,
    }}
    label={props.label}
    leftSection={props.icon}
  >
    {props.items.map((item) => (
      <NavLinkHref key={item.label} {...item} />
    ))}
  </NavLink>
);

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
