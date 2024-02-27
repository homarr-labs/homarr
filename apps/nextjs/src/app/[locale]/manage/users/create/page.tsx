import { getScopedI18n } from "@homarr/translation/server";

import { UserCreateStepperComponent } from "./_components/stepper.component";

export async function generateMetadata() {
  const t = await getScopedI18n("management.page.user.create");
  const metaTitle = `${t("metaTitle")} • Homarr`;

  return {
    title: metaTitle,
  };
}

export default function CreateUserPage() {
  return <UserCreateStepperComponent />;
}
