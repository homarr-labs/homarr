"use client";

import type { ChangeEvent } from "react";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Flex, Group, Menu, ScrollArea, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

import { getIntegrationName, integrationKinds } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { IntegrationAvatar } from "@homarr/ui";

export const IntegrationCreateDropdownContent = () => {
  const t = useI18n();
  const [search, setSearch] = useState("");

  const filteredKinds = useMemo(() => {
    return integrationKinds.filter((kind) =>
      getIntegrationName(kind).toLowerCase().includes(search.toLowerCase().trim()),
    );
  }, [search]);

  const handleSearch = React.useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value),
    [setSearch],
  );

  return (
    <Flex direction={{ base: "column-reverse", md: "column" }} gap="sm">
      <TextInput
        leftSection={<IconSearch stroke={1.5} size={20} />}
        placeholder={t("integration.page.list.search")}
        value={search}
        data-autofocus
        onChange={handleSearch}
        variant="filled"
      />

      {filteredKinds.length > 0 ? (
        <ScrollArea.Autosize mah={384}>
          {filteredKinds.map((kind) => (
            <Menu.Item component={Link} href={`/manage/integrations/new/${kind}`} key={kind}>
              <Group>
                <IntegrationAvatar kind={kind} size="sm" />
                <Text size="sm">{getIntegrationName(kind)}</Text>
              </Group>
            </Menu.Item>
          ))}
        </ScrollArea.Autosize>
      ) : (
        <Menu.Item disabled>{t("common.noResults")}</Menu.Item>
      )}
    </Flex>
  );
};
