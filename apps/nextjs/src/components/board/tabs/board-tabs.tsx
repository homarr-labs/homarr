"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  getContrastColor,
  Group,
  Kbd,
  Menu,
  Tabs,
  Text,
  TextInput,
  Tooltip,
  useComputedColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import type { HotkeyItem } from "@mantine/hooks";
import { IconArrowLeft, IconArrowRight, IconDotsVertical, IconHome, IconPencil, IconPlus } from "@tabler/icons-react";

import { useEditMode } from "@homarr/boards/edit-mode";
import type { BoardTab } from "@homarr/boards/tabs";
import { useBoardTabs } from "@homarr/boards/tabs";
import { maxBoardTabs } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";

import { BoardRemoveConfirmationMenuItem } from "~/components/board/remove-confirmation-menu-item";
import classes from "./board-tabs.module.css";
import { useBoardTabActions } from "./use-board-tab-actions";
import { useBoardTabLabel } from "./use-board-tab-label";

const isInsideDialog = (event: globalThis.KeyboardEvent) =>
  event.target instanceof Element &&
  event.target.closest("[role='dialog']") !== null &&
  event.target.closest("[data-board-tab-picker]") === null;

export const useBoardTabHotkeys = () => {
  const { tabs, selectTab } = useBoardTabs();
  const hotkeys = tabs.slice(0, maxBoardTabs).flatMap((tab, index): HotkeyItem[] => {
    const handler = (event: globalThis.KeyboardEvent) => {
      if (isInsideDialog(event)) return;
      selectTab(tab.id);
    };
    return [
      [String(index + 1), handler, { preventDefault: false }],
      [`digit${index + 1}`, handler, { preventDefault: false, usePhysicalKeys: true }],
    ];
  });

  useHotkeys(tabs.length > 1 ? hotkeys : []);
};

export const BoardTabBar = ({
  compact = false,
  fit = false,
  menuWithinPortal = true,
}: {
  compact?: boolean;
  fit?: boolean;
  menuWithinPortal?: boolean;
}) => {
  const { tabs, activeTab } = useBoardTabs();
  const [isEditMode] = useEditMode();
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const getTabLabel = useBoardTabLabel();
  const t = useI18n("board.tabs");
  const theme = useMantineTheme();
  const colorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const activeColor = getContrastColor({
    color: theme.primaryColor,
    colorScheme,
    theme: { ...theme, luminanceThreshold: 0.179 },
    autoContrast: true,
  });

  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !tab) return;

    const bounds = list.getBoundingClientRect();
    const tabBounds = tab.getBoundingClientRect();
    if (tabBounds.left < bounds.left) list.scrollLeft += tabBounds.left - bounds.left;
    else if (tabBounds.right > bounds.right) list.scrollLeft += tabBounds.right - bounds.right;
  }, [activeTab?.id, activeTab?.name]);

  return (
    <Group gap={4} wrap="nowrap" w={fit ? "100%" : "fit-content"} maw="100%" p={2}>
      <Tabs.List ref={listRef} className={classes.list} aria-label={t("label")} grow={fit} flex={fit ? 1 : undefined}>
        {tabs.map((tab, index) => {
          if (isEditMode && renamingTabId === tab.id) {
            return <BoardTabRenameInput key={tab.id} tab={tab} onDone={() => setRenamingTabId(null)} />;
          }

          return (
            <Tooltip key={tab.id} label={getTabLabel(tab)} withArrow>
              <Tabs.Tab
                value={tab.id}
                className={classes.tab}
                styles={{ tabLabel: { minWidth: 0 } }}
                c={tab.id === activeTab?.id ? activeColor : undefined}
                miw={28}
                flex={fit ? "1 1 0" : "0 0 auto"}
                px={compact ? 8 : 10}
                py={7}
                aria-label={getTabLabel(tab)}
                aria-controls={`board-tabs-panel-${tab.id}`}
                title={t("hotkeyHint", { key: String(index + 1) })}
                leftSection={index === 0 && isEditMode && !compact ? <IconHome size={14} stroke={1.75} /> : undefined}
                rightSection={
                  !compact && (
                    <Kbd size="xs" className={classes.hint} visibleFrom={fit ? "xl" : "lg"} aria-hidden>
                      {index + 1}
                    </Kbd>
                  )
                }
                onDoubleClick={isEditMode ? () => setRenamingTabId(tab.id) : undefined}
              >
                <Text component="span" inherit truncate="end" display="block" maw="7rem">
                  {compact ? index + 1 : getTabLabel(tab)}
                </Text>
              </Tabs.Tab>
            </Tooltip>
          );
        })}
      </Tabs.List>
      {isEditMode && activeTab && (
        <BoardTabEditControls
          activeTab={activeTab}
          withinPortal={menuWithinPortal}
          onRename={() => setRenamingTabId(activeTab.id)}
        />
      )}
    </Group>
  );
};

const BoardTabRenameInput = ({ tab, onDone }: { tab: BoardTab; onDone: () => void }) => {
  const { renameTab } = useBoardTabActions();
  const getTabLabel = useBoardTabLabel();
  const t = useI18n("board.tabs");
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const initialLabel = useRef(getTabLabel(tab));

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const finish = (value: string | null) => {
    if (finished.current) return;
    finished.current = true;
    if (value !== null && value.trim() !== initialLabel.current && value.trim() !== (tab.name ?? "")) {
      renameTab(tab.id, value);
    }
    onDone();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") finish(null);
    else finish(event.currentTarget.value);
  };

  return (
    <TextInput
      w="8rem"
      flex="none"
      size="xs"
      radius="xl"
      maxLength={32}
      defaultValue={initialLabel.current}
      aria-label={t("rename")}
      placeholder={t("namePlaceholder")}
      ref={inputRef}
      onBlur={(event) => finish(event.currentTarget.value)}
      onKeyDown={handleKeyDown}
    />
  );
};

const BoardTabEditControls = ({
  activeTab,
  onRename,
  withinPortal,
}: {
  activeTab: BoardTab;
  onRename: () => void;
  withinPortal: boolean;
}) => {
  const { tabs } = useBoardTabs();
  const { canAddTab, addTab, moveTab, removeTab } = useBoardTabActions();
  const renameRequested = useRef(false);
  const t = useI18n("board.tabs");
  const index = tabs.findIndex((tab) => tab.id === activeTab.id);
  const isHomeTab = index === 0;

  return (
    <Group
      gap={2}
      wrap="nowrap"
      ps={4}
      flex="none"
      style={{ borderInlineStart: "1px solid var(--mantine-color-default-border)" }}
    >
      <Tooltip label={canAddTab ? t("add") : t("limitReached", { max: maxBoardTabs })} withArrow>
        <ActionIcon variant="subtle" radius="xl" disabled={!canAddTab} onClick={addTab} aria-label={t("add")}>
          <IconPlus size={16} />
        </ActionIcon>
      </Tooltip>
      <Menu
        withinPortal={withinPortal}
        position="bottom-end"
        withArrow
        shadow="md"
        onExitTransitionEnd={() => {
          if (!renameRequested.current) return;
          renameRequested.current = false;
          onRename();
        }}
      >
        <Menu.Target>
          <ActionIcon variant="subtle" radius="xl" color="gray" aria-label={t("actions")}>
            <IconDotsVertical size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => (renameRequested.current = true)}>
            {t("rename")}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowLeft size={16} />}
            disabled={index <= 1}
            onClick={() => moveTab(activeTab.id, -1)}
          >
            {t("moveLeft")}
          </Menu.Item>
          <Menu.Item
            leftSection={<IconArrowRight size={16} />}
            disabled={isHomeTab || index === tabs.length - 1}
            onClick={() => moveTab(activeTab.id, 1)}
          >
            {t("moveRight")}
          </Menu.Item>
          {!isHomeTab && (
            <>
              <Menu.Divider />
              <BoardRemoveConfirmationMenuItem
                key={activeTab.id}
                label={t("remove.action")}
                confirmationLabel={t("remove.confirm")}
                onConfirm={() => removeTab(activeTab.id)}
              />
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};
