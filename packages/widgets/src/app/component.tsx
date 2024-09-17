"use client";

import type { PropsWithChildren } from "react";
import { Suspense } from "react";
import { Flex, Text, Tooltip, UnstyledButton } from "@mantine/core";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { parseAppHrefWithVariablesClient } from "@homarr/common/client";
import { useRegisterSpotlightActions } from "@homarr/spotlight";

import type { WidgetComponentProps } from "../definition";
import classes from "./app.module.css";
import { PingDot } from "./ping/ping-dot";
import { PingIndicator } from "./ping/ping-indicator";

export default function AppWidget({ options, isEditMode }: WidgetComponentProps<"app">) {
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

  useRegisterSpotlightActions(
    `app-${options.appId}`,
    app.href
      ? [
          {
            id: `app-${options.appId}`,
            title: app.name,
            description: app.description ?? "",
            icon: app.iconUrl,
            group: "app",
            type: "link",
            href: parseAppHrefWithVariablesClient(app.href),
            openInNewTab: options.openInNewTab,
          },
        ]
      : [],
    [app, options.appId, options.openInNewTab],
  );

  return (
    <AppLink
      href={parseAppHrefWithVariablesClient(app.href ?? "")}
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
          className={combineClasses("app-flex-wrapper", app.name, app.id)}
          h="100%"
          w="100%"
          direction="column"
          p="7.5cqmin"
          justify="center"
          align="center"
        >
          {options.showTitle && (
            <Text className="app-title" fw={700} ta="center" size="12.5cqmin">
              {app.name}
            </Text>
          )}
          <img src={app.iconUrl} alt={app.name} className={combineClasses(classes.appIcon, "app-icon")} />
        </Flex>
      </Tooltip.Floating>
      {options.pingEnabled && app.href ? (
        <Suspense fallback={<PingDot color="blue" tooltip="Loading…" />}>
          <PingIndicator href={app.href} />
        </Suspense>
      ) : null}
    </AppLink>
  );
}

interface AppLinkProps {
  href: string;
  openInNewTab: boolean;
  enabled: boolean;
}

const AppLink = ({ href, openInNewTab, enabled, children }: PropsWithChildren<AppLinkProps>) =>
  enabled ? (
    <UnstyledButton component="a" href={href} target={openInNewTab ? "_blank" : undefined} h="100%" w="100%">
      {children}
    </UnstyledButton>
  ) : (
    children
  );
