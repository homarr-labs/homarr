"use client";

import {Code, Stack, Title} from "@mantine/core";
import type {WidgetComponentProps} from "../definition";

export default function BookmarksWidget({options}: WidgetComponentProps<"bookmarks">) {
  return <Stack>
    <Title size="h4" px="0.25rem">
      {options.title}
    </Title>
    <Code mx={"md"} block>
      {JSON.stringify(options)}
    </Code>
  </Stack>
}