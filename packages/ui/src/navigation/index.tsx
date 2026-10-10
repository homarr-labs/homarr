"use client";

import type { ComponentPropsWithRef, ComponentType, PropsWithChildren } from "react";
import { createContext, useContext } from "react";

export type NavigationLinkProps = Omit<ComponentPropsWithRef<"a">, "href"> & {
  href: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null;
};

export interface NavigationAdapter {
  pathname: string;
  search: string;
  replace: (href: string) => void;
  Link: ComponentType<NavigationLinkProps>;
}

const NavigationContext = createContext<NavigationAdapter | null>(null);

export const NavigationProvider = ({ children, adapter }: PropsWithChildren<{ adapter: NavigationAdapter }>) => (
  <NavigationContext.Provider value={adapter}>{children}</NavigationContext.Provider>
);

export const useNavigation = () => {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error("NavigationProvider is not provided");
  return navigation;
};
