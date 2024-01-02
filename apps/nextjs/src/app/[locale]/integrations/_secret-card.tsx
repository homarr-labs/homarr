"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import type { RouterOutputs } from "@homarr/api";
import { integrationSecretKindObject } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import {
  ActionIcon,
  Avatar,
  Button,
  Card,
  Collapse,
  Group,
  IconEye,
  IconEyeOff,
  Kbd,
  Stack,
  Text,
} from "@homarr/ui";

import { integrationSecretIcons } from "./_secret-icons";

dayjs.extend(relativeTime);

interface SecretCardProps {
  secret: RouterOutputs["integration"]["byId"]["secrets"][number];
  children: React.ReactNode;
  onCancel: () => Promise<boolean>;
}

export const SecretCard = ({ secret, children, onCancel }: SecretCardProps) => {
  const params = useParams<{ locale: string }>();
  const t = useI18n();
  const { isPublic } = integrationSecretKindObject[secret.kind];
  const [publicSecretDisplayOpened, { toggle: togglePublicSecretDisplay }] =
    useDisclosure(false);
  const [editMode, setEditMode] = useState(false);
  const DisplayIcon = publicSecretDisplayOpened ? IconEye : IconEyeOff;
  const KindIcon = integrationSecretIcons[secret.kind];

  console.log(params);

  return (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Group>
            <Avatar>
              <KindIcon size={16} />
            </Avatar>
            <Text fw={500}>
              {t(`integration.secrets.kind.${secret.kind}.label`)}
            </Text>
            {publicSecretDisplayOpened ? <Kbd>{secret.value}</Kbd> : null}
          </Group>
          <Group>
            <Text c="gray.6" size="sm">
              {t("integration.secrets.lastUpdated", {
                date: dayjs().locale(params.locale).to(dayjs(secret.updatedAt)),
              })}
            </Text>
            {isPublic ? (
              <ActionIcon
                color="gray"
                variant="subtle"
                onClick={togglePublicSecretDisplay}
              >
                <DisplayIcon size={16} stroke={1.5} />
              </ActionIcon>
            ) : null}
            <Button
              variant="default"
              onClick={async () => {
                if (!editMode) {
                  setEditMode(true);
                  return;
                }

                const shouldCancel = await onCancel();
                if (!shouldCancel) return;
                setEditMode(false);
              }}
            >
              {editMode ? t("common.action.cancel") : t("common.action.edit")}
            </Button>
          </Group>
        </Group>
        <Collapse in={editMode}>{children}</Collapse>
      </Stack>
    </Card>
  );
};
