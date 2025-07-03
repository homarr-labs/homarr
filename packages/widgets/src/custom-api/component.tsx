"use client";

import { Center, Flex, Image, Stack, Text, Title } from "@mantine/core";
import selectn from "selectn";

import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";

function parseInlineCSS(cssString: string): React.CSSProperties {
  const style: React.CSSProperties = {};

  cssString.split(";").forEach((rule) => {
    const [property, value] = rule.split(":").map((s) => s?.trim());

    if (property && value) {
      const camelProperty = property.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      (style as Record<string, string | number>)[camelProperty] = value;
    }
  });

  return style;
}

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
            ...(options.iconCSS ? parseInlineCSS(options.iconCSS) : {}),
          }}
        />
      )}
      <Stack align="center" justify="center" gap="md">
        <Text ta="center">{String(value)}</Text>
      </Stack>
    </Center>
  );
}
