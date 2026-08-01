"use client";

import { Anchor, Card, Flex, Group, ScrollArea, SimpleGrid, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import combineClasses from "clsx";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import classes from "./bookmark.module.css";

export default function BookmarksWidget({ options, itemId, width, displayMode }: WidgetComponentProps<"bookmarks">) {
  const board = useRequiredBoard();
  const { data = [] } = clientApi.app.byIds.useQuery(options.items, {
    select(apps) {
      return apps.toSorted((appA, appB) => options.items.indexOf(appA.id) - options.items.indexOf(appB.id));
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
      {displayMode === "advanced" && (
        <AdvancedBookmarksLayout
          data={data}
          width={width}
          openNewTab={options.openNewTab}
          withBorder={options.withBorder}
          hasIconColor={board.iconColor !== null}
        />
      )}
      {displayMode !== "advanced" && (options.layout === "grid" || options.layout === "gridHorizontal") && (
        <GridLayout
          data={data}
          itemDirection={options.layout === "gridHorizontal" ? "horizontal" : "vertical"}
          hideTitle={options.hideTitle}
          hideIcon={options.hideIcon}
          hideHostname={options.hideHostname}
          openNewTab={options.openNewTab}
          withBorder={options.withBorder}
          hasIconColor={board.iconColor !== null}
        />
      )}
      {displayMode !== "advanced" && options.layout !== "grid" && options.layout !== "gridHorizontal" && (
        <FlexLayout
          data={data}
          direction={options.layout}
          hideTitle={options.hideTitle}
          hideIcon={options.hideIcon}
          hideHostname={options.hideHostname}
          openNewTab={options.openNewTab}
          withBorder={options.withBorder}
          hasIconColor={board.iconColor !== null}
        />
      )}
    </Stack>
  );
}

interface FlexLayoutProps {
  data: RouterOutputs["app"]["byIds"];
  direction: "row" | "column";
  hideTitle: boolean;
  hideIcon: boolean;
  hideHostname: boolean;
  openNewTab: boolean;
  withBorder: boolean;
  hasIconColor: boolean;
}

const FlexLayout = ({
  data,
  direction,
  hideTitle,
  hideIcon,
  hideHostname,
  openNewTab,
  withBorder,
  hasIconColor,
}: FlexLayoutProps) => {
  const board = useRequiredBoard();
  return (
    <Flex direction={direction} gap="0" w="100%">
      {data.map((app) => (
        <div key={app.id} style={{ display: "flex", flex: "1", flexDirection: direction }}>
          <UnstyledButton
            component="a"
            href={app.href ?? undefined}
            target={openNewTab ? "_blank" : "_self"}
            rel="noopener noreferrer"
            key={app.id}
            w="100%"
          >
            <Card
              radius={board.itemRadius}
              className={classes.card}
              w="100%"
              display="flex"
              p={4}
              h="100%"
              withBorder={withBorder}
            >
              {direction === "row" ? (
                <VerticalItem
                  app={app}
                  hideTitle={hideTitle}
                  hideIcon={hideIcon}
                  hideHostname={hideHostname}
                  hasIconColor={hasIconColor}
                />
              ) : (
                <HorizontalItem
                  app={app}
                  hideTitle={hideTitle}
                  hideIcon={hideIcon}
                  hideHostname={hideHostname}
                  hasIconColor={hasIconColor}
                />
              )}
            </Card>
          </UnstyledButton>
        </div>
      ))}
    </Flex>
  );
};

interface AdvancedBookmarksLayoutProps {
  data: RouterOutputs["app"]["byIds"];
  width: number;
  openNewTab: boolean;
  withBorder: boolean;
  hasIconColor: boolean;
}

export const getAdvancedBookmarkColumns = (width: number, itemCount: number): number =>
  Math.max(1, Math.min(itemCount || 1, Math.floor(width / 280)));

export const getBookmarkHostname = (href: string | null): string | undefined => {
  if (!href) return undefined;
  try {
    return new URL(href).hostname;
  } catch {
    return href;
  }
};

const AdvancedBookmarksLayout = ({
  data,
  width,
  openNewTab,
  withBorder,
  hasIconColor,
}: AdvancedBookmarksLayoutProps) => {
  const board = useRequiredBoard();

  return (
    <ScrollArea h="100%" style={{ flex: 1 }}>
      <SimpleGrid cols={getAdvancedBookmarkColumns(width, data.length)} spacing="sm">
        {data.map((app) => (
          <UnstyledButton
            key={app.id}
            component="a"
            href={app.href ?? undefined}
            target={openNewTab ? "_blank" : "_self"}
            rel="noopener noreferrer"
          >
            <Card radius={board.itemRadius} className={classes.card} withBorder={withBorder} p="md" h="100%">
              <Group align="flex-start" wrap="nowrap">
                <MaskedOrNormalImage
                  imageUrl={app.iconUrl}
                  hasColor={hasIconColor}
                  alt={app.name}
                  className={classes.bookmarkIcon}
                  style={{ width: 40, height: 40, flex: "0 0 auto" }}
                />
                <Stack gap={3} miw={0}>
                  <Text fw={700} size="sm" truncate="end">
                    {app.name}
                  </Text>
                  <Anchor component="span" size="xs" truncate="end">
                    {getBookmarkHostname(app.href)}
                  </Anchor>
                  {app.description && (
                    <Text size="xs" c="dimmed" lineClamp={3}>
                      {app.description}
                    </Text>
                  )}
                </Stack>
              </Group>
            </Card>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </ScrollArea>
  );
};

interface GridLayoutProps {
  data: RouterOutputs["app"]["byIds"];
  hideTitle: boolean;
  hideIcon: boolean;
  hideHostname: boolean;
  openNewTab: boolean;
  withBorder: boolean;
  itemDirection: "horizontal" | "vertical";
  hasIconColor: boolean;
}

const GridLayout = ({
  data,
  hideTitle,
  hideIcon,
  hideHostname,
  openNewTab,
  withBorder,
  itemDirection,
  hasIconColor,
}: GridLayoutProps) => {
  const board = useRequiredBoard();

  return (
    <Flex miw="100%" gap={4} wrap="wrap" style={{ flex: 1 }}>
      {data.map((app) => (
        <UnstyledButton
          component="a"
          href={app.href ?? undefined}
          target={openNewTab ? "_blank" : "_self"}
          rel="noopener noreferrer"
          key={app.id}
          flex="1"
        >
          <Card
            h="100%"
            className={combineClasses(classes.card, classes["card-grid"])}
            radius={board.itemRadius}
            withBorder={withBorder}
            p="xs"
          >
            {itemDirection === "horizontal" ? (
              <HorizontalItem
                app={app}
                hideTitle={hideTitle}
                hideIcon={hideIcon}
                hideHostname={hideHostname}
                hasIconColor={hasIconColor}
              />
            ) : (
              <VerticalItem
                app={app}
                hideTitle={hideTitle}
                hideIcon={hideIcon}
                hideHostname={hideHostname}
                hasIconColor={hasIconColor}
              />
            )}
          </Card>
        </UnstyledButton>
      ))}
    </Flex>
  );
};

const VerticalItem = ({
  app,
  hideTitle,
  hideIcon,
  hideHostname,
  hasIconColor,
}: {
  app: RouterOutputs["app"]["byIds"][number];
  hideTitle: boolean;
  hideIcon: boolean;
  hideHostname: boolean;
  hasIconColor: boolean;
}) => {
  return (
    <Stack h="100%" miw={16} gap="sm" justify={"center"}>
      {!hideTitle && (
        <Text fw={700} ta="center" size="xs">
          {app.name}
        </Text>
      )}
      {!hideIcon && (
        <MaskedOrNormalImage
          imageUrl={app.iconUrl}
          hasColor={hasIconColor}
          alt={app.name}
          className={classes.bookmarkIcon}
          style={{
            width: hideHostname && hideTitle ? "min(max(100%, 16px), 40px)" : 40,
            height: hideHostname && hideTitle ? "min(max(100%, 16px), 40px)" : 40,
            overflow: "auto",
            flex: "unset",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />
      )}
      {!hideHostname && (
        <Anchor ta="center" component="span" size="xs">
          {getBookmarkHostname(app.href)}
        </Anchor>
      )}
    </Stack>
  );
};

const HorizontalItem = ({
  app,
  hideTitle,
  hideIcon,
  hideHostname,
  hasIconColor,
}: {
  app: RouterOutputs["app"]["byIds"][number];
  hideTitle: boolean;
  hideIcon: boolean;
  hideHostname: boolean;
  hasIconColor: boolean;
}) => {
  return (
    <Group wrap="nowrap" gap="xs" h="100%" justify="start">
      {!hideIcon && (
        <MaskedOrNormalImage
          imageUrl={app.iconUrl}
          hasColor={hasIconColor}
          alt={app.name}
          className={classes.bookmarkIcon}
          style={{
            overflow: "auto",
            width: hideHostname ? 16 : 24,
            height: hideHostname ? 16 : 24,
            flex: "unset",
          }}
        />
      )}
      {!(hideTitle && hideHostname) && (
        <>
          <Stack justify="space-between" gap={0}>
            {!hideTitle && (
              <Text fw={700} size="xs" lineClamp={hideHostname ? 2 : 1}>
                {app.name}
              </Text>
            )}

            {!hideHostname && (
              <Anchor component="span" size="xs">
                {getBookmarkHostname(app.href)}
              </Anchor>
            )}
          </Stack>
        </>
      )}
    </Group>
  );
};
