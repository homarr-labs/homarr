"use client";

import { Box, Stack, Text, Title } from "@mantine/core";
import { IconBrowserOff, IconProtocol } from "@tabler/icons-react";

import { objectEntries } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

export default function IFrameWidget({ options, isEditMode }: WidgetComponentProps<"iframe">) {
  const t = useI18n();
  const { embedUrl, ...permissions } = options;
  const allowedPermissions = getAllowedPermissions(permissions);

  if (embedUrl.trim() === "") return <NoUrl />;
  if (!isSupportedProtocol(embedUrl)) {
    return <UnsupportedProtocol />;
  }

  return (
    <Box h="100%" w="100%">
      <iframe
        style={isEditMode ? { userSelect: "none", pointerEvents: "none" } : undefined}
        className={classes.iframe}
        src={embedUrl}
        title="widget iframe"
        allow={allowedPermissions.join(" ")}
        scrolling={options.allowScrolling ? "yes" : "no"}
      >
        <Text>{t("widget.iframe.error.noBrowerSupport")}</Text>
      </iframe>
    </Box>
  );
}

const supportedProtocols = ["http", "https"];

const isSupportedProtocol = (url: string) => {
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

const getAllowedPermissions = (
  permissions: Omit<WidgetComponentProps<"iframe">["options"], "embedUrl" | "allowScrolling">,
) => {
  return objectEntries(permissions)
    .filter(([_key, value]) => value)
    .map(([key]) => permissionMapping[key]);
};

const permissionMapping = {
  allowAutoPlay: "autoplay",
  allowCamera: "camera",
  allowFullScreen: "fullscreen",
  allowGeolocation: "geolocation",
  allowMicrophone: "microphone",
  allowPayment: "payment",
} satisfies Record<keyof Omit<WidgetComponentProps<"iframe">["options"], "embedUrl" | "allowScrolling">, string>;
