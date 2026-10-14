import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppShellNavbar, AppShellSection, Image, NavLink, ScrollArea } from "@mantine/core";

import { useNavigation } from "@homarr/ui/navigation";
import type { NavigationLinkProps } from "@homarr/ui/navigation";

import type { ChromeTourTarget, MainNavigationProps } from "./contracts";

interface ClientNavigationLinkHref {
  readonly label: string;
  readonly icon: ReactNode;
  readonly href: string;
  readonly external?: boolean;
  readonly exact?: boolean;
  readonly active?: boolean;
  readonly "data-onboarding-tour-id"?: string;
}

interface ClientNavigationLinkWithItems {
  readonly label: string;
  readonly icon: ReactNode;
  readonly items: readonly ClientNavigationLinkHref[];
  readonly "data-onboarding-tour-id"?: string;
}

export type ClientNavigationLink = ClientNavigationLinkHref | ClientNavigationLinkWithItems;

interface NavigationResources {
  readonly collapseNavigation: () => void;
  readonly TourTarget: ChromeTourTarget;
}

export function ChromeLink(props: NavigationLinkProps) {
  const { Link } = useNavigation();
  return <Link {...props} />;
}

export function MainNavigation({
  headerSection,
  footerSection,
  links,
  collapseNavigation,
  TourTarget,
}: MainNavigationProps) {
  return (
    <AppShellNavbar p="md">
      {headerSection && <AppShellSection>{headerSection}</AppShellSection>}
      <AppShellSection
        grow
        mt={headerSection ? "md" : undefined}
        mb={footerSection ? "md" : undefined}
        component={ScrollArea}
      >
        {links.map((link, index) => {
          if (link.hidden) return null;
          const { icon: Icon, iconProps, ...props } = link;
          let icon: ReactNode;
          if (typeof Icon === "string") icon = <Image src={Icon} w={20} h={20} />;
          else icon = <Icon size={20} stroke={1.5} {...iconProps} />;

          if ("items" in props) {
            const items = props.items
              .filter((item) => !item.hidden)
              .map((item) => {
                const { icon: ItemIcon, ...rest } = item;
                let itemIcon: ReactNode;
                if (typeof ItemIcon === "string") itemIcon = <Image src={ItemIcon} w={20} h={20} />;
                else itemIcon = <ItemIcon size={20} stroke={1.5} {...iconProps} />;
                return { ...rest, icon: itemIcon };
              });
            return (
              <CommonNavLink
                key={index}
                {...props}
                items={items}
                icon={icon}
                collapseNavigation={collapseNavigation}
                TourTarget={TourTarget}
              />
            );
          }
          return (
            <CommonNavLink
              key={index}
              {...props}
              icon={icon}
              collapseNavigation={collapseNavigation}
              TourTarget={TourTarget}
            />
          );
        })}
      </AppShellSection>
      {footerSection && <AppShellSection>{footerSection}</AppShellSection>}
    </AppShellNavbar>
  );
}

export function CommonNavLink(props: ClientNavigationLink & NavigationResources) {
  if ("href" in props) return <NavLinkHref {...props} />;
  return <NavLinkWithItems {...props} />;
}

function withOptionalTourTarget(TourTarget: ChromeTourTarget, id: string | undefined, children: ReactElement) {
  if (id) return <TourTarget id={id}>{children}</TourTarget>;
  return children;
}

function pathMatches(pathname: string, href: string, exact = false) {
  if (pathname === href) return true;
  if (exact) return false;
  return pathname.startsWith(`${href}/`);
}

function useClientPathname() {
  const { pathname } = useNavigation();
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return { pathname, isClient };
}

function NavLinkHref(props: ClientNavigationLinkHref & NavigationResources) {
  const { pathname, isClient } = useClientPathname();
  const isActive = props.active ?? (isClient && pathMatches(pathname, props.href, props.exact));
  const link = props.external ? (
    <NavLink component="a" label={props.label} leftSection={props.icon} href={props.href} target="_blank" />
  ) : (
    <NavLink
      component={ChromeLink}
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      active={isActive}
      onClick={props.collapseNavigation}
    />
  );
  return withOptionalTourTarget(props.TourTarget, props["data-onboarding-tour-id"], link);
}

function NavLinkWithItems(props: ClientNavigationLinkWithItems & NavigationResources) {
  const { pathname, isClient } = useClientPathname();
  const activeItemHref = props.items
    .filter((item) => pathMatches(pathname, item.href, item.exact))
    .toSorted((first, second) => second.href.length - first.href.length)
    .at(0)?.href;
  const isActive = isClient && activeItemHref !== undefined;
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (isActive) setOpened(true);
  }, [isActive]);

  const nav = (
    <NavLink label={props.label} leftSection={props.icon} active={isActive} opened={opened} onChange={setOpened}>
      {props.items.map((item) => (
        <NavLinkHref
          key={item.label}
          {...item}
          active={isClient && activeItemHref === item.href}
          collapseNavigation={props.collapseNavigation}
          TourTarget={props.TourTarget}
        />
      ))}
    </NavLink>
  );
  return withOptionalTourTarget(props.TourTarget, props["data-onboarding-tour-id"], nav);
}
