"use client";

import type { ReactNode } from "react";
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

const NavLinkHref = (props: NavigationLinkHref) => {
  const pathname = usePathname();
  const tourId = props["data-onboarding-tour-id"];
  const link = props.external ? (
    <NavLink component="a" label={props.label} leftSection={props.icon} href={props.href} target="_blank" />
  ) : (
    <NavLink
      component={Link}
      label={props.label}
      leftSection={props.icon}
      href={props.href}
      active={pathname === props.href || pathname.startsWith(`${props.href}/`)}
    />
  );
  return <TourTarget id={tourId}>{link}</TourTarget>;
};

const NavLinkWithItems = (props: NavigationLinkWithItems) => {
  const pathname = usePathname();
  const isActive = props.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
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
