"use client";

import { Center, Flex, Image, Stack, Text } from "@mantine/core";
import selectn from "selectn";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";

export default function CustomApiWidget({ options }: WidgetComponentProps<"customApi">) {
  const [{ data }] = clientApi.widget.customApi.fetchURL.useSuspenseQuery({ url: options.url, method: options.method,headerName: options.headerName, headerValue: options.headerValue });
  const value = options.filter ? selectn(options.filter as string, data) as unknown : "Please enter a filter";

  return (
    <Center h="100%" w="100%">
      <Stack align="center" justify="center" gap="md">
        <Flex direction="row" align="center" gap="lg">
          {
            options.title && (
              <Text ta="center" fw="bold" size="lg">
                {options.title}
              </Text>
            )
          }
          {
            options.icon && (
              <Image src={String(options.icon)} w="lg" h="lg" />
            )
          }
        </Flex>
        <Text ta="center">{String(value)}</Text>
      </Stack>
    </Center>
  );
}
