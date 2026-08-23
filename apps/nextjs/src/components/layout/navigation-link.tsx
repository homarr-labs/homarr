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

const pathMatches = (pathname: string, href: string, exact = false) => {
  if (pathname === href) return true;
  if (exact) return false;
  return pathname.startsWith(`${href}/`);
};

const getMostSpecificMatchingHref = (pathname: string, items: NavigationLinkHref[]) =>
  items
    .filter((item) => pathMatches(pathname, item.href, item.exact))
    .toSorted((first, second) => second.href.length - first.href.length)
    .at(0)?.href;

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
  const isActive = props.active ?? (isClient && pathMatches(pathname, props.href, props.exact));
  const link = props.external ? (
    <NavLink component="a" label={props.label} leftSection={props.icon} href={props.href} target="_blank" />
  ) : (
    <NavLink
      component={Link}
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      active={isActive}
    />
  );
  return withOptionalTourTarget(tourId, link);
};

const NavLinkWithItems = (props: NavigationLinkWithItems) => {
  const { pathname, isClient } = useClientPathname();
  const activeItemHref = getMostSpecificMatchingHref(pathname, props.items);
  const isActive = isClient && activeItemHref !== undefined;
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (isActive) setOpened(true);
  }, [isActive]);

  const nav = (
    <NavLink label={props.label} leftSection={props.icon} active={isActive} opened={opened} onChange={setOpened}>
      {props.items.map((item) => (
        <NavLinkHref key={item.label} {...item} active={isClient && activeItemHref === item.href} />
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
  exact?: boolean;
  active?: boolean;
}
interface NavigationLinkWithItems extends CommonNavigationLinkProps {
  items: NavigationLinkHref[];
}

export type ClientNavigationLink = NavigationLinkHref | NavigationLinkWithItems;
