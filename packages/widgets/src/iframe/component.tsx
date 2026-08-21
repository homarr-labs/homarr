"use client";

import { Box, Stack, Text, Title } from "@mantine/core";
import { IconBrowserOff, IconProtocol } from "@tabler/icons-react";

import { objectEntries } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import { getSafeApplicationUrl } from "../common/application-url";
import classes from "./component.module.css";

export default function IFrameWidget({ options, isEditMode }: WidgetComponentProps<"iframe">) {
  const t = useI18n("widget.iframe");
  const { embedUrl, allowScrolling, ...permissions } = options;
  const safeEmbedUrl = getSafeApplicationUrl(embedUrl);
  const allowedPermissions = getAllowedPermissions(permissions);
  const sandboxFlags = getSandboxFlags(permissions);

  if (embedUrl.trim() === "") return <NoUrl />;
  if (!safeEmbedUrl) {
    return <UnsupportedProtocol />;
  }

  return (
    <Stack h="100%" w="100%" gap={0}>
      <Box style={{ flex: 1, minHeight: 0 }}>
        <iframe
          loading="lazy"
          style={isEditMode ? { userSelect: "none", pointerEvents: "none" } : undefined}
          className={classes.iframe}
          src={safeEmbedUrl}
          title={getFrameTitle(safeEmbedUrl)}
          allow={allowedPermissions}
          scrolling={allowScrolling ? "yes" : "no"}
          sandbox={sandboxFlags.join(" ")}
        >
          <Text>{t("error.noBrowerSupport")}</Text>
        </iframe>
      </Box>
    </Stack>
  );
}

const supportedProtocols = ["http", "https"];

export const isSupportedProtocol = (url: string) => {
  return getSafeApplicationUrl(url) !== undefined;
};

const NoUrl = () => {
  const t = useI18n("widget.iframe");

  return (
    <Stack align="center" justify="center" h="100%">
      <IconBrowserOff />
      <Title order={4}>{t("error.noUrl")}</Title>
    </Stack>
  );
};

const UnsupportedProtocol = () => {
  const t = useI18n("widget.iframe");

  return (
    <Stack align="center" justify="center" h="100%">
      <IconProtocol />
      <Title order={4} ta="center">
        {t("error.unsupportedProtocol", {
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

export const getFrameTitle = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "iframe";
  }
};
