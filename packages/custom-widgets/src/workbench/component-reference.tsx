import { useMemo, useState } from "react";
import { Badge, Button, Group, Popover, ScrollArea, Stack, Text, TextInput } from "@mantine/core";
import { IconComponents, IconSearch } from "@tabler/icons-react";

import { enabledCustomJsxComponents } from "../core/component-registry";

export interface ComponentReferenceMessages {
  action: string;
  search: string;
  empty: string;
  count(count: number): string;
}

export function ComponentReference({ messages }: { messages: ComponentReferenceMessages }) {
  const [query, setQuery] = useState("");
  const components = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return enabledCustomJsxComponents.filter(
      (component) =>
        normalized.length === 0 ||
        component.name.toLocaleLowerCase().includes(normalized) ||
        component.category.toLocaleLowerCase().includes(normalized),
    );
  }, [query]);
  return (
    <Popover width={320} position="bottom-end" withinPortal shadow="md">
      <Popover.Target>
        <Button type="button" size="compact-xs" variant="subtle" leftSection={<IconComponents size={14} />}>
          {messages.action}
        </Button>
      </Popover.Target>
      <Popover.Dropdown p="xs">
        <Stack gap="xs">
          <TextInput
            size="xs"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={messages.search}
            aria-label={messages.search}
            leftSection={<IconSearch size={14} />}
          />
          <ScrollArea.Autosize mah={300} type="auto">
            <Stack gap={4}>
              {components.map((component) => (
                <Group key={component.name} justify="space-between" wrap="nowrap" py={3} px={4}>
                  <Text size="xs" ff="monospace" fw={600}>
                    {component.name}
                  </Text>
                  <Badge size="xs" variant="light" color={component.safety === "wrapped" ? "yellow" : "gray"}>
                    {component.category}
                  </Badge>
                </Group>
              ))}
              {components.length === 0 && (
                <Text size="xs" c="dimmed" ta="center" py="md">
                  {messages.empty}
                </Text>
              )}
            </Stack>
          </ScrollArea.Autosize>
          <Text size="xs" c="dimmed">
            {messages.count(enabledCustomJsxComponents.length)}
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
