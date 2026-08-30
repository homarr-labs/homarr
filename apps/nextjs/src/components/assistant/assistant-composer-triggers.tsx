"use client";

import type { RefObject } from "react";
import { useContext, useLayoutEffect, useMemo, useRef } from "react";
import type { Unstable_TriggerItem } from "@assistant-ui/react";
import {
  ComposerPrimitive,
  useAui,
  unstable_useMentionAdapter,
  unstable_useSlashCommandAdapter,
  unstable_useTriggerPopoverScopeContext,
} from "@assistant-ui/react";
import { Text, ThemeIcon } from "@mantine/core";
import { IconAt, IconChevronRight } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import { AssistantDirectiveEntitiesContext, contextIcons } from "./assistant-message-content";
import { getNearestTriggerScrollTop } from "./assistant-trigger-scroll";

const TriggerPopoverAutoScroll = ({ viewportRef }: { viewportRef: RefObject<HTMLDivElement | null> }) => {
  const { activeCategoryId, categories, highlightedIndex, isSearchMode, items, open, query } =
    unstable_useTriggerPopoverScopeContext();

  useLayoutEffect(() => {
    if (!open) return;

    const viewport = viewportRef.current;
    const highlightedItem = viewport?.querySelector<HTMLElement>("[data-highlighted]");
    if (!viewport || !highlightedItem) return;

    const viewportRect = viewport.getBoundingClientRect();
    const itemRect = highlightedItem.getBoundingClientRect();
    const viewportTop = viewportRect.top + viewport.clientTop;
    const viewportBottom = viewportTop + viewport.clientHeight;

    viewport.scrollTop = getNearestTriggerScrollTop({
      scrollTop: viewport.scrollTop,
      viewportTop,
      viewportBottom,
      itemTop: itemRect.top,
      itemBottom: itemRect.bottom,
    });
  }, [activeCategoryId, categories, highlightedIndex, isSearchMode, items, open, query, viewportRef]);

  return null;
};

const TriggerItem = ({ item, index }: { item: Unstable_TriggerItem; index: number }) => {
  const Icon =
    typeof item.metadata?.icon === "string" && item.metadata.icon in contextIcons
      ? contextIcons[item.metadata.icon as keyof typeof contextIcons]
      : IconAt;
  return (
    <ComposerPrimitive.Unstable_TriggerPopoverItem className={classes.triggerItem} item={item} index={index}>
      <ThemeIcon size="sm" variant="light" color="gray">
        <Icon size={13} />
      </ThemeIcon>
      <div className={classes.triggerItemText}>
        <Text size="sm" fw={600} lineClamp={1}>
          {item.label}
        </Text>
        {item.description && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {item.description}
          </Text>
        )}
      </div>
    </ComposerPrimitive.Unstable_TriggerPopoverItem>
  );
};

export const ComposerTriggers = () => {
  const t = useI18n("assistant");
  const aui = useAui();
  const mentionViewportRef = useRef<HTMLDivElement>(null);
  const slashViewportRef = useRef<HTMLDivElement>(null);
  const { entities, isLoading } = useContext(AssistantDirectiveEntitiesContext);
  const categories = useMemo(
    () =>
      (["app", "integration", "board", "widget"] as const).map((type) => ({
        id: type,
        label: t(`mentions.${type}`),
        items: entities
          .filter((entity) => entity.type === type)
          .map((entity) => ({
            id: entity.id,
            type: entity.type,
            label: entity.label,
            description: entity.description,
            icon: entity.type,
          })),
      })),
    [entities, t],
  );
  const mention = unstable_useMentionAdapter({
    categories,
    includeModelContextTools: {
      category: { id: "tools", label: t("mentions.tools") },
      formatLabel: (name) => name.replaceAll("_", " "),
      icon: "tools",
    },
    iconMap: contextIcons,
    fallbackIcon: IconAt,
  });
  const slash = unstable_useSlashCommandAdapter({
    removeOnExecute: true,
    commands: [
      {
        id: "health",
        label: "/health",
        description: t("commands.health"),
        execute: () => aui.composer().setText(t("suggestions.health.prompt")),
      },
      {
        id: "explore",
        label: "/explore",
        description: t("commands.explore"),
        execute: () => aui.composer().setText(t("suggestions.explore.prompt")),
      },
      {
        id: "media",
        label: "/media",
        description: t("commands.media"),
        execute: () => aui.composer().setText(t("suggestions.media.prompt")),
      },
      {
        id: "style",
        label: "/style",
        description: t("commands.style"),
        execute: () => aui.composer().setText(t("suggestions.style.prompt")),
      },
    ],
  });

  return (
    <>
      <ComposerPrimitive.Unstable_TriggerPopover
        ref={mentionViewportRef}
        className={classes.triggerPopover}
        char="@"
        adapter={mention.adapter}
        isLoading={isLoading}
        aria-label={t("mentions.menu")}
      >
        <TriggerPopoverAutoScroll viewportRef={mentionViewportRef} />
        <ComposerPrimitive.Unstable_TriggerPopover.Directive {...mention.directive} />
        <ComposerPrimitive.Unstable_TriggerPopoverCategories className={classes.triggerList}>
          {(items) =>
            items.map((category) => {
              const Icon = contextIcons[category.id as keyof typeof contextIcons] ?? IconAt;
              return (
                <ComposerPrimitive.Unstable_TriggerPopoverCategoryItem
                  key={category.id}
                  categoryId={category.id}
                  className={classes.triggerItem}
                >
                  <ThemeIcon size="sm" variant="light" color="gray">
                    <Icon size={13} />
                  </ThemeIcon>
                  <Text size="sm" fw={600} flex={1}>
                    {category.label}
                  </Text>
                  <IconChevronRight size={14} />
                </ComposerPrimitive.Unstable_TriggerPopoverCategoryItem>
              );
            })
          }
        </ComposerPrimitive.Unstable_TriggerPopoverCategories>
        <ComposerPrimitive.Unstable_TriggerPopoverItems className={classes.triggerList}>
          {(items) =>
            items.map((item, index) => <TriggerItem key={`${item.type}:${item.id}`} item={item} index={index} />)
          }
        </ComposerPrimitive.Unstable_TriggerPopoverItems>
      </ComposerPrimitive.Unstable_TriggerPopover>
      <ComposerPrimitive.Unstable_TriggerPopover
        ref={slashViewportRef}
        className={classes.triggerPopover}
        char="/"
        adapter={slash.adapter}
        aria-label={t("commands.menu")}
      >
        <TriggerPopoverAutoScroll viewportRef={slashViewportRef} />
        <ComposerPrimitive.Unstable_TriggerPopover.Action {...slash.action} />
        <ComposerPrimitive.Unstable_TriggerPopoverItems className={classes.triggerList}>
          {(items) => items.map((item, index) => <TriggerItem key={item.id} item={item} index={index} />)}
        </ComposerPrimitive.Unstable_TriggerPopoverItems>
      </ComposerPrimitive.Unstable_TriggerPopover>
    </>
  );
};
