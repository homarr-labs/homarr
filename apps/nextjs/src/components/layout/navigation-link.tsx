"use client";

import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ActionIcon, Menu, NavLink, Tooltip } from "@mantine/core";

import { Link } from "@homarr/ui";

import { TourTarget } from "./header/tour-target";
import { useManagementNavigation } from "./navigation-context";
import classes from "./navigation.module.css";

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
  const navigation = useManagementNavigation();
  const tourId = props["data-onboarding-tour-id"];
  const isActive = props.active ?? (isClient && pathMatches(pathname, props.href, props.exact));
  if (navigation?.compact) {
    let variant = "subtle";
    let color: string | undefined = "gray";
    if (isActive) {
      variant = "light";
      color = undefined;
    }
    const common = {
      "aria-label": props.label,
      "aria-current": isActive ? ("page" as const) : undefined,
      className: classes.compactLink,
      size: 40,
      variant,
      color,
    };
    let compactLink = (
      <ActionIcon component={Link} href={props.href} {...common}>
        {props.icon}
      </ActionIcon>
    );
    if (props.external)
      compactLink = (
        <ActionIcon component="a" href={props.href} target="_blank" rel="noreferrer" {...common}>
          {props.icon}
        </ActionIcon>
      );
    return withOptionalTourTarget(
      tourId,
      <Tooltip label={props.label} position="right" events={{ hover: true, focus: true, touch: false }}>
        {compactLink}
      </Tooltip>,
    );
  }
  const link = props.external ? (
    <NavLink
      component="a"
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      target="_blank"
      onClick={navigation?.closeMobile}
      className={classes.navigationLink}
    />
  ) : (
    <NavLink
      component={Link}
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      active={isActive}
      onClick={navigation?.closeMobile}
      className={classes.navigationLink}
    />
  );
  return withOptionalTourTarget(tourId, link);
};

const NavLinkWithItems = (props: NavigationLinkWithItems) => {
  const { pathname, isClient } = useClientPathname();
  const navigation = useManagementNavigation();
  const activeItemHref = getMostSpecificMatchingHref(pathname, props.items);
  const isActive = isClient && activeItemHref !== undefined;
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (isActive) setOpened(true);
  }, [isActive]);

  if (navigation?.compact) {
    let variant = "subtle";
    let color: string | undefined = "gray";
    if (isActive) {
      variant = "light";
      color = undefined;
    }
    return withOptionalTourTarget(
      props["data-onboarding-tour-id"],
      <Menu
        position="right-start"
        offset={12}
        width={230}
        withinPortal
        menuItemTabIndex={0}
        withInitialFocusPlaceholder={false}
      >
        <Tooltip label={props.label} position="right" events={{ hover: true, focus: true, touch: false }}>
          <span className={classes.compactLink}>
            <Menu.Target>
              <ActionIcon size={40} variant={variant} color={color} aria-label={props.label}>
                {props.icon}
              </ActionIcon>
            </Menu.Target>
          </span>
        </Tooltip>
        <Menu.Dropdown>
          <Menu.Label c="var(--mantine-color-text)">{props.label}</Menu.Label>
          {props.items.map((item) => {
            const active = isClient && activeItemHref === item.href;
            if (item.external)
              return (
                <Menu.Item
                  key={item.href}
                  component="a"
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  leftSection={item.icon}
                >
                  {item.label}
                </Menu.Item>
              );
            return (
              <Menu.Item
                key={item.href}
                component={Link}
                href={item.href}
                leftSection={item.icon}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Menu.Item>
            );
          })}
        </Menu.Dropdown>
      </Menu>,
    );
  }

  const nav = (
    <NavLink
      label={props.label}
      leftSection={props.icon}
      active={isActive}
      opened={opened}
      onChange={setOpened}
      className={classes.navigationLink}
    >
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
