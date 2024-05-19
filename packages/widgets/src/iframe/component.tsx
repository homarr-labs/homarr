import { Box, Stack, Text, Title } from "@mantine/core";
import { IconBrowserOff } from "@tabler/icons-react";

import { objectEntries } from "@homarr/common";
import { useI18n } from "@homarr/translation/client";

import type { WidgetComponentProps } from "../definition";
import classes from "./component.module.css";

export default function IFrameWidget({ options }: WidgetComponentProps<"iframe">) {
  const t = useI18n();
  const { embedUrl, ...permissions } = options;
  const allowedPermissions = getAllowedPermissions(permissions);

  if (embedUrl.trim() === "") return <NoUrl />;

  return (
    <Box h="100%" w="100%">
      <iframe className={classes.iframe} src={embedUrl} title="widget iframe" allow={allowedPermissions.join(" ")}>
        <Text>{t("widget.iframe.error.noBrowerSupport")}</Text>
      </iframe>
    </Box>
  );
}

const NoUrl = () => {
  const t = useI18n();

  return (
    <Stack align="center" justify="center" h="100%">
      <IconBrowserOff />
      <Title order={4}>{t("widget.iframe.error.noUrl")}</Title>
    </Stack>
  );
};

const getAllowedPermissions = (permissions: Omit<WidgetComponentProps<"iframe">["options"], "embedUrl">) => {
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
  allowScrolling: "scrolling",
  allowTransparency: "transparency",
} satisfies Record<keyof Omit<WidgetComponentProps<"iframe">["options"], "embedUrl">, string>;
