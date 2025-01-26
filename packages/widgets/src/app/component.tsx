"use client";

import type { PropsWithChildren } from "react";
import { Suspense } from "react";
import { Flex, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconLoader } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { useWidgetOptionSettings } from "../option-settings-context";
import classes from "./app.module.css";
import { PingDot } from "./ping/ping-dot";
import { PingIndicator } from "./ping/ping-indicator";

export default function AppWidget({ options, isEditMode }: WidgetComponentProps<"app">) {
  const t = useI18n();
  const widgetOptionSettings = useWidgetOptionSettings();
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
      {options.pingEnabled &&
      !widgetOptionSettings.server.board.forceDisableStatus &&
      !board.disableStatus &&
      app.href ? (
        <Suspense fallback={<PingDot icon={IconLoader} color="blue" tooltip={`${t("common.action.loading")}…`} />}>
          <PingIndicator href={app.href} />
        </Suspense>
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
