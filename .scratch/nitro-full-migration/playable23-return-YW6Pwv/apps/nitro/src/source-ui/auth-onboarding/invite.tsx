import { Alert } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";

import type { AuthPresentation, RegistrationPresentation } from "./contracts";
import { authShellBranding } from "./contracts";
import { AuthRegistrationForm } from "./registration-form";

export type AuthInvitePageProps = {
  presentation: AuthPresentation;
  registration: Omit<RegistrationPresentation, "t">;
  invite:
    | { kind: "verified"; creatorName: string }
    | { kind: "display-preview"; creatorName: string; label: string }
    | { kind: "unavailable"; message: string };
};

export function AuthInvitePage({ presentation, registration, invite }: AuthInvitePageProps) {
  const { Shell, branding, t } = presentation;
  const customName = branding.authBranding.showAppName && branding.isCustomAppName;
  let title = t("user.page.invite.title");
  let description = t("user.page.invite.subtitle");
  if (customName) {
    title = t("user.page.invite.titleWithAppName", { appName: branding.appName });
    description = t("user.page.invite.subtitleWithAppName", { appName: branding.appName });
  }
  if (branding.authBranding.showGreeting && branding.greeting.length > 0) description = branding.greeting;
  let footer;
  if (invite.kind !== "unavailable") footer = t("user.page.invite.description", { username: invite.creatorName });
  return (
    <Shell
      title={title}
      description={description}
      icon={<IconUserPlus size={24} />}
      footer={footer}
      {...authShellBranding(branding)}
    >
      {invite.kind === "display-preview" ? (
        <Alert color="yellow" role="alert">
          {invite.label}
        </Alert>
      ) : null}
      {invite.kind !== "unavailable" ? (
        <AuthRegistrationForm {...registration} t={t} />
      ) : (
        <Alert color="yellow" role="alert">
          {invite.message}
        </Alert>
      )}
    </Shell>
  );
}
