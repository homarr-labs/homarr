import type { Metadata } from "next";

import { CustomWidgetConfigurationEntry } from "./configuration-entry";

export const metadata: Metadata = {
  title: "Configure custom widget API source",
  robots: { index: false, follow: false },
};

export default async function CustomWidgetConfigurationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CustomWidgetConfigurationEntry token={token} />;
}
