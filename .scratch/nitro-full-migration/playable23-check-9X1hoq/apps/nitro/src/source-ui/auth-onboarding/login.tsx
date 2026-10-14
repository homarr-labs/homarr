import { IconLogin } from "@tabler/icons-react";

import { AuthLoginForm } from "../../features/auth";
import type { AuthLoginFormProps } from "../../features/auth";
import type { AuthPresentation } from "./contracts";
import { authShellBranding } from "./contracts";

export type AuthLoginPageProps = AuthLoginFormProps & { presentation: AuthPresentation };

export function AuthLoginPage({ presentation, ...form }: AuthLoginPageProps) {
  const { Shell, branding, t } = presentation;
  let description = t("user.page.login.subtitle");
  if (branding.authBranding.showGreeting && branding.greeting.length > 0) description = branding.greeting;
  return (
    <Shell
      title={t("user.page.login.title")}
      description={description}
      icon={<IconLogin size={24} />}
      {...authShellBranding(branding)}
    >
      <AuthLoginForm {...form} />
    </Shell>
  );
}
