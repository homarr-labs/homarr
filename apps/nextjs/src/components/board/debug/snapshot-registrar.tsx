"use client";

import { useComputedColorScheme } from "@mantine/core";
import { IconCamera } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { useIntegrations } from "@homarr/auth/client";
import { showErrorNotification, showSuccessNotification } from "@homarr/notifications";
import { useSettings } from "@homarr/settings";
import type { ContextSpecificItem } from "@homarr/spotlight";
import { useRegisterSpotlightContextActions } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";
import { useCollapsedSectionIds } from "~/components/board/sections/section-collapse";

export const BoardSnapshotRegistrar = () => {
  const board = useRequiredBoard();
  const layoutId = useCurrentLayout();
  const queryClient = useQueryClient();
  const settings = useSettings();
  const integrations = useIntegrations();
  const colorScheme = useComputedColorScheme("dark");
  const locale = useLocale();
  const collapsedIds = useCollapsedSectionIds();
  const t = useI18n("board.snapshot");
  const capture = async () => {
    try {
      const { createBoardSnapshot, downloadBoardSnapshot } = await import("./snapshot");
      downloadBoardSnapshot(
        await createBoardSnapshot({
          board: {
            ...board,
            sections: board.sections.map((section) => {
              if (section.kind === "empty") return section;
              return { ...section, collapsed: collapsedIds.has(section.id) };
            }),
          },
          queryClient,
          settings,
          integrations,
          colorScheme,
          locale,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            layoutId,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
          },
        }),
      );
      showSuccessNotification({ title: t("downloaded"), message: t("downloadedDescription"), autoClose: 10_000 });
    } catch {
      showErrorNotification({ title: t("failed"), message: t("failedDescription") });
    }
  };
  const items: ContextSpecificItem[] = [
    {
      id: "board-snapshot",
      name: t("take"),
      icon: IconCamera,
      description: t("description"),
      aliases: ["debug", "snapshot", "export", "issue", "bug", "reproduce"],
      interaction: () => ({ type: "javaScript", onSelect: capture }),
    },
  ];
  const dependencies = [board, layoutId, queryClient, settings, integrations, colorScheme, locale, t, collapsedIds];
  useRegisterSpotlightContextActions("board-debug", items, dependencies);
  return null;
};
