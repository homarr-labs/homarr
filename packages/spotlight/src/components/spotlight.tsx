"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Center, Group, Kbd, Text } from "@mantine/core";
import { Spotlight as MantineSpotlight } from "@mantine/spotlight";
import { IconArrowDown, IconArrowLeft, IconArrowUp, IconCornerDownLeft, IconSearch, IconX } from "@tabler/icons-react";
import { useSetAtom } from "jotai";

import { translateIfNecessary } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import {
  consumePendingMediaRequestSearch,
  consumePendingSpotlightOpen,
  mediaRequestSearchEvent,
  spotlightOpenEvent,
} from "../open";
import type { OpenMediaRequestSearchOptions, SpotlightMode, SpotlightOpenIntent } from "../open";
import type { inferSearchInteractionOptions } from "../lib/interaction";
import type { SearchMode } from "../lib/mode";
import { useSpotlightCatalogs } from "../lib/catalog";
import { searchModes } from "../modes";
import { mediaRequestSearchScopeAtom, selectAction, spotlightActions, spotlightStore } from "../spotlight-store";
import { SpotlightChildrenActions } from "./actions/children-actions";
import { SpotlightActionGroups } from "./actions/groups/action-group";
import { SpotlightModeRail } from "./mode-rail";
import { SpotlightNoResults } from "./no-results";
import classes from "./spotlight.module.css";

type ChildrenOptions = inferSearchInteractionOptions<"children">;

const defaultMode: SpotlightMode = "search";

const resetSelection = () => {
  requestAnimationFrame(() => selectAction(0, spotlightStore));
};

export const Spotlight = () => {
  useSpotlightCatalogs();

  const [mode, setMode] = useState<SpotlightMode>(defaultMode);
  const [query, setQuery] = useState("");
  const setMediaRequestSearchScope = useSetAtom(mediaRequestSearchScopeAtom);
  const activeMode = useMemo(() => searchModes.find((searchMode) => searchMode.mode === mode), [mode]);

  const applyOpenOptions = useCallback(
    (options: SpotlightOpenIntent) => {
      setMode(options.mode);
      setQuery(options.query ?? "");
      if (options.mode !== "media") setMediaRequestSearchScope({});
      spotlightActions.open();
      resetSelection();
    },
    [setMediaRequestSearchScope],
  );

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const pendingOptions = consumePendingSpotlightOpen();
      const eventOptions = (event as CustomEvent<SpotlightOpenIntent>).detail;
      applyOpenOptions(eventOptions ?? pendingOptions ?? { mode: defaultMode });
    };

    window.addEventListener(spotlightOpenEvent, handleOpen);
    const pendingOptions = consumePendingSpotlightOpen();
    if (pendingOptions) applyOpenOptions(pendingOptions);
    return () => window.removeEventListener(spotlightOpenEvent, handleOpen);
  }, [applyOpenOptions]);

  useEffect(() => {
    const applyMediaRequestSearch = ({ integrationIds, query: mediaQuery }: OpenMediaRequestSearchOptions) => {
      setMediaRequestSearchScope({ integrationIds });
      applyOpenOptions({ mode: "media", query: mediaQuery });
    };

    const handleMediaRequestSearch = (event: Event) => {
      const pendingOptions = consumePendingMediaRequestSearch();
      const eventOptions = (event as CustomEvent<OpenMediaRequestSearchOptions>).detail;
      applyMediaRequestSearch(eventOptions ?? pendingOptions ?? {});
    };

    window.addEventListener(mediaRequestSearchEvent, handleMediaRequestSearch);
    const pendingOptions = consumePendingMediaRequestSearch();
    if (pendingOptions) applyMediaRequestSearch(pendingOptions);
    return () => window.removeEventListener(mediaRequestSearchEvent, handleMediaRequestSearch);
  }, [applyOpenOptions, setMediaRequestSearchScope]);

  if (!activeMode) return null;

  return (
    <SpotlightWithActiveMode
      key={mode}
      mode={mode}
      setMode={setMode}
      query={query}
      setQuery={setQuery}
      activeMode={activeMode}
    />
  );
};

interface SpotlightWithActiveModeProps {
  mode: SpotlightMode;
  setMode: Dispatch<SetStateAction<SpotlightMode>>;
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  activeMode: SearchMode;
}

const SpotlightWithActiveMode = ({ mode, setMode, query, setQuery, activeMode }: SpotlightWithActiveModeProps) => {
  const [childrenStack, setChildrenStack] = useState<ChildrenOptions[]>([]);
  const childrenOptions = childrenStack.at(-1) ?? null;
  const t = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const useGroups = "groups" in activeMode ? () => activeMode.groups : activeMode.useGroups;
  const groups = useGroups();
  const hasModeCharacter = activeMode.character !== undefined;
  const activeModeLabel = translateIfNecessary(t, activeMode.label) ?? activeMode.mode;
  const placeholder = translateIfNecessary(t, activeMode.placeholder) ?? t("search.placeholder");
  const modeRailEntries = searchModes.map((searchMode) => {
    const label = translateIfNecessary(t, searchMode.label) ?? searchMode.mode;
    return {
      mode: searchMode.mode,
      character: searchMode.character,
      label,
      ariaLabel: t("search.modePicker.modeAriaLabel", { mode: label }),
    };
  });

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const clearChildrenStack = useCallback(() => {
    setChildrenStack([]);
  }, []);

  const changeMode = useCallback(
    (nextMode: SpotlightMode, preserveQuery = true) => {
      setMode(nextMode);
      clearChildrenStack();
      if (!preserveQuery) setQuery("");
      resetSelection();
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [clearChildrenStack, setMode, setQuery],
  );

  const pushChildrenOptions = useCallback(
    (options: ChildrenOptions) => {
      setChildrenStack((currentStack) => [...currentStack, options]);
      setQuery("");
      resetSelection();
    },
    [setQuery],
  );

  const popChildrenOptions = useCallback(() => {
    setChildrenStack((currentStack) => currentStack.slice(0, -1));
    setQuery("");
    resetSelection();
  }, [setQuery]);

  return (
    <MantineSpotlight.Root
      shortcut={null}
      size={760}
      yOffset={64}
      scrollable
      maxHeight="min(62vh, 560px)"
      overlayProps={{ blur: 3, backgroundOpacity: 0.24 }}
      attributes={{ content: { "aria-label": t("search.modePicker.dialogAriaLabel", { mode: activeModeLabel }) } }}
      classNames={{ content: classes.content }}
      onSpotlightOpen={() => {
        requestAnimationFrame(() => inputRef.current?.focus());
      }}
      onSpotlightClose={() => {
        setMode(defaultMode);
        clearChildrenStack();
        setQuery("");
      }}
      query={query}
      onQueryChange={(nextQuery) => {
        const sanitizedQuery = mode === "external" && nextQuery.startsWith("!") ? nextQuery.slice(1) : nextQuery;
        setQuery(sanitizedQuery);

        if (sanitizedQuery.length === 1) {
          const modeToActivate = searchModes.find((searchMode) => searchMode.character === sanitizedQuery);
          if (modeToActivate) {
            changeMode(modeToActivate.mode, false);
            return;
          }
        }

        resetSelection();
      }}
      store={spotlightStore}
    >
      <MantineSpotlight.Search
        data-homarr-dev-benchmark-spotlight
        aria-label={placeholder}
        placeholder={placeholder}
        ref={inputRef}
        className={classes.search}
        leftSectionWidth={hasModeCharacter ? 80 : 48}
        leftSection={
          <Group align="center" wrap="nowrap" gap="xs" w="100%" h="100%">
            <Center w={48} h="100%">
              <IconSearch stroke={1.5} />
            </Center>
            {hasModeCharacter ? <Kbd size="sm">{activeMode.character}</Kbd> : null}
          </Group>
        }
        styles={{ section: { pointerEvents: "all" } }}
        rightSection={
          mode === defaultMode && childrenStack.length === 0 ? null : (
            <ActionIcon
              title={
                childrenStack.length > 0
                  ? t("search.mode.command.group.preferences.children.detail.backAction")
                  : t("common.action.close")
              }
              onClick={() => {
                if (childrenStack.length > 0) {
                  popChildrenOptions();
                  inputRef.current?.focus();
                  return;
                }

                changeMode(defaultMode, true);
              }}
              variant="subtle"
              aria-label={
                childrenStack.length > 0
                  ? t("search.mode.command.group.preferences.children.detail.backAction")
                  : t("common.action.close")
              }
            >
              {childrenStack.length > 0 ? <IconArrowLeft stroke={1.5} /> : <IconX stroke={1.5} />}
            </ActionIcon>
          )
        }
        value={query}
        onKeyDown={(event) => {
          if (query.length !== 0 || event.key !== "Backspace") return;

          if (childrenStack.length > 0) {
            popChildrenOptions();
            return;
          }

          if (mode !== defaultMode) changeMode(defaultMode, true);
        }}
      />

      <SpotlightModeRail
        activeMode={mode}
        entries={modeRailEntries}
        navigationLabel={t("search.modePicker.navigationLabel")}
        onModeChange={changeMode}
      />

      {childrenOptions ? (
        <Group key={childrenStack.length}>
          <childrenOptions.DetailComponent options={childrenOptions.option as never} />
        </Group>
      ) : null}

      <MantineSpotlight.ActionsList
        component="section"
        className={classes.actionsList}
        aria-label={t("search.modePicker.resultsAriaLabel", { mode: activeModeLabel })}
      >
        {childrenOptions ? (
          <SpotlightChildrenActions
            key={childrenStack.length}
            childrenOptions={childrenOptions}
            query={query}
            setChildrenOptions={pushChildrenOptions}
          />
        ) : (
          <SpotlightActionGroups
            setQuery={setQuery}
            setMode={(nextMode) => changeMode(nextMode, true)}
            setChildrenOptions={pushChildrenOptions}
            query={query}
            groups={groups}
          />
        )}
        <SpotlightNoResults className={classes.emptyState} />
      </MantineSpotlight.ActionsList>

      <MantineSpotlight.Footer className={classes.footer} px="md" py="xs">
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
                {t("search.modePicker.footer.navigate")}
              </Text>
            </Group>
            <Group gap={4} wrap="nowrap">
              <Kbd size="xs">
                <IconCornerDownLeft size={11} />
              </Kbd>
              <Text size="xs" className={classes.footerHint}>
                {t("search.modePicker.footer.open")}
              </Text>
            </Group>
          </Group>
          <Group gap={4} wrap="nowrap" className={classes.footerSecondary}>
            <Kbd size="xs">esc</Kbd>
            <Text size="xs" className={classes.footerHint}>
              {t("search.modePicker.footer.close")}
            </Text>
          </Group>
        </Group>
      </MantineSpotlight.Footer>
    </MantineSpotlight.Root>
  );
};
