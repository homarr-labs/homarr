"use client";

import type { PropsWithChildren } from "react";
import { Flex, Text, Tooltip, UnstyledButton } from "@mantine/core";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { MaskedOrNormalImage } from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import classes from "./app.module.css";
import { PingIndicator } from "./ping/ping-indicator";

export default function AppWidget({ options, isEditMode, height, width }: WidgetComponentProps<"app">) {
  const settings = useSettings();
  const board = useRequiredBoard();
  const [app] = clientApi.app.byId.useSuspenseQuery(
    {
      id: options.appId,
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  useRegisterSpotlightContextResults(
    `app-${app.id}`,
    app.href
      ? [
          {
            id: app.id,
            name: app.name,
            icon: app.iconUrl,
            interaction() {
              return {
                type: "link",
                // We checked above that app.href is defined
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                href: app.href!,
                newTab: options.openInNewTab,
              };
            },
          },
        ]
      : [],
    [app, options.openInNewTab],
  );

  const tinyText = height < 100 || width < 100;

  return (
    <AppLink
      href={app.href ?? undefined}
      openInNewTab={options.openInNewTab}
      enabled={Boolean(app.href) && !isEditMode}
    >
      <Tooltip.Floating
        label={app.description}
        position="right-start"
        multiline
        disabled={!options.showDescriptionTooltip || !app.description}
        styles={{ tooltip: { maxWidth: 300 } }}
      >
        <Flex
          className={combineClasses("app-flex-wrapper", app.name, app.id, app.href && classes.appWithUrl)}
          h="100%"
          w="100%"
          direction="column"
          justify="center"
          align="center"
        >
          {options.showTitle && (
            <Text className="app-title" fw={700} size={tinyText ? "8px" : "sm"} ta="center">
              {app.name}
            </Text>
          )}
          <MaskedOrNormalImage
            imageUrl={app.iconUrl}
            hasColor={board.iconColor !== null}
            alt={app.name}
            className={combineClasses(classes.appIcon, "app-icon")}
            style={{
              height: "100%",
              width: "100%",
            }}
          />
        </Flex>
      </Tooltip.Floating>
      {options.pingEnabled && !settings.forceDisableStatus && !board.disableStatus && app.href ? (
        <PingIndicator href={app.pingUrl ?? app.href} />
      ) : null}
    </AppLink>
  );
}

interface AppLinkProps {
  href: string | undefined;
  openInNewTab: boolean;
  enabled: boolean;
}

const AppLink = ({ href, openInNewTab, enabled, children }: PropsWithChildren<AppLinkProps>) =>
  enabled ? (
    <UnstyledButton
      component="a"
      href={href}
      target={openInNewTab ? "_blank" : undefined}
      rel="noreferrer"
      h="100%"
      w="100%"
    >
      {children}
    </UnstyledButton>
  ) : (
    children
  );
