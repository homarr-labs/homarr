"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionIcon, Center, Group, Kbd } from "@mantine/core";
import { Spotlight as MantineSpotlight } from "@mantine/spotlight";
import { IconSearch, IconX } from "@tabler/icons-react";

import type { TranslationObject } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";

import type { inferSearchInteractionOptions } from "../lib/interaction";
import type { SearchMode } from "../lib/mode";
import { searchModes } from "../modes";
import { useSpotlightContextResults } from "../modes/home/context";
import { selectAction, spotlightStore } from "../spotlight-store";
import { SpotlightChildrenActions } from "./actions/children-actions";
import { SpotlightActionGroups } from "./actions/groups/action-group";

type SearchModeKey = keyof TranslationObject["search"]["mode"];

export const Spotlight = () => {
  const items = useSpotlightContextResults();
  // We fallback to help if no context results are available
  const defaultMode = items.length >= 1 ? "home" : "help";
  const searchModeState = useState<SearchModeKey>(defaultMode);
  const mode = searchModeState[0];
  const activeMode = useMemo(() => searchModes.find((searchMode) => searchMode.modeKey === mode), [mode]);

  /**
   * The below logic is used to switch to home page if any context results are registered
   * or to help page if context results are unregistered
   */
  const previousLengthRef = useRef(items.length);
  useEffect(() => {
    if (items.length >= 1 && previousLengthRef.current === 0) {
      searchModeState[1]("home");
    } else if (items.length === 0 && previousLengthRef.current >= 1) {
      searchModeState[1]("help");
    }

    previousLengthRef.current = items.length;
  }, [items.length, searchModeState]);

  if (!activeMode) {
    return null;
  }

  // We use the "key" below to prevent the 'Different amounts of hooks' error
  return (
    <SpotlightWithActiveMode key={mode} modeState={searchModeState} activeMode={activeMode} defaultMode={defaultMode} />
  );
};

interface SpotlightWithActiveModeProps {
  modeState: [SearchModeKey, Dispatch<SetStateAction<SearchModeKey>>];
  activeMode: SearchMode;
  defaultMode: SearchModeKey;
}

const SpotlightWithActiveMode = ({ modeState, activeMode, defaultMode }: SpotlightWithActiveModeProps) => {
  const [query, setQuery] = useState("");
  const [mode, setMode] = modeState;
  const [childrenOptions, setChildrenOptions] = useState<inferSearchInteractionOptions<"children"> | null>(null);
  const t = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  // Works as always the same amount of hooks are executed
  const useGroups = "groups" in activeMode ? () => activeMode.groups : activeMode.useGroups;
  const groups = useGroups();

  return (
    <MantineSpotlight.Root
      yOffset={8}
      onSpotlightClose={() => {
        setMode(defaultMode);
        setChildrenOptions(null);
      }}
      query={query}
      onQueryChange={(query) => {
        if ((mode !== "help" && mode !== "home") || query.length !== 1) {
          setQuery(query);
        }

        const modeToActivate = searchModes.find((mode) => mode.character === query);
        if (!modeToActivate) {
          return;
        }

        setMode(modeToActivate.modeKey);
        setQuery("");
        setTimeout(() => selectAction(0, spotlightStore));
      }}
      store={spotlightStore}
    >
      <MantineSpotlight.Search
        placeholder={`${t("search.placeholder")}...`}
        ref={inputRef}
        leftSectionWidth={activeMode.modeKey !== defaultMode ? 80 : 48}
        leftSection={
          <Group align="center" wrap="nowrap" gap="xs" w="100%" h="100%">
            <Center w={48} h="100%">
              <IconSearch stroke={1.5} />
            </Center>
            {activeMode.modeKey !== defaultMode ? <Kbd size="sm">{activeMode.character}</Kbd> : null}
          </Group>
        }
        styles={{
          section: {
            pointerEvents: "all",
          },
        }}
        rightSection={
          mode === defaultMode ? undefined : (
            <ActionIcon
              onClick={() => {
                setMode(defaultMode);
                setChildrenOptions(null);
                inputRef.current?.focus();
              }}
              variant="subtle"
            >
              <IconX stroke={1.5} />
            </ActionIcon>
          )
        }
        value={query}
        onKeyDown={(event) => {
          if (query.length === 0 && mode !== defaultMode && event.key === "Backspace") {
            setMode(defaultMode);
            setChildrenOptions(null);
          }
        }}
      />

      {childrenOptions ? (
        <Group>
          <childrenOptions.DetailComponent options={childrenOptions.option as never} />
        </Group>
      ) : null}

      <MantineSpotlight.ActionsList>
        {childrenOptions ? (
          <SpotlightChildrenActions childrenOptions={childrenOptions} query={query} />
        ) : (
          <SpotlightActionGroups
            setMode={(mode) => {
              setMode(mode);
              setChildrenOptions(null);
              setTimeout(() => selectAction(0, spotlightStore));
            }}
            setChildrenOptions={(options) => {
              setChildrenOptions(options);

              setTimeout(() => {
                setQuery("");
                selectAction(0, spotlightStore);
              });
            }}
            query={query}
            groups={groups}
          />
        )}
      </MantineSpotlight.ActionsList>
    </MantineSpotlight.Root>
  );
};
