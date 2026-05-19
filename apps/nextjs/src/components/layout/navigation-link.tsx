"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "@mantine/core";

import { Link } from "@homarr/ui";

export const CommonNavLink = (props: ClientNavigationLink) =>
  "href" in props ? <NavLinkHref {...props} /> : <NavLinkWithItems {...props} />;

const NavLinkHref = (props: NavigationLinkHref) => {
  const pathname = usePathname();
  const tourId = props["data-onboarding-tour-id"];
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
      data-onboarding-tour-id={tourId}
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
      data-onboarding-tour-id={tourId}
    />
  );
};

const NavLinkWithItems = (props: NavigationLinkWithItems) => {
  const pathname = usePathname();
  const isActive = props.items.some((item) => item.href === pathname);
  return (
    <NavLink
      style={{
        borderRadius: 5,
      }}
      label={props.label}
      leftSection={props.icon}
      defaultOpened={isActive}
      data-onboarding-tour-id={props["data-onboarding-tour-id"]}
    >
      {props.items.map((item) => (
        <NavLinkHref key={item.label} {...item} />
      ))}
    </NavLink>
  );
};

interface CommonNavigationLinkProps {
  label: string;
  icon: ReactNode;
  "data-onboarding-tour-id"?: string;
}

interface NavigationLinkHref extends CommonNavigationLinkProps {
  href: string;
  external?: boolean;
}
interface NavigationLinkWithItems extends CommonNavigationLinkProps {
  items: NavigationLinkHref[];
}

export type ClientNavigationLink = NavigationLinkHref | NavigationLinkWithItems;
