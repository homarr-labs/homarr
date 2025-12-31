"use client";

import { Link } from "@homarr/ui";
import { NavLink } from "@mantine/core";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface NavigationLinkProps {
  href: string;
  label: string;
  icon: ReactNode;
}

export const NavigationLink = ({ href, icon, label }: NavigationLinkProps) => {
  const pathName = usePathname();

  return <NavLink component={Link} href={href} active={pathName === href} label={label} leftSection={icon} />;
};
