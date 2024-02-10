"use client";

import { useState } from "react";
import Link from "next/link";
import { useListState } from "@mantine/hooks";
import {
  Spotlight as MantineSpotlight,
  SpotlightAction,
} from "@mantine/spotlight";

import { Center, Flex, Group, IconSearch, Text } from "@homarr/ui";

import type { SpotlightActionProps } from "./type";

export const Spotlight = () => {
  const [query, setQuery] = useState("");
  const [actions] = useListState<SpotlightActionProps>([
    {
      id: "1",
      title: "Google",
      description: "Search the web using Google",
      group: "group",
      icon: "https://www.google.com/favicon.ico",
      type: "link",
      href: "https://www.google.com",
    },
  ]);

  const items = actions
    .filter((item) =>
      item.title.toLowerCase().includes(query.toLowerCase().trim()),
    )
    .map((item) => {
      const renderRoot =
        item.type === "link"
          ? (props: Record<string, unknown>) => (
              <Link href={item.href} {...props} />
            )
          : undefined;

      return (
        <SpotlightAction
          key={item.title}
          renderRoot={renderRoot}
          onClick={item.type === "button" ? item.onClick : undefined}
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

  /*  {item.new && <Badge variant="default">new</Badge>} */
  return (
    <MantineSpotlight.Root query={query} onQueryChange={setQuery}>
      <MantineSpotlight.Search
        placeholder="Search..."
        leftSection={<IconSearch stroke={1.5} />}
      />
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
