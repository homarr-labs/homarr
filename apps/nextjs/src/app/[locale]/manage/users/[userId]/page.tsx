import { Box, Group, Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getI18n, getScopedI18n } from "@homarr/translation/server";

import {
  DangerZoneItem,
  DangerZoneRoot,
} from "~/components/manage/danger-zone";
import { DeleteUserButton } from "./_delete-user-button";
import { UserProfileAvatarForm } from "./_profile-avatar-form";
import { UserProfileForm } from "./_profile-form";

interface Props {
  params: {
    userId: string;
  };
}

export async function generateMetadata({ params }: Props) {
  const user = await api.user.getById({
    userId: params.userId,
  });
  const t = await getScopedI18n("management.page.user.edit");
  const metaTitle = `${t("metaTitle", { username: user?.name })} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default async function EditUserPage({ params }: Props) {
  const t = await getI18n();
  const tGeneral = await getScopedI18n("management.page.user.setting.general");
  const user = await api.user.getById({
    userId: params.userId,
  });

  return (
    <Stack>
      <Title>{tGeneral("title")}</Title>
      <Group gap="xl">
        <Box flex={1}>
          <UserProfileForm user={user} />
        </Box>
        <Box w={{ base: "100%", lg: 200 }}>
          <UserProfileAvatarForm user={user} />
        </Box>
      </Group>

      <DangerZoneRoot>
        <DangerZoneItem
          label={t("user.action.delete.label")}
          description={t("user.action.delete.description")}
          action={<DeleteUserButton user={user} />}
        />
      </DangerZoneRoot>
    </Stack>
  );
}
