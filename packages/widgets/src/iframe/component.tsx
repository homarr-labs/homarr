"use client";

import { Anchor, Box, Group, Stack, Text, Title } from "@mantine/core";
import { IconBrowserOff, IconProtocol } from "@tabler/icons-react";

import { objectEntries } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

export default function IFrameWidget({ options, isEditMode, displayMode }: WidgetComponentProps<"iframe">) {
  const t = useI18n();
  const { embedUrl, allowScrolling, ...permissions } = options;
  const allowedPermissions = getAllowedPermissions(permissions);
  const sandboxFlags = getSandboxFlags(permissions);

  if (embedUrl.trim() === "") return <NoUrl />;
  if (!isSupportedProtocol(embedUrl)) {
    return <UnsupportedProtocol />;
  }

  return (
    <Stack h="100%" w="100%" gap={0}>
      {displayMode === "advanced" && (
        <Group key="advanced-header" px="xs" py={4} wrap="nowrap" justify="space-between">
          <Text size="xs" c="dimmed" truncate>
            {getFrameTitle(embedUrl)}
          </Text>
          <Anchor href={embedUrl} target="_blank" rel="noreferrer" size="xs">
            {embedUrl}
          </Anchor>
        </Group>
      )}
      <Box key="frame" style={{ flex: 1, minHeight: 0 }}>
        <iframe
          style={isEditMode ? { userSelect: "none", pointerEvents: "none" } : undefined}
          className={classes.iframe}
          src={embedUrl}
          title={getFrameTitle(embedUrl)}
          allow={allowedPermissions}
          scrolling={allowScrolling ? "yes" : "no"}
          sandbox={sandboxFlags.join(" ")}
        >
          <Text>{t("widget.iframe.error.noBrowerSupport")}</Text>
        </iframe>
      </Box>
    </Stack>
  );
}

const supportedProtocols = ["http", "https"];

export const isSupportedProtocol = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    return supportedProtocols.map((protocol) => `${protocol}:`).includes(`${parsedUrl.protocol}`);
  } catch {
    return false;
  }
};

const NoUrl = () => {
  const t = useI18n();

  return (
    <Stack align="center" justify="center" h="100%">
      <IconBrowserOff />
      <Title order={4}>{t("widget.iframe.error.noUrl")}</Title>
    </Stack>
  );
};

const UnsupportedProtocol = () => {
  const t = useI18n();

  return (
    <Stack align="center" justify="center" h="100%">
      <IconProtocol />
      <Title order={4} ta="center">
        {t("widget.iframe.error.unsupportedProtocol", {
          supportedProtocols: supportedProtocols.map((protocol) => protocol).join(", "),
        })}
      </Title>
    </Stack>
  );
};

export const getAllowedPermissions = (
  permissions: Omit<WidgetComponentProps<"iframe">["options"], "embedUrl" | "allowScrolling">,
) => {
  return (
    objectEntries(permissions)
      // * means it applies to all origins. Sandbox-only flags such as
      // allow-modals intentionally have no Permissions Policy mapping.
      .flatMap(([key, value]) => {
        const permission = permissionMapping[key];
        return value && permission ? [`${permission} *`] : [];
      })
      .join("; ")
  );
};

export const getSandboxFlags = (
  permissions: Omit<WidgetComponentProps<"iframe">["options"], "embedUrl" | "allowScrolling">,
) => {
  const baseSandbox = [
    "allow-scripts",
    "allow-same-origin",
    "allow-forms",
    "allow-popups",
    "allow-top-navigation-by-user-activation",
  ];

  if (permissions.allowFullScreen) {
    baseSandbox.push("allow-presentation");
  }

  if (permissions.allowPayment) {
    baseSandbox.push("allow-popups-to-escape-sandbox");
  }

  if (permissions.allowModals) {
    baseSandbox.push("allow-modals");
  }

  return baseSandbox;
};

const permissionMapping: Partial<
  Record<keyof Omit<WidgetComponentProps<"iframe">["options"], "embedUrl" | "allowScrolling">, string>
> = {
  allowAutoPlay: "autoplay",
  allowCamera: "camera",
  allowFullScreen: "fullscreen",
  allowGeolocation: "geolocation",
  allowMicrophone: "microphone",
  allowPayment: "payment",
};

const getFrameTitle = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "iframe";
  }
};
