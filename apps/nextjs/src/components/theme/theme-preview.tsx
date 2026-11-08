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

import { useI18n } from "@homarr/translation/client";

import { useThemePreview } from "./theme-preview-context";

export const ThemePreview = () => {
  const preview = useThemePreview();
  const t = useI18n("common.customTheme.studio");
  const common = useI18n("common");
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [checked, setChecked] = useState(true);
  const [slider, setSlider] = useState(65);
  useEffect(() => {
    setModal(false);
    setDrawer(false);
  }, [preview?.surface]);
  if (!preview) return <Text p="md">{t("loadingPreview")}</Text>;

  const board = (
    <Stack gap="md">
      <Paper p="md" withBorder>
        <Group justify="space-between">
          <Group>
            <Avatar color="primaryColor">H</Avatar>
            <Title order={3}>{t("sampleBoard")}</Title>
          </Group>
          <Group gap="xs">
            <Tooltip label={t("sampleSettings")}>
              <ActionIcon aria-label={t("sampleSettings")} variant="default" onClick={() => setDrawer(true)}>
                <IconSettings size={18} />
              </ActionIcon>
            </Tooltip>
            <Button onClick={() => setModal(true)}>{t("openModal")}</Button>
          </Group>
        </Group>
      </Paper>
      <TextInput placeholder={t("sampleSearch")} aria-label={t("sampleSearch")} />
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
              {t("sampleOnline")}
            </Text>
          </Card>
        ))}
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Card>
          <Stack>
            <Group justify="space-between">
              <Title order={4}>{t("sampleHealth")}</Title>
              <Badge color="teal">{t("sampleHealthy")}</Badge>
            </Group>
            <Text size="sm">
              {t("sampleCpu")}: {slider}%
            </Text>
            <Progress value={slider} />
            <Slider value={slider} onChange={setSlider} aria-label={t("sampleCpu")} />
            <Text size="sm" c="dimmed">
              {t("sampleDisk")}: 428 GB / 1 TB
            </Text>
            <Progress value={43} color="secondaryColor" />
          </Stack>
        </Card>
        <Card>
          <Stack>
            <Title order={4}>{t("sampleActivity")}</Title>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("sampleService")}</Table.Th>
                  <Table.Th>{t("sampleStatus")}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td>Home Assistant</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{t("sampleOnline")}</Badge>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Plex</Table.Td>
                  <Table.Td>
                    <Badge color="yellow" variant="light">
                      {t("sampleUpdating")}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td>Sonarr</Table.Td>
                  <Table.Td>
                    <Badge color="red" variant="light">
                      {t("sampleOffline")}
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
            {t("sampleHeading")} {order}
          </Title>
        ))}
        <Divider />
        {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => (
          <Text key={size} size={size}>
            {size.toUpperCase()} · {t("sampleText")}
          </Text>
        ))}
        <Text c="dimmed">{t("sampleMuted")}</Text>
        <Text ff="monospace">const homarr = &#123; theme: &quot;custom&quot; &#125;;</Text>
      </Stack>
    </Card>
  );

  const components = (
    <Stack>
      <Card>
        <Stack>
          <Title order={3}>{t("buttons")}</Title>
          <Group>
            <Button>{common("action.save")}</Button>
            <Button variant="light">{t("lightVariant")}</Button>
            <Button variant="outline">{t("outlineVariant")}</Button>
            <Button variant="default">{common("action.cancel")}</Button>
            <Button disabled>{t("disabled")}</Button>
            <Button loading>{t("loading")}</Button>
            <Tooltip label={t("sampleTooltip")} events={{ hover: true, focus: true, touch: true }}>
              <Button variant="default">{t("previewTooltip")}</Button>
            </Tooltip>
            <Menu>
              <Menu.Target>
                <ActionIcon variant="default" aria-label={t("openMenu")}>
                  <IconDots size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item>{common("action.edit")}</Menu.Item>
                <Menu.Item color="red">{common("action.delete")}</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
          <Group>
            <Badge>{t("badge")}</Badge>
            <Badge variant="light">{t("lightVariant")}</Badge>
            <Badge color="red">{t("error")}</Badge>
          </Group>
        </Stack>
      </Card>
      <Card>
        <Stack>
          <Title order={3}>{t("inputs")}</Title>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput label={t("inputDefault")} placeholder={t("sampleSearch")} />
            <TextInput label={t("inputError")} error={t("sampleError")} defaultValue="invalid" />
            <Select label={t("select")} data={["Homarr", "Nord", "Dracula"]} defaultValue="Homarr" />
            <TextInput label={t("disabled")} disabled defaultValue="Homarr" />
          </SimpleGrid>
          <Textarea label={t("textarea")} placeholder={t("sampleText")} />
          <Group>
            <Checkbox
              label={t("checkbox")}
              checked={checked}
              onChange={(event) => setChecked(event.currentTarget.checked)}
            />
            <Switch label={t("switch")} defaultChecked />
          </Group>
        </Stack>
      </Card>
      <Tabs defaultValue="one">
        <Tabs.List>
          <Tabs.Tab value="one">{t("tabs")}</Tabs.Tab>
          <Tabs.Tab value="two">{t("secondTab")}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one" pt="md">
          <Alert>{t("sampleNotice")}</Alert>
        </Tabs.Panel>
        <Tabs.Panel value="two" pt="md">
          <Paper p="md" shadow="md">
            {t("sampleText")}
          </Paper>
        </Tabs.Panel>
      </Tabs>
      <Alert color="red" title={t("error")}>
        {t("sampleError")}
      </Alert>
      <Notification title={t("notification")} withCloseButton={false}>
        {t("sampleNotice")}
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
          <Button onClick={() => setModal(true)}>{t("openModal")}</Button>
          <Button variant="default" onClick={() => setDrawer(true)}>
            {t("openDrawer")}
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
        title={t("sampleModal")}
        closeButtonProps={{ "aria-label": common("action.close") }}
      >
        <Stack>
          <Text>{t("modalHint")}</Text>
          <TextInput label={t("inputDefault")} />
          <Group justify="end">
            <Button variant="default" onClick={() => setModal(false)}>
              {common("action.cancel")}
            </Button>
            <Button onClick={() => setModal(false)}>{common("action.save")}</Button>
          </Group>
        </Stack>
      </Modal>
      <Drawer
        opened={drawer}
        onClose={() => setDrawer(false)}
        title={t("sampleDrawer")}
        closeButtonProps={{ "aria-label": common("action.close") }}
      >
        <Stack>
          <Text>{t("modalHint")}</Text>
          <Switch label={t("switch")} defaultChecked />
          <Button onClick={() => setDrawer(false)}>{common("action.close")}</Button>
        </Stack>
      </Drawer>
    </Box>
  );
};
