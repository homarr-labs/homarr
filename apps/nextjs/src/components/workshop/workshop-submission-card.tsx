"use client";

import type { ReactNode } from "react";
import { Badge, Box, Card, Group, Image, Stack, Text, Tooltip } from "@mantine/core";
import { IconAlertTriangle, IconFlag, IconPhoto } from "@tabler/icons-react";

import { useScopedI18n } from "@homarr/translation/client";
import type { WorkshopBackend } from "@homarr/workshop/backend";
import type { WorkshopSubmissionSummary } from "@homarr/workshop/schema";

/** Aspect-ratio-preserving preview strip. Large enough to actually judge a widget by. */
const PREVIEW_HEIGHT = 168;

interface WorkshopSubmissionCardProps {
  client: WorkshopBackend;
  item: WorkshopSubmissionSummary;
  /** Rendered in the card footer, e.g. score, external link and the install button. */
  actions: ReactNode;
}

export function WorkshopSubmissionCard({ client, item, actions }: WorkshopSubmissionCardProps) {
  const t = useScopedI18n("workshop");
  const screenshot = item.screenshots[0];

  return (
    <Card component="li" withBorder radius="md" padding="md" h="100%">
      <Card.Section>
        {screenshot ? (
          <Image
            src={client.fileUrl(item.id, screenshot, "600x400")}
            h={PREVIEW_HEIGHT}
            fit="cover"
            alt={t("screenshotAlt", { title: item.title, count: 1 })}
          />
        ) : (
          <Box
            h={PREVIEW_HEIGHT}
            bg="var(--mantine-color-default-hover)"
            style={{ display: "grid", placeItems: "center" }}
          >
            <Stack gap={4} align="center">
              <IconPhoto size={28} stroke={1.5} opacity={0.5} />
              <Text size="xs" c="dimmed" fw={600}>
                {item.type === "customCss" ? "CSS" : "JSX"}
              </Text>
            </Stack>
          </Box>
        )}
      </Card.Section>

      <Stack gap="xs" mt="md" style={{ flex: 1 }}>
        <Group gap={6} wrap="wrap">
          {item.outdated && (
            <Badge size="sm" variant="light" color="yellow" leftSection={<IconAlertTriangle size={11} />}>
              {t("outdated")}
            </Badge>
          )}
          {item.reportCount > 0 && (
            <Tooltip label={t("reportWarning", { count: item.reportCount })} multiline maw={320}>
              <Badge size="sm" variant="light" color="red" leftSection={<IconFlag size={11} />}>
                {t("reportCount", { count: item.reportCount })}
              </Badge>
            </Tooltip>
          )}
        </Group>
        <Box>
          <Text fw={600} lineClamp={1}>
            {item.title}
          </Text>
          <Text size="xs" c="dimmed">
            {t("author", { name: item.authorName || t("communityMember") })}
          </Text>
        </Box>
        <Text size="sm" c="dimmed" lineClamp={2} style={{ flex: 1 }}>
          {item.description || t("noDescription")}
        </Text>
      </Stack>

      <Group justify="space-between" align="center" gap="xs" wrap="nowrap" mt="md">
        {actions}
      </Group>
    </Card>
  );
}
