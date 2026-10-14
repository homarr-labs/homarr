"use client";

import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { Fragment } from "react";
import { Box, Flex, rem, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import combineClasses from "clsx";

import { SAFE_NEW_TAB_REL } from "@homarr/common/url";

import classes from "./app.module.css";

export interface AppImageDisplayProps {
  imageUrl?: string;
  alt: string;
  className: string;
  style: CSSProperties;
}

export interface AppNativeViewProps {
  app: { id: string; name: string; description?: string | null; iconUrl?: string };
  href?: string;
  options: {
    openInNewTab: boolean;
    showTitle: boolean;
    descriptionDisplayMode: "normal" | "tooltip" | "hidden";
    layout: "column" | "column-reverse" | "row" | "row-reverse";
  };
  isEditMode: boolean;
  height: number;
  width: number;
  displayScale?: number;
  renderImage: (props: AppImageDisplayProps) => ReactNode;
  status: ReactNode;
}

export function AppNativeView({
  app,
  href,
  options,
  isEditMode,
  height,
  width,
  displayScale = 1,
  renderImage,
  status,
}: AppNativeViewProps) {
  let layoutScale = displayScale;
  if (!Number.isFinite(layoutScale) || layoutScale <= 0) layoutScale = 1;

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
      <AppLink href={href} openInNewTab={options.openInNewTab} enabled={Boolean(href) && !isEditMode}>
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
            {renderImage({
              imageUrl: app.iconUrl,
              alt: app.name,
              className: combineClasses(classes.appIcon, "app-icon"),
              style: {
                height: "100%",
                width: "100%",
                minWidth: "20%",
                maxWidth: isColumnLayout ? undefined : "50%",
              },
            })}
          </Flex>
        </AppDescriptionTooltip>
        {status}
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
