import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@homarr/auth/next";

import { CustomWidgetConfigurationEntry } from "./configuration-entry";

export const metadata: Metadata = {
  title: "Configure custom widget API source",
  robots: { index: false, follow: false },
};

export default async function CustomWidgetConfigurationPage({ params }: { params: Promise<{ token: string }> }) {
  const session = await auth();
  if (!session?.user.permissions.includes("admin")) redirect(session ? "/" : "/auth/login");
  const { token } = await params;
  return <CustomWidgetConfigurationEntry token={token} />;
}
