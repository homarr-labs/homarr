import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActionIcon, Center, Group, Kbd, Text } from "@mantine/core";
import { createSpotlight, Spotlight } from "@mantine/spotlight";
import { IconArrowDown, IconArrowLeft, IconArrowUp, IconCornerDownLeft, IconSearch, IconX } from "@tabler/icons-react";

import type { SpotlightMode } from "../open";
import { selectAction } from "../spotlight-store";
import { RuntimeSpotlightModeRail, runtimeSearchModes } from "./runtime-mode-rail";
import type { RuntimeModeRailEntry } from "./runtime-mode-rail";
import classes from "./spotlight.module.css";
import actionClasses from "./actions/items/action-item.module.css";

export interface RuntimeSearchPaletteProps {
  mode: SpotlightMode | "bookmarks";
  query: string;
  inputRef: RefObject<HTMLInputElement | null>;
  canManageUsers: boolean;
  selectionRevision: string;
  entries?: readonly RuntimeModeRailEntry[];
  placeholder?: string;
  detail?: ReactNode;
  children: ReactNode;
  canGoBack: boolean;
  interactionBlocked?: boolean;
  canLeave?(): boolean;
  onBack(): void;
  onClose(): void;
  onEscape(): void;
  onModeChange(mode: SpotlightMode): void;
  onQueryChange(query: string): void;
  onKeyDown(event: KeyboardEvent<HTMLInputElement>): void;
}

export function RuntimeSearchPalette({
  mode,
  query,
  inputRef,
  canManageUsers,
  selectionRevision,
  entries = runtimeSearchModes,
  placeholder,
  detail,
  children,
  canGoBack,
  interactionBlocked = false,
  canLeave,
  onBack,
  onClose,
  onEscape,
  onModeChange,
  onQueryChange,
  onKeyDown,
}: RuntimeSearchPaletteProps) {
  const [[store, actions]] = useState(createSpotlight);
  const list = useRef<HTMLDivElement>(null);
  const selectedKey = useRef<string | undefined>(undefined);
  const activeMode = entries.find((entry) => entry.mode === mode);
  const label = activeMode?.label ?? "Board bookmarks";
  const searchPlaceholder = placeholder ?? activeMode?.placeholder ?? "Search board bookmarks";

  useLayoutEffect(() => {
    actions.open();
    return () => actions.close();
  }, [actions]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const options = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("[data-action]") ?? []);
      let index = options.findIndex((option) => option.dataset.searchKey === selectedKey.current);
      if (index < 0) index = 0;
      selectAction(index, store);
      selectedKey.current = options[index]?.dataset.searchKey;
    });
    return () => cancelAnimationFrame(frame);
  }, [selectionRevision, store]);

  return (
    <Spotlight.Root
      shortcut={null}
      size={760}
      yOffset={64}
      scrollable
      maxHeight="min(62vh, 560px)"
      overlayProps={{ blur: 3, backgroundOpacity: 0.24 }}
      attributes={{ content: { "aria-label": `${label} search palette` } }}
      classNames={{ content: classes.content }}
      store={store}
      query={query}
      onQueryChange={onQueryChange}
      onSpotlightOpen={() => inputRef.current?.focus()}
      onSpotlightClose={onClose}
      clearQueryOnClose={false}
      closeOnActionTrigger={false}
      closeOnEscape={false}
      closeOnClickOutside={false}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape" || event.nativeEvent.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        onEscape();
      }}
      onClickCapture={(event) => {
        if (
          !(event.target instanceof Element) ||
          !event.target.closest("a[href]") ||
          (!interactionBlocked && canLeave?.() !== false)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <Spotlight.Search
        aria-label={searchPlaceholder}
        placeholder={searchPlaceholder}
        ref={inputRef}
        className={classes.search}
        leftSectionWidth={activeMode?.character ? 80 : 48}
        leftSection={
          <Group align="center" wrap="nowrap" gap="xs" w="100%" h="100%">
            <Center w={48} h="100%">
              <IconSearch stroke={1.5} />
            </Center>
            {activeMode?.character && <Kbd size="sm">{activeMode.character}</Kbd>}
          </Group>
        }
        styles={{ section: { pointerEvents: "all" } }}
        rightSection={
          <ActionIcon
            title={canGoBack ? "Back to results" : "Close search"}
            aria-label={canGoBack ? "Back to results" : "Close search"}
            variant="subtle"
            onClick={canGoBack ? onBack : onClose}
            disabled={interactionBlocked}
          >
            {canGoBack ? <IconArrowLeft stroke={1.5} /> : <IconX stroke={1.5} />}
          </ActionIcon>
        }
        value={query}
        readOnly={interactionBlocked}
        onKeyDown={(event) => {
          if (!event.nativeEvent.isComposing) onKeyDown(event);
          selectedKey.current = list.current?.querySelector<HTMLButtonElement>("[data-selected]")?.dataset.searchKey;
        }}
        onKeyUp={() => {
          selectedKey.current = list.current?.querySelector<HTMLButtonElement>("[data-selected]")?.dataset.searchKey;
        }}
      />
      <RuntimeSpotlightModeRail
        activeMode={mode}
        entries={entries}
        canManageUsers={canManageUsers}
        onModeChange={onModeChange}
        interactionBlocked={interactionBlocked}
      />
      {detail}
      <Spotlight.ActionsList
        ref={list}
        component="section"
        className={classes.actionsList}
        aria-label={`${label} results`}
      >
        {children}
      </Spotlight.ActionsList>
      <Spotlight.Footer className={classes.footer} px="md" py="xs">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Group gap={4} wrap="nowrap">
              <Kbd size="xs">
                <IconArrowUp size={11} />
              </Kbd>
              <Kbd size="xs">
                <IconArrowDown size={11} />
              </Kbd>
              <Text size="xs" className={classes.footerHint}>
                Choose
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap">
              <Kbd size="xs">
                <IconCornerDownLeft size={11} />
              </Kbd>
              <Text size="xs" className={classes.footerHint}>
                Open
              </Text>
            </Group>
          </Group>
          <Group gap={4} wrap="nowrap" className={classes.footerSecondary}>
            <Kbd size="xs">esc</Kbd>
            <Text size="xs" className={classes.footerHint}>
              Back or close
            </Text>
          </Group>
        </Group>
      </Spotlight.Footer>
    </Spotlight.Root>
  );
}

export interface RuntimeSearchActionProps {
  actionKey: string;
  actionRef?: RefObject<HTMLButtonElement | null>;
  disabled?: boolean;
  children: ReactNode;
  onSelect(): void;
}

export function RuntimeSearchAction({ actionKey, actionRef, disabled, children, onSelect }: RuntimeSearchActionProps) {
  return (
    <Spotlight.Action
      ref={actionRef}
      className={actionClasses.spotlightAction}
      data-search-key={actionKey}
      data-action={disabled ? undefined : true}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      closeSpotlightOnTrigger={false}
      onClick={onSelect}
    >
      {children}
    </Spotlight.Action>
  );
}

export const RuntimeSearchGroup = Spotlight.ActionsGroup;
