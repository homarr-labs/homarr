"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ActionIcon, Center, Group, Kbd, Text } from "@mantine/core";
import { Spotlight } from "@mantine/spotlight";
import { IconSearch, IconX } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";

import classes from "../component.module.css";
import { selectAction, spotlightStore } from "../spotlight-store";
import type { SearchGroup } from "./group";
import { SearchInteraction, type inferSearchInteractionOptions } from "./interaction";
import { searchModes } from "./modes";
import { searchEnginesChildrenOptions, searchEnginesSearchGroups } from "./modes/external/search-engines-search-group";

export const NewSpotlight = () => {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("default");
  const [childrenOptions, setChildrenOptions] = useState<inferSearchInteractionOptions<"children"> | null>(null);
  const t = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  // It's a conditional hook, but as it is always called the same amount of times, it's fine
  const { useActions } = childrenOptions ?? { useActions: () => [] };

  const childrenActions = useActions();
  const activeMode = useMemo(() => searchModes.find((searchMode) => searchMode.name === mode), [mode]);

  const actions = useMemo(() => {
    if (!activeMode) return [];

    return activeMode.groups.map((group) => (
      <Spotlight.ActionsGroup key={group.title} label={group.title}>
        {/*eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <GroupActions<any>
          group={group}
          query={query}
          setMode={(mode) => {
            setMode(mode);
            setChildrenOptions(null);
          }}
          setChildrenOptions={(options) => {
            setChildrenOptions(options);
            setQuery("");
            setTimeout(() => selectAction(0, spotlightStore));
          }}
        />
      </Spotlight.ActionsGroup>
    ));
  }, [activeMode, query, setMode, setChildrenOptions, selectAction, spotlightStore]);

  const childrenActionsItems = useMemo(() => {
    if (!childrenActions || !childrenOptions) return null;

    return childrenActions.map((action) => (
      <ChildrenActionOption childrenOptions={childrenOptions} query={query} action={action} />
    ));
  }, [childrenOptions, query]);

  const displayActions = childrenActionsItems ?? actions;

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
        {displayActions.length > 0 ? (
          displayActions
        ) : (
          <Spotlight.Empty>{t("common.search.nothingFound")}</Spotlight.Empty>
        )}
      </Spotlight.ActionsList>
    </Spotlight.Root>
  );
};

interface ChildrenActionOptionProps {
  childrenOptions: inferSearchInteractionOptions<"children">;
  query: string;
  action: ReturnType<inferSearchInteractionOptions<"children">["useActions"]>[number];
}

const ChildrenActionOption = ({ childrenOptions, query, action }: ChildrenActionOptionProps) => {
  const interaction = {
    type: "disabled" as SearchInteraction,
    href: "",
    onSelect: () => {},
  }; //action.useInteraction(childrenOptions.option, query);

  if (interaction.type === "disabled") {
    return <></>;
  }

  const renderRoot =
    interaction.type === "link"
      ? (props: Record<string, unknown>) => {
          return <Link href={interaction.href} {...props} />;
        }
      : undefined;

  const onClick = interaction.type === "javaScript" ? interaction.onSelect : undefined;

  return (
    <Spotlight.Action renderRoot={renderRoot} onClick={onClick} className={classes.spotlightAction}>
      <action.component {...childrenOptions.option} />
    </Spotlight.Action>
  );
};

interface GroupActionsProps<TOption extends Record<string, unknown>> {
  group: SearchGroup<TOption>;
  query: string;
  setMode: (mode: string) => void;
  setChildrenOptions: (options: inferSearchInteractionOptions<"children">) => void;
}

const GroupActions = <TOption extends Record<string, unknown>>({
  group,
  query,
  setMode,
  setChildrenOptions,
}: GroupActionsProps<TOption>) => {
  // This does work as the same amount of hooks is called on every render
  const useOptions =
    "options" in group ? () => group.options : "useOptions" in group ? group.useOptions : group.useQueryOptions;
  const options = useOptions(query);
  const t = useI18n();

  if (Array.isArray(options)) {
    const filteredOptions = options
      .filter((option) => ("filter" in group ? group.filter(query, option) : false))
      .sort((optionA, optionB) => {
        if ("sort" in group) {
          return group.sort?.(query, [optionA, optionB]) ?? 0;
        }

        return 0;
      });

    if (filteredOptions.length === 0) {
      return <Spotlight.Empty>{t("common.search.nothingFound")}</Spotlight.Empty>;
    }

    return filteredOptions.map((option) => (
      <SpotlightOption
        option={option}
        group={group}
        query={query}
        setMode={setMode}
        setChildrenOptions={setChildrenOptions}
      />
    ));
  }

  if (options.isLoading || options.isError || !options.data) {
    return <></>;
  }

  if (options.data.length === 0) {
    return <Spotlight.Empty>{t("common.search.nothingFound")}</Spotlight.Empty>;
  }

  return options.data.map((option) => (
    <SpotlightOption
      option={option}
      group={group}
      query={query}
      setMode={setMode}
      setChildrenOptions={setChildrenOptions}
    />
  ));
};

interface SpotlightOptionProps<TOption extends Record<string, unknown>> {
  option: TOption;
  query: string;
  setMode: (mode: string) => void;
  setChildrenOptions: (options: inferSearchInteractionOptions<"children">) => void;
  group: SearchGroup<TOption>;
}

const SpotlightOption = <TOption extends Record<string, unknown>>({
  group,
  query,
  setMode,
  setChildrenOptions,
  option,
}: SpotlightOptionProps<TOption>) => {
  const interaction = group.useInteraction(option, query);

  if (interaction.type === "disabled") {
    return <></>;
  }

  const renderRoot =
    interaction.type === "link"
      ? (props: Record<string, unknown>) => {
          return <Link href={interaction.href} {...props} />;
        }
      : undefined;

  const onClick =
    interaction.type === "javaScript"
      ? interaction.onSelect
      : interaction.type === "mode"
        ? () => setMode(interaction.mode)
        : interaction.type === "children"
          ? () => setChildrenOptions(interaction)
          : undefined;

  return (
    <Spotlight.Action
      renderRoot={renderRoot}
      onClick={onClick}
      closeSpotlightOnTrigger={interaction.type !== "mode" && interaction.type !== "children"}
      className={classes.spotlightAction}
    >
      <group.component {...option} />
    </Spotlight.Action>
  );
};
