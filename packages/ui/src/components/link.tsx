"use client";

import type { NavigationLinkProps } from "../navigation";
import { useNavigation } from "../navigation";

export const Link = (props: NavigationLinkProps) => {
  const { Link: RoutedLink } = useNavigation();
  return <RoutedLink {...props} />;
};
