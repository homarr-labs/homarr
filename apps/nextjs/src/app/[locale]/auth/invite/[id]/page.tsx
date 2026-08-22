import { notFound } from "next/navigation";
import { IconUserPlus } from "@tabler/icons-react";

import { auth } from "@homarr/auth/next";
import { isProviderEnabled } from "@homarr/auth/server";
import { and, db, eq } from "@homarr/db";
import { invites } from "@homarr/db/schema";
import { OnboardingAuthShell } from "@homarr/onboarding";
import { getI18n } from "@homarr/translation/server";

import { RegistrationForm } from "./_registration-form";

interface InviteUsagePageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    token: string;
  }>;
}

export default async function InviteUsagePage(props: InviteUsagePageProps) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  if (!isProviderEnabled("credentials")) notFound();

  const session = await auth();
  if (session) notFound();

  const invite = await db.query.invites.findFirst({
    where: and(eq(invites.id, params.id), eq(invites.token, searchParams.token)),
    columns: {
      id: true,
      token: true,
      expirationDate: true,
    },
    with: {
      creator: {
        columns: {
          name: true,
        },
      },
    },
  });

  if (!invite || invite.expirationDate < new Date()) notFound();

  const t = await getI18n("user.page.invite");

  return (
    <OnboardingAuthShell
      title={t("title")}
      description={t("subtitle")}
      icon={<IconUserPlus size={24} />}
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      footer={t("description", { username: invite.creator.name! })}
    >
      <RegistrationForm invite={invite} />
    </OnboardingAuthShell>
  );
}
