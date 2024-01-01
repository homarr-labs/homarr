"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { capitalize } from "@homarr/common";
import { integrationKinds } from "@homarr/definitions";
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

  const filteredKinds = useMemo(() => {
    return integrationKinds.filter((kind) =>
      kind.includes(search.toLowerCase()),
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

      {filteredKinds.length > 0 ? (
        <ScrollArea.Autosize mah={384}>
          {filteredKinds.map((kind) => (
            <Menu.Item
              component={Link}
              href={`/integrations/new?kind=${kind}`}
              key={kind}
            >
              <Group>
                <IntegrationAvatar kind={kind} size="sm" />
                <Text size="sm">{capitalize(kind)}</Text>
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
