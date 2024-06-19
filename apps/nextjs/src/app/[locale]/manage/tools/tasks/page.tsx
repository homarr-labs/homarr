import { getScopedI18n } from "@homarr/translation/server";
import { Box, Card, Stack, Title, Text, Group, ActionIcon } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import { createMetaTitle } from "~/metadata";

export async function generateMetadata() {
  const t = await getScopedI18n("management");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default function TasksPage() {
  return (
    <Box>
      <Title mb={"md"}>Tasks</Title>
      <Stack>
        <Card>
          <Group justify={"space-between"} gap={"md"}>
            <Stack gap={0}>
              <Text>Icon Repositories</Text>
              <Text size={"sm"} c={"dimmed"}>Last run 6 hours ago</Text>
            </Stack>

            <ActionIcon variant={"default"} size={"xl"} radius={"xl"}>
              <IconPlayerPlay stroke={1.5}/>
            </ActionIcon>
          </Group>
        </Card>
        <Card>
          <Group justify={"space-between"} gap={"md"}>
            <Stack gap={0}>
              <Text>Server Analytics</Text>
              <Text size={"sm"} c={"dimmed"}>Currently running</Text>
            </Stack>

            <ActionIcon variant={"default"} size={"xl"} radius={"xl"} disabled>
              <IconPlayerPlay stroke={1.5}/>
            </ActionIcon>
          </Group>
        </Card>
      </Stack>
    </Box>
  );
}