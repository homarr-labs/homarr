import { Box, Group, HoverCard, Progress, Stack, Text, UnstyledButton } from "@mantine/core";

import type { BeszelSystemRow } from "./types";
import { thresholdColor } from "./colors";
import { formatPercent, getProgressTrackSize } from "./format";

interface DiskUsageProps {
  system: BeszelSystemRow;
  fontSize: string;
  progressSize: "xs" | "sm";
  valueMiw: number;
  valueGap?: number;
}

const mountLabel = (path: string) =>
  path === "/" ? "ROOT" : (path.split("/").filter(Boolean).at(-1) ?? path).toUpperCase();
const severityColor = (value: number) => `var(--mantine-color-${thresholdColor(value)}-6)`;

export const DiskUsage = ({ system, fontSize, progressSize, valueMiw, valueGap = 6 }: DiskUsageProps) => {
  const filesystems = Object.entries(system.extraFilesystems).filter(([path]) => path !== "/");
  const trackSize = getProgressTrackSize(progressSize);
  const dotSize = progressSize === "xs" ? 2 : 3;
  const dotGap = 2;

  return (
    <Group gap={valueGap} wrap="nowrap" style={{ flex: 1, minWidth: 0, marginLeft: "auto" }}>
      <Text size={fontSize} fw={500} w={valueMiw} ta="left" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
        {formatPercent(system.disk)}
      </Text>
      <HoverCard
        position="right"
        withArrow
        shadow="md"
        openDelay={200}
        closeDelay={100}
        disabled={filesystems.length === 0}
      >
        <HoverCard.Target>
          {filesystems.length > 0 ? (
            <UnstyledButton
              aria-label={`Show usage for ${filesystems.length + 1} filesystems`}
              style={{
                display: "flex",
                alignItems: "center",
                flex: 1,
                minWidth: 24,
                cursor: "pointer",
              }}
            >
              <Box pos="relative" style={{ flex: 1, minWidth: 24 }}>
                <Progress value={system.disk} color={thresholdColor(system.disk)} size={trackSize} />
                <Group
                  gap={dotGap}
                  wrap="nowrap"
                  aria-hidden
                  pos="absolute"
                  top="50%"
                  right={Math.max(2, dotGap)}
                  style={{ transform: "translateY(-50%)" }}
                >
                  {filesystems.map(([path, value]) => (
                    <Box
                      key={path}
                      w={dotSize}
                      h={dotSize}
                      style={{
                        borderRadius: "50%",
                        backgroundColor: severityColor(value),
                        boxShadow: "0 0 0 0.5px var(--mantine-color-body)",
                        flex: "0 0 auto",
                      }}
                    />
                  ))}
                </Group>
              </Box>
            </UnstyledButton>
          ) : (
            <Box style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 24 }}>
              <Box pos="relative" style={{ flex: 1, minWidth: 24 }}>
                <Progress value={system.disk} color={thresholdColor(system.disk)} size={trackSize} />
              </Box>
            </Box>
          )}
        </HoverCard.Target>
        <HoverCard.Dropdown p={8}>
          <Stack gap={6} miw={145}>
            {[["/", system.disk] as const, ...filesystems].map(([path, value]) => (
              <Stack key={path} gap={1}>
                <Text size="10px" c="dimmed" fw={500} lh={1.2}>
                  {mountLabel(path)}
                </Text>
                <Group gap={8} wrap="nowrap">
                  <Text size="sm" fw={600} miw={48} lh={1.25}>
                    {formatPercent(value)}
                  </Text>
                  <Progress value={value} color={thresholdColor(value)} size="xs" style={{ flex: 1 }} />
                </Group>
              </Stack>
            ))}
          </Stack>
        </HoverCard.Dropdown>
      </HoverCard>
    </Group>
  );
};
