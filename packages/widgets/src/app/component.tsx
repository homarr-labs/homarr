"use client";

import type { PropsWithChildren } from "react";
import { Fragment, Suspense } from "react";
import { Box, Flex, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconMinus } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import { getSafeAppHref, SAFE_NEW_TAB_REL } from "../common/application-url";
import { getUsableWidgetQueryData, isInitialWidgetQueryPending } from "../common/query-state";
import { WidgetQueryLoadingState } from "../common/query-state-indicator";
import type { WidgetComponentProps } from "../definition";
import classes from "./app.module.css";
import { PingDot } from "./ping/ping-dot";
import { PingIndicator } from "./ping/ping-indicator";

export default function AppWidget({
  options,
  isEditMode,
  height,
  width,
  displayScale = 1,
}: WidgetComponentProps<"app">) {
  const tCommon = useI18n("common");
  const settings = useSettings();
  const board = useRequiredBoard();
  const appQuery = clientApi.app.byId.useQuery({ id: options.appId }, { enabled: Boolean(options.appId) });
  const app = getUsableWidgetQueryData(appQuery);
  const href = getSafeAppHref(app?.href);

  if (!options.appId) return <WidgetEmptyState />;
  if (isInitialWidgetQueryPending(appQuery)) return <WidgetQueryLoadingState />;
  if (!app) return <WidgetEmptyState />;

  // Readable board tokens stay fixed on screen, but must yield space to the icon
  // when the tile itself becomes small. Below 100px, scale the whole composition.
  let scale = 1;
  if (Number.isFinite(displayScale) && displayScale > 0) scale = displayScale;
  const contentScale = Math.min(1 / Math.min(scale, 1), Math.min(width, height) / 100);
  const textSize = `${14 * contentScale}px`;
  const spacing = 12 * contentScale;
  const isColumnLayout = options.layout.startsWith("column");

  return (
    <Box h="100%" w="100%" pos="relative">
      <AppLink href={href} openInNewTab={options.openInNewTab} enabled={Boolean(href) && !isEditMode}>
        <AppDescriptionTooltip
          description={app.description}
          enabled={options.descriptionDisplayMode === "tooltip" && Boolean(app.description) && !isEditMode}
        >
          <Flex
            className={combineClasses("app-flex-wrapper", app.name, app.id, href && classes.appWithUrl)}
            h="100%"
            w="100%"
            direction={options.layout}
            justify="center"
            align="center"
            style={{ padding: spacing, gap: isColumnLayout ? 0 : spacing / 2 }}
            onContextMenu={isEditMode ? (e) => e.preventDefault() : undefined}
          >
            <Stack
              gap={0}
              className={classes.appText}
              style={{ maxWidth: isColumnLayout ? "100%" : "50%", maxHeight: isColumnLayout ? "50%" : "100%" }}
            >
              {options.showTitle && (
                <Text
                  className="app-title"
                  fw={700}
                  lineClamp={2}
                  style={{ fontSize: textSize }}
                  ta={isColumnLayout ? "center" : undefined}
                >
                  {app.name}
                </Text>
              )}
              {options.descriptionDisplayMode === "normal" && (
                <Text
                  className="app-description"
                  style={{ fontSize: textSize }}
                  ta={isColumnLayout ? "center" : undefined}
                  c="dimmed"
                  lineClamp={2}
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
                flex: isColumnLayout ? undefined : "0 0 50%",
                height: "100%",
                width: "100%",
                minWidth: 0,
                minHeight: 0,
                maxWidth: isColumnLayout ? undefined : "50%",
              }}
            />
          </Flex>
        </AppDescriptionTooltip>
        {options.pingEnabled &&
        !settings.forceDisableStatus &&
        !board.disableStatus &&
        Boolean(app.pingUrl ?? app.href) ? (
          <Suspense fallback={<PingDot icon={IconMinus} color="gray" tooltip={`${tCommon("action.loading")}…`} />}>
            <PingIndicator appId={app.id} />
          </Suspense>
        ) : null}
      </AppLink>
    </Box>
  );
}

interface AppLinkProps {
  href: string | undefined;
  openInNewTab: boolean;
  enabled: boolean;
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

const AppLink = ({ href, openInNewTab, enabled, children }: PropsWithChildren<AppLinkProps>) =>
  enabled ? (
    <UnstyledButton
      component="a"
      href={href}
      target={openInNewTab ? "_blank" : undefined}
      rel={openInNewTab ? SAFE_NEW_TAB_REL : undefined}
      h="100%"
      w="100%"
    >
      {children}
    </UnstyledButton>
  ) : (
    children
  );
