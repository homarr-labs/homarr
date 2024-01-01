import { useState } from "react";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";

import type { RouterOutputs } from "@homarr/api";
import { integrationSecretKindObject } from "@homarr/definitions";
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

interface SecretCardProps {
  secret: RouterOutputs["integration"]["byId"]["secrets"][number];
  children: React.ReactNode;
  onCancel: () => Promise<boolean>;
}

export const SecretCard = ({ secret, children, onCancel }: SecretCardProps) => {
  const { isPublic } = integrationSecretKindObject[secret.kind];
  const [publicSecretDisplayOpened, { toggle: togglePublicSecretDisplay }] =
    useDisclosure(false);
  const [editMode, setEditMode] = useState(false);
  const DisplayIcon = publicSecretDisplayOpened ? IconEye : IconEyeOff;
  const KindIcon = integrationSecretIcons[secret.kind];

  return (
    <Card>
      <Stack>
        <Group justify="space-between">
          <Group>
            <Avatar>
              <KindIcon size={16} />
            </Avatar>
            <Text fw={500}>{secret.kind}</Text>
            {publicSecretDisplayOpened ? <Kbd>{secret.value}</Kbd> : null}
          </Group>
          <Group>
            <Text c="gray.6" size="sm">
              Last updated {dayjs().to(dayjs(secret.updatedAt))}
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
              {editMode ? "Cancel" : "Edit"}
            </Button>
          </Group>
        </Group>
        <Collapse in={editMode}>{children}</Collapse>
      </Stack>
    </Card>
  );
};
