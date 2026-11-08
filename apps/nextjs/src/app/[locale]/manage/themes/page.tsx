import { redirect } from "next/navigation";

import { auth } from "@homarr/auth/next";

export default async function OwnThemePage() {
  const session = await auth();
  if (!session) redirect("/auth/login?redirect=/manage/themes");
  redirect(`/manage/themes/${session.user.id}`);
}
