import { Button, Card, Stack, Text } from "@mantine/core";
import { IconDatabaseImport, IconFileImport, IconPlayerPlay } from "@tabler/icons-react";

import { getMantineColor } from "@homarr/common";

export const InitStart = () => {
  return (
    <Card w={64 * 6} maw="90vw">
      <Stack>
        <Text>To get started, please select how you want to set up your Homarr instance.</Text>

        <Button
          variant="default"
          leftSection={<IconPlayerPlay color={getMantineColor("green", 6)} size={16} stroke={1.5} />}
        >
          Start from scratch
        </Button>
        <Button
          variant="default"
          leftSection={<IconFileImport color={getMantineColor("cyan", 6)} size={16} stroke={1.5} />}
        >
          Import from Homarr before 1.0
        </Button>
        <Button
          variant="default"
          leftSection={<IconDatabaseImport color={getMantineColor("yellow", 6)} size={16} stroke={1.5} />}
          disabled
          display="none"
        >
          Import from Homarr after 1.0
        </Button>
      </Stack>
    </Card>
  );
};
