import { Accordion, Card, Stack, Text } from "@mantine/core";
import { IconSubtask } from "@tabler/icons-react";

import type { AnyMappedTestConnectionError } from "@homarr/api";
import { getMantineColor } from "@homarr/common";

interface IntegrationTestConnectionErrorProps {
  error: AnyMappedTestConnectionError;
}

export const IntegrationTestConnectionError = ({ error }: IntegrationTestConnectionErrorProps) => {
  return (
    <Card withBorder style={{ borderColor: getMantineColor("red", 8) }}>
      <Stack>
        <Text fw={500} c="red.8">
          {error.name}: {error.message}
        </Text>

        {error.type}
        {error.data ? JSON.stringify(error.data, null, 2) : null}

        {error.cause ? (
          <Accordion variant="contained">
            <Accordion.Item value="cause">
              <Accordion.Control icon={<IconSubtask size={16} stroke={1.5} />}>
                Cause with more details
              </Accordion.Control>
              <Accordion.Panel>{JSON.stringify(error.cause, null, 2)}</Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        ) : null}
      </Stack>
    </Card>
  );
};
