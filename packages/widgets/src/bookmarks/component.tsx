"use client";

import { Anchor, Box, Card, Divider, Flex, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";

import type { WidgetComponentProps } from "../definition";
import classes from "./bookmark.module.css";

export default function BookmarksWidget({ options, width, height, itemId }: WidgetComponentProps<"bookmarks">) {
  const [data] = clientApi.app.byIds.useSuspenseQuery(options.items, {
    select(data) {
      return data.sort((appA, appB) => options.items.indexOf(appA.id) - options.items.indexOf(appB.id));
    },
  });

  useRegisterSpotlightContextResults(
    `bookmark-${itemId}`,
    data
      .filter((app) => app.href !== null)
      .map((app) => ({
        id: app.id,
        name: app.name,
        icon: app.iconUrl,
        interaction() {
          return {
            type: "link",
            // We checked above that app.href is defined
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            href: app.href!,
            newTab: false,
          };
        },
      })),
    [data],
  );

  return (
    <Stack h="100%" gap="sm" p="sm">
      <Title order={4} px="0.25rem">
        {options.title}
      </Title>
      {options.layout === "grid" && (
        <GridLayout
          data={data}
          width={width}
          height={height}
          showIcon={options.showIcon}
          showUrl={options.showUrl}
          openInNewTab={options.openInNewTab}
        />
      )}
      {options.layout !== "grid" && (
        <FlexLayout
          data={data}
          direction={options.layout}
          showIcon={options.showIcon}
          showUrl={options.showUrl}
          openInNewTab={options.openInNewTab}
        />
      )}
    </Stack>
  );
}

interface FlexLayoutProps {
  data: RouterOutputs["app"]["byIds"];
  direction: "row" | "column";
  showIcon: boolean;
  showUrl: boolean;
  openInNewTab: boolean;
}

const FlexLayout = ({ data, direction, showIcon, showUrl, openInNewTab }: FlexLayoutProps) => {
  return (
    <Flex direction={direction} gap="0" h="100%" w="100%">
      {data.map((app, index) => (
        <div key={app.id} style={{ display: "flex", flex: "1", flexDirection: direction }}>
          <Divider
            m="3px"
            orientation={direction !== "column" ? "vertical" : "horizontal"}
            color={index === 0 ? "transparent" : undefined}
          />
          <UnstyledButton
            component="a"
            href={app.href ?? undefined}
            target={openInNewTab ? "_blank" : "_self"}
            rel="noopener noreferrer"
            key={app.id}
            h="100%"
            w="100%"
          >
            <Card
              radius="md"
              style={{ containerType: "size" }}
              className={classes.card}
              h="100%"
              w="100%"
              display="flex"
              p={0}
            >
              {direction === "row" ? (
                <VerticalItem app={app} showIcon={showIcon} showUrl={showUrl} />
              ) : (
                <HorizontalItem app={app} showIcon={showIcon} showUrl={showUrl} />
              )}
            </Card>
          </UnstyledButton>
        </div>
      ))}
    </Flex>
  );
};

interface GridLayoutProps {
  data: RouterOutputs["app"]["byIds"];
  width: number;
  height: number;
  showIcon: boolean;
  showUrl: boolean;
  openInNewTab: boolean;
}

const GridLayout = ({ data, width, height, showIcon, showUrl, openInNewTab }: GridLayoutProps) => {
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
          target={openInNewTab ? "_blank" : "_self"}
          rel="noopener noreferrer"
          key={app.id}
          h="100%"
        >
          <Card withBorder style={{ containerType: "size" }} h="100%" className={classes.card} p="5cqmin">
            <VerticalItem app={app} showIcon={showIcon} showUrl={showUrl} />
          </Card>
        </UnstyledButton>
      ))}
    </Box>
  );
};

const VerticalItem = ({
  app,
  showIcon,
  showUrl,
}: {
  app: RouterOutputs["app"]["byIds"][number];
  showIcon: boolean;
  showUrl: boolean;
}) => {
  return (
    <Stack h="100%" gap="5cqmin">
      <Text fw={700} ta="center" size="20cqmin">
        {app.name}
      </Text>
      {showIcon && (
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
      )}
      {showUrl && (
        <Anchor ta="center" component="span" size="12cqmin">
          {app.href ? new URL(app.href).hostname : undefined}
        </Anchor>
      )}
    </Stack>
  );
};

const HorizontalItem = ({
  app,
  showIcon,
  showUrl,
}: {
  app: RouterOutputs["app"]["byIds"][number];
  showIcon: boolean;
  showUrl: boolean;
}) => {
  return (
    <Group wrap="nowrap">
      {showIcon && (
        <img
          style={{
            overflow: "auto",
            objectFit: "contain",
            scale: 0.8,
            minHeight: "100cqh",
            maxHeight: "100cqh",
            minWidth: "100cqh",
            maxWidth: "100cqh",
          }}
          src={app.iconUrl}
          alt={app.name}
        />
      )}
      <Stack justify="space-between" gap={0}>
        <Text fw={700} size="45cqh" lineClamp={1}>
          {app.name}
        </Text>

        {showUrl && (
          <Anchor component="span" size="30cqh">
            {app.href ? new URL(app.href).hostname : undefined}
          </Anchor>
        )}
      </Stack>
    </Group>
  );
};
