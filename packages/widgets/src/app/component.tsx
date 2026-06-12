"use client";

import type { PropsWithChildren } from "react";
import { Fragment, Suspense } from "react";
import { Flex, rem, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconMinus } from "@tabler/icons-react";
import combineClasses from "clsx";

import { clientApi } from "@homarr/api/client";
import { useRequiredBoard } from "@homarr/boards/context";
import { useSettings } from "@homarr/settings";
import { useRegisterSpotlightContextResults } from "@homarr/spotlight";
import { useI18n } from "@homarr/translation/client";
import { MaskedOrNormalImage } from "@homarr/ui";

import { WidgetEmptyState } from "../common/empty-state";
import type { WidgetComponentProps } from "../definition";
import classes from "./app.module.css";
import { PingDot } from "./ping/ping-dot";
import { PingIndicator } from "./ping/ping-indicator";

export default function AppWidget({ options, isEditMode, height, width }: WidgetComponentProps<"app">) {
  const t = useI18n();
  const settings = useSettings();
  const board = useRequiredBoard();
  const { data: app } = clientApi.app.byId.useQuery(
    {
      id: options.appId,
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  );
  useRegisterSpotlightContextResults(
    `app-${app?.id ?? options.appId}`,
    app?.href
      ? [
          {
            id: app.id,
            name: app.name,
            icon: app.iconUrl,
            interaction() {
              return {
                type: "link",
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

  if (!app) return <WidgetEmptyState />;

  const isTiny = height < 100 || width < 100;
  const isColumnLayout = options.layout.startsWith("column");

  return (
    <AppLink
      href={app.href ?? undefined}
      openInNewTab={options.openInNewTab}
      enabled={Boolean(app.href) && !isEditMode}
    >
      <Tooltip.Floating
        label={app.description?.split("\n").map((line, index) => (
          <Fragment key={index}>
            {line}
            <br />
          </Fragment>
        ))}
        position="right-start"
        multiline
        disabled={options.descriptionDisplayMode !== "tooltip" || !app.description || isEditMode}
        styles={{ tooltip: { maxWidth: 300 } }}
      >
        <Flex
          p={isTiny ? 4 : "sm"}
          className={combineClasses("app-flex-wrapper", app.name, app.id, app.href && classes.appWithUrl)}
          h="100%"
          w="100%"
          direction={options.layout}
          justify="center"
          align="center"
          gap={isColumnLayout ? 0 : "sm"}
        >
          <Stack gap={0}>
            {options.showTitle && (
              <Text
                className="app-title"
                fw={700}
                size={isTiny ? rem(8) : "sm"}
                ta={isColumnLayout ? "center" : undefined}
              >
                {app.name}
              </Text>
            )}
            {options.descriptionDisplayMode === "normal" && (
              <Text
                className="app-description"
                size={isTiny ? rem(8) : "sm"}
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
          <MaskedOrNormalImage
            imageUrl={app.iconUrl}
            hasColor={board.iconColor !== null}
            alt={app.name}
            className={combineClasses(classes.appIcon, "app-icon")}
            style={{
              height: "100%",
              width: "100%",
              minWidth: "20%",
              maxWidth: isColumnLayout ? undefined : "50%",
            }}
          />
        </Flex>
      </Tooltip.Floating>
      {options.pingEnabled && !settings.forceDisableStatus && !board.disableStatus && app.href ? (
        <Suspense fallback={<PingDot icon={IconMinus} color="gray" tooltip={`${t("common.action.loading")}…`} />}>
          <PingIndicator appId={app.id} />
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
