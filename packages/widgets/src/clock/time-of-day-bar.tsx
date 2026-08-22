import { Badge, Box, Group, Progress, Stack, Text } from "@mantine/core";

import { useI18n } from "@homarr/translation/client";

import type { TimeOfDayPhase } from "./world-clock";

interface TimeOfDayBarProps {
  minuteOfDay: number;
  phase: TimeOfDayPhase;
  showLegend?: boolean;
  showTicks?: boolean;
  label: string;
}

const phaseSections = [
  { key: "nightStart", value: 20.833, color: "indigo.8" },
  { key: "dawn", value: 12.5, color: "orange.6" },
  { key: "day", value: 41.667, color: "cyan.6" },
  { key: "dusk", value: 12.5, color: "grape.6" },
  { key: "nightEnd", value: 12.5, color: "indigo.8" },
] as const;

const phaseLegend = [
  { key: "night", color: "indigo.8" },
  { key: "dawn", color: "orange.6" },
  { key: "day", color: "cyan.6" },
  { key: "dusk", color: "grape.6" },
] as const;

const timeTicks = ["midnight", "morning", "noon", "evening", "end"] as const;

export const TimeOfDayBar = ({
  minuteOfDay,
  phase,
  showLegend = false,
  showTicks = false,
  label,
}: TimeOfDayBarProps) => {
  const t = useI18n("widget.clock");
  const progress = Math.max(0, Math.min(100, (minuteOfDay / 1440) * 100));
  const remainingMinutes = Math.max(0, 1440 - Math.floor(minuteOfDay));
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainder = remainingMinutes % 60;

  return (
    <Stack component="figure" gap={6} m={0} aria-label={label}>
      <Group justify="space-between" align="center" gap="xs" wrap="nowrap">
        <Badge color={getPhaseColor(phase)} variant="dot" size="sm">
          {t(`worldClock.phase.${phase}`)}
        </Badge>
        <Text size="xs" c="dimmed" ta="right">
          {t("worldClock.dayProgress", {
            percent: Math.round(progress),
            hours: remainingHours,
            minutes: remainder.toString().padStart(2, "0"),
          })}
        </Text>
      </Group>
      <Box pos="relative">
        <Progress.Root size="md" radius="xl" aria-hidden>
          {phaseSections.map((section) => (
            <Progress.Section key={section.key} value={section.value} color={section.color} withAria={false} />
          ))}
        </Progress.Root>
        <Box
          pos="absolute"
          top="50%"
          left={`${progress}%`}
          w={4}
          h={24}
          bg="var(--mantine-color-text)"
          style={{ borderRadius: "var(--mantine-radius-xl)", transform: "translate(-50%, -50%)" }}
        />
      </Box>
      {showTicks && (
        <Group justify="space-between" wrap="nowrap">
          {timeTicks.map((tick) => (
            <Text key={tick} size="xs" c="dimmed" aria-hidden>
              {t(`worldClock.tick.${tick}`)}
            </Text>
          ))}
        </Group>
      )}
      {showLegend && (
        <Group gap="md" mt={4} align="center" wrap="wrap">
          <Text size="xs" fw={600}>
            {t("worldClock.phaseLegend")}
          </Text>
          {phaseLegend.map((item) => (
            <Group key={item.key} gap={6} wrap="nowrap">
              <Box w={9} h={9} bg={item.color} style={{ borderRadius: "var(--mantine-radius-xl)" }} />
              <Text size="xs" c="dimmed">
                {t(`worldClock.phase.${item.key}`)} · {t(`worldClock.phaseRange.${item.key}`)}
              </Text>
            </Group>
          ))}
        </Group>
      )}
    </Stack>
  );
};

const getPhaseColor = (phase: TimeOfDayPhase) => {
  if (phase === "night") return "indigo";
  if (phase === "dawn") return "orange";
  if (phase === "day") return "cyan";
  return "grape";
};
