"use client";

import { Anchor, Center, Stack, Text } from "@mantine/core";
import { IconServerOff } from "@tabler/icons-react";

import { Link } from "@homarr/ui";

export default function IncusErrorPage() {
  return (
    <Center>
      <Stack align="center">
        <IconServerOff size={48} stroke={1.5} />
        <Stack align="center" gap="xs">
          <Text size="lg" fw={500}>
            Failed to fetch Incus instances
          </Text>
          <Anchor size="sm" component={Link} href="/manage/tools/logs">
            Check logs
          </Anchor>
        </Stack>
      </Stack>
    </Center>
  );
}
