"use client";

import { Box, Flex, Group, Text, Tooltip } from "@mantine/core";
import { IconUsersGroup } from "@tabler/icons-react";

import { clientApi } from "@homarr/api/client";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../../definition";

export default function MinecraftServerStatusWidget({ options }: WidgetComponentProps<"minecraftServerStatus">) {
  const [{ data }] = clientApi.widget.minecraft.getServerStatus.useSuspenseQuery(options);
  const utils = clientApi.useUtils();
  clientApi.widget.minecraft.subscribeServerStatus.useSubscription(options, {
    onData(data) {
      utils.widget.minecraft.getServerStatus.setData(options, {
        data,
        timestamp: new Date(),
      });
    },
  });
  const tStatus = useScopedI18n("widget.minecraftServerStatus.status");

  const title = options.title.trim().length > 0 ? options.title : options.domain;

  return (
    <Flex
      className="minecraftServerStatus-wrapper"
      h="100%"
      w="100%"
      direction="column"
      p="sm"
      justify="center"
      align="center"
    >
      <Group gap="xs" wrap="nowrap" align="center">
        <Tooltip label={data.online ? tStatus("online") : tStatus("offline")}>
          <Box w="lg" h="lg" bg={data.online ? "teal" : "red"} style={{ borderRadius: "100%" }}></Box>
        </Tooltip>
        <Text size="lg" fw="bold">
          {title}
        </Text>
      </Group>
      {data.online && (
        <>
          <img
            style={{ flex: 1, transform: "scale(0.8)", objectFit: "contain" }}
            alt={`minecraft icon ${options.domain}`}
            src={data.icon}
          />
          <Group gap={5} c="gray.6" align="center">
            <IconUsersGroup size="1rem" />
            <Text size="lg">
              {data.players.online} / {data.players.max}
            </Text>
          </Group>
        </>
      )}
    </Flex>
  );
}
