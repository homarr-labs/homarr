"use client";

import { Anchor, Box, Card, Stack, Text, Title, UnstyledButton } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";

import type { WidgetComponentProps } from "../definition";

export default function BookmarksWidget({ options, width, height }: WidgetComponentProps<"bookmarks">) {
  const [data] = clientApi.app.byIds.useSuspenseQuery(options.items, {
    select(data) {
      return data.sort((appA, appB) => options.items.indexOf(appA.id) - options.items.indexOf(appB.id));
    },
  });

  return (
    <Stack h="100%" gap="sm" p="sm">
      <Title order={4} px="0.25rem">
        {options.title}
      </Title>
      <GridLayout data={data} width={width} height={height} />
    </Stack>
  );
}

interface GridLayoutProps {
  data: RouterOutputs["app"]["byIds"];
  width: number;
  height: number;
}

const GridLayout = ({ data, width, height }: GridLayoutProps) => {
  // Calculates the perfect number of columns for the grid layout based on the width and height in pixels and the number of items
  const columns = Math.ceil(Math.sqrt(data.length * (width / height)));

  return (
    <Box
      display="grid"
      h="100%"
      style={{
        gridTemplateColumns: `repeat(${columns}, auto)`,
        gap: 10,
      }}
    >
      {data.map((app) => (
        <UnstyledButton
          component="a"
          href={app.href ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          key={app.id}
          h="100%"
        >
          <Card withBorder style={{ containerType: "size" }} h="100%" p="5cqmin">
            <Stack h="100%" gap="5cqmin">
              <Text fw={700} ta="center" size="20cqmin">
                {app.name}
              </Text>
              <img
                style={{
                  maxHeight: "100%",
                  maxWidth: "100%",
                  overflow: "auto",
                  flex: 1,
                  objectFit: "contain",
                  scale: 0.8,
                }}
                src={app.iconUrl}
                alt={app.name}
              />
              <Anchor ta="center" component="span" size="10cqmin">
                {app.href ? new URL(app.href).hostname : undefined}
              </Anchor>
            </Stack>
          </Card>
        </UnstyledButton>
      ))}
    </Box>
  );
};
