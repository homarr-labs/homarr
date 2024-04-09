"use client";

import type { PropsWithChildren } from "react";

import { clientApi } from "@homarr/api/client";
import { useRegisterSpotlightActions } from "@homarr/spotlight";
import { useScopedI18n } from "@homarr/translation/client";
import {
  Center,
  Flex,
  IconDeviceDesktopX,
  Loader,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from "@homarr/ui";

import type { WidgetComponentProps } from "../definition";
import classes from "./app.module.css";

export default function AppWidget({
  options,
  serverData,
  isEditMode,
  width,
  height,
}: WidgetComponentProps<"app">) {
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
        serverData?.app?.id === options.appId ? serverData?.app : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: isQueryEnabled,
    },
  );

  useRegisterSpotlightActions(
    `app-${options.appId}`,
    app?.href
      ? [
          {
            id: `app-${options.appId}`,
            title: app?.name,
            description: app?.description ?? "",
            icon: app?.iconUrl,
            group: "app",
            type: "link",
            href: app?.href,
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
          <IconDeviceDesktopX size={width >= 96 ? "2rem" : "1.5rem"} />
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
      href={app?.href ?? ""}
      openInNewTab={options.openInNewTab}
      enabled={Boolean(app?.href) && !isEditMode}
    >
      <Flex align="center" justify="center" h="100%">
        <Tooltip.Floating
          label={app?.description}
          position="right-start"
          multiline
          disabled={!options.showDescriptionTooltip || !app?.description}
          styles={{ tooltip: { maxWidth: 300 } }}
        >
          <Flex
            h="100%"
            direction="column"
            align="center"
            gap={0}
            style={{
              overflow: "visible",
              flexGrow: 5,
            }}
          >
            {height >= 96 && (
              <Text fw={700} ta="center">
                {app?.name}
              </Text>
            )}
            <img
              src={app?.iconUrl}
              alt={app?.name}
              className={classes.appIcon}
            />
          </Flex>
        </Tooltip.Floating>
      </Flex>
    </AppLink>
  );
}

interface AppLinkProps {
  href: string;
  openInNewTab: boolean;
  enabled: boolean;
}

const AppLink = ({
  href,
  openInNewTab,
  enabled,
  children,
}: PropsWithChildren<AppLinkProps>) =>
  enabled ? (
    <UnstyledButton
      component="a"
      href={href}
      target={openInNewTab ? "_blank" : undefined}
      h="100%"
      w="100%"
    >
      {children}
    </UnstyledButton>
  ) : (
    children
  );
