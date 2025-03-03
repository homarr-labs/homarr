"use client";

import { Center, Flex, Image, Stack, Text } from "@mantine/core";
import selectn from "selectn";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";

export default function CustomApiWidget({ options }: WidgetComponentProps<"customApi">) {
  const [{ data }] = clientApi.widget.customApi.fetchURL.useSuspenseQuery({ url: options.url });
  const value = selectn(options.filter, data) as unknown;

  return (
    <Center h="100%" w="100%">
      <Stack align="center" justify="center" gap="md">
        <Flex direction="row" align="center" gap="lg">
          <Text ta="center" fw="bold" size="lg">
            {options.title}
          </Text>
          <Image src={options.icon} w="lg" h="lg" />
        </Flex>
        <Text ta="center">{`${value}`}</Text>
      </Stack>
    </Center>
  );
}
