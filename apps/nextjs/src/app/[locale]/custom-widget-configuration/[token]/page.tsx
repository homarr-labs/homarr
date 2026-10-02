import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@homarr/auth/next";
import { createLoginUrl } from "@homarr/auth/shared";

import { CustomWidgetConfigurationEntry } from "./configuration-entry";

export const metadata: Metadata = {
  title: "Configure custom widget API source",
  robots: { index: false, follow: false },
};

export default async function CustomWidgetConfigurationPage({ params }: { params: Promise<{ token: string }> }) {
  const [session, { token }] = await Promise.all([auth(), params]);
  if (!session) redirect(createLoginUrl(`/custom-widget-configuration/${token}`));
  if (!session.user.permissions.includes("admin")) redirect("/");
  return <CustomWidgetConfigurationEntry token={token} />;
}
