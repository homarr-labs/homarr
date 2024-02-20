import { notFound } from "next/navigation";

import { getScopedI18n } from "@homarr/translation/server";
import { Title } from "@homarr/ui";

import { api } from "~/trpc/server";

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
  const user = await api.user.getById({
    userId: params.userId,
  });

  if (!user) {
    notFound();
  }

  return <Title>Edit User {user.name}!</Title>;
}
