"use client";

import type { FocusEvent } from "react";
import { useRef } from "react";
import { Group, Popover, Stack, Tabs, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { useBoardTabs } from "@homarr/boards/tabs";
import { useI18n } from "@homarr/translation/client";
import type { HeaderTabsDisplay } from "@homarr/validation/user";

import { HeaderButton } from "~/components/layout/header/button";
import { BoardTabBar } from "./board-tabs";
import { useBoardTabLabel } from "./use-board-tab-label";
import classes from "./header-board-tabs.module.css";

export const HeaderBoardTabs = ({ display }: { display: HeaderTabsDisplay }) => {
  const { tabs, activeTab, selectTab } = useBoardTabs();
  const [opened, { open, close, toggle, set: setOpened }] = useDisclosure(false);
  const targetRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const getTabLabel = useBoardTabLabel();
  const t = useI18n("board.tabs");
  if (tabs.length < 2 || !activeTab) return null;

  const select = (value: string | null) => {
    if (!value) return;
    selectTab(value);
    if (opened) targetRef.current?.focus();
    close();
  };

  const closeOnFocusLeave = (event: FocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Node &&
      (targetRef.current?.contains(nextTarget) || dropdownRef.current?.contains(nextTarget))
    ) {
      return;
    }
    close();
  };

  const tabStrip = (
    <Tabs
      value={activeTab.id}
      onChange={select}
      variant="pills"
      radius="md"
      miw={0}
      maw="100%"
      flex={display === "wide" ? "1 1 0" : "0 1 auto"}
      visibleFrom={display === "wide" ? "lg" : undefined}
    >
      <BoardTabBar compact={display === "compact"} fit={display === "wide"} />
    </Tabs>
  );
  if (display === "compact") return tabStrip;

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab.id);

  return (
    <>
      {display === "wide" && tabStrip}
      <Popover
        opened={opened}
        onChange={setOpened}
        onDismiss={close}
        position="bottom-end"
        withArrow
        withinPortal
        shadow="md"
        returnFocus={false}
      >
        <Popover.Target>
          <HeaderButton
            ref={targetRef}
            hiddenFrom={display === "wide" ? "lg" : undefined}
            aria-label={t("indicator", { index: activeIndex + 1, count: tabs.length, name: getTabLabel(activeTab) })}
            onClick={toggle}
            onBlur={closeOnFocusLeave}
            onKeyDown={(event) => {
              if (event.key === "Escape" && opened) {
                event.preventDefault();
                event.stopPropagation();
                close();
                return;
              }
              if (event.key !== "ArrowDown") return;
              event.preventDefault();
              open();
              window.requestAnimationFrame(() =>
                dropdownRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus(),
              );
            }}
          >
            <Stack component="span" align="center" gap={3} aria-hidden>
              <Text component="span" className={classes.number} fz="0.8rem" fw={600} lh={1}>
                {activeIndex + 1}
              </Text>
              <Group component="span" gap={2} wrap="nowrap">
                {tabs.map((tab) => (
                  <span key={tab.id} className={classes.dot} data-active={tab.id === activeTab.id || undefined} />
                ))}
              </Group>
            </Stack>
          </HeaderButton>
        </Popover.Target>
        <Popover.Dropdown
          ref={dropdownRef}
          onBlur={closeOnFocusLeave}
          data-board-tab-picker
          maw="calc(100vw - 1rem)"
          p={4}
        >
          <Tabs value={activeTab.id} onChange={select} variant="pills" radius="md">
            <BoardTabBar menuWithinPortal={false} />
          </Tabs>
        </Popover.Dropdown>
      </Popover>
    </>
  );
};
