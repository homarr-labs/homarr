import { Box, Group, Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";

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
    </Stack>
  );
}
