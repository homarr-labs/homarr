"use client";

import { Anchor, Box, Card, Divider, Flex, Group, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import combineClasses from "clsx";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import classes from "./bookmark.module.css";

export default function BookmarksWidget({ options, width, height, itemId }: WidgetComponentProps<"bookmarks">) {
  const board = useRequiredBoard();
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
      {options.title.length > 0 && (
        <Title order={4} px="0.25rem">
          {options.title}
        </Title>
      )}
      {options.layout === "grid" && (
        <GridLayout
          data={data}
          width={width}
          height={height}
          hideIcon={options.hideIcon}
          hideHostname={options.hideHostname}
          openNewTab={options.openNewTab}
          hasIconColor={board.iconColor !== null}
        />
      )}
      {options.layout !== "grid" && (
        <FlexLayout
          data={data}
          direction={options.layout}
          hideIcon={options.hideIcon}
          hideHostname={options.hideHostname}
          openNewTab={options.openNewTab}
          hasIconColor={board.iconColor !== null}
        />
      )}
    </Stack>
  );
}

interface FlexLayoutProps {
  data: RouterOutputs["app"]["byIds"];
  direction: "row" | "column";
  hideIcon: boolean;
  hideHostname: boolean;
  openNewTab: boolean;
  hasIconColor: boolean;
}

const FlexLayout = ({ data, direction, hideIcon, hideHostname, openNewTab, hasIconColor }: FlexLayoutProps) => {
  const board = useRequiredBoard();
  return (
    <Flex direction={direction} gap="0" w="100%">
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
            target={openNewTab ? "_blank" : "_self"}
            rel="noopener noreferrer"
            key={app.id}
            w="100%"
          >
            <Card radius={board.itemRadius} className={classes.card} w="100%" display="flex" p={"xs"} h={"100%"}>
              {direction === "row" ? (
                <VerticalItem app={app} hideIcon={hideIcon} hideHostname={hideHostname} hasIconColor={hasIconColor} />
              ) : (
                <HorizontalItem app={app} hideIcon={hideIcon} hideHostname={hideHostname} hasIconColor={hasIconColor} />
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
  hideIcon: boolean;
  hideHostname: boolean;
  openNewTab: boolean;
  hasIconColor: boolean;
}

const GridLayout = ({ data, width, height, hideIcon, hideHostname, openNewTab, hasIconColor }: GridLayoutProps) => {
  // Calculates the perfect number of columns for the grid layout based on the width and height in pixels and the number of items
  const columns = Math.ceil(Math.sqrt(data.length * (width / height)));

  const board = useRequiredBoard();

  return (
    <Box
      display="grid"
      h="100%"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 10,
      }}
    >
      {data.map((app) => (
        <UnstyledButton
          component="a"
          href={app.href ?? undefined}
          target={openNewTab ? "_blank" : "_self"}
          rel="noopener noreferrer"
          key={app.id}
          h="100%"
        >
          <Card
            h="100%"
            className={combineClasses(classes.card, classes["card-grid"])}
            radius={board.itemRadius}
            p="sm"
          >
            <VerticalItem
              app={app}
              hideIcon={hideIcon}
              hideHostname={hideHostname}
              hasIconColor={hasIconColor}
              size={50}
            />
          </Card>
        </UnstyledButton>
      ))}
    </Box>
  );
};

const VerticalItem = ({
  app,
  hideIcon,
  hideHostname,
  hasIconColor,
  size = 30,
}: {
  app: RouterOutputs["app"]["byIds"][number];
  hideIcon: boolean;
  hideHostname: boolean;
  hasIconColor: boolean;
  size?: number;
}) => {
  return (
    <Stack h="100%" gap="sm">
      <Text fw={700} ta="center" size="lg">
        {app.name}
      </Text>
      {!hideIcon && (
        <MaskedOrNormalImage
          imageUrl={app.iconUrl}
          hasColor={hasIconColor}
          alt={app.name}
          className={classes.bookmarkIcon}
          style={{
            width: size,
            height: size,
            overflow: "auto",
            flex: 1,
            scale: 0.8,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
      )}
      {!hideHostname && (
        <Anchor ta="center" component="span" size="lg">
          {app.href ? new URL(app.href).hostname : undefined}
        </Anchor>
      )}
    </Stack>
  );
};

const HorizontalItem = ({
  app,
  hideIcon,
  hideHostname,
  hasIconColor,
}: {
  app: RouterOutputs["app"]["byIds"][number];
  hideIcon: boolean;
  hideHostname: boolean;
  hasIconColor: boolean;
}) => {
  return (
    <Group wrap="nowrap" gap={"xs"}>
      {!hideIcon && (
        <MaskedOrNormalImage
          imageUrl={app.iconUrl}
          hasColor={hasIconColor}
          alt={app.name}
          className={classes.bookmarkIcon}
          style={{
            overflow: "auto",
            scale: 0.8,
            width: 30,
            height: 30,
            flex: "unset",
          }}
        />
      )}
      <Stack justify="space-between" gap={0}>
        <Text fw={700} size="md" lineClamp={1}>
          {app.name}
        </Text>

        {!hideHostname && (
          <Anchor component="span" size="xs">
            {app.href ? new URL(app.href).hostname : undefined}
          </Anchor>
        )}
      </Stack>
    </Group>
  );
};
