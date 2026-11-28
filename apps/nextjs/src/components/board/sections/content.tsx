import { useId, useMemo, useState } from "react";
import { Button, Text } from "@mantine/core";
import { getWidgetName } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { useEditMode } from "@homarr/boards/edit-mode";
import { getWidgetActivity, smartContainerActivityKinds } from "@homarr/widgets/activity";
import { useSmartContainerProjection } from "./smart-container/smart-container-context";
import smartClasses from "./smart-container/smart-container-surface.module.css";

import type { RouterOutputs } from "@homarr/api";

import type { ContainerSectionItem, SectionItem } from "~/app/[locale]/boards/_types";
import { BoardItemContent } from "../items/item-content";
import { WidgetHoverOverlay } from "../items/widget-hover-overlay";
import { BoardContainerSection } from "./container-section";
import { FixedGridItem } from "./grid/fixed-grid-item";
import { useSectionContext } from "./section-context";
import { useSectionItems } from "./use-section-items";

export const SectionContent = () => {
  const { section, innerSections, integrations, items } = useSectionContext();
  const smart = useSmartContainerProjection();
  const [isEditMode] = useEditMode();

  /** Keep portal content order deterministic across static and edit renderers. */
  const sortedItems = useMemo(() => {
    return [...items, ...innerSections].toSorted((itemA, itemB) => {
      if (itemA.yOffset === itemB.yOffset) {
        return itemA.xOffset - itemB.xOffset;
      }

      return itemA.yOffset - itemB.yOffset;
    });
  }, [items, innerSections]);

  // Keep visited widgets mounted across state changes. Hidden activity reporters still drive automatic selection.
  const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set());
  let visibleItems = sortedItems;
  if (smart?.sectionId === section.id) {
    const active = smart.projection.itemIds;
    if (isEditMode && items.some((item) => !visited.has(item.id))) {
      setVisited(new Set(items.map((item) => item.id)));
    } else if (active.some((id) => !visited.has(id))) {
      setVisited(new Set([...visited, ...active]));
    }
    if (!isEditMode) {
      visibleItems = sortedItems.filter(
        (item) =>
          item.type === "section" ||
          visited.has(item.id) ||
          smart.projection.placements.has(item.id) ||
          smartContainerActivityKinds.has(item.kind),
      );
    }
  }
  return (
    <>
      {visibleItems.map((item) => (
        <SectionContentItem key={item.id} item={item} integrations={integrations} />
      ))}
    </>
  );
};

interface ItemProps {
  item: ContainerSectionItem | SectionItem;
  integrations: RouterOutputs["integration"]["all"] | undefined;
}

export const SectionContentItem = ({ item, integrations }: ItemProps) => {
  const smart = useSmartContainerProjection();
  const { section } = useSectionContext();
  const translate = useI18n();
  const t = useI18n("section.container.smart");
  const bodyId = useId();
  if (item.type === "section") return <ContainerSectionContentItem item={item} />;
  const quiet =
    smart?.sectionId === section.id &&
    smart.compactQuiet &&
    smart.focusedItemId !== item.id &&
    getWidgetActivity(smart.runtime.activities[item.id], smart.now) === "quiet";
  const expanded = smart?.sectionId === section.id && smart.compactQuiet && smart.expandedItemId === item.id;
  const compact = quiet && !expanded;
  const name = item.advancedOptions.title || getWidgetName(item.kind, translate);

  return (
    <FixedGridItem item={item}>
      {item.kind !== "app" && <WidgetHoverOverlay item={item} integrations={integrations} />}
      <div className={smartClasses.widgetBody} data-expanded={expanded || undefined}>
        {(compact || expanded) && smart && (
          <div className={smartClasses.compact}>
            <div>
              <Text size="sm" fw={600} truncate>
                {name}
              </Text>
              {!expanded && (
                <Text size="xs" c="dimmed">
                  {t("quiet")}
                </Text>
              )}
            </div>
            <Button
              data-smart-compact-control
              className={smartClasses.compactControl}
              size="compact-sm"
              variant="subtle"
              aria-expanded={expanded}
              aria-controls={bodyId}
              aria-label={t(expanded ? "compactWidget" : "openWidget", { name })}
              onClick={() => smart.toggleCompactWidget(item.id)}
            >
              {t(expanded ? "compactAction" : "openAction")}
            </Button>
          </div>
        )}
        <div id={bodyId} className={smartClasses.nativeBody} hidden={compact} inert={compact}>
          <BoardItemContent
            item={item}
            deferRuntime={
              smart?.sectionId === section.id &&
              smart.deferPassiveWidgets &&
              !smartContainerActivityKinds.has(item.kind)
            }
          />
        </div>
      </div>
    </FixedGridItem>
  );
};

const ContainerSectionContentItem = ({ item }: { item: ContainerSectionItem }) => {
  const { minWidth, minHeight } = useMinSize(item);
  return (
    <FixedGridItem item={item} minWidth={minWidth} minHeight={minHeight}>
      <BoardContainerSection section={item} />
    </FixedGridItem>
  );
};

/**
 * Calculates a container's minimum width or height from its direct content.
 */
export const useMinSize = (item: ContainerSectionItem) => {
  const { items, innerSections } = useSectionItems(item.id);
  let minHeight = 1;
  if (!item.options.smart?.enabled) {
    minHeight = Math.max(
      1,
      ...items.map((child) => child.yOffset + child.height),
      ...innerSections.map((child) => child.yOffset + child.height),
    );
  }
  return {
    minWidth: Math.max(
      1,
      ...items.map((child) => child.xOffset + child.width),
      ...innerSections.map((child) => child.xOffset + child.width),
    ),
    minHeight,
  };
};
