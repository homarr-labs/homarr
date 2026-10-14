import { Anchor, Card, Group, SimpleGrid, Stack, Text } from "@mantine/core";

import type { CertificateDetailsViewProps } from "./contracts";

export const CertificateDetailsView = ({
  subject,
  issuer,
  validFrom,
  validTo,
  serialNumber,
  fingerprint,
  copy,
  onOpenPem,
}: CertificateDetailsViewProps) => (
  <Card>
    <Text fw={500}>{copy.title}</Text>
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {copy.description}
      </Text>
      <Anchor size="sm" ta="start" component="button" type="button" onClick={onOpenPem}>
        {copy.contentAction}
      </Anchor>
    </Group>

    <SimpleGrid cols={{ base: 1, md: 2 }} mt="md">
      <Stack gap={0}>
        <Text size="xs" c="dimmed">
          {copy.subject}
        </Text>
        <Text size="sm">{subject}</Text>
      </Stack>
      <Stack gap={0}>
        <Text size="xs" c="dimmed">
          {copy.issuer}
        </Text>
        <Text size="sm">{issuer}</Text>
      </Stack>
      <Stack gap={0}>
        <Text size="xs" c="dimmed">
          {copy.validFrom}
        </Text>
        <Text size="sm">{validFrom}</Text>
      </Stack>
      <Stack gap={0}>
        <Text size="xs" c="dimmed">
          {copy.validTo}
        </Text>
        <Text size="sm">{validTo}</Text>
      </Stack>
      <Stack gap={0}>
        <Text size="xs" c="dimmed">
          {copy.serialNumber}
        </Text>
        <Text size="sm">{serialNumber}</Text>
      </Stack>
    </SimpleGrid>

    <SimpleGrid cols={1} mt="md">
      <Stack gap={0}>
        <Text size="xs" c="dimmed">
          {copy.fingerprint}
        </Text>
        <Text size="sm">{fingerprint}</Text>
      </Stack>
    </SimpleGrid>
  </Card>
);
