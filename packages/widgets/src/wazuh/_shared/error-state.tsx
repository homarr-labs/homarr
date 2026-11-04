"use client";

import { Center, Stack, Text } from "@mantine/core";
import {
  IconCertificateOff,
  IconClockExclamation,
  IconDatabaseOff,
  IconExclamationCircle,
  IconLock,
  IconPlugConnectedX,
} from "@tabler/icons-react";

import type { WazuhErrorReason, WazuhPublicError } from "@homarr/integrations";
import { useI18n } from "@homarr/translation/client";
import type { TablerIcon } from "@homarr/ui";

const errorIcons: Record<WazuhErrorReason, TablerIcon> = {
  unauthorized: IconLock,
  certificate: IconCertificateOff,
  certificateHostname: IconCertificateOff,
  certificateExpired: IconCertificateOff,
  unreachable: IconPlugConnectedX,
  timeout: IconClockExclamation,
  status: IconExclamationCircle,
  invalidResponse: IconExclamationCircle,
  indexerRequired: IconDatabaseOff,
  unknown: IconExclamationCircle,
};

export const WazuhErrorState = ({ error, compact }: { error: WazuhPublicError; compact?: boolean }) => {
  const t = useI18n("widget.wazuh");
  const Icon = errorIcons[error.reason];
  const target = error.target ? t(`target.${error.target}`) : t("target.wazuh");

  return (
    <Center h="100%" w="100%" p="sm">
      <Stack align="center" gap={4} maw={320}>
        <Icon size={compact ? 20 : 28} stroke={1.5} color="var(--mantine-color-red-5)" />
        <Text size="sm" fw={600} ta="center">
          {t(`error.${error.reason}.title`, { target })}
        </Text>
        {!compact && (
          <Text size="xs" c="dimmed" ta="center">
            {t(`error.${error.reason}.description`, { target, status: String(error.status ?? "") })}
          </Text>
        )}
      </Stack>
    </Center>
  );
};
