"use client";

import { Center, Flex, Image, Stack, Text, Title } from "@mantine/core";
import selectn from "selectn";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";

export default function CustomApiWidget({ options, width }: WidgetComponentProps<"customApi">) {
  if (!options.url) {
    throw new Error("URL is required");
  }

  if (!options.filter) {
    throw new Error("Filter is required");
  }

  const [{ data }] = clientApi.widget.customApi.fetchURL.useSuspenseQuery({
    url: options.url,
    method: options.method,
    headerName: options.headerName,
    headerValue: options.headerValue,
  });

  const value = selectn(options.filter, data) as unknown;

  return (
    <Center h="100%" w="100%">
      {options.title && (
        <Title pos="absolute" top={10} left={10} ta="center" order={width > 280 ? 3 : 4}>
          {options.title}
        </Title>
      )}
      {options.icon && (
        <Image
          src={String(options.icon)}
          pos="absolute"
          top={10}
          right={10}
          w={width > 280 ? "xl" : "lg"}
          h={width > 280 ? "xl" : "lg"}
          style={{
            borderRadius: "100%",
          }}
        />
      )}
      <Stack align="center" justify="center" gap="md">
        <Flex direction="row" align="center" gap="lg"></Flex>
        <Text ta="center">{String(value)}</Text>
      </Stack>
    </Center>
  );
}
