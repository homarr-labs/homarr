"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Center, Group, Kbd } from "@mantine/core";
import { Spotlight as MantineSpotlight } from "@mantine/spotlight";
import { IconArrowLeft, IconSearch, IconX } from "@tabler/icons-react";
import { useSetAtom } from "jotai";

import { hotkeys } from "@homarr/definitions";
import type { TranslationObject } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { OpenMediaRequestSearchOptions } from "../index";
import type { inferSearchInteractionOptions } from "../lib/interaction";
import type { SearchMode } from "../lib/mode";
import { searchModes } from "../modes";
import { useHomeEmptyGroupsWithPreferences } from "../modes/help/home-empty-groups";
import {
  mediaRequestSearchEvent,
  mediaRequestSearchScopeAtom,
  selectAction,
  spotlightActions,
  spotlightStore,
} from "../spotlight-store";
import { SpotlightChildrenActions } from "./actions/children-actions";
import { SpotlightActionGroups } from "./actions/groups/action-group";

type SearchModeKey = keyof TranslationObject["search"]["mode"];
type ChildrenOptions = inferSearchInteractionOptions<"children">;

const defaultMode = "home";
export const Spotlight = () => {
  const searchModeState = useState<SearchModeKey>(defaultMode);
  const queryState = useState("");
  const mode = searchModeState[0];
  const activeMode = useMemo(() => searchModes.find((searchMode) => searchMode.modeKey === mode), [mode]);

  if (!activeMode) {
    return null;
  }

  return (
    <SpotlightWithActiveMode key={mode} modeState={searchModeState} queryState={queryState} activeMode={activeMode} />
  );
};

interface SpotlightWithActiveModeProps {
  modeState: [SearchModeKey, Dispatch<SetStateAction<SearchModeKey>>];
  queryState: [string, Dispatch<SetStateAction<string>>];
  activeMode: SearchMode;
}

const SpotlightWithActiveMode = ({ modeState, queryState, activeMode }: SpotlightWithActiveModeProps) => {
  const [query, setQuery] = queryState;
  const [mode, setMode] = modeState;
  const [childrenStack, setChildrenStack] = useState<ChildrenOptions[]>([]);
  const childrenOptions = childrenStack.at(-1) ?? null;
  const t = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const setMediaRequestSearchScope = useSetAtom(mediaRequestSearchScopeAtom);
  const useGroups = "groups" in activeMode ? () => activeMode.groups : activeMode.useGroups;
  const groups = useGroups();
  const homeEmptyGroups = useHomeEmptyGroupsWithPreferences();
  const hasModeCharacter = activeMode.modeKey !== defaultMode && activeMode.character !== undefined;

  const clearChildrenStack = useCallback(() => {
    setChildrenStack([]);
  }, []);

  const pushChildrenOptions = useCallback(
    (options: ChildrenOptions) => {
      setChildrenStack((currentStack) => [...currentStack, options]);
      setQuery("");
      setTimeout(() => selectAction(0, spotlightStore));
    },
    [setQuery],
  );

  const popChildrenOptions = useCallback(() => {
    setChildrenStack((currentStack) => currentStack.slice(0, -1));
    setQuery("");
    setTimeout(() => selectAction(0, spotlightStore));
  }, [setQuery]);

  useEffect(() => {
    const handleMediaRequestSearch = (event: Event) => {
      const { integrationIds, query } = (event as CustomEvent<OpenMediaRequestSearchOptions>).detail ?? {};
      setMediaRequestSearchScope({ integrationIds });
      setMode("media");
      clearChildrenStack();
      setQuery(query ?? "");
      spotlightActions.open();
      setTimeout(() => selectAction(0, spotlightStore));
    };

    window.addEventListener(mediaRequestSearchEvent, handleMediaRequestSearch);
    return () => {
      window.removeEventListener(mediaRequestSearchEvent, handleMediaRequestSearch);
    };
  }, [setMediaRequestSearchScope, setMode, setQuery, clearChildrenStack]);

  useEffect(() => {
    if (mode !== "media") {
      setMediaRequestSearchScope({});
    }
  }, [mode, setMediaRequestSearchScope]);

  return (
    <MantineSpotlight.Root
      shortcut={hotkeys.openSpotlight}
      yOffset={8}
      overlayProps={{ blur: 2, backgroundOpacity: 0.2 }}
      onSpotlightClose={() => {
        setMode(defaultMode);
        clearChildrenStack();
        setQuery("");
      }}
      query={query}
      onQueryChange={(nextQuery) => {
        const sanitizedQuery = mode === "external" && nextQuery.startsWith("!") ? nextQuery.slice(1) : nextQuery;
        setQuery(sanitizedQuery);

        if (sanitizedQuery.length !== 1) return;

        const modeToActivate = searchModes.find((searchMode) => searchMode.character === sanitizedQuery);
        if (!modeToActivate) return;

        setMode(modeToActivate.modeKey);
        clearChildrenStack();
        setQuery("");
        setTimeout(() => selectAction(0, spotlightStore));
      }}
      store={spotlightStore}
    >
      <MantineSpotlight.Search
        placeholder={`${t("search.placeholder")}...`}
        ref={inputRef}
        leftSectionWidth={hasModeCharacter ? 80 : 48}
        leftSection={
          <Group align="center" wrap="nowrap" gap="xs" w="100%" h="100%">
            <Center w={48} h="100%">
              <IconSearch stroke={1.5} />
            </Center>
            {hasModeCharacter ? <Kbd size="sm">{activeMode.character}</Kbd> : null}
          </Group>
        }
        styles={{
          section: {
            pointerEvents: "all",
          },
        }}
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

                setMode(defaultMode);
                clearChildrenStack();
                inputRef.current?.focus();
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

          if (mode !== defaultMode) {
            setMode(defaultMode);
            clearChildrenStack();
          }
        }}
      />

      {childrenOptions ? (
        <Group key={childrenStack.length}>
          <childrenOptions.DetailComponent options={childrenOptions.option as never} />
        </Group>
      ) : null}

      <MantineSpotlight.ActionsList>
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
            setMode={(nextMode) => {
              setMode(nextMode);
              clearChildrenStack();
              setTimeout(() => selectAction(0, spotlightStore));
            }}
            setChildrenOptions={(options) => {
              pushChildrenOptions(options);
            }}
            query={query}
            groups={mode === defaultMode && query.length === 0 ? [...homeEmptyGroups] : groups}
          />
        )}
      </MantineSpotlight.ActionsList>
    </MantineSpotlight.Root>
  );
};
