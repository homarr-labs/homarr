"use client";

import { Code, Stack, Title } from "@mantine/core";

import type { WidgetComponentProps } from "../definition";

export default function BookmarksWidget({ options }: WidgetComponentProps<"bookmarks">) {
  console.log('bookmark items: ', options.items);
  options.items.forEach((item) => {
    console.log(item);
  });

  return (
    <Stack>
      <Title size="h4" px="0.25rem">
        {options.title}
      </Title>
      <Code mx={"md"} block>
        {JSON.stringify(options)}
      </Code>
    </Stack>
  );
}
