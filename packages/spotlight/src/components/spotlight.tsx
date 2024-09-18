"use client";

import { useMemo, useRef, useState } from "react";
import { ActionIcon, Center, Group, Kbd, Text } from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import { IconSearch, IconX } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import type { inferSearchInteractionOptions } from "../lib/interaction";
import { searchModes } from "../modes";
import { searchEnginesChildrenOptions, searchEnginesSearchGroups } from "../modes/external/search-engines-search-group";
import { selectAction, spotlightStore } from "../spotlight-store";
import { SpotlightChildrenActions } from "./actions/children-actions";
import { SpotlightActionGroups } from "./actions/groups/action-group";

export const NewSpotlight = () => {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("default");
  const [childrenOptions, setChildrenOptions] = useState<inferSearchInteractionOptions<"children"> | null>(null);
  const t = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const activeMode = useMemo(() => searchModes.find((searchMode) => searchMode.name === mode), [mode]);

  return (
    <Spotlight.Root
      onSpotlightClose={() => {
        setMode("default");
        setChildrenOptions(null);
      }}
      query={query}
      onQueryChange={(query) => {
        if ((mode === "default" || mode === "help") && query.length === 1) {
          const modeToActivate = searchModes.find((mode) => mode.character === query);
          if (modeToActivate) {
            setMode(modeToActivate.name);
            setQuery("");
            return;
          }
        }

        setQuery(query);
      }}
      store={spotlightStore}
    >
      <Spotlight.Search
        placeholder={t("common.rtl", {
          value: t("common.search.placeholder"),
          symbol: "...",
        })}
        ref={inputRef}
        leftSectionWidth={activeMode ? 80 : 48}
        leftSection={
          <Group align="center" wrap="nowrap" gap="xs" w="100%" h="100%">
            <Center w={48} h="100%">
              <IconSearch stroke={1.5} />
            </Center>
            {activeMode ? <Kbd size="sm">{activeMode.character}</Kbd> : null}
          </Group>
        }
        rightSection={
          mode === "default" ? undefined : (
            <ActionIcon
              onClick={() => {
                setMode("default");
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
          if (query.length === 0 && mode !== "default" && event.key === "Backspace") {
            setMode("default");
            setChildrenOptions(null);
          }

          // TODO: Add api to directly interact / maybe even add an option to add a onKeyPress event to modes / groups?
          if (mode === "external" && event.code === "Space") {
            const engine =
              "options" in searchEnginesSearchGroups
                ? searchEnginesSearchGroups.options.find((option) => option.short === query)
                : undefined;

            if (engine) {
              setChildrenOptions(searchEnginesChildrenOptions(engine));
              setQuery("");
            }
          }
        }}
      />

      {childrenOptions ? (
        <Group>
          <childrenOptions.detailComponent options={childrenOptions.option as never} />
        </Group>
      ) : (
        <Group justify="start" px="md" py="sm">
          {activeMode?.tip ? (
            activeMode.tip
          ) : (
            <Text size="xs" c="gray.6">
              Type <Kbd size="xs">?</Kbd> for help and tips
            </Text>
          )}
        </Group>
      )}

      <Spotlight.ActionsList>
        {childrenOptions ? (
          <SpotlightChildrenActions childrenOptions={childrenOptions} query={query} />
        ) : activeMode ? (
          <SpotlightActionGroups
            setMode={(mode) => {
              setMode(mode);
              setChildrenOptions(null);
            }}
            setChildrenOptions={(options) => {
              setChildrenOptions(options);
              setQuery("");
              setTimeout(() => selectAction(0, spotlightStore));
            }}
            query={query}
            groups={activeMode.groups}
          />
        ) : (
          <Spotlight.Empty>{t("common.search.nothingFound")}</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
};
