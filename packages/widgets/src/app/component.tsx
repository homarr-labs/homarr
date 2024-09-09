"use client";

import type { PropsWithChildren } from "react";
import { Suspense, useState } from "react";
import type { MantineColor } from "@mantine/core";
import { Box, Flex, Text, Tooltip, UnstyledButton } from "@mantine/core";
import combineClasses from "clsx";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { parseAppHrefWithVariablesClient } from "@homarr/common/client";
import { useRegisterSpotlightActions } from "@homarr/spotlight";

import type { WidgetComponentProps } from "../definition";
import classes from "./app.module.css";

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
            <Text className="app-title" fw={700} size="12.5cqmin">
              {app.name}
            </Text>
          )}
          <img src={app.iconUrl} alt={app.name} className={combineClasses(classes.appIcon, "app-icon")} />
        </Flex>
      </Tooltip.Floating>
      {options.pingEnabled && app.href ? (
        <Suspense fallback={<PingDot color="blue" label="Loading…" />}>
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

interface PingIndicatorProps {
  href: string;
}

const PingIndicator = ({ href }: PingIndicatorProps) => {
  const [ping] = clientApi.widget.app.ping.useSuspenseQuery(
    {
      url: parseAppHrefWithVariablesClient(href),
    },
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  );

  const [pingResult, setPingResult] = useState<RouterOutputs["widget"]["app"]["ping"]>(ping);

  clientApi.widget.app.updatedPing.useSubscription(
    { url: parseAppHrefWithVariablesClient(href) },
    {
      onData(data) {
        setPingResult(data);
      },
    },
  );

  return (
    <PingDot
      color={"error" in pingResult || pingResult.statusCode >= 500 ? "red" : "green"}
      label={"statusCode" in pingResult ? pingResult.statusCode.toString() : pingResult.error}
    />
  );
};

const PingDot = ({ color, label }: { color: MantineColor; label: string }) => {
  return (
    <Box bottom={4} right={4} pos="absolute">
      <Tooltip label={label}>
        <Box
          bg={color}
          style={{
            borderRadius: "100%",
          }}
          w={16}
          h={16}
        ></Box>
      </Tooltip>
    </Box>
  );
};
