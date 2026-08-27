"use client";

import { Group, Stack, Text } from "@mantine/core";

import type { RouterOutputs } from "@homarr/api";
import { clientApi } from "@homarr/api/client";
import type { SupportedAuthProvider } from "@homarr/definitions";
import { useI18n } from "@homarr/translation/client";
import { UserAvatar } from "@homarr/ui";

import type { AccessPickerOption, AccessPickerTriggerProps } from "./access-picker";
import { AccessPicker } from "./access-picker";

type SelectableUser = RouterOutputs["user"]["selectable"][number];

interface UserSelectProps {
  presentUserIds: string[];
  allowedProviders?: SupportedAuthProvider[];
  onSelect: (user: { id: string; name: string; image: string; email: string | null }) => void | Promise<void>;
  triggerLabel?: string;
  triggerProps?: AccessPickerTriggerProps;
}

export const UserSelect = ({
  presentUserIds,
  allowedProviders,
  onSelect,
  triggerLabel,
  triggerProps,
}: UserSelectProps) => {
  const tUser = useI18n("user.action.select");
  const tCommon = useI18n("common");
  const { data: users, isPending } = clientApi.user.selectable.useQuery({ providers: allowedProviders });
  const availableUsers = (users ?? []).filter((user) => !presentUserIds.includes(user.id));
  const options: AccessPickerOption<SelectableUser>[] = availableUsers.map((user) => ({
    value: user.id,
    label: user.name ?? "",
    keywords: [user.email ?? ""],
    item: user,
    content: (
      <Group wrap="nowrap" gap="xs">
        <UserAvatar user={user} size="xs" />
        <Stack gap={0}>
          <Text size="sm">{user.name}</Text>
          {user.email && (
            <Text size="xs" c="dimmed">
              {user.email}
            </Text>
          )}
        </Stack>
      </Group>
    ),
  }));

  const handleSelect = ({ item: user }: AccessPickerOption<SelectableUser>) =>
    onSelect({
      id: user.id,
      name: user.name ?? "",
      image: user.image ?? "",
      email: user.email ?? null,
    });

  return (
    <AccessPicker
      label={tUser("label")}
      searchPlaceholder={tUser("label")}
      emptyMessage={tUser("notFound")}
      triggerLabel={triggerLabel ?? tCommon("action.add")}
      triggerProps={triggerProps}
      options={options}
      isPending={isPending}
      onSelect={handleSelect}
    />
  );
};
