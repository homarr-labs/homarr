"use client";

import { ActionIcon, Badge, Code, CopyButton, Group, Stack, Text, Title, Tooltip } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type { RouterOutputs } from "@homarr/api";
import { useI18n } from "@homarr/translation/client";

dayjs.extend(relativeTime);

type SignInInformationData = RouterOutputs["user"]["getSignInInformation"];

interface SignInInformationProps {
  information: SignInInformationData;
}

export const SignInInformation = ({ information }: SignInInformationProps) => {
  const t = useI18n("management.page.user.setting.general.item.signInInformation");

  return (
    <Stack mb="lg">
      <Title order={2}>{t("title")}</Title>
      <Text size="sm">{t("description")}</Text>
      <Stack gap="sm">
        <SignInDetail label={t("provider")} value={information.provider} />
        <SignInDetail label={t("subject")} value={information.subject} copyable />
        <SignInDetail label={t("email")} value={information.email} copyable />
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {t("homarrGroups")}
          </Text>
          {information.homarrGroups.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t("noGroups")}
            </Text>
          ) : (
            <Group gap="xs">
              {information.homarrGroups.map((group) => (
                <Badge key={group.id} variant="light">
                  {group.name}
                </Badge>
              ))}
            </Group>
          )}
        </Stack>
        <GroupsClaimDetails information={information} />
      </Stack>
    </Stack>
  );
};

const GroupsClaimDetails = ({ information }: SignInInformationProps) => {
  const t = useI18n("management.page.user.setting.general.item.signInInformation");
  const homarrGroupNames = new Set(information.homarrGroups.map((group) => group.name));

  return (
    <Stack gap={4}>
      <Group gap="xs">
        <Text size="sm" fw={500}>
          {t("groupsClaim")}
        </Text>
        {information.groupsClaimSeenAt && (
          <Text size="xs" c="dimmed">
            {t("groupsClaimSeenAt", { time: dayjs(information.groupsClaimSeenAt).fromNow() })}
          </Text>
        )}
      </Group>
      {information.groupsClaim === null ? (
        <Text size="sm" c="dimmed">
          {t("empty")}
        </Text>
      ) : information.groupsClaim.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("noGroups")}
        </Text>
      ) : (
        <Group gap="xs">
          {information.groupsClaim.map((claim) => {
            const unmatched = !homarrGroupNames.has(claim);
            return (
              <Tooltip key={claim} label={unmatched ? t("unmatched") : claim} disabled={!unmatched}>
                <Badge variant="light" color={unmatched ? "yellow" : "blue"}>
                  {claim}
                </Badge>
              </Tooltip>
            );
          })}
        </Group>
      )}
    </Stack>
  );
};

const SignInDetail = ({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string | null;
  copyable?: boolean;
}) => {
  const t = useI18n("management.page.user.setting.general.item.signInInformation");

  if (!value) {
    return (
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        <Text size="sm" c="dimmed">
          {t("empty")}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Code>{value}</Code>
        {copyable && (
          <CopyButton value={value}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? t("copied") : t("copy")}>
                <ActionIcon
                  variant="subtle"
                  color={copied ? "green" : "gray"}
                  onClick={copy}
                  aria-label={copied ? t("copied") : t("copy")}
                >
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        )}
      </Group>
    </Stack>
  );
};
