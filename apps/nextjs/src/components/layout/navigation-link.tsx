"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { OnboardingTour } from "@gfazioli/mantine-onboarding-tour";
import { NavLink } from "@mantine/core";

import { Link } from "@homarr/ui";

export const CommonNavLink = (props: ClientNavigationLink) =>
  "href" in props ? <NavLinkHref {...props} /> : <NavLinkWithItems {...props} />;

const TourTarget = ({ id, children }: { id?: string; children: ReactNode }) => {
  if (!id) return <>{children}</>;
  return <OnboardingTour.Target id={id}>{children}</OnboardingTour.Target>;
};

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
  return <TourTarget id={tourId}>{link}</TourTarget>;
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
  return <TourTarget id={props["data-onboarding-tour-id"]}>{nav}</TourTarget>;
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
