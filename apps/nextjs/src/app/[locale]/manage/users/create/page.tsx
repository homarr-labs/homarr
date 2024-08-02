import { getScopedI18n } from "@homarr/translation/server";

import { DynamicBreadcrumb } from "~/components/navigation/dynamic-breadcrumb";
import { createMetaTitle } from "~/metadata";
import { UserCreateStepperComponent } from "./_components/create-user-stepper";

export async function generateMetadata() {
  const t = await getScopedI18n("management.page.user.create");

  return {
    title: createMetaTitle(t("metaTitle")),
  };
}

export default function CreateUserPage() {
  return (
    <>
      <DynamicBreadcrumb />
      <UserCreateStepperComponent />
    </>
  );
}
