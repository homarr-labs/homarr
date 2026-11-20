"use client";

import { useCallback } from "react";

import type { BoardTab } from "@homarr/boards/tabs";
import { useBoardTabs } from "@homarr/boards/tabs";
import { useI18n } from "@homarr/translation/client";

export const useBoardTabLabel = () => {
  const { tabs } = useBoardTabs();
  const t = useI18n("board.tabs");

  return useCallback(
    (tab: BoardTab) => {
      const name = tab.name?.trim();
      if (name) return name;
      const index = tabs.findIndex((candidate) => candidate.id === tab.id);
      if (index === 0) return t("home");
      return t("untitled", { index: index + 1 });
    },
    [t, tabs],
  );
};
