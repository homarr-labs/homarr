"use client";

import { Anchor, Badge, Group, Text } from "@mantine/core";

import type { CoolifyServiceWithContext } from "@homarr/integrations/types";
import { useI18n } from "@homarr/translation/client";

import actionTargetClasses from "../common/action-target.module.css";
import { getSafeApplicationUrl, SAFE_NEW_TAB_REL } from "../common/application-url";
import { cleanFqdn, getStatusColor, parseStatus } from "./coolify-utils";

type ServiceApplication = NonNullable<CoolifyServiceWithContext["applications"]>[number];

export const ServiceApplicationRow = ({ application }: { application: ServiceApplication }) => {
  const t = useI18n("widget.coolify");
  const status = parseStatus(application.status ?? "");
  const publicUrl = getSafeApplicationUrl(cleanFqdn(application.fqdn));
  const statusLabel =
    status === "running" ||
    status === "stopped" ||
    status === "exited" ||
    status === "starting" ||
    status === "restarting" ||
    status === "unhealthy"
      ? t(`status.${status}`)
      : t("status.unknown");

  return (
    <Group gap={4} wrap="nowrap">
      <Badge size="xs" variant="dot" color={getStatusColor(status)}>
        {statusLabel}
      </Badge>
      {publicUrl ? (
        <Anchor
          className={actionTargetClasses.root}
          href={publicUrl}
          target="_blank"
          rel={SAFE_NEW_TAB_REL}
          fz="xs"
          c="inherit"
          truncate="end"
          style={{ textDecoration: "none" }}
        >
          {application.name}
        </Anchor>
      ) : (
        <Text fz="xs" truncate="end">
          {application.name}
        </Text>
      )}
    </Group>
  );
};
