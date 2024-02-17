"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Spotlight as MantineSpotlight,
  SpotlightAction,
} from "@mantine/spotlight";
import { useAtomValue } from "jotai";

import type { TranslationFunction } from "@homarr/translation";
import { useI18n } from "@homarr/translation/client";
import {
  Center,
  Chip,
  Divider,
  Flex,
  Group,
  IconSearch,
  Text,
} from "@homarr/ui";

import { GroupChip } from "./chip-group";
import classes from "./component.module.css";
import { actionsAtomRead, groupsAtomRead } from "./data-store";
import { setSelectedAction, spotlightStore } from "./spotlight-store";
import type { SpotlightActionData } from "./type";

export const Spotlight = () => {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const groups = useAtomValue(groupsAtomRead);
  const actions = useAtomValue(actionsAtomRead);
  const t = useI18n();

  const preparedActions = actions.map((action) => prepareAction(action, t));
  const items = preparedActions
    .filter(
      (item) =>
        (item.ignoreSearchAndOnlyShowInGroup
          ? item.group === group
          : item.title.toLowerCase().includes(query.toLowerCase().trim())) &&
        (group === "all" || item.group === group),
    )
    .map((item) => {
      const renderRoot =
        item.type === "link"
          ? (props: Record<string, unknown>) => (
              <Link href={prepareHref(item.href, query)} {...props} />
            )
          : undefined;

      return (
        <SpotlightAction
          key={item.id}
          renderRoot={renderRoot}
          onClick={item.type === "button" ? item.onClick : undefined}
          className={classes.spotlightAction}
        >
          <Group wrap="nowrap" w="100%">
            {item.icon && (
              <Center w={50} h={50}>
                {typeof item.icon !== "string" && <item.icon size={24} />}
                {typeof item.icon === "string" && (
                  <img
                    src={item.icon}
                    alt={item.title}
                    width={24}
                    height={24}
                  />
                )}
              </Center>
            )}

            <Flex direction="column">
              <Text>{item.title}</Text>

              {item.description && (
                <Text opacity={0.6} size="xs">
                  {item.description}
                </Text>
              )}
            </Flex>
          </Group>
        </SpotlightAction>
      );
    });

  const onGroupChange = useCallback(
    (group: string) => {
      setSelectedAction(-1, spotlightStore);
      setGroup(group);
    },
    [setGroup, setSelectedAction],
  );

  return (
    <MantineSpotlight.Root
      query={query}
      onQueryChange={setQuery}
      store={spotlightStore}
    >
      <MantineSpotlight.Search
        placeholder={t("common.search.placeholder")}
        leftSection={<IconSearch stroke={1.5} />}
      />

      <Divider />
      <Group wrap="nowrap" p="sm">
        <Chip.Group multiple={false} value={group} onChange={onGroupChange}>
          <Group justify="start">
            {groups.map((group) => (
              <GroupChip key={group} group={group} />
            ))}
          </Group>
        </Chip.Group>
      </Group>

      <MantineSpotlight.ActionsList>
        {items.length > 0 ? (
          items
        ) : (
          <MantineSpotlight.Empty>
            {t("common.search.nothingFound")}
          </MantineSpotlight.Empty>
        )}
      </MantineSpotlight.ActionsList>
    </MantineSpotlight.Root>
  );
};

const prepareHref = (href: string, query: string) => {
  return href.replace("%s", query);
};

const translateIfNecessary = (
  value: string | ((t: TranslationFunction) => string),
  t: TranslationFunction,
) => {
  if (typeof value === "function") {
    return value(t);
  }

  return value;
};

const prepareAction = (
  action: SpotlightActionData,
  t: TranslationFunction,
) => ({
  ...action,
  title: translateIfNecessary(action.title, t),
  description: translateIfNecessary(action.description, t),
});
