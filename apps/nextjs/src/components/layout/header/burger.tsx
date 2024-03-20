"use client";

import { useCallback } from "react";
import { atom, useAtom } from "jotai";

import { Burger } from "@homarr/ui";

export const navigationCollapsedAtom = atom(true);

export const ClientBurger = () => {
  const [collapsed, setCollapsed] = useAtom(navigationCollapsedAtom);

  const toggle = useCallback(
    () => setCollapsed((collapsed) => !collapsed),
    [setCollapsed],
  );

  return (
    <Burger opened={!collapsed} onClick={toggle} hiddenFrom="sm" size="sm" />
  );
};
