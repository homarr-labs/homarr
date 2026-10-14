"use client";

import { Badge, Box, Card, Group, Image, Stack, Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconFlag, IconPhoto } from "@tabler/icons-react";

import type { WorkshopSubmissionCardViewProps } from "./contracts";

const PREVIEW_HEIGHT = 168;

export function WorkshopSubmissionCardView({
  title,
  type,
  authorLabel,
  description,
  outdated,
  reportCount,
  screenshot,
  outdatedLabel,
  reportWarningLabel,
  reportCountLabel,
  actions,
}: WorkshopSubmissionCardViewProps) {
  return (
    <Card component="li" withBorder radius="md" padding="md" h="100%">
      <Card.Section>
        {screenshot ? (
          <Image src={screenshot.url} h={PREVIEW_HEIGHT} fit="cover" alt={screenshot.alt} />
        ) : (
          <Box
            h={PREVIEW_HEIGHT}
            bg="var(--mantine-color-default-hover)"
            style={{ display: "grid", placeItems: "center" }}
          >
            <Stack gap={4} align="center">
              <IconPhoto size={28} stroke={1.5} opacity={0.5} />
              <Text size="xs" c="dimmed" fw={600}>
                {type === "customCss" ? "CSS" : "JSX"}
              </Text>
            </Stack>
          </Box>
        )}
      </Card.Section>

      <Stack gap="xs" mt="md" style={{ flex: 1 }}>
        <Group gap={6} wrap="wrap">
          {outdated && (
            <Badge size="sm" variant="light" color="yellow" leftSection={<IconAlertTriangle size={11} />}>
              {outdatedLabel}
            </Badge>
          )}
          {reportCount > 0 && (
            <Tooltip label={reportWarningLabel} multiline maw={320}>
              <Badge size="sm" variant="light" color="red" leftSection={<IconFlag size={11} />}>
                {reportCountLabel}
              </Badge>
            </Tooltip>
          )}
        </Group>
        <Box>
          <Text fw={600} lineClamp={1}>
            {title}
          </Text>
          <Text size="xs" c="dimmed">
            {authorLabel}
          </Text>
        </Box>
        <Text size="sm" c="dimmed" lineClamp={2} style={{ flex: 1 }}>
          {description}
        </Text>
      </Stack>

      <Group justify="space-between" align="center" gap="xs" wrap="nowrap" mt="md">
        {actions}
      </Group>
    </Card>
  );
}
