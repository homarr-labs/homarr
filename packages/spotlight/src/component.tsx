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
import { useRegisterWebActions } from "./web-actions";

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

export const Spotlight = () => {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const groups = useAtomValue(groupsAtomRead);
  const actions = useAtomValue(actionsAtomRead);
  const t = useI18n();
  useRegisterWebActions();

  const items = actions
    .filter(
      (item) =>
        (item.ignoreSearchAndOnlyShowInGroup
          ? item.group === group
          : translateIfNecessary(item.title, t)
              .toLowerCase()
              .includes(query.toLowerCase().trim())) &&
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
                    alt={translateIfNecessary(item.title, t)}
                    width={24}
                    height={24}
                  />
                )}
              </Center>
            )}

            <Flex direction="column">
              <Text>{translateIfNecessary(item.title, t)}</Text>

              {item.description && (
                <Text opacity={0.6} size="xs">
                  {translateIfNecessary(item.description, t)}
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

  /*  {item.new && <Badge variant="default">new</Badge>} */
  return (
    <MantineSpotlight.Root
      query={query}
      onQueryChange={setQuery}
      store={spotlightStore}
    >
      <MantineSpotlight.Search
        placeholder="Search..."
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
          <MantineSpotlight.Empty>Nothing found...</MantineSpotlight.Empty>
        )}
      </MantineSpotlight.ActionsList>
    </MantineSpotlight.Root>
  );
};
