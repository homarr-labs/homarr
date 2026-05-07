import { Avatar, Badge, Group, Paper, Stack, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

import type { TracearrViolation } from "@homarr/integrations/types";
import { useScopedI18n } from "@homarr/translation/client";

export function ViolationsList({ violations }: { violations: TracearrViolation[] }) {
  const t = useScopedI18n("widget.tracearr");

  return (
    <Stack gap={4}>
      <Text size="xs" fw={600} c="dimmed" tt="uppercase">
        {t("violations.title")}
      </Text>
      {violations.length === 0 ? (
        <Text size="xs" c="dimmed" ta="center">
          {t("violations.empty")}
        </Text>
      ) : (
        <Stack gap="xs">
          {violations.map((violation) => (
            <Paper key={violation.id} p="xs" radius="lg" withBorder>
              <Group justify="space-between" wrap="nowrap">
                <Group gap="xs" wrap="nowrap" style={{ overflow: "hidden" }}>
                  <IconAlertTriangle
                    size={14}
                    color={
                      violation.severity === "high"
                        ? "var(--mantine-color-red-6)"
                        : violation.severity === "medium"
                          ? "var(--mantine-color-orange-6)"
                          : "var(--mantine-color-yellow-6)"
                    }
                  />
                  <Avatar src={violation.user.avatarUrl} alt={violation.user.username} radius="xl" size="sm" />
                  <Stack gap={0} style={{ overflow: "hidden" }}>
                    <Text size="sm" fw={500} lineClamp={1}>
                      {violation.user.username}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {t("violations.rule")}: {violation.rule.name}
                    </Text>
                  </Stack>
                </Group>
                <Stack gap={4} align="center">
                  <Badge
                    size="xs"
                    variant="light"
                    color={
                      violation.severity === "high" ? "red" : violation.severity === "medium" ? "orange" : "yellow"
                    }
                  >
                    {violation.severity}
                  </Badge>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {new Date(violation.createdAt).toLocaleDateString()}
                  </Text>
                </Stack>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
