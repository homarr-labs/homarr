import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@homarr/auth/next";

import { CustomWidgetsUnavailable } from "~/components/custom-widgets/custom-widgets-unavailable";
import { env } from "~/env";
import { CustomWidgetConfigurationEntry } from "./configuration-entry";

export const metadata: Metadata = {
  title: "Configure custom widget API source",
  robots: { index: false, follow: false },
};

export default async function CustomWidgetConfigurationPage({ params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect(session ? "/" : "/auth/login");
  if (env.CUSTOM_WIDGETS_ENABLED === false) return <CustomWidgetsUnavailable />;
  const { token } = await params;
  return <CustomWidgetConfigurationEntry token={token} />;
}
