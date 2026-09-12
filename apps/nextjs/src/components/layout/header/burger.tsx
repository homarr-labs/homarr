"use client";

import { useCallback } from "react";
import { Burger } from "@mantine/core";
import { atom, useAtom } from "jotai";
import { useI18n } from "@homarr/translation/client";

export const navigationCollapsedAtom = atom(true);

export const ClientBurger = () => {
  const [collapsed, setCollapsed] = useAtom(navigationCollapsedAtom);
  const t = useI18n("management.navbar");

  const toggle = useCallback(() => setCollapsed((current) => !current), [setCollapsed]);

  let label = t("openNavigation");
  if (!collapsed) label = t("closeNavigation");
  return (
    <Burger
      opened={!collapsed}
      onClick={toggle}
      hiddenFrom="sm"
      size="sm"
      aria-label={label}
      aria-expanded={!collapsed}
      aria-controls="main-navigation"
    />
  );
};
