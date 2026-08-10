"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { NavLink } from "@mantine/core";

import { Link } from "@homarr/ui";

import { TourTarget } from "./header/tour-target";

export const CommonNavLink = (props: ClientNavigationLink) =>
  "href" in props ? <NavLinkHref {...props} /> : <NavLinkWithItems {...props} />;

const withOptionalTourTarget = (id: string | undefined, children: ReactElement) =>
  id ? <TourTarget id={id}>{children}</TourTarget> : children;

const pathMatches = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

const useClientPathname = () => {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return { pathname, isClient };
};

const NavLinkHref = (props: NavigationLinkHref) => {
  const { pathname, isClient } = useClientPathname();
  const tourId = props["data-onboarding-tour-id"];
  const link = props.external ? (
    <NavLink component="a" label={props.label} leftSection={props.icon} href={props.href} target="_blank" />
  ) : (
    <NavLink
      component={Link}
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      active={isClient && pathMatches(pathname, props.href)}
    />
  );
  return withOptionalTourTarget(tourId, link);
};

const NavLinkWithItems = (props: NavigationLinkWithItems) => {
  const { pathname, isClient } = useClientPathname();
  const isActive = isClient && props.items.some((item) => pathMatches(pathname, item.href));
  const nav = (
    <NavLink label={props.label} leftSection={props.icon} defaultOpened={isActive}>
      {props.items.map((item) => (
        <NavLinkHref key={item.label} {...item} />
      ))}
    </NavLink>
  );
  return withOptionalTourTarget(props["data-onboarding-tour-id"], nav);
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
