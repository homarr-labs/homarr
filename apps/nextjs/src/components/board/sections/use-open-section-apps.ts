import { use, useCallback, useMemo } from "react";

import { clientApi } from "@homarr/api/client";
import { useCurrentLayout, useRequiredBoard } from "@homarr/boards/context";
import { getSafeAppHref } from "@homarr/common";
import { useConfirmModal } from "@homarr/modals";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import type { WidgetComponentProps } from "@homarr/widgets/definition";
import { loadWidgetDefinition, reduceWidgetOptionsWithDefinition } from "@homarr/widgets/manifest";

import type { Item } from "~/app/[locale]/boards/_types";

interface SectionItemLayout {
  layoutId: string;
  sectionId: string;
}

interface SectionLayout {
  layoutId: string;
  parentSectionId: string;
}

interface SectionTreeItem {
  layouts: readonly SectionItemLayout[];
}

interface SectionTreeSection {
  id: string;
  kind: string;
  layouts?: readonly SectionLayout[];
}

interface SectionTree<TItem extends SectionTreeItem> {
  items: readonly TItem[];
  sections: readonly SectionTreeSection[];
}

/**
 * Finds every item contained by a section in one responsive layout. Containers
 * can be nested, so their descendants are traversed recursively.
 */
export const getSectionItemsForLayout = <TItem extends SectionTreeItem>(
  board: SectionTree<TItem>,
  rootSectionId: string,
  layoutId: string,
) => {
  const childrenByParent = new Map<string, string[]>();

  for (const section of board.sections) {
    if (section.kind !== "container") continue;

    const layout = section.layouts?.find((candidate) => candidate.layoutId === layoutId);
    if (!layout) continue;

    const children = childrenByParent.get(layout.parentSectionId) ?? [];
    children.push(section.id);
    childrenByParent.set(layout.parentSectionId, children);
  }

  const includedSectionIds = new Set([rootSectionId]);
  const queue = [rootSectionId];

  for (const sectionId of queue) {
    for (const childSectionId of childrenByParent.get(sectionId) ?? []) {
      if (includedSectionIds.has(childSectionId)) continue;

      includedSectionIds.add(childSectionId);
      queue.push(childSectionId);
    }
  }

  return board.items.filter((item) =>
    item.layouts.some((layout) => layout.layoutId === layoutId && includedSectionIds.has(layout.sectionId)),
  );
};

export const useOpenSectionApps = (sectionId: string, enabled: boolean) => {
  const board = useRequiredBoard();
  const currentLayoutId = useCurrentLayout();
  const settings = useSettings();
  const { openConfirmModal } = useConfirmModal();
  const t = useI18n("section");
  const appDefinition = use(loadWidgetDefinition("app"));
  const appIds = useMemo(() => {
    const items: Item[] = getSectionItemsForLayout(board, sectionId, currentLayoutId);
    return Array.from(
      new Set(
        items
          .filter((item) => item.kind === "app")
          .map(
            (item) =>
              (
                reduceWidgetOptionsWithDefinition(
                  appDefinition,
                  settings,
                  item.options,
                ) as WidgetComponentProps<"app">["options"]
              ).appId,
          )
          .filter((appId): appId is string => typeof appId === "string"),
      ),
    );
  }, [appDefinition, board, currentLayoutId, sectionId, settings]);
  const { data: apps = [], isLoading } = clientApi.app.byIds.useQuery(appIds, {
    enabled: enabled && appIds.length > 0,
    staleTime: 30_000,
  });

  const open = useCallback(() => {
    const appUrls = apps.map((app) => getSafeAppHref(app.href)).filter((href) => href !== undefined);

    for (const href of appUrls) {
      const openedWindow = window.open(href);
      if (openedWindow) continue;

      openConfirmModal({
        title: t("openAllInNewTabs.title"),
        children: t("openAllInNewTabs.text"),
      });
      break;
    }
  }, [apps, openConfirmModal, t]);

  return {
    open,
    isLoading: enabled && appIds.length > 0 && isLoading,
  };
};
