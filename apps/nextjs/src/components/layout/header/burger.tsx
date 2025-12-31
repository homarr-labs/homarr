"use client";

import { Burger } from "@mantine/core";
import { atom, useAtom } from "jotai";
import { useCallback } from "react";

export const navigationCollapsedAtom = atom(true);

export const ClientBurger = () => {
  const [collapsed, setCollapsed] = useAtom(navigationCollapsedAtom);

  const toggle = useCallback(() => setCollapsed((collapsed) => !collapsed), [setCollapsed]);

  return <Burger opened={!collapsed} onClick={toggle} hiddenFrom="sm" size="sm" />;
};
