"use client";

import type { CSSProperties } from "react";
import { Badge, Box, Flex, Group, Progress, Stack, Text, Tooltip, VisuallyHidden } from "@mantine/core";
import { IconCube, IconUsersGroup } from "@tabler/icons-react";

import { formatNumber } from "@homarr/common/number";

export interface MinecraftServerStatusNativeViewProps {
  data: { online: false } | { online: true; players: { online: number; max: number }; icon?: string };
  options: { title: string; domain: string; isBedrockServer: boolean };
  width: number;
  height: number;
  displayMode?: "compact" | "advanced";
  labels: { online: string; offline: string; bedrock: string };
  zoomCompensatedSize: (size: number) => CSSProperties;
}

export function MinecraftServerStatusNativeView({
  data,
  labels,
  zoomCompensatedSize,
  options,
  width,
  height,
  displayMode,
}: MinecraftServerStatusNativeViewProps) {
  const title = options.title.trim().length > 0 ? options.title : options.domain;
  const isAdvanced = displayMode === "advanced";
  const isDense = isAdvanced && (width < 220 || height < 120);
  const showServerIcon = !isAdvanced || (!isDense && height >= 144);
  const showMetadata = isAdvanced && width >= 260 && height >= 180;
  const showCapacity = isAdvanced && width >= 180 && height >= 140;
  const iconSize = Math.max(40, Math.min(80, width * 0.45, height * 0.45));
  const playerPercent = data.online && data.players.max > 0 ? (data.players.online / data.players.max) * 100 : 0;

  return (
    <Flex
      className="minecraftServerStatus-wrapper"
      h="100%"
      w="100%"
      direction="column"
      p={isDense ? "xs" : "sm"}
      justify="center"
      align="center"
    >
      <Group gap="xs" wrap="nowrap" align="center" maw="100%">
        <Tooltip label={data.online ? labels.online : labels.offline}>
          <Box aria-hidden miw="md" h="md" bg={data.online ? "teal" : "red"} style={{ borderRadius: "100%" }} />
        </Tooltip>
        <VisuallyHidden>{data.online ? labels.online : labels.offline}</VisuallyHidden>
        <Text size={showMetadata ? "lg" : "md"} fw="bold" truncate="end">
          {title}
        </Text>
      </Group>
      {showMetadata && (
        <Group gap="xs" mt="xs" wrap="wrap" justify="center">
          <Badge variant="light">{options.domain}</Badge>
          {options.isBedrockServer && <Badge variant="outline">{labels.bedrock}</Badge>}
        </Group>
      )}
      {data.online && (
        <>
          {!options.isBedrockServer &&
            showServerIcon &&
            (data.icon ? (
              <img
                style={{
                  flex: 1,
                  width: `calc(${iconSize}px * var(--board-canvas-ui-scale, 1))`,
                  maxHeight: `calc(${iconSize}px * var(--board-canvas-ui-scale, 1))`,
                  objectFit: "contain",
                }}
                alt={`minecraft icon ${options.domain}`}
                src={data.icon}
              />
            ) : (
              <Box
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconCube style={zoomCompensatedSize(iconSize)} color="var(--mantine-color-gray-5)" />
              </Box>
            ))}
          <Stack gap={4} w={showCapacity ? "min(100%, 420px)" : "auto"} align="stretch">
            <Group gap={5} c="dimmed" align="center" justify="center">
              <IconUsersGroup style={zoomCompensatedSize(showMetadata ? 20 : 16)} />
              <Text size={showMetadata ? "lg" : isDense ? "sm" : "md"}>
                {formatNumber(data.players.online, 1)} / {formatNumber(data.players.max, 1)}
              </Text>
            </Group>
            {showCapacity && <Progress value={playerPercent} color={playerPercent >= 90 ? "orange" : "teal"} />}
          </Stack>
        </>
      )}
      {showMetadata && !data.online && (
        <Text mt="md" c="dimmed" size="sm">
          {options.domain}
        </Text>
      )}
    </Flex>
  );
}
