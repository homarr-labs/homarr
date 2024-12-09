import { Card, Stack, Text } from "@mantine/core";
import { IconFileImport, IconPlayerPlay } from "@tabler/icons-react";

import { getMantineColor } from "@homarr/common";

import { InitStartButton } from "./next-button";

export const InitStart = () => {
  return (
    <Card w={64 * 6} maw="90vw">
      <Stack>
        <Text>To get started, please select how you want to set up your Homarr instance.</Text>

        <InitStartButton
          preferredStep={undefined}
          icon={<IconPlayerPlay color={getMantineColor("green", 6)} size={16} stroke={1.5} />}
        >
          Start from scratch
        </InitStartButton>
        <InitStartButton
          preferredStep="import"
          icon={<IconFileImport color={getMantineColor("cyan", 6)} size={16} stroke={1.5} />}
        >
          Import from Homarr before 1.0
        </InitStartButton>
      </Stack>
    </Card>
  );
};
