"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { capitalize } from "@homarr/common";
import { integrationSorts } from "@homarr/db/schema/items";
import {
  Group,
  IconSearch,
  Menu,
  ScrollArea,
  Stack,
  Text,
  TextInput,
} from "@homarr/ui";

import { IntegrationAvatar } from "../_avatar";

export const IntegrationCreateDropdownContent = () => {
  const [search, setSearch] = useState("");

  const filteredSorts = useMemo(() => {
    return integrationSorts.filter((sort) =>
      sort.includes(search.toLowerCase()),
    );
  }, [search]);

  return (
    <Stack>
      <TextInput
        leftSection={<IconSearch stroke={1.5} size={20} />}
        placeholder="Search integrations"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredSorts.length > 0 ? (
        <ScrollArea.Autosize mah={384}>
          {filteredSorts.map((sort) => (
            <Menu.Item
              component={Link}
              href={`/integrations/new?sort=${sort}`}
              key={sort}
            >
              <Group>
                <IntegrationAvatar sort={sort} size="sm" />
                <Text size="sm">{capitalize(sort)}</Text>
              </Group>
            </Menu.Item>
          ))}
        </ScrollArea.Autosize>
      ) : (
        <Menu.Item disabled>No results found</Menu.Item>
      )}
    </Stack>
  );
};
