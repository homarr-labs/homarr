"use client";
import { definition, getAppPingQuery } from ".";

import type { PropsWithChildren } from "react";
import { Fragment } from "react";
import { Box, Flex, rem, Stack, Text, Tooltip } from "@mantine/core";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";
import { MaskedOrNormalImage } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import { AppLink } from "./_app-link";
import classes from "./app.module.css";
import { PingIndicator } from "./ping/ping-indicator";

export default function AppWidget({
  options,
  isEditMode,
  height,
  width,
  displayScale = 1,
}: WidgetComponentProps<"app">) {
  const settings = useSettings();
  const board = useRequiredBoard();
  const context = { options, integrationIds: [], board, settings };
  const queries = definition.data.queries(context);
  const appQuery = clientApi.app.byId.useQuery(queries.main.input, {
    enabled: Boolean(options.appId),
  });
  const app = getUsableWidgetQueryData(appQuery);
  const href = app?.href ?? undefined;

  if (!options.appId) return <WidgetEmptyState />;
  if (isInitialWidgetQueryPending(appQuery)) return <WidgetQueryLoadingState />;
  if (!app) return <WidgetEmptyState />;
  const ping = getAppPingQuery(app, context);

  let layoutScale = displayScale;
  if (!Number.isFinite(layoutScale) || layoutScale <= 0) layoutScale = 1;

  // Widget dimensions are logical pixels; compact sizing follows the displayed tile.
  const isTiny = height * layoutScale < 100 || width * layoutScale < 100;
  const isColumnLayout = options.layout.startsWith("column");
  let padding = 12;
  let fontSize = rem(14);
  let gap = 12;
  let titleLineClamp: number | undefined = 2;
  let titleTruncate: "end" | undefined;
  if (isTiny) {
    padding = 4;
    fontSize = rem(12);
    titleLineClamp = undefined;
    titleTruncate = "end";
  }
  if (isColumnLayout) gap = 0;

  return (
    <Box h="100%" w="100%" pos="relative" style={{ "--mantine-scale": 1 / layoutScale }}>
      <AppLink href={href} openIn={options.openIn} enabled={Boolean(href) && !isEditMode}>
        <AppDescriptionTooltip
          description={app.description}
          enabled={options.descriptionDisplayMode === "tooltip" && Boolean(app.description) && !isEditMode}
        >
          <Flex
            p={padding}
            className={combineClasses("app-flex-wrapper", app.name, app.id, href && classes.appWithUrl)}
            h="100%"
            w="100%"
            direction={options.layout}
            justify="center"
            align="center"
            gap={gap}
            onContextMenu={isEditMode ? (e) => e.preventDefault() : undefined}
          >
            <Stack gap={0} className={classes.appText} data-column={isColumnLayout || undefined}>
              {options.showTitle && (
                <Text
                  className={combineClasses("app-title", classes.appTitle)}
                  data-compact={isTiny || undefined}
                  title={app.name}
                  fw={700}
                  size={fontSize}
                  lh="sm"
                  lineClamp={titleLineClamp}
                  truncate={titleTruncate}
                >
                  {app.name}
                </Text>
              )}
              {options.descriptionDisplayMode === "normal" && (
                <Text
                  className="app-description"
                  size={fontSize}
                  lh="sm"
                  ta={isColumnLayout ? "center" : undefined}
                  c="dimmed"
                  lineClamp={4}
                >
                  {app.description?.split("\n").map((line, index) => (
                    <Fragment key={index}>
                      {line}
                      <br />
                    </Fragment>
                  ))}
                </Text>
              )}
            </Stack>
            <MaskedOrNormalImage
              imageUrl={app.iconUrl}
              hasColor={board.iconColor !== null}
              alt={app.name}
              className={combineClasses(classes.appIcon, "app-icon")}
              style={{
                height: "100%",
                width: "100%",
                minWidth: "20%",
                maxWidth: isColumnLayout ? undefined : "50%",
              }}
            />
          </Flex>
        </AppDescriptionTooltip>
        {ping.enabled && <PingIndicator input={ping.input} />}
      </AppLink>
    </Box>
  );
}

const AppDescriptionTooltip = ({
  description,
  enabled,
  children,
}: PropsWithChildren<{ description?: string | null; enabled: boolean }>) =>
  enabled ? (
    <Tooltip.Floating
      label={description?.split("\n").map((line, index) => (
        <Fragment key={index}>
          {line}
          <br />
        </Fragment>
      ))}
      position="right-start"
      multiline
      styles={{ tooltip: { maxWidth: 300 } }}
    >
      {children}
    </Tooltip.Floating>
  ) : (
    children
  );
