import { Button, Card, Group, Stack, Text } from "@mantine/core";

import { objectEntries } from "@homarr/common";
import type { MaybePromise } from "@homarr/common/types";

interface ImportSummaryCardProps {
  counts: { apps: number; boards: number; integrations: number; users: number };
  loading: boolean;
  onSubmit: () => MaybePromise<void>;
}

export const ImportSummaryCard = ({ counts, onSubmit, loading }: ImportSummaryCardProps) => {
  return (
    <Card w={64 * 12 + 8} maw="90vw">
      <Stack gap="sm">
        <Stack gap={0}>
          <Text fw={500}>Import summary</Text>
          <Text size="sm" c="gray.6">
            In the below summary you can see what will be imported
          </Text>
        </Stack>

        <Stack gap="xs">
          {objectEntries(counts).map(([key, count]) => (
            <Card withBorder p="sm">
              <Group justify="space-between" align="center">
                <Text fw={500} size="sm">
                  {key}
                </Text>
                <Text size="sm">{count}</Text>
              </Group>
            </Card>
          ))}
        </Stack>

        <Button onClick={onSubmit} loading={loading}>
          Confirm import and continue
        </Button>
      </Stack>
    </Card>
  );
};
