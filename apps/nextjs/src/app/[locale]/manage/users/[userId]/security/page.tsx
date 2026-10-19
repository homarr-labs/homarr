import { notFound } from "next/navigation";
import { Stack, Title } from "@mantine/core";

import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { catchRpcNotFound, catchRpcUnauthorized } from "~/errors/rpc-catch-error";
import { canAccessUserEditPage } from "../access";
import { getUserEditDataAsync } from "../_data";
import { ChangePasswordForm } from "./_components/_change-password-form";

interface Props {
  params: Promise<{
    userId: string;
  }>;
}

export default async function UserSecurityPage(props: Props) {
  const params = await props.params;
  const session = await auth();
  const tSecurity = await getI18n("management.page.user.setting.security");
  const user = await getUserEditDataAsync(params.userId).catch(catchRpcNotFound).catch(catchRpcUnauthorized);

  if (!canAccessUserEditPage(session, user.id)) {
    notFound();
  }

  if (user.provider !== "credentials") {
    notFound();
  }

  return (
    <Stack>
      <Title>{tSecurity("title")}</Title>

      <ChangePasswordForm user={user} />
    </Stack>
  );
}
