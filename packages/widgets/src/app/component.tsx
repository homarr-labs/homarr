"use client";

import type { PropsWithChildren } from "react";

import { clientApi } from "@homarr/api/client";
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
  height: _h,
}: WidgetComponentProps<"app">) {
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
        serverData?.app.id == options.appId ? serverData?.app : undefined,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  if (isPending) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Tooltip.Floating label="You have no valid app selected">
        <Stack gap="xs" align="center" justify="center" h="100%" w="100%">
          <IconDeviceDesktopX size={width >= 128 ? "2rem" : "1.5rem"} />
          {width >= 128 && (
            <Text ta="center" size="sm">
              No app
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
      enabled={!!app?.href && !isEditMode}
    >
      <Flex align="center" justify="center" h="100%">
        <Tooltip.Floating
          label={app?.description}
          position="right-start"
          multiline
          disabled={!options.showDescriptionTooltip}
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
            <Text fw={700} ta="center">
              {app?.name}
            </Text>
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
