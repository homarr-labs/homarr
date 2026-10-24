"use client";

import type { RefObject } from "react";
import { useContext, useLayoutEffect, useMemo, useRef } from "react";
import type { DirectiveFormatter, TriggerItem as AssistantTriggerItem } from "@assistant-ui/react";
import {
  ComposerPrimitive,
  defaultDirectiveFormatter,
  unstable_useMentionAdapter,
  unstable_useSlashCommandAdapter,
  unstable_useTriggerPopoverScopeContext,
} from "@assistant-ui/react";
import { Button, Text, ThemeIcon } from "@mantine/core";
import { IconAt, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import classes from "./assistant-panel.module.css";
import { AssistantDirectiveEntitiesContext, contextIcons } from "./assistant-message-content";
import { getNearestTriggerScrollTop } from "./assistant-trigger-scroll";
import { assistantPromptDefinitions, useAssistantPrompts } from "./assistant-prompts";

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

const TriggerItem = ({ item, index }: { item: AssistantTriggerItem; index: number }) => {
  let Icon =
    typeof item.metadata?.icon === "string" && item.metadata.icon in contextIcons
      ? contextIcons[item.metadata.icon as keyof typeof contextIcons]
      : IconAt;
  if (item.type === "command") {
    Icon = assistantPromptDefinitions.find((definition) => definition.id === item.id)?.Icon ?? IconAt;
  }
  return (
    <ComposerPrimitive.TriggerPopoverItem
      className={classes.triggerItem}
      item={item}
      index={index}
      onMouseDown={(event) => event.preventDefault()}
    >
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
      {item.type === "command" && (
        <Text size="xs" c="dimmed" span>
          /{item.id}
        </Text>
      )}
    </ComposerPrimitive.TriggerPopoverItem>
  );
};

export const ComposerTriggers = () => {
  const t = useI18n("assistant");
  const prompts = useAssistantPrompts();
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
    commands: prompts.map(({ id, label, description }) => ({ id, label, description, execute: () => undefined })),
  });
  const promptFormatter = useMemo<DirectiveFormatter>(
    () => ({
      parse: defaultDirectiveFormatter.parse,
      serialize: (item) => prompts.find((prompt) => prompt.id === item.id)?.prompt ?? item.label,
    }),
    [prompts],
  );

  return (
    <>
      <ComposerPrimitive.TriggerPopover
        ref={mentionViewportRef}
        className={classes.triggerPopover}
        char="@"
        adapter={mention.adapter}
        isLoading={isLoading}
        aria-label={t("mentions.menu")}
      >
        <TriggerPopoverAutoScroll viewportRef={mentionViewportRef} />
        <ComposerPrimitive.TriggerPopover.Directive {...mention.directive} />
        <ComposerPrimitive.TriggerPopoverBack asChild>
          <Button variant="subtle" size="compact-sm" leftSection={<IconChevronLeft size={14} />}>
            {t("mentions.back")}
          </Button>
        </ComposerPrimitive.TriggerPopoverBack>
        <ComposerPrimitive.TriggerPopoverCategories className={classes.triggerList}>
          {(items) =>
            items.map((category) => {
              const Icon = contextIcons[category.id as keyof typeof contextIcons] ?? IconAt;
              return (
                <ComposerPrimitive.TriggerPopoverCategoryItem
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
                </ComposerPrimitive.TriggerPopoverCategoryItem>
              );
            })
          }
        </ComposerPrimitive.TriggerPopoverCategories>
        <ComposerPrimitive.TriggerPopoverItems className={classes.triggerList}>
          {(items) => (
            <>
              {items.map((item, index) => (
                <TriggerItem key={`${item.type}:${item.id}`} item={item} index={index} />
              ))}
              {items.length === 0 && (
                <Text size="xs" c="dimmed" p="sm">
                  {isLoading ? t("mentions.loading") : t("mentions.empty")}
                </Text>
              )}
            </>
          )}
        </ComposerPrimitive.TriggerPopoverItems>
      </ComposerPrimitive.TriggerPopover>
      <ComposerPrimitive.TriggerPopover
        ref={slashViewportRef}
        className={classes.triggerPopover}
        char="/"
        adapter={slash.adapter}
        aria-label={t("commands.menu")}
      >
        <TriggerPopoverAutoScroll viewportRef={slashViewportRef} />
        <ComposerPrimitive.TriggerPopover.Action {...slash.action} formatter={promptFormatter} />
        <ComposerPrimitive.TriggerPopoverItems className={classes.triggerList}>
          {(items) => (
            <>
              {items.map((item, index) => (
                <TriggerItem key={item.id} item={item} index={index} />
              ))}
              {items.length === 0 && (
                <Text size="xs" c="dimmed" p="sm">
                  {t("commands.empty")}
                </Text>
              )}
            </>
          )}
        </ComposerPrimitive.TriggerPopoverItems>
      </ComposerPrimitive.TriggerPopover>
    </>
  );
};
