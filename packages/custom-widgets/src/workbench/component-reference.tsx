import { useMemo, useState } from "react";
import { Accordion, Badge, Button, Code, Group, Popover, ScrollArea, Stack, Text, TextInput } from "@mantine/core";
import { IconComponents, IconSearch } from "@tabler/icons-react";

import { customJsxAuthoringCatalog, getCustomJsxComponentProps } from "../core/component-catalog";

export interface ComponentReferenceMessages {
  action: string;
  search: string;
  empty: string;
  count(count: number): string;
}

const enabledComponents = customJsxAuthoringCatalog.components.filter((component) => component.safety !== "denied");

export function ComponentReference({ messages }: { messages: ComponentReferenceMessages }) {
  const [query, setQuery] = useState("");
  const components = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return enabledComponents;
    return enabledComponents.filter((component) =>
      [
        component.name,
        component.package,
        component.category,
        component.description ?? "",
        ...getCustomJsxComponentProps(component.name).map(({ name, type }) => `${name} ${type}`),
      ].some((value) => value.toLocaleLowerCase().includes(normalized)),
    );
  }, [query]);

  return (
    <Popover width={560} position="bottom-end" withinPortal shadow="md">
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
          <ScrollArea.Autosize mah={440} type="auto">
            <Accordion variant="separated" radius="sm">
              {components.map((component) => {
                const props = getCustomJsxComponentProps(component.name);
                return (
                  <Accordion.Item key={component.name} value={component.name}>
                    <Accordion.Control>
                      <Group justify="space-between" wrap="nowrap" pr="xs">
                        <Code>{component.name}</Code>
                        <Group gap={4} wrap="nowrap">
                          {component.bind && <Badge size="xs">bind: {component.bind.type}</Badge>}
                          <Badge size="xs" variant="light" color={component.safety === "wrapped" ? "yellow" : "gray"}>
                            {component.category}
                          </Badge>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap={6}>
                        {component.description && <Text size="xs">{component.description}</Text>}
                        <Text size="xs" c="dimmed">
                          {component.package} · {props.length} props
                        </Text>
                        {component.blockedProps.map((prop) => (
                          <Text key={prop.name} size="xs" c="red">
                            {prop.name}: {prop.reason}
                          </Text>
                        ))}
                        <ScrollArea.Autosize mah={200} type="auto">
                          <Stack gap={3}>
                            {props.map((prop) => (
                              <Group key={prop.name} gap="xs" justify="space-between" wrap="nowrap">
                                <Code>{prop.name}</Code>
                                <Text size="xs" ff="monospace" c="dimmed" ta="right">
                                  {prop.type}
                                  {prop.required ? " · required" : ""}
                                </Text>
                              </Group>
                            ))}
                          </Stack>
                        </ScrollArea.Autosize>
                        {component.accessibilityRequirements.map((requirement) => (
                          <Text key={requirement} size="xs" c="dimmed">
                            {requirement}
                          </Text>
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
            {components.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py="md">
                {messages.empty}
              </Text>
            )}
          </ScrollArea.Autosize>
          <Text size="xs" c="dimmed">
            {messages.count(enabledComponents.length)} · Mantine {customJsxAuthoringCatalog.mantineVersion}
          </Text>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
