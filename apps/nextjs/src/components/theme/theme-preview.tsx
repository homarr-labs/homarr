"use client";

import { useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Drawer,
  Group,
  Menu,
  Modal,
  Notification,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { IconCloud, IconDots, IconPhoto, IconPlayerPlay, IconServer, IconSettings } from "@tabler/icons-react";

import { useThemePreview } from "./theme-preview-context";

export const ThemePreview = () => {
  const preview = useThemePreview();
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [checked, setChecked] = useState(true);
  const [slider, setSlider] = useState(65);
  useEffect(() => {
    setModal(false);
    setDrawer(false);
  }, [preview?.surface]);
  if (!preview) return <Text p="md">{"Loading preview…"}</Text>;

  const board = (
    <Stack gap="md">
      <Paper p="md" withBorder>
        <Group justify="space-between">
          <Group>
            <Avatar color="primaryColor">H</Avatar>
            <Title order={3}>{"Sample board"}</Title>
          </Group>
          <Group gap="xs">
            <Tooltip label={"Settings"}>
              <ActionIcon aria-label={"Settings"} variant="default" onClick={() => setDrawer(true)}>
                <IconSettings size={18} />
              </ActionIcon>
            </Tooltip>
            <Button onClick={() => setModal(true)}>{"Open modal"}</Button>
          </Group>
        </Group>
      </Paper>
      <TextInput placeholder={"Search apps and services"} aria-label={"Search apps and services"} />
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        {[
          { name: "Jellyfin", Icon: IconPlayerPlay },
          { name: "Immich", Icon: IconPhoto },
          { name: "Nextcloud", Icon: IconCloud },
          { name: "Proxmox", Icon: IconServer },
        ].map(({ name, Icon }) => (
          <Card key={name}>
            <Group gap="sm">
              <Icon size={24} color="var(--mantine-primary-color-filled)" />
              <Text fw={600}>{name}</Text>
            </Group>
            <Text size="xs" c="dimmed" mt="sm">
              {"Online"}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card>
          <Stack>
            <Group justify="space-between">
              <Title order={4}>{"System health"}</Title>
              <Badge color="teal">{"Healthy"}</Badge>
            </Group>
            <Text size="sm">
              {"CPU"}: {slider}%
            </Text>
            <Progress value={slider} />
            <Slider value={slider} onChange={setSlider} aria-label={"CPU"} />
            <Text size="sm" c="dimmed">
              {"Storage"}: 428 GB / 1 TB
            </Text>
            <Progress value={43} color="secondaryColor" />
          </Stack>
        </Card>
        <Card>
          <Stack>
            <Title order={4}>{"Services"}</Title>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{"Service"}</Table.Th>
                  <Table.Th>{"Status"}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>Home Assistant</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{"Online"}</Badge>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Plex</Table.Td>
                  <Table.Td>
                    <Badge color="yellow" variant="light">
                      {"Updating"}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Sonarr</Table.Td>
                  <Table.Td>
                    <Badge color="red" variant="light">
                      {"Offline"}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );

  const typography = (
    <Card>
      <Stack>
        {([1, 2, 3, 4, 5, 6] as const).map((order) => (
          <Title key={order} order={order}>
            {"Heading"} {order}
          </Title>
        ))}
        <Divider />
        {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
          <Text key={size} size={size}>
            {size.toUpperCase()} · {"Everything in its place. Make your dashboard feel like home."}
          </Text>
        ))}
        <Text c="dimmed">{"Muted text for descriptions and secondary information."}</Text>
        <Text ff="monospace">const homarr = &#123; theme: &quot;custom&quot; &#125;;</Text>
      </Stack>
    </Card>
  );

  const components = (
    <Stack>
      <Card>
        <Stack>
          <Title order={3}>{"Buttons & badges"}</Title>
          <Group>
            <Button>{"Save"}</Button>
            <Button variant="light">{"Light"}</Button>
            <Button variant="outline">{"Outline"}</Button>
            <Button variant="default">{"Cancel"}</Button>
            <Button disabled>{"Disabled"}</Button>
            <Button loading>{"Loading"}</Button>
            <Tooltip label={"Tooltip preview"} events={{ hover: true, focus: true, touch: true }}>
              <Button variant="default">{"Preview tooltip"}</Button>
            </Tooltip>
            <Menu>
              <Menu.Target>
                <ActionIcon variant="default" aria-label={"Open menu"}>
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item>{"Edit"}</Menu.Item>
                <Menu.Item color="red">{"Delete"}</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
          <Group>
            <Badge>{"Badge"}</Badge>
            <Badge variant="light">{"Light"}</Badge>
            <Badge color="red">{"Error"}</Badge>
          </Group>
        </Stack>
      </Card>
      <Card>
        <Stack>
          <Title order={3}>{"Inputs"}</Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={"Default input"} placeholder={"Search apps and services"} />
            <TextInput label={"Input with error"} error={"Check this value and try again."} defaultValue="invalid" />
            <Select label={"Select"} data={["Homarr", "Nord", "Dracula"]} defaultValue="Homarr" />
            <TextInput label={"Disabled"} disabled defaultValue="Homarr" />
          </SimpleGrid>
          <Textarea label={"Text area"} placeholder={"Everything in its place. Make your dashboard feel like home."} />
          <Group>
            <Checkbox
              label={"Checkbox"}
              checked={checked}
              onChange={(event) => setChecked(event.currentTarget.checked)}
            />
            <Switch label={"Switch"} defaultChecked />
          </Group>
        </Stack>
      </Card>
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">{"Tabs"}</Tabs.Tab>
          <Tabs.Tab value="two">{"Second tab"}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one" pt="md">
          <Alert>{"Your theme applies to alerts, menus, forms, and other surfaces."}</Alert>
        </Tabs.Panel>
        <Tabs.Panel value="two" pt="md">
          <Paper p="md" shadow="md">
            {"Everything in its place. Make your dashboard feel like home."}
          </Paper>
        </Tabs.Panel>
      </Tabs>
      <Alert color="red" title={"Error"}>
        {"Check this value and try again."}
      </Alert>
      <Notification title={"Notification"} withCloseButton={false}>
        {"Your theme applies to alerts, menus, forms, and other surfaces."}
      </Notification>
    </Stack>
  );

  let content = board;
  if (preview.surface === "components") content = components;
  if (preview.surface === "typography") content = typography;
  if (preview.surface === "overlays")
    content = (
      <Stack>
        <Group>
          <Button onClick={() => setModal(true)}>{"Open modal"}</Button>
          <Button variant="default" onClick={() => setDrawer(true)}>
            {"Open drawer"}
          </Button>
        </Group>
        {board}
      </Stack>
    );

  return (
    <Box p="md" mih="100vh" bg="var(--mantine-color-body)" c="var(--mantine-color-text)">
      {content}
      <Modal
        opened={modal}
        onClose={() => setModal(false)}
        title={"Modal preview"}
        closeButtonProps={{ "aria-label": "Close" }}
      >
        <Stack>
          <Text>
            {"Change the backdrop blur, opacity, shadow, or roundness in the editor while this panel is open."}
          </Text>
          <TextInput label={"Default input"} />
          <Group justify="end">
            <Button variant="default" onClick={() => setModal(false)}>
              {"Cancel"}
            </Button>
            <Button onClick={() => setModal(false)}>{"Save"}</Button>
          </Group>
        </Stack>
      </Modal>
      <Drawer
        opened={drawer}
        onClose={() => setDrawer(false)}
        title={"Drawer preview"}
        closeButtonProps={{ "aria-label": "Close" }}
      >
        <Stack>
          <Text>
            {"Change the backdrop blur, opacity, shadow, or roundness in the editor while this panel is open."}
          </Text>
          <Switch label={"Switch"} defaultChecked />
          <Button onClick={() => setDrawer(false)}>{"Close"}</Button>
        </Stack>
      </Drawer>
    </Box>
  );
};
