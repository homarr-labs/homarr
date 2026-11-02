import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { createLoginUrl } from "@homarr/auth/shared";

export async function authorizeArena() {
  const session = await auth();
  if (!session) redirect(createLoginUrl("/manage/custom-widgets/arena"));
  if (!session.user.permissions.includes("admin")) redirect("/");
  return session.user.id;
}
