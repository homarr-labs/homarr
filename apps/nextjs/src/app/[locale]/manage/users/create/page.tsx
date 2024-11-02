import { notFound } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { isProviderEnabled } from "@homarr/auth/server";
import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { createMetaTitle } from "~/metadata";
import { UserCreateStepperComponent } from "./_components/create-user-stepper";

export async function generateMetadata() {
  if (!isProviderEnabled("credentials")) return {};

  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }

  const t = await getScopedI18n("management.page.user.create");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default async function CreateUserPage() {
  if (!isProviderEnabled("credentials")) {
    notFound();
  }

  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return notFound();
  }

  return (
    <>
      <DynamicBreadcrumb />
      <UserCreateStepperComponent />
    </>
  );
}
