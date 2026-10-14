import { Card, Divider, Stack, Title } from "@mantine/core";

import type { SectionCardProps } from "./contracts";

export const SectionCard = ({ title, children }: SectionCardProps) => {
  return (
    <Card withBorder bg="transparent">
      <Stack gap="md">
        <Title order={3}>{title}</Title>
        <Divider />
        {children}
      </Stack>
    </Card>
  );
};
