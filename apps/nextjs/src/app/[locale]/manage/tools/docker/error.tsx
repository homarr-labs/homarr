"use client";

import { Anchor, Center, Stack, Text } from "@mantine/core";
import { IconShipOff } from "@tabler/icons-react";

import { useI18n } from "@homarr/translation/client";
import { Link } from "@homarr/ui";

export default function DockerErrorPage() {
  const tDocker = useI18n("docker");
  const tCommon = useI18n("common");

  return (
    <Center>
      <Stack align="center">
        <IconShipOff size={48} stroke={1.5} />
        <Stack align="center" gap="xs">
          <Text size="lg" fw={500}>
            {tDocker("error.internalServerError")}
          </Text>
          <Anchor size="sm" component={Link} href="/manage/tools/logs">
            {tCommon("action.checkLogs")}
          </Anchor>
        </Stack>
      </Stack>
    </Center>
  );
}
