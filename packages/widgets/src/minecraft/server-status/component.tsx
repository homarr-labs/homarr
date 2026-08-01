"use client";

import { Badge, Box, Flex, Group, Progress, Stack, Text, Tooltip } from "@mantine/core";
import { IconCube, IconUsersGroup } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { formatNumber } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import { WidgetEmptyState } from "../../common/empty-state";
import type { WidgetComponentProps } from "../../definition";

export default function MinecraftServerStatusWidget({
  options,
  width,
  height,
  displayMode,
}: WidgetComponentProps<"minecraftServerStatus">) {
  const { data: result } = clientApi.widget.minecraft.getServerStatus.useQuery(options);
  const t = useI18n();

  if (!result) return <WidgetEmptyState />;
  const { data } = result;

  const title = options.title.trim().length > 0 ? options.title : options.domain;
  const isAdvanced = displayMode === "advanced";
  const iconSize = Math.max(40, Math.min(isAdvanced ? 128 : 80, width * 0.45, height * 0.45));
  const playerPercent = data.online && data.players.max > 0 ? (data.players.online / data.players.max) * 100 : 0;

  return (
    <Flex
      className="minecraftServerStatus-wrapper"
      h="100%"
      w="100%"
      direction="column"
      p={isAdvanced ? "lg" : "sm"}
      justify="center"
      align="center"
    >
      <Group gap="xs" wrap="nowrap" align="center">
        <Tooltip
          label={
            data.online
              ? t("widget.minecraftServerStatus.status.online")
              : t("widget.minecraftServerStatus.status.offline")
          }
        >
          <Box miw="md" h="md" bg={data.online ? "teal" : "red"} style={{ borderRadius: "100%" }}></Box>
        </Tooltip>
        <Text size={isAdvanced ? "xl" : "md"} fw="bold" truncate="end">
          {title}
        </Text>
      </Group>
      {isAdvanced && (
        <Group gap="xs" mt="xs" wrap="wrap" justify="center">
          <Badge variant="light">{options.domain}</Badge>
          {options.isBedrockServer && (
            <Badge variant="outline">{t("widget.minecraftServerStatus.option.isBedrockServer.label")}</Badge>
          )}
        </Group>
      )}
      {data.online && (
        <>
          {!options.isBedrockServer &&
            (data.icon ? (
              <img
                style={{ flex: 1, width: iconSize, maxHeight: iconSize, objectFit: "contain" }}
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
                <IconCube size={iconSize} color="var(--mantine-color-gray-5)" />
              </Box>
            ))}
          <Stack gap={4} w={isAdvanced ? "min(100%, 420px)" : "auto"} align="stretch">
            <Group gap={5} c="dimmed" align="center" justify="center">
              <IconUsersGroup size={isAdvanced ? "1.25rem" : "1rem"} />
              <Text size={isAdvanced ? "lg" : "md"}>
                {formatNumber(data.players.online, 1)} / {formatNumber(data.players.max, 1)}
              </Text>
            </Group>
            {isAdvanced && <Progress value={playerPercent} color={playerPercent >= 90 ? "orange" : "teal"} />}
          </Stack>
        </>
      )}
      {isAdvanced && !data.online && (
        <Text mt="md" c="dimmed" size="sm">
          {options.domain}
        </Text>
      )}
    </Flex>
  );
}
