"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavLink } from "@mantine/core";

interface NavigationLinkProps {
  href: string;
  label: string;
  icon: ReactNode;
}

export const NavigationLink = ({ href, icon, label }: NavigationLinkProps) => {
  const pathName = usePathname();

  return (
    <NavLink
      component={Link}
      href={href}
      active={pathName === href}
      label={label}
      leftSection={icon}
    />
  );
};
