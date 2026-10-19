"use client";

import { useCallback } from "react";
import { Burger } from "@mantine/core";
import { atom, useAtom } from "jotai";

import { useI18n } from "@homarr/translation/client";

export const navigationCollapsedAtom = atom(true);

export const ClientBurger = () => {
  const t = useI18n("common.navigation");
  const [collapsed, setCollapsed] = useAtom(navigationCollapsedAtom);

  const toggle = useCallback(() => setCollapsed((collapsed) => !collapsed), [setCollapsed]);

  return (
    <Burger
      opened={!collapsed}
      onClick={toggle}
      hiddenFrom="sm"
      size="sm"
      aria-label={t("toggle")}
      aria-expanded={!collapsed}
    />
  );
};
