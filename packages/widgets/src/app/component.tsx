"use client";

import type { CSSProperties, PropsWithChildren } from "react";
import { Fragment, Suspense } from "react";
import { Box, Flex, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconMinus } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";
import { useI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { getWidgetDisplayScale } from "../common/widget-layout-size";
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
  displayMode,
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
  const scale = getWidgetDisplayScale({ displayScale, displayMode });
  const maximumContentScale = Math.min(width, height) / 100;
  let uiScale = "var(--board-canvas-ui-scale, 1)";
  if (displayMode === "advanced") uiScale = "1";
  const textSize = `min(calc(14px * ${uiScale}), ${14 * maximumContentScale}px)`;
  const spacing = `min(calc(12px * ${uiScale}), ${12 * maximumContentScale}px)`;
  const rowGap = `min(calc(6px * ${uiScale}), ${6 * maximumContentScale}px)`;
  const isColumnLayout = options.layout.startsWith("column");
  const isTiny = Math.min(width, height) * scale < 100;
  const textStyle: CSSProperties = {};
  let titleLineClamp: number | undefined;
  let descriptionLineClamp = 4;
  if (isColumnLayout) textStyle.flexShrink = 0;
  if (isTiny) {
    titleLineClamp = 2;
    descriptionLineClamp = 2;
    textStyle.flexShrink = 1;
    textStyle.maxWidth = "50%";
    textStyle.maxHeight = "100%";
    if (isColumnLayout) {
      textStyle.maxWidth = "100%";
      textStyle.maxHeight = "50%";
    }
  }

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
            style={{ padding: spacing, gap: isColumnLayout ? 0 : rowGap }}
            onContextMenu={isEditMode ? (e) => e.preventDefault() : undefined}
          >
            <Stack gap={0} className={classes.appText} style={textStyle}>
              {options.showTitle && (
                <Text
                  className="app-title"
                  fw={700}
                  lineClamp={titleLineClamp}
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
                  lineClamp={descriptionLineClamp}
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
