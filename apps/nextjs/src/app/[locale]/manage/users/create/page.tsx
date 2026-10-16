import { notFound } from "next/navigation";

import { api, getBackendRuntimeAsync } from "@homarr/api/server";
import { auth } from "@homarr/auth/next";
import { getI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { UserCreateStepperComponent } from "./_components/create-user-stepper";

export async function generateMetadata() {
  if (!(await getBackendRuntimeAsync()).credentialsEnabled) return {};

  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return {};
  }

  const t = await getI18n("management.page.user.create");

  return {
    title: t("metaTitle"),
  };
}

export default async function CreateUserPage() {
  if (!(await getBackendRuntimeAsync()).credentialsEnabled) {
    notFound();
  }

  const session = await auth();
  if (!session?.user.permissions.includes("admin")) {
    return notFound();
  }

  const initialGroups = await api.frontend.defaultGroups.query();

  return (
    <>
      <DynamicBreadcrumb />
      <UserCreateStepperComponent
        initialGroups={initialGroups.map((group) => ({
          ...group,
          permissions: group.permissions.map(({ permission }) => permission),
        }))}
      />
    </>
  );
}
