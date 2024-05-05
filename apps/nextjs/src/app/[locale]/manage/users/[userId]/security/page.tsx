import { Stack, Title } from "@mantine/core";

import { api } from "@homarr/api/server";
import { getScopedI18n } from "@homarr/translation/server";

import { ChangePasswordForm } from "./_change-password-form";

interface Props {
  params: {
    userId: string;
  };
}

export default async function UserSecurityPage({ params }: Props) {
  const tSecurity = await getScopedI18n(
    "management.page.user.setting.security",
  );
  const user = await api.user.getById({
    userId: params.userId,
  });

  return (
    <Stack>
      <Title>{tSecurity("title")}</Title>

      <ChangePasswordForm user={user} />
    </Stack>
  );
}
