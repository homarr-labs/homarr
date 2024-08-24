"use client";

import type { PropsWithChildren } from "react";
import { useState } from "react";
import { Box, Center, Flex, Loader, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconDeviceDesktopX } from "@tabler/icons-react";
import combineClasses from "clsx";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import { parseAppHrefWithVariablesClient } from "@homarr/common/client";
import { useRegisterSpotlightActions } from "@homarr/spotlight";
import { useScopedI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./app.module.css";

export default function AppWidget({ options, serverData, isEditMode, width }: WidgetComponentProps<"app">) {
  const t = useScopedI18n("widget.app");
  const isQueryEnabled = Boolean(options.appId);
  const {
    data: app,
    isPending,
    isError,
  } = clientApi.app.byId.useQuery(
    {
      id: options.appId,
    },
    {
      initialData:
        // We need to check if the id's match because otherwise the same initialData for a changed id will be used
        serverData?.app?.id === options.appId ? serverData.app : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: isQueryEnabled,
    },
  );

  const [pingResult, setPingResult] = useState<RouterOutputs["widget"]["app"]["ping"] | null>(null);

  const shouldRunPing = Boolean(app?.href) && options.pingEnabled;
  clientApi.widget.app.updatedPing.useSubscription(
    { url: parseAppHrefWithVariablesClient(app?.href ?? "") },
    {
      enabled: shouldRunPing,
      onData(data) {
        setPingResult(data);
      },
    },
  );

  useRegisterSpotlightActions(
    `app-${options.appId}`,
    app?.href
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

  if (isPending && isQueryEnabled) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (isError || !isQueryEnabled) {
    return (
      <Tooltip.Floating label={t("error.notFound.tooltip")}>
        <Stack gap="xs" align="center" justify="center" h="100%" w="100%">
          <IconDeviceDesktopX size={width >= 96 ? "2rem" : "1rem"} />
          {width >= 96 && (
            <Text ta="center" size="sm">
              {t("error.notFound.label")}
            </Text>
          )}
        </Stack>
      </Tooltip.Floating>
    );
  }

  return (
    <AppLink
      href={parseAppHrefWithVariablesClient(app?.href ?? "")}
      openInNewTab={options.openInNewTab}
      enabled={Boolean(app?.href) && !isEditMode}
    >
      <Tooltip.Floating
        label={app?.description}
        position="right-start"
        multiline
        disabled={!options.showDescriptionTooltip || !app?.description}
        styles={{ tooltip: { maxWidth: 300 } }}
      >
        <Flex
          className={combineClasses("app-flex-wrapper", app?.name, app?.id)}
          h="100%"
          w="100%"
          direction="column"
          p="7.5cqmin"
          justify="center"
          align="center"
        >
          {options.showTitle && (
            <Text className="app-title" fw={700} size="12.5cqmin">
              {app?.name}
            </Text>
          )}
          <img src={app?.iconUrl} alt={app?.name} className={combineClasses(classes.appIcon, "app-icon")} />
        </Flex>
      </Tooltip.Floating>
      {shouldRunPing && <PingIndicator pingResult={pingResult} />}
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
  pingResult: RouterOutputs["widget"]["app"]["ping"] | null;
}

const PingIndicator = ({ pingResult }: PingIndicatorProps) => {
  return (
    <Box bottom={4} right={4} pos="absolute">
      <Tooltip
        label={pingResult && "statusCode" in pingResult ? pingResult.statusCode : pingResult?.error}
        disabled={!pingResult}
      >
        <Box
          style={{
            borderRadius: "100%",
            backgroundColor: !pingResult
              ? "orange"
              : "error" in pingResult || pingResult.statusCode >= 500
                ? "red"
                : "green",
          }}
          w={16}
          h={16}
        ></Box>
      </Tooltip>
    </Box>
  );
};
